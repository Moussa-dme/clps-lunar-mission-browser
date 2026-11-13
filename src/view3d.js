/*
 * CLPS Lunar Mission Browser — 3D view
 * -------------------------------------
 * WebGL (three.js r128) rendering of the LOLA south-polar terrain.
 * Illumination and Earth visibility are computed on the GPU for every terrain
 * texel by marching along the great circle towards the Sun / Earth over the real
 * terrain (fine 240 m grid near the pole, 1 km grid down to 75 S), with lunar
 * curvature and the finite solar disk. Vertical stretch is visual only: the
 * physics always uses the true heights.
 *
 * Usage: const v = LunarView3D.create(stageElement, terrain, { onPick, colors })
 */
(function (root, factory) {
  root.LunarView3D = factory(root.THREE);
})(typeof self !== 'undefined' ? self : this, function (THREE) {
  'use strict';
  const R = 1737.4;                     // km
  const D2R = Math.PI / 180;
  const SKY_DIST = 6000;                // km, sky bodies drawn at this distance from the camera

  // Body-fixed (X towards Earth's mean direction, Z north) -> scene (y up at the south pole)
  const toScene = (v, offset) => new THREE.Vector3(v[0], -v[2] - (offset ? R : 0), v[1]);
  const fromScene = p => [p.x, p.z, -(p.y + R)];

  /* ------------------------------------------------------------- shaders */
  const COMMON_GLSL = `
    precision highp float;
    const float R = 1737.4;
    uniform sampler2D uFine; uniform sampler2D uCoarse;
    uniform float uFineHalf; uniform float uFinePx; uniform float uCoarseHalf; uniform float uCoarsePx;
    float heightKm(vec2 xy) {
      if (abs(xy.x) < uFineHalf - uFinePx && abs(xy.y) < uFineHalf - uFinePx)
        return texture2D(uFine, vec2((xy.x + uFineHalf) / (2.0 * uFineHalf), (uFineHalf - xy.y) / (2.0 * uFineHalf))).r * 0.001;
      if (abs(xy.x) < uCoarseHalf - uCoarsePx && abs(xy.y) < uCoarseHalf - uCoarsePx)
        return texture2D(uCoarse, vec2((xy.x + uCoarseHalf) / (2.0 * uCoarseHalf), (uCoarseHalf - xy.y) / (2.0 * uCoarseHalf))).r * 0.001;
      return -99.0;
    }
    // south polar stereographic <-> unit vector (no trig, no cancellation near the pole)
    vec3 unitOf(vec2 xy) { float s2 = dot(xy, xy) / (4.0 * R * R); return vec3(xy.y / R, xy.x / R, -(1.0 - s2)) / (1.0 + s2); }
    vec2 psOf(vec3 Q) { float d = length(Q) - Q.z; return vec2(2.0 * R * Q.y / d, 2.0 * R * Q.x / d); }
  `;

  const COMPUTE_FS = COMMON_GLSL + `
    uniform float uGridHalf; uniform float uGridPx;
    uniform vec3 uSun; uniform vec3 uEarth; uniform float uMast;
    uniform float uSunFracMin; uniform float uEarthMargin; uniform float uDsnOk; uniform float uWeight;
    varying vec2 vUv;
    float horizonAlong(vec3 P, vec3 U, vec3 D) {
      float best = -1.5707;
      float t = 0.12;
      for (int k = 0; k < 230; k++) {
        vec3 Q = P + D * t;
        vec2 q = psOf(Q);
        float hq = heightKm(q);
        if (hq < -90.0) break;
        vec3 v = unitOf(q) * (R + hq) - P;
        best = max(best, asin(clamp(dot(v, U) / length(v), -1.0, 1.0)));
        if (t > 5.0 && length(Q) - R > 9.5) break;
        t = t * 1.026 + 0.12;
      }
      return best;
    }
    float diskFrac(float h, float r) {
      if (h >= r) return 1.0;
      if (h <= -r) return 0.0;
      float x = h / r;
      return 1.0 - (acos(x) - x * sqrt(1.0 - x * x)) / 3.14159265;
    }
    void main() {
      vec2 xy = vec2(-uGridHalf + vUv.x * 2.0 * uGridHalf, uGridHalf - vUv.y * 2.0 * uGridHalf);
      float h0 = heightKm(xy);
      vec3 U = unitOf(xy);
      vec3 P = U * (R + h0 + uMast);
      float e = uGridPx;
      vec3 ax = unitOf(xy + vec2(e, 0.0)) * (R + heightKm(xy + vec2(e, 0.0))) - unitOf(xy - vec2(e, 0.0)) * (R + heightKm(xy - vec2(e, 0.0)));
      vec3 ay = unitOf(xy + vec2(0.0, e)) * (R + heightKm(xy + vec2(0.0, e))) - unitOf(xy - vec2(0.0, e)) * (R + heightKm(xy - vec2(0.0, e)));
      vec3 N = normalize(cross(ax, ay)); if (dot(N, U) < 0.0) N = -N;
      float sunEl = asin(clamp(dot(uSun, U), -1.0, 1.0));
      float frac = diskFrac(sunEl - horizonAlong(P, U, uSun), 0.004654);
      vec3 dE = normalize(uEarth - P);
      float clr = degrees(asin(clamp(dot(dE, U), -1.0, 1.0)) - horizonAlong(P, U, dE));
      #ifdef ACCUM
        float lit = (frac >= uSunFracMin && frac > 0.0) ? 1.0 : 0.0;
        float dte = (clr >= uEarthMargin && uDsnOk > 0.5) ? 1.0 : 0.0;
        gl_FragColor = vec4(lit, dte, lit * dte, 1.0) * uWeight;
      #else
        float lam = frac * max(0.0, dot(N, uSun));
        gl_FragColor = vec4(frac, clamp((clr + 10.0) / 20.0, 0.0, 1.0), sqrt(lam), 1.0);
      #endif
    }
  `;
  const QUAD_VS = `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

  const TERRAIN_VS = `
    #include <common>
    #include <logdepthbuf_pars_vertex>
    varying vec2 vUv; varying vec3 vN;
    void main() {
      vUv = uv; vN = normal;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      #include <logdepthbuf_vertex>
    }
  `;
  const TERRAIN_FS = `
    #include <common>
    #include <logdepthbuf_pars_fragment>
    uniform sampler2D uIllum; uniform sampler2D uAvg;
    uniform int uMode; uniform float uSunFracMin; uniform float uEarthMargin; uniform float uDsnOk;
    uniform vec3 cOps; uniform vec3 cSun; uniform vec3 cComm; uniform vec3 cNone;
    uniform vec3 uHsDir; uniform float uEarthIllum; uniform float uAvgReady; uniform float uDetail; uniform float uNoiseFreq;
    uniform float uFlat; uniform vec3 uFlatDir;
    varying vec2 vUv; varying vec3 vN;
    vec3 ramp(vec3 hue, float v) {
      vec3 c = mix(vec3(0.11, 0.115, 0.13), hue, smoothstep(0.0, 0.85, v));
      return mix(c, vec3(1.0), smoothstep(0.85, 1.0, v) * 0.55);
    }
    float hash21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
    float vnoise(vec2 p) {
      vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x), mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), f.x), f.y);
    }
    vec3 thermal(float v) {
      vec3 a = vec3(0.70, 0.09, 0.17), b = vec3(0.94, 0.54, 0.38), c = vec3(0.96, 0.96, 0.96), d = vec3(0.40, 0.66, 0.81), e = vec3(0.13, 0.40, 0.67);
      v = clamp(v, 0.0, 1.0);
      return v < 0.25 ? mix(a, b, v / 0.25) : v < 0.5 ? mix(b, c, (v - 0.25) / 0.25) : v < 0.75 ? mix(c, d, (v - 0.5) / 0.25) : mix(d, e, (v - 0.75) / 0.25);
    }
    void main() {
      #include <logdepthbuf_fragment>
      vec2 d = vUv - 0.5; if (dot(d, d) > 0.2475) discard;
      float hs = clamp(dot(normalize(vN), uHsDir), 0.0, 1.0);
      // fine regolith grain (High quality only), faded out when it would alias
      float fw = fwidth(vUv.x * uNoiseFreq);
      float dt = 1.0 + uDetail * (vnoise(vUv * uNoiseFreq) * 0.6 + vnoise(vUv * uNoiseFreq * 2.7) * 0.4 - 0.5) * 0.4 * (1.0 - smoothstep(0.35, 0.9, fw));
      vec4 I = texture2D(uIllum, vUv);
      float frac = I.r; float clr = I.g * 20.0 - 10.0; float lam = I.b * I.b;
      vec3 col;
      if (uMode == 0) {
        float rad = 4.5 * lam * dt;
        col = vec3(1.0 - exp(-rad * 2.2)) * vec3(1.0, 0.985, 0.95);
        float earthshine = (clr > 0.0 ? 1.0 : 0.0) * uEarthIllum * 0.02;
        col += (0.03 + earthshine) * (0.35 + 0.65 * hs) * vec3(0.55, 0.62, 0.78);
      } else if (uMode == 1) {
        bool lit = frac >= uSunFracMin && frac > 0.0;
        bool dte = clr >= uEarthMargin && uDsnOk > 0.5;
        vec3 s = lit && dte ? cOps : lit ? cSun : dte ? cComm : cNone;
        col = s * (0.42 + 0.58 * hs) * dt;
      } else {
        vec4 A = texture2D(uAvg, vUv);
        float v = uMode == 2 ? A.r : uMode == 3 ? A.g : A.b;
        vec3 hue = uMode == 2 ? cSun : uMode == 3 ? cComm : cOps;
        col = thermal(pow(clamp(v / 0.7, 0.0, 1.0), 0.7)) * (0.62 + 0.38 * hs);
        if (uAvgReady < 0.5) col *= 0.6;
      }
      if (uFlat > 0.5) {   // fictional even lighting: just the terrain, no real shadows or states
        float h2 = clamp(dot(normalize(vN), uFlatDir), 0.0, 1.0);
        col = vec3(0.76, 0.74, 0.71) * (0.26 + 0.74 * h2) * dt;
      }
      gl_FragColor = vec4(col, 1.0);
    }
  `;

  /* whole-Moon globe: Lambert shading from the real Sun direction, optional even light */
  const GLOBE_VS = `
    #include <common>
    #include <logdepthbuf_pars_vertex>
    varying vec2 vUv; varying vec3 vN;
    void main() {
      vUv = uv; vN = normalize(position + vec3(0.0, 1737.4, 0.0));
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      #include <logdepthbuf_vertex>
    }
  `;
  const GLOBE_FS = `
    #include <common>
    #include <logdepthbuf_pars_fragment>
    uniform sampler2D uTex; uniform vec3 uSunDir; uniform float uFlat;
    varying vec2 vUv; varying vec3 vN;
    void main() {
      #include <logdepthbuf_fragment>
      vec3 base = texture2D(uTex, vUv).rgb;
      float d = dot(normalize(vN), uSunDir);
      float day = smoothstep(-0.015, 0.09, d) * (0.34 + 0.66 * clamp(d * 1.25, 0.0, 1.0));
      vec3 col = base * (0.05 + 0.95 * day) * vec3(1.0, 0.99, 0.96);
      if (uFlat > 0.5) col = base * 0.92;
      gl_FragColor = vec4(col, 1.0);
    }
  `;

  /* -------------------------------------------------------------- helpers */
  function canvasTexture(w, h, draw) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    return t;
  }
  function seeded(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
  function earthTexture() {
    // Illustrative globe (not real geography): ocean, land masses, clouds.
    return canvasTexture(512, 256, (g, w, h) => {
      const rnd = seeded(7);
      g.fillStyle = '#1d4f91'; g.fillRect(0, 0, w, h);
      const blob = (x, y, r, col, a) => {
        g.fillStyle = col; g.globalAlpha = a;
        for (let k = 0; k < 18; k++) { g.beginPath(); g.arc(x + (rnd() - .5) * r * 1.6, y + (rnd() - .5) * r, r * (0.3 + rnd() * 0.5), 0, 7); g.fill(); }
      };
      for (let k = 0; k < 9; k++) blob(rnd() * w, h * (0.2 + rnd() * 0.6), 18 + rnd() * 30, k % 3 ? '#4f7a3a' : '#a08a5a', 0.9);
      g.fillStyle = '#e8eef5'; g.globalAlpha = 1; g.fillRect(0, 0, w, 14); g.fillRect(0, h - 18, w, 18);
      for (let k = 0; k < 60; k++) { g.globalAlpha = 0.35 + rnd() * 0.4; g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(rnd() * w, rnd() * h, 10 + rnd() * 40, 3 + rnd() * 6, rnd(), 0, 7); g.fill(); }
      g.globalAlpha = 1;
    });
  }
  /* Illustrative whole-Moon surface: approximate maria positions + craters. NOT LOLA data;
     the real LOLA shaded relief of the south polar cap (80-90 S) is composited on top. */
  const MARIA = [   // lat, lon (E), radius deg, darkness
    [18, -57, 17, .62], [26, -42, 10, .5], [8, -31, 7, .55], [33, -16, 13, .72], [56, 0, 22, .38], [28, 18, 8, .7], [8, 31, 9, .72],
    [13, 3, 4.5, .6], [-21, -16, 9, .58], [-24, -39, 5.5, .66], [-10, -23, 4.5, .55], [-15, 34, 4.2, .6], [-4, 52, 8, .62], [17, 59, 5.2, .78],
    [-19, -93, 4, .55], [27, 148, 3.2, .55], [-34, 166, 3.2, .5], [2, 98, 3, .35], [-53, -169, 24, .2], [10, -20, 3, .0]
  ];
  function moonTexture(basemap, meta, onReady) {
    const W = 2048, H = 1024;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d');
    const rnd = seeded(2026);
    g.fillStyle = '#9a9792'; g.fillRect(0, 0, W, H);
    const X = lon => (lon + 180) / 360 * W, Y = lat => (90 - lat) / 180 * H;
    const blobAt = (lat, lon, rad, a, col) => {
      for (const dx of [-W, 0, W]) {
        const cx = X(lon) + dx, cy = Y(lat), ry = rad / 180 * H, rx = ry / Math.max(0.12, Math.cos(lat * D2R));
        if (cx + rx < 0 || cx - rx > W) continue;
        g.save(); g.translate(cx, cy); g.scale(rx / ry, 1);
        const gr = g.createRadialGradient(0, 0, 0, 0, 0, ry);
        gr.addColorStop(0, col.replace('A', a)); gr.addColorStop(0.72, col.replace('A', a * 0.85)); gr.addColorStop(1, col.replace('A', 0));
        g.fillStyle = gr; g.beginPath(); g.arc(0, 0, ry, 0, 7); g.fill(); g.restore();
      }
    };
    // highland mottling, then maria
    for (let k = 0; k < 900; k++) blobAt(rnd() * 160 - 80, rnd() * 360 - 180, 2 + rnd() * 6, 0.05 + rnd() * 0.06, rnd() < 0.5 ? 'rgba(60,58,55,A)' : 'rgba(225,222,215,A)');
    for (const [la, lo, r, d] of MARIA) {
      if (d <= 0.01) continue;
      for (let j = 0; j < 4; j++) blobAt(la + (rnd() - .5) * r * .5, lo + (rnd() - .5) * r * .7, r * (0.55 + rnd() * 0.5), d * 0.55, 'rgba(48,50,56,A)');
    }
    // craters (uniform on the sphere) and a few bright ray craters
    for (let k = 0; k < 5200; k++) {
      const lat = Math.asin(rnd() * 2 - 1) / D2R, lon = rnd() * 360 - 180, r = 0.25 + Math.pow(rnd(), 3) * 3.2;
      blobAt(lat, lon, r, 0.16, 'rgba(30,30,32,A)'); blobAt(lat + r * .18, lon - r * .18 / Math.max(.2, Math.cos(lat * D2R)), r * .7, 0.10, 'rgba(235,232,225,A)');
    }
    for (const [la, lo, r] of [[-43, -11, 3.2], [10, -20, 2.6], [8, -38, 2.2], [-9, -2, 2], [-44, 100, 2.4], [12, 51, 2]]) blobAt(la, lo, r, 0.55, 'rgba(250,248,240,A)');
    const tex = new THREE.CanvasTexture(c);
    tex.anisotropy = 4;
    if (basemap) {
      const draw = () => {
        const half = meta.half_m, n = meta.n, S = 1024;
        const bc = document.createElement('canvas'); bc.width = bc.height = n;
        const bg = bc.getContext('2d'); bg.drawImage(basemap, 0, 0, n, n);
        const bd = bg.getImageData(0, 0, n, n).data;
        const y0 = Math.floor(Y(-79)), img = g.getImageData(0, y0, W, H - y0), px = img.data;
        for (let yy = 0; yy < H - y0; yy++) {
          const lat = 90 - (yy + y0 + 0.5) / H * 180;
          const r = 2 * 1737400 * Math.tan(Math.PI / 4 + lat * D2R / 2);
          const a = Math.min(1, Math.max(0, (-79 - lat) / 1.2));
          if (a <= 0) continue;
          for (let xx = 0; xx < W; xx++) {
            const lon = (xx + 0.5) / W * 360 - 180;
            const x = r * Math.sin(lon * D2R), y = r * Math.cos(lon * D2R);
            const bx = Math.floor((x + half) / (2 * half) * n), by = Math.floor((half - y) / (2 * half) * n);
            if (bx < 0 || by < 0 || bx >= n || by >= n) continue;
            const v = bd[(by * n + bx) * 4] * 1.12, i = (yy * W + xx) * 4;
            px[i] += (v - px[i]) * a; px[i + 1] += (v * 0.99 - px[i + 1]) * a; px[i + 2] += (v * 0.97 - px[i + 2]) * a;
          }
        }
        g.putImageData(img, 0, y0); tex.needsUpdate = true; if (onReady) onReady();
      };
      if (basemap.complete && basemap.naturalWidth) draw(); else basemap.addEventListener('load', draw, { once: true });
    }
    return tex;
  }
  function sunTexture() {
    return canvasTexture(256, 256, (g, w) => {
      const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.16, 'rgba(255,253,240,1)');
      gr.addColorStop(0.19, 'rgba(255,230,170,0.75)'); gr.addColorStop(0.4, 'rgba(255,200,110,0.22)');
      gr.addColorStop(1, 'rgba(255,180,80,0)');
      g.fillStyle = gr; g.fillRect(0, 0, w, w);
    });
  }
  const hexToVec = hex => { const c = new THREE.Color(hex); return new THREE.Vector3(c.r, c.g, c.b); };
  function ease(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

  /* ---------------------------------------------------------------- main */
  function create(stage, terrain, opts) {
    opts = opts || {};
    if (!THREE) throw new Error('three.js did not load');
    const renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true, preserveDrawingBuffer: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 1);
    stage.insertBefore(renderer.domElement, stage.firstChild);
    renderer.domElement.className = 'v3d-canvas';
    renderer.domElement.setAttribute('aria-label', '3D view of the lunar south pole');
    const gl = renderer.getContext();
    const ext = n => { try { return renderer.extensions.get(n); } catch (e) { return null; } };
    const floatLinear = !!ext('OES_texture_float_linear');
    const accumType = (renderer.capabilities.isWebGL2 && ext('EXT_color_buffer_float')) ? THREE.FloatType
      : (ext('EXT_color_buffer_half_float') || ext('EXT_color_buffer_float')) ? THREE.HalfFloatType : THREE.UnsignedByteType;

    const labels = stage.querySelector('.v3d-labels');
    const lctx = labels.getContext('2d');

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.005, 40000);

    /* height textures (true heights in metres, physics uses these) */
    function heightTex(G) {
      const n = G.n, data = new Float32Array(n * n * 4);
      for (let i = 0; i < n * n; i++) data[i * 4] = G.h[i];
      const t = new THREE.DataTexture(data, n, n, THREE.RGBAFormat, THREE.FloatType);
      t.minFilter = t.magFilter = floatLinear ? THREE.LinearFilter : THREE.NearestFilter;
      t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.generateMipmaps = false; t.needsUpdate = true;
      return t;
    }
    const texFine = heightTex(terrain.fine), texCoarse = heightTex(terrain.coarse);
    const commonUniforms = {
      uFine: { value: texFine }, uCoarse: { value: texCoarse },
      uFineHalf: { value: terrain.fine.half_m / 1000 }, uFinePx: { value: terrain.fine.px_m / 1000 },
      uCoarseHalf: { value: terrain.coarse.half_m / 1000 }, uCoarsePx: { value: terrain.coarse.px_m / 1000 }
    };

    /* GPU compute pass (full-screen quad into a render target) */
    const quadScene = new THREE.Scene(), quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const mkCompute = (accum) => new THREE.ShaderMaterial({
      uniforms: Object.assign({}, commonUniforms, {
        uGridHalf: { value: 1 }, uGridPx: { value: 1 }, uSun: { value: new THREE.Vector3(1, 0, 0) },
        uEarth: { value: new THREE.Vector3(-384000, 0, 0) }, uMast: { value: 0.002 },
        uSunFracMin: { value: 0.5 }, uEarthMargin: { value: 0 }, uDsnOk: { value: 1 }, uWeight: { value: 1 }
      }),
      vertexShader: QUAD_VS, fragmentShader: COMPUTE_FS, defines: accum ? { ACCUM: 1 } : {},
      depthTest: false, depthWrite: false,
      blending: accum ? THREE.CustomBlending : THREE.NoBlending,
      blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor
    });
    const computeNow = mkCompute(false), computeAcc = mkCompute(true);
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), computeNow);
    quad.frustumCulled = false; quadScene.add(quad);

    let rtNow = null, rtAvg = null;
    const terrainMat = new THREE.ShaderMaterial({
      uniforms: {
        uIllum: { value: null }, uAvg: { value: null }, uMode: { value: 0 },
        uSunFracMin: { value: 0.5 }, uEarthMargin: { value: 0 }, uDsnOk: { value: 1 },
        cOps: { value: hexToVec('#2fbf8c') }, cSun: { value: hexToVec('#f2b84b') }, cComm: { value: hexToVec('#5fa2f0') }, cNone: { value: hexToVec('#343a43') },
        uHsDir: { value: new THREE.Vector3(-0.5, 0.75, -0.4).normalize() }, uEarthIllum: { value: 0.5 }, uAvgReady: { value: 0 },
        uDetail: { value: 1 }, uNoiseFreq: { value: 1000 },
        uFlat: { value: 0 }, uFlatDir: { value: new THREE.Vector3(-0.5, 0.75, -0.4).normalize() }
      },
      vertexShader: TERRAIN_VS, fragmentShader: TERRAIN_FS, extensions: { derivatives: true }
    });

    /* state */
    const st = {
      region: 'pole', mode: 'sun', exag: 3, sun: [1, 0, 0], earth: [-384000, 0, 0], earthIllum: 0.5, dsnOk: true,
      quality: 'high', rules: { sunFracMin: 0.5, earthMarginDeg: 0 }, sites: [], samples: [], avgDone: 0, avgKey: '',
      grid: null, mesh: null, fp: null, cam: null, anim: null, skyScale: 4, flat: false, zones: [], hoverZone: null
    };

    function regionGrid() { return st.region === 'pole' ? terrain.fine : terrain.coarse; }
    const isMoon = () => st.region === 'moon';

    /* whole-Moon globe (smooth sphere, illustrative texture) and its zone discs */
    const globeMat = new THREE.ShaderMaterial({
      uniforms: { uTex: { value: null }, uSunDir: { value: new THREE.Vector3(1, 0, 0) }, uFlat: { value: 0 } },
      vertexShader: GLOBE_VS, fragmentShader: GLOBE_FS
    });
    let globe = null; const zoneGroup = new THREE.Group(); zoneGroup.visible = false; scene.add(zoneGroup);
    const GLOBE_C = new THREE.Vector3(0, -R, 0);
    function ensureGlobe() {
      if (globe) return;
      const W = 192, H = 96, pos = new Float32Array((W + 1) * (H + 1) * 3), uv = new Float32Array((W + 1) * (H + 1) * 2), idx = [];
      let k = 0;
      for (let j = 0; j <= H; j++) for (let i = 0; i <= W; i++) {
        const lat = (90 - j / H * 180) * D2R, lon = (i / W * 360 - 180) * D2R;
        const p = toScene([Math.cos(lat) * Math.cos(lon) * R, Math.cos(lat) * Math.sin(lon) * R, Math.sin(lat) * R], true);
        pos[k * 3] = p.x; pos[k * 3 + 1] = p.y; pos[k * 3 + 2] = p.z; uv[k * 2] = i / W; uv[k * 2 + 1] = 1 - j / H; k++;
      }
      for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const a = j * (W + 1) + i, b = a + 1, c = a + W + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      geo.setIndex(idx); geo.computeBoundingSphere();
      globeMat.uniforms.uTex.value = moonTexture(opts.basemap, opts.basemapMeta, invalidate);
      globe = new THREE.Mesh(geo, globeMat); globe.frustumCulled = false; scene.add(globe);
    }
    const unitOf = (lat, lon) => [Math.cos(lat * D2R) * Math.cos(lon * D2R), Math.cos(lat * D2R) * Math.sin(lon * D2R), Math.sin(lat * D2R)];
    const angBetween = (a, b) => Math.acos(Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]))) / D2R;
    function buildZones() {
      while (zoneGroup.children.length) { const c = zoneGroup.children.pop(); c.geometry.dispose(); c.material.dispose(); }
      st.zones.forEach(z => {
        z.u = unitOf(z.lat, z.lon);
        const c = new THREE.Vector3(...z.u);
        const e1 = Math.abs(c.z) > 0.95 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 0, 1);
        const a1 = new THREE.Vector3().crossVectors(c, e1).normalize(), a2 = new THREE.Vector3().crossVectors(c, a1).normalize();
        const ring = (rho, rr) => { const t = rho * D2R, k = []; for (let b = 0; b < 72; b++) { const q = b / 72 * 2 * Math.PI;
          const v = c.clone().multiplyScalar(Math.cos(t)).addScaledVector(a1, Math.sin(t) * Math.cos(q)).addScaledVector(a2, Math.sin(t) * Math.sin(q)).multiplyScalar(rr);
          k.push(toScene([v.x, v.y, v.z], true)); } return k; };
        const outer = ring(z.rad, R * 1.0025), inner = ring(z.rad * 0.955, R * 1.0025), ctr = toScene(z.u.map(x => x * R * 1.0025), true);
        const fill = [], band = [];
        for (let b = 0; b < 72; b++) { const n = (b + 1) % 72; fill.push(ctr, inner[b], inner[n]); band.push(inner[b], outer[b], inner[n], inner[n], outer[b], outer[n]); }
        const mk = (pts, op) => { const m = new THREE.Mesh(new THREE.BufferGeometry().setFromPoints(pts),
          new THREE.MeshBasicMaterial({ color: new THREE.Color(z.color), transparent: true, opacity: op, depthWrite: false, side: THREE.DoubleSide })); m.frustumCulled = false; m.renderOrder = 2; return m; };
        const f = mk(fill, 0.13), bnd = mk(band, 0.85);
        f.userData = { zone: z.id, base: 0.13 }; bnd.userData = { zone: z.id, base: 0.85 };
        zoneGroup.add(f, bnd);
      });
      paintZoneHover();
    }
    function paintZoneHover() {
      zoneGroup.children.forEach(m => { m.material.opacity = m.userData.base * (m.userData.zone === st.hoverZone ? (m.userData.base < 0.5 ? 2.4 : 1) : 1); });
    }
    /* is a point on the globe on the hemisphere facing the camera? */
    function facing(p) { return p.clone().sub(GLOBE_C).normalize().dot(camera.position.clone().sub(GLOBE_C)) > R; }
    function sphereHit(clientX, clientY) {
      const r = el.getBoundingClientRect();
      ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const o = ray.ray.origin.clone().sub(GLOBE_C), d = ray.ray.direction, b = o.dot(d), disc = b * b - (o.dot(o) - R * R);
      if (disc < 0) return null;
      const tt = -b - Math.sqrt(disc);
      return tt < 0 ? null : ray.ray.origin.clone().addScaledVector(d, tt);
    }
    function latLonOfScene(p) {
      const b = fromScene(p);
      return [Math.asin(b[2] / Math.hypot(b[0], b[1], b[2])) / D2R, Math.atan2(b[1], b[0]) / D2R];
    }
    function zoneAtLatLon(lat, lon) {
      const u = unitOf(lat, lon); let best = null, bd = 1e9;
      for (const z of st.zones) { const d = angBetween(u, z.u); if (d <= z.rad && d < bd) { bd = d; best = z; } }
      return best;
    }

    /* terrain mesh */
    function buildMesh() {
      const G = regionGrid(), step = (st.region === 'pole' || st.quality === 'high') ? 1 : 2;
      terrainMat.uniforms.uDetail.value = st.quality === 'high' ? 1 : 0;
      terrainMat.uniforms.uNoiseFreq.value = G.n * 1.5;
      const n = G.n, m = Math.floor((n - 1) / step) + 1;
      const pos = new Float32Array(m * m * 3), uv = new Float32Array(m * m * 2);
      let k = 0;
      for (let r = 0; r < m; r++) for (let c = 0; c < m; c++) {
        const rr = Math.min(n - 1, r * step), cc = Math.min(n - 1, c * step);
        const x = (-G.half_m + (cc + 0.5) * G.px_m) / 1000, y = (G.half_m - (rr + 0.5) * G.px_m) / 1000;
        const s2 = (x * x + y * y) / (4 * R * R), den = 1 + s2;
        const h = G.h[rr * n + cc] * st.exag / 1000;
        const rad = R + h;
        const X = y / R / den * rad, Y = x / R / den * rad, Z = -(1 - s2) / den * rad;
        pos[k * 3] = X; pos[k * 3 + 1] = -Z - R; pos[k * 3 + 2] = Y;
        uv[k * 2] = (cc + 0.5) / n; uv[k * 2 + 1] = (rr + 0.5) / n;
        k++;
      }
      const idx = new Uint32Array((m - 1) * (m - 1) * 6);
      let q = 0;
      for (let r = 0; r < m - 1; r++) for (let c = 0; c < m - 1; c++) {
        const a = r * m + c, b = a + 1, d = a + m, e = d + 1;
        idx[q++] = a; idx[q++] = d; idx[q++] = b; idx[q++] = b; idx[q++] = d; idx[q++] = e;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      geo.setIndex(new THREE.BufferAttribute(idx, 1));
      geo.computeVertexNormals();
      geo.computeBoundingSphere();
      if (st.mesh) { scene.remove(st.mesh); st.mesh.geometry.dispose(); }
      st.mesh = new THREE.Mesh(geo, terrainMat);
      scene.add(st.mesh);
    }

    function buildTargets() {
      const G = regionGrid();
      const size = Math.min(G.n, 1024);
      const p = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false, stencilBuffer: false, generateMipmaps: false };
      if (rtNow) rtNow.dispose(); if (rtAvg) rtAvg.dispose();
      rtNow = new THREE.WebGLRenderTarget(size, size, Object.assign({ type: THREE.UnsignedByteType }, p));
      rtAvg = new THREE.WebGLRenderTarget(size, size, Object.assign({ type: accumType }, p));
      for (const mat of [computeNow, computeAcc]) {
        mat.uniforms.uGridHalf.value = G.half_m / 1000;
        mat.uniforms.uGridPx.value = 2 * G.half_m / 1000 / size;
      }
      terrainMat.uniforms.uIllum.value = rtNow.texture;
      terrainMat.uniforms.uAvg.value = rtAvg.texture;
      st.avgKey = '';
    }

    /* sky */
    const sky = new THREE.Group(); scene.add(sky);
    const starGeo = new THREE.BufferGeometry();
    { const rnd = seeded(42), N = 2500, p = new Float32Array(N * 3);
      for (let i = 0; i < N; i++) { const u = rnd() * 2 - 1, th = rnd() * 2 * Math.PI, s = Math.sqrt(1 - u * u);
        p[i * 3] = s * Math.cos(th) * 30000; p[i * 3 + 1] = u * 30000; p[i * 3 + 2] = s * Math.sin(th) * 30000; }
      starGeo.setAttribute('position', new THREE.BufferAttribute(p, 3)); }
    const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0x9aa4b5, size: 1.3, sizeAttenuation: false }));
    sky.add(stars);
    const sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: sunTexture(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    scene.add(sunSprite);
    const earth = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), new THREE.MeshPhongMaterial({ map: earthTexture(), shininess: 12, specular: 0x223344 }));
    scene.add(earth);
    const sunLight = new THREE.DirectionalLight(0xffffff, 1.25); scene.add(sunLight); scene.add(sunLight.target);
    scene.add(new THREE.AmbientLight(0x223040, 0.15));

    /* site markers */
    const markers = new THREE.Group(); scene.add(markers);
    function sitePos(s, extra) {
      const lat = s.lat * D2R, lon = s.lon * D2R;
      const h = isMoon() ? (extra || 0) : (s.heightM || terrain.height(s.lat, s.lon) || 0) * (st.fp ? 1 : st.exag) / 1000 + (extra || 0);
      const u = [Math.cos(lat) * Math.cos(lon), Math.cos(lat) * Math.sin(lon), Math.sin(lat)];
      return toScene(u.map(c => c * (R + h)), true);
    }
    function inRegion(s) {
      if (isMoon()) return true;
      if (!terrain.covers(s.lat)) return false;
      const G = regionGrid();
      const [x, y] = LunarTerrainXY(s.lat, s.lon);
      const rr = Math.hypot(x, y);
      return rr < G.half_m * 0.985;
    }
    function LunarTerrainXY(lat, lon) {
      const r = 2 * R * 1000 * Math.tan(Math.PI / 4 + lat * D2R / 2);
      return [r * Math.sin(lon * D2R), r * Math.cos(lon * D2R)];
    }
    function buildMarkers() {
      while (markers.children.length) { const c = markers.children.pop(); c.children.forEach(k => { k.geometry.dispose(); k.material.dispose(); }); c.geometry.dispose(); c.material.dispose(); }
      const pinH = isMoon() ? 70 : st.region === 'pole' ? 4 : 18, headR = isMoon() ? 24 : st.region === 'pole' ? 1.3 : 5.5;
      for (const s of st.sites) {
        if (!inRegion(s)) continue;
        const base = sitePos(s, 0), top = sitePos(s, pinH);
        const col = new THREE.Color(s.color);
        const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([base, top]), new THREE.LineBasicMaterial({ color: col }));
        const head = new THREE.Mesh(new THREE.SphereGeometry(headR * (s.focus ? 1.5 : 1), 20, 14), new THREE.MeshBasicMaterial({ color: col }));
        const halo = new THREE.Mesh(new THREE.SphereGeometry(headR * (s.focus ? 1.5 : 1) * 1.45, 20, 14), new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.BackSide }));
        head.add(halo);
        head.position.copy(top); head.userData.site = s; head.scale.setScalar((st.msc || 1) * (st.hover === s.id ? 1.6 : 1));
        line.visible = head.visible = !st.fp || st.fp.site.id !== s.id;
        markers.add(line, head);
      }
    }

    /* camera control */
    const ctl = { target: new THREE.Vector3(), radius: 300, theta: Math.PI, phi: 0.75, fov: 45,
      yaw: 0, pitch: 0.03 };
    function applyCamera() {
      if (st.fp) {
        const f = st.fp;
        const dir = f.N.clone().multiplyScalar(Math.cos(ctl.yaw)).add(f.E.clone().multiplyScalar(Math.sin(ctl.yaw)))
          .multiplyScalar(Math.cos(ctl.pitch)).add(f.U.clone().multiplyScalar(Math.sin(ctl.pitch)));
        camera.position.copy(f.pos);
        camera.up.copy(f.U);
        const Fh = f.N.clone().multiplyScalar(Math.cos(ctl.yaw)).addScaledVector(f.E, Math.sin(ctl.yaw));
        const Rt = f.E.clone().multiplyScalar(Math.cos(ctl.yaw)).addScaledVector(f.N, -Math.sin(ctl.yaw));
        terrainMat.uniforms.uFlatDir.value.copy(f.U).multiplyScalar(0.75).addScaledVector(Rt, 0.45).addScaledVector(Fh, -0.25).normalize();
        camera.lookAt(f.pos.clone().add(dir));
      } else {
        terrainMat.uniforms.uFlatDir.value.set(-0.5, 0.75, -0.4).normalize();
        const sp = Math.sin(ctl.phi);
        camera.up.set(0, isMoon() ? -1 : 1, 0);
        camera.position.set(ctl.target.x + ctl.radius * sp * Math.cos(ctl.theta), ctl.target.y + ctl.radius * Math.cos(ctl.phi),
          ctl.target.z + ctl.radius * sp * Math.sin(ctl.theta));
        camera.lookAt(ctl.target);
      }
      camera.fov = ctl.fov; camera.updateProjectionMatrix();
      sky.position.copy(camera.position);
      markers.visible = !st.fp;
      if (!st.fp) {   // keep markers a readable size on screen whatever the zoom
        const ms = Math.max(0.3, Math.min(1.8, ctl.radius / (regionRadius() * 2.35)));
        if (Math.abs(ms - (st.msc || 1)) > 0.02) { st.msc = ms; markers.children.forEach(m => { if (m.userData.site) m.scale.setScalar(ms * (st.hover === m.userData.site.id ? 1.6 : 1)); }); }
      }
      placeSky();
    }
    function animateTo(to, ms) {
      const from = { tx: ctl.target.x, ty: ctl.target.y, tz: ctl.target.z, radius: ctl.radius, theta: ctl.theta, phi: ctl.phi, fov: ctl.fov, yaw: ctl.yaw, pitch: ctl.pitch };
      // shortest way round for angles
      if (to.theta != null) { let d = to.theta - from.theta; d = ((d + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI; to.theta = from.theta + d; }
      if (to.yaw != null) { let d = to.yaw - from.yaw; d = ((d + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI; to.yaw = from.yaw + d; }
      const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      st.anim = { from, to, t0: performance.now(), ms: reduce ? 1 : (ms || 1200) };
      invalidate();
    }
    function stepAnim(now) {
      const a = st.anim; if (!a) return false;
      const u = Math.min(1, (now - a.t0) / a.ms), e = ease(u), f = a.from, t = a.to;
      const L = (k, x) => (t[k] == null ? f[k] : f[k] + (t[k] - f[k]) * x);
      ctl.target.set(L('tx', e), L('ty', e), L('tz', e));
      ctl.radius = L('radius', e); ctl.theta = L('theta', e); ctl.phi = L('phi', e); ctl.fov = L('fov', e);
      ctl.yaw = L('yaw', e); ctl.pitch = L('pitch', e);
      if (u >= 1) st.anim = null;
      return !!st.anim;
    }

    /* sky bodies follow the camera so their directions are exact */
    function placeSky() {
      const cb = fromScene(camera.position);
      const s = new THREE.Vector3(st.sun[0], st.sun[1], st.sun[2]).normalize();
      const sScene = toScene([s.x, s.y, s.z]);
      const scale = st.fp ? 1.6 : st.skyScale;
      sunSprite.position.copy(camera.position).addScaledVector(sScene, SKY_DIST);
      const rs = SKY_DIST * Math.tan(0.2666 * D2R) * scale;
      sunSprite.scale.set(rs * 6.2, rs * 6.2, 1);
      const e = new THREE.Vector3(st.earth[0] - cb[0], st.earth[1] - cb[1], st.earth[2] - cb[2]);
      const ed = e.length(); e.normalize();
      const eScene = toScene([e.x, e.y, e.z]);
      earth.position.copy(camera.position).addScaledVector(eScene, SKY_DIST);
      const re = SKY_DIST * Math.tan(Math.asin(6371 / ed)) * scale;
      earth.scale.set(re, re, re);
      earth.lookAt(camera.position);
      sunLight.position.copy(earth.position).addScaledVector(sScene, 1000);
      sunLight.target.position.copy(earth.position);
    }

    /* compute passes */
    function setComputeUniforms(mat, sun, earthPos, dsnOk) {
      const s = new THREE.Vector3(sun[0], sun[1], sun[2]).normalize();
      mat.uniforms.uSun.value.copy(s);
      mat.uniforms.uEarth.value.set(earthPos[0], earthPos[1], earthPos[2]);
      mat.uniforms.uDsnOk.value = dsnOk ? 1 : 0;
      mat.uniforms.uSunFracMin.value = st.rules.sunFracMin;
      mat.uniforms.uEarthMargin.value = st.rules.earthMarginDeg;
    }
    let lastComputeMs = 0;
    function runNow() {
      if (isMoon()) { st.nowDirty = false; return; }
      const t0 = performance.now();
      setComputeUniforms(computeNow, st.sun, st.earth, st.dsnOk);
      quad.material = computeNow;
      renderer.setRenderTarget(rtNow); renderer.render(quadScene, quadCam); renderer.setRenderTarget(null);
      lastComputeMs = performance.now() - t0;
      st.nowDirty = false;
    }
    function avgKey() { return [st.region, st.samples.length, st.samples.length && st.samples[0].t, st.samples.length && st.samples[st.samples.length - 1].t,
      st.rules.sunFracMin, st.rules.earthMarginDeg].join('|'); }
    function stepAvg(budgetMs) {
      if (isMoon() || st.mode.indexOf('avg') !== 0 || !st.samples.length) return false;
      const key = avgKey();
      if (key !== st.avgKey) {
        st.avgKey = key; st.avgDone = 0;
        renderer.setRenderTarget(rtAvg); renderer.setClearColor(0x000000, 0); renderer.clear(true, false, false);
        renderer.setClearColor(0x000000, 1); renderer.setRenderTarget(null);
        terrainMat.uniforms.uAvgReady.value = 0;
      }
      if (st.avgDone >= st.samples.length) return false;
      const t0 = performance.now();
      quad.material = computeAcc;
      computeAcc.uniforms.uWeight.value = 1 / st.samples.length;
      const autoClear = renderer.autoClear; renderer.autoClear = false;
      renderer.setRenderTarget(rtAvg);
      while (st.avgDone < st.samples.length) {
        const smp = st.samples[st.avgDone++];
        setComputeUniforms(computeAcc, smp.sun, smp.earth, smp.dsnOk);
        renderer.render(quadScene, quadCam);
        if (performance.now() - t0 > budgetMs) break;
      }
      renderer.setRenderTarget(null); renderer.autoClear = autoClear;
      const done = st.avgDone >= st.samples.length;
      terrainMat.uniforms.uAvgReady.value = done ? 1 : 0;
      if (opts.onProgress) opts.onProgress(done ? null : st.avgDone / st.samples.length);
      return !done;
    }

    /* labels overlay */
    function drawLabels() {
      const w = labels.clientWidth, h = labels.clientHeight, dpr = renderer.getPixelRatio();
      if (labels.width !== Math.round(w * dpr) || labels.height !== Math.round(h * dpr)) { labels.width = Math.round(w * dpr); labels.height = Math.round(h * dpr); }
      lctx.setTransform(dpr, 0, 0, dpr, 0, 0); lctx.clearRect(0, 0, w, h);
      lctx.font = '600 12px "IBM Plex Sans", system-ui, sans-serif'; lctx.textBaseline = 'middle';
      const boxes = [];
      const place = (x, y, text, dot, bold) => {
        lctx.font = (bold ? '600 ' : '') + '12px "IBM Plex Sans", system-ui, sans-serif';
        const tw = lctx.measureText(text).width + (dot ? 16 : 8), th = 19;
        const tries = [[x + 8, y - th / 2], [x - 8 - tw, y - th / 2], [x - tw / 2, y - th - 6], [x - tw / 2, y + 6]];
        const b = tries.map(([bx, by]) => ({ x: bx, y: by, w: tw, h: th })).find(b => !boxes.some(o => b.x < o.x + o.w && b.x + b.w > o.x && b.y < o.y + o.h && b.y + b.h > o.y));
        if (!b || b.x < 0 || b.y < 0 || b.x + b.w > w || b.y + b.h > h) return;
        boxes.push(b);
        lctx.fillStyle = 'rgba(8,10,14,0.72)'; lctx.fillRect(b.x, b.y, b.w, b.h);
        if (dot) { lctx.fillStyle = dot; lctx.beginPath(); lctx.arc(b.x + 8, b.y + th / 2, 4, 0, 7); lctx.fill(); }
        lctx.fillStyle = '#f2f4f7'; lctx.fillText(text, b.x + (dot ? 15 : 4), b.y + th / 2 + 0.5);
      };
      const proj = p => { const v = p.clone().project(camera); return v.z < 1 && v.z > -1 ? [(v.x + 1) / 2 * w, (1 - v.y) / 2 * h] : null; };
      if (isMoon()) for (const z of st.zones) {
        const p3 = toScene(z.u.map(x => x * R * 1.0025), true);
        if (!facing(p3)) continue;
        const p = proj(p3); if (p) place(p[0], p[1], z.name, z.color, true);
      }
      // sky labels first
      for (const [obj, name] of [[sunSprite, opts.t('sunNow')], [earth, opts.t('earthNow')]]) {
        if (!obj.visible) continue;
        const p = proj(obj.position);
        if (p) { const off = obj === earth ? Math.max(10, earth.scale.x / SKY_DIST * h / (2 * Math.tan(camera.fov * D2R / 2))) : 14; place(p[0], p[1] - off - 8, name, null, true); }
      }
    }

    /* render loop on demand */
    let raf = 0;
    function invalidate() { if (!raf) raf = requestAnimationFrame(frame); }
    function frame(now) {
      raf = 0;
      let again = stepAnim(now);
      if (st.nowDirty) runNow();
      if (stepAvg(24)) again = true;
      applyCamera();
      renderer.render(scene, camera);
      drawLabels();
      if (again) invalidate();
    }

    function resize() {
      const w = stage.clientWidth, h = stage.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = w + 'px'; renderer.domElement.style.height = h + 'px';
      camera.aspect = w / h;
      invalidate();
    }

    /* pointer input */
    const el = renderer.domElement;
    let drag = null; const pointers = new Map();
    el.addEventListener('pointerdown', e => {
      el.setPointerCapture(e.pointerId); pointers.set(e.pointerId, [e.clientX, e.clientY]);
      drag = { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, button: e.button, shift: e.shiftKey, moved: false };
      st.anim = null; if (opts.onUserInput) opts.onUserInput();
    });
    el.addEventListener('pointermove', e => {
      if (!drag || !pointers.has(e.pointerId)) return;
      const prev = pointers.get(e.pointerId); pointers.set(e.pointerId, [e.clientX, e.clientY]);
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
        if (drag.pinch) zoom(drag.pinch / d);
        drag.pinch = d; drag.moved = true; return;
      }
      const dx = e.clientX - prev[0], dy = e.clientY - prev[1];
      if (Math.abs(e.clientX - drag.x0) + Math.abs(e.clientY - drag.y0) > 4) drag.moved = true;
      if (st.fp) {
        const k = ctl.fov * D2R / el.clientHeight;
        ctl.yaw -= dx * k; ctl.pitch = Math.max(-1.2, Math.min(1.4, ctl.pitch + dy * k));
      } else if (isMoon()) {
        const f = Math.max(0.25, Math.min(1, (ctl.radius - R) / (2.1 * R)));
        ctl.theta -= dx * 0.006 * f; ctl.phi = Math.max(0.12, Math.min(Math.PI - 0.12, ctl.phi + dy * 0.005 * f));
      } else if (drag.button === 2 || drag.shift) {
        const k = ctl.radius * 0.0016;
        const right = new THREE.Vector3(-Math.sin(ctl.theta), 0, Math.cos(ctl.theta));
        const fwd = new THREE.Vector3(-Math.cos(ctl.theta), 0, -Math.sin(ctl.theta));
        ctl.target.addScaledVector(right, -dx * k).addScaledVector(fwd, dy * k);
      } else {
        ctl.theta += dx * 0.006; ctl.phi = Math.max(0.05, Math.min(1.53, ctl.phi - dy * 0.005));
      }
      invalidate();
    });
    const endDrag = e => {
      pointers.delete(e.pointerId);
      if (drag && !drag.moved && e.type === 'pointerup' && pointers.size === 0) pick(e);
      if (pointers.size === 0) drag = null;
    };
    el.addEventListener('pointerup', endDrag); el.addEventListener('pointercancel', endDrag);
    el.addEventListener('contextmenu', e => e.preventDefault());
    function zoom(f) {
      if (st.fp) ctl.fov = Math.max(8, Math.min(90, ctl.fov * f));
      else if (isMoon()) ctl.radius = Math.max(R * 1.12, Math.min(R * 9, ctl.radius * f));
      else ctl.radius = Math.max(4, Math.min(4000, ctl.radius * f));
      invalidate();
    }
    el.addEventListener('wheel', e => { e.preventDefault(); zoom(Math.exp(e.deltaY * 0.0012)); if (opts.onUserInput) opts.onUserInput(); }, { passive: false });

    const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
    /* nearest site marker on screen (more forgiving than a ray against a small sphere) */
    function nearestSite(clientX, clientY, maxPx) {
      if (st.fp) return null;
      const r = el.getBoundingClientRect(), x = clientX - r.left, y = clientY - r.top;
      let best = null, bd = maxPx;
      for (const s of st.sites) {
        if (!inRegion(s)) continue;
        const pp = sitePos(s, isMoon() ? 70 : st.region === 'pole' ? 4 : 18);
        if (isMoon() && !facing(pp)) continue;
        const v = pp.clone().project(camera);
        if (v.z > 1 || v.z < -1) continue;
        const d = Math.hypot((v.x + 1) / 2 * r.width - x, (1 - v.y) / 2 * r.height - y);
        if (d < bd) { bd = d; best = s; }
      }
      return best;
    }
    let hoverId = null;
    function setHover(id) {
      hoverId = id; st.hover = id;
      markers.children.forEach(m => { if (m.userData.site) m.scale.setScalar((st.msc || 1) * (m.userData.site.id === id ? 1.6 : 1)); });
      if (!id && opts.onHover) opts.onHover(null);
      invalidate();
    }
    el.addEventListener('pointermove', e => {
      if (drag || !opts.onHover) return;
      const s = nearestSite(e.clientX, e.clientY, 24);
      let z = null;
      if (!s && isMoon()) { const hp = sphereHit(e.clientX, e.clientY); if (hp) { const ll = latLonOfScene(hp); z = zoneAtLatLon(ll[0], ll[1]); } }
      el.style.cursor = s || z ? 'pointer' : '';
      if ((s ? s.id : null) !== hoverId) setHover(s ? s.id : null);
      if (s) opts.onHover(s.id, e.clientX, e.clientY);
      if ((z ? z.id : null) !== st.hoverZone) { st.hoverZone = z ? z.id : null; paintZoneHover(); invalidate(); if (!z && !s && opts.onZoneHover) opts.onZoneHover(null); }
      if (z && opts.onZoneHover) opts.onZoneHover(z.id, e.clientX, e.clientY);
    });
    el.addEventListener('pointerleave', () => { if (hoverId) setHover(null); if (st.hoverZone) { st.hoverZone = null; paintZoneHover(); invalidate(); if (opts.onZoneHover) opts.onZoneHover(null); } });
    function pick(e) {
      const r = el.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const hm = ray.intersectObjects(markers.children.filter(m => m.userData.site), false)[0];
      if (hm && opts.onSite) { opts.onSite(hm.object.userData.site.id); return; }
      const ns = nearestSite(e.clientX, e.clientY, 24);
      if (ns && opts.onSite && !(drag && drag.button === 2)) { opts.onSite(ns.id); return; }
      let hp = null;
      if (isMoon()) hp = sphereHit(e.clientX, e.clientY);
      else { if (!st.mesh) return; const hit = ray.intersectObject(st.mesh, false)[0]; hp = hit && hit.point; }
      if (!hp) return;
      const [lat, lon] = latLonOfScene(hp);
      if (drag && drag.button === 2) { if (opts.onContext) opts.onContext(lat, lon, e.clientX, e.clientY); return; }
      if (isMoon() && opts.onZone) { const z = zoneAtLatLon(lat, lon); if (z) opts.onZone(z.id); }
    }

    /* presets */
    function regionRadius() { return isMoon() ? R : regionGrid().half_m / 1000; }
    function sunAzScene() { return Math.atan2(st.sun[1], st.sun[0]); } // angle in scene x/z plane
    const api = {
      renderer,
      setRegion(region) {
        if (region === st.region && (st.mesh || region === 'moon')) return;
        st.hoverZone = null;
        if (region === 'moon') {
          if (st.fp) { st.fp = null; st.exag = st.exagBeforeFp || 3; }
          st.region = 'moon'; ensureGlobe(); globe.visible = true; zoneGroup.visible = true; earth.visible = false;
          if (st.mesh) st.mesh.visible = false;
          ctl.target.copy(GLOBE_C); buildMarkers(); paintZoneHover();
          api.view('overview', null, 1); invalidate();
          return;
        }
        if (globe) { globe.visible = false; zoneGroup.visible = false; } earth.visible = true;
        st.region = region; buildMesh(); buildTargets(); buildMarkers(); st.nowDirty = true;
        if (!st.fp) api.view('overview', null, 1);
        invalidate();
      },
      setMode(mode) { st.mode = mode; terrainMat.uniforms.uMode.value = ['sun', 'plan', 'avgSun', 'avgEarth', 'avgOps'].indexOf(mode); invalidate(); },
      setQuality(q) { if (q === st.quality) return; st.quality = q; if (st.mesh) { buildMesh(); buildMarkers(); } invalidate(); },
      setExag(x) {
        if (st.fp) { st.exagBeforeFp = x; return; }
        if (x === st.exag) return;
        st.exag = x; buildMesh(); buildMarkers(); invalidate();
      },
      setRules(r) {
        st.rules = { sunFracMin: r.sunFracMin, earthMarginDeg: r.earthMarginDeg };
        terrainMat.uniforms.uSunFracMin.value = r.sunFracMin; terrainMat.uniforms.uEarthMargin.value = r.earthMarginDeg;
        invalidate();
      },
      setColors(c) {
        for (const k of ['cOps', 'cSun', 'cComm', 'cNone']) if (c[k]) terrainMat.uniforms[k].value.copy(hexToVec(c[k]));
        invalidate();
      },
      setFlat(on) {
        st.flat = !!on; terrainMat.uniforms.uFlat.value = on ? 1 : 0; globeMat.uniforms.uFlat.value = on ? 1 : 0; invalidate();
      },
      setZones(list) { st.zones = list; buildZones(); invalidate(); },
      focusZone(id, ms) {
        const z = st.zones.find(q => q.id === id); if (!z || !isMoon()) return;
        const p = toScene(z.u.map(x => x * R), true).sub(GLOBE_C).normalize();
        animateTo({ tx: GLOBE_C.x, ty: GLOBE_C.y, tz: GLOBE_C.z, radius: R * (1.35 + z.rad / 40), theta: Math.atan2(p.z, p.x), phi: Math.max(0.12, Math.min(Math.PI - 0.12, Math.acos(p.y))) }, ms || 1000);
      },
      setState(s) {
        st.sun = s.sun; st.earth = s.earth;
        { const q = toScene([s.sun[0], s.sun[1], s.sun[2]]).normalize(); globeMat.uniforms.uSunDir.value.copy(q); } st.earthIllum = s.earthIllum; st.dsnOk = s.dsnOk;
        terrainMat.uniforms.uDsnOk.value = s.dsnOk ? 1 : 0; terrainMat.uniforms.uEarthIllum.value = s.earthIllum;
        st.nowDirty = true; invalidate();
      },
      setSites(list, rebuild) { st.sites = list; if (rebuild !== false) buildMarkers(); invalidate(); },
      flyTo(site, ms) {
        if (st.fp || !site) return;
        if (isMoon()) {
          const q = sitePos(site, 0).sub(GLOBE_C).normalize();
          animateTo({ tx: GLOBE_C.x, ty: GLOBE_C.y, tz: GLOBE_C.z, radius: Math.min(ctl.radius, R * 2.3), theta: Math.atan2(q.z, q.x), phi: Math.max(0.12, Math.min(Math.PI - 0.12, Math.acos(q.y))) }, ms || 900);
          return;
        }
        const p = sitePos(site, 0);
        animateTo({ tx: p.x, ty: p.y, tz: p.z, radius: Math.min(ctl.radius, regionRadius() * 0.9), phi: 0.85 }, ms || 900);
      },
      inRegion: s => inRegion(s),
      region: () => st.region,
      mode: () => st.mode,
      setSamples(samples) { st.samples = samples; invalidate(); },
      view(name, site, ms) {
        if (isMoon()) {
          if (name === 'site' && site) { api.flyTo(site, ms); return; }
          const g = { tx: GLOBE_C.x, ty: GLOBE_C.y, tz: GLOBE_C.z, radius: R * 3.7, fov: 45 };
          if (name === 'sun') {
            const q = toScene([st.sun[0], st.sun[1], st.sun[2]]).normalize();
            animateTo(Object.assign(g, { theta: Math.atan2(q.z, q.x), phi: Math.max(0.12, Math.min(Math.PI - 0.12, Math.acos(q.y))) }), ms);
          } else animateTo(Object.assign(g, { theta: 0, phi: Math.PI / 2 - 0.72 }), ms);
          return;
        }
        if (name === 'site' && site) {
          const lat = site.lat * D2R, lon = site.lon * D2R;
          const U = toScene([Math.cos(lat) * Math.cos(lon), Math.cos(lat) * Math.sin(lon), Math.sin(lat)]).normalize();
          const E = toScene([-Math.sin(lon), Math.cos(lon), 0]).normalize();
          const N = toScene([-Math.sin(lat) * Math.cos(lon), -Math.sin(lat) * Math.sin(lon), Math.cos(lat)]).normalize();
          const wasFp = !!st.fp;
          st.fp = { site, U, E, N, pos: null };
          if (!wasFp || st.exag !== 1) { st.exagBeforeFp = wasFp ? st.exagBeforeFp : st.exag; st.exag = 1; buildMesh(); }
          st.fp.pos = sitePos(site, 0.03);
          buildMarkers();
          const sv = new THREE.Vector3(st.sun[0], st.sun[1], st.sun[2]).normalize();
          const sScene = toScene([sv.x, sv.y, sv.z]);
          const yaw = Math.atan2(sScene.dot(E), sScene.dot(N));
          if (!wasFp) { ctl.yaw = yaw; ctl.pitch = 0.05; ctl.fov = 55; }
          animateTo({ yaw, pitch: 0.05, fov: 55 }, ms == null ? 900 : ms);
          return;
        }
        if (st.fp) { st.fp = null; st.exag = st.exagBeforeFp || 3; buildMesh(); buildMarkers(); }
        const rad = regionRadius();
        if (name === 'sun') {
          animateTo({ tx: 0, ty: 0, tz: 0, radius: rad * 1.25, theta: sunAzScene() + Math.PI, phi: 1.32, fov: 45 }, ms);
        } else {
          animateTo({ tx: 0, ty: 0, tz: 0, radius: rad * 2.35, theta: Math.PI, phi: 0.62, fov: 45 }, ms);
        }
      },
      isFirstPerson: () => !!st.fp,
      /** Read back the GPU result at a point: { sunFrac, earthClearanceDeg } (used by the consistency test). */
      sampleNow(lat, lon) {
        if (st.nowDirty) runNow();
        const half = regionGrid().half_m / 1000, size = rtNow.width;
        const [x, y] = LunarTerrainXY(lat, lon).map(v => v / 1000);
        const px = Math.floor((x + half) / (2 * half) * size), py = Math.floor((half - y) / (2 * half) * size);
        const buf = new Uint8Array(4);
        renderer.readRenderTargetPixels(rtNow, px, py, 1, 1, buf);
        return { sunFrac: buf[0] / 255, earthClearanceDeg: buf[1] / 255 * 20 - 10 };
      },
      lastComputeMs: () => lastComputeMs,
      floatLinear, accumType,
      resize, invalidate,
      snapshot() { renderer.render(scene, camera); return renderer.domElement.toDataURL('image/png'); },
      dispose() { cancelAnimationFrame(raf); renderer.dispose(); }
    };
    st.region = '';
    api.setRegion('pole');
    api.view('overview', null, 1);
    new ResizeObserver(resize).observe(stage);
    resize();
    return api;
  }

  return { create, available: () => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; } } };
});
