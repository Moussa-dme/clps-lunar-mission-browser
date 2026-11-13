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
    uniform vec3 uHsDir; uniform float uEarthIllum; uniform float uAvgReady;
    varying vec2 vUv; varying vec3 vN;
    vec3 ramp(vec3 hue, float v) {
      vec3 c = mix(vec3(0.11, 0.115, 0.13), hue, smoothstep(0.0, 0.85, v));
      return mix(c, vec3(1.0), smoothstep(0.85, 1.0, v) * 0.55);
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
      vec4 I = texture2D(uIllum, vUv);
      float frac = I.r; float clr = I.g * 20.0 - 10.0; float lam = I.b * I.b;
      vec3 col;
      if (uMode == 0) {
        float rad = 4.5 * lam;
        col = vec3(1.0 - exp(-rad * 2.2)) * vec3(1.0, 0.985, 0.95);
        float earthshine = (clr > 0.0 ? 1.0 : 0.0) * uEarthIllum * 0.02;
        col += (0.03 + earthshine) * (0.35 + 0.65 * hs) * vec3(0.55, 0.62, 0.78);
      } else if (uMode == 1) {
        bool lit = frac >= uSunFracMin && frac > 0.0;
        bool dte = clr >= uEarthMargin && uDsnOk > 0.5;
        vec3 s = lit && dte ? cOps : lit ? cSun : dte ? cComm : cNone;
        col = s * (0.42 + 0.58 * hs);
      } else {
        vec4 A = texture2D(uAvg, vUv);
        float v = uMode == 2 ? A.r : uMode == 3 ? A.g : A.b;
        vec3 hue = uMode == 2 ? cSun : uMode == 3 ? cComm : cOps;
        col = thermal(pow(clamp(v / 0.7, 0.0, 1.0), 0.7)) * (0.62 + 0.38 * hs);
        if (uAvgReady < 0.5) col *= 0.6;
      }
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
        uHsDir: { value: new THREE.Vector3(-0.5, 0.75, -0.4).normalize() }, uEarthIllum: { value: 0.5 }, uAvgReady: { value: 0 }
      },
      vertexShader: TERRAIN_VS, fragmentShader: TERRAIN_FS
    });

    /* state */
    const st = {
      region: 'pole', mode: 'sun', exag: 3, sun: [1, 0, 0], earth: [-384000, 0, 0], earthIllum: 0.5, dsnOk: true,
      rules: { sunFracMin: 0.5, earthMarginDeg: 0 }, sites: [], samples: [], avgDone: 0, avgKey: '',
      grid: null, mesh: null, fp: null, cam: null, anim: null, skyScale: 4
    };

    function regionGrid() { return st.region === 'pole' ? terrain.fine : terrain.coarse; }

    /* terrain mesh */
    function buildMesh() {
      const G = regionGrid(), step = st.region === 'pole' ? 1 : 2;
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
      const h = (s.heightM || terrain.height(s.lat, s.lon) || 0) * (st.fp ? 1 : st.exag) / 1000 + (extra || 0);
      const u = [Math.cos(lat) * Math.cos(lon), Math.cos(lat) * Math.sin(lon), Math.sin(lat)];
      return toScene(u.map(c => c * (R + h)), true);
    }
    function inRegion(s) {
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
      while (markers.children.length) { const c = markers.children.pop(); c.geometry.dispose(); c.material.dispose(); }
      const pinH = st.region === 'pole' ? 2.2 : 9, headR = st.region === 'pole' ? 0.35 : 1.6;
      for (const s of st.sites) {
        if (!inRegion(s)) continue;
        const base = sitePos(s, 0), top = sitePos(s, pinH);
        const col = new THREE.Color(s.color);
        const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([base, top]), new THREE.LineBasicMaterial({ color: col }));
        const head = new THREE.Mesh(new THREE.SphereGeometry(headR * (s.focus ? 1.4 : 1), 16, 12), new THREE.MeshBasicMaterial({ color: col }));
        head.position.copy(top); head.userData.site = s;
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
        camera.lookAt(f.pos.clone().add(dir));
      } else {
        const sp = Math.sin(ctl.phi);
        camera.up.set(0, 1, 0);
        camera.position.set(ctl.target.x + ctl.radius * sp * Math.cos(ctl.theta), ctl.target.y + ctl.radius * Math.cos(ctl.phi),
          ctl.target.z + ctl.radius * sp * Math.sin(ctl.theta));
        camera.lookAt(ctl.target);
      }
      camera.fov = ctl.fov; camera.updateProjectionMatrix();
      sky.position.copy(camera.position);
      markers.visible = !st.fp;
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
      if (st.mode.indexOf('avg') !== 0 || !st.samples.length) return false;
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
      // sky labels first
      for (const [obj, name] of [[sunSprite, opts.t('sunNow')], [earth, opts.t('earthNow')]]) {
        const p = proj(obj.position);
        if (p) { const off = obj === earth ? Math.max(10, earth.scale.x / SKY_DIST * h / (2 * Math.tan(camera.fov * D2R / 2))) : 14; place(p[0], p[1] - off - 8, name, null, true); }
      }
      const sorted = st.sites.filter(inRegion).sort((a, b) => (b.focus - a.focus) || (b.selected - a.selected));
      for (const s of sorted) {
        if (st.fp && st.fp.site.id === s.id) continue;
        if (!s.selected && !s.focus && !s.label) continue;
        const p = proj(sitePos(s, st.region === 'pole' ? 2.2 : 9)); if (!p) continue;
        place(p[0], p[1], s.name, s.stateColor || null, s.focus);
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
        const v = sitePos(s, st.region === 'pole' ? 2.2 : 9).clone().project(camera);
        if (v.z > 1 || v.z < -1) continue;
        const d = Math.hypot((v.x + 1) / 2 * r.width - x, (1 - v.y) / 2 * r.height - y);
        if (d < bd) { bd = d; best = s; }
      }
      return best;
    }
    let hoverId = null;
    el.addEventListener('pointermove', e => {
      if (drag || !opts.onHover) return;
      const s = nearestSite(e.clientX, e.clientY, 16);
      el.style.cursor = s ? 'pointer' : '';
      if ((s ? s.id : null) !== hoverId || s) { hoverId = s ? s.id : null; opts.onHover(hoverId, e.clientX, e.clientY); }
    });
    el.addEventListener('pointerleave', () => { if (hoverId && opts.onHover) { hoverId = null; opts.onHover(null); } });
    function pick(e) {
      const r = el.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const hm = ray.intersectObjects(markers.children.filter(m => m.userData.site), false)[0];
      if (hm && opts.onSite) { opts.onSite(hm.object.userData.site.id); return; }
      const ns = nearestSite(e.clientX, e.clientY, 18);
      if (ns && opts.onSite) { opts.onSite(ns.id); return; }
      if (!st.mesh) return;
      const hit = ray.intersectObject(st.mesh, false)[0];
      if (!hit) return;
      const b = fromScene(hit.point);
      const lat = Math.asin(b[2] / Math.hypot(b[0], b[1], b[2])) / D2R, lon = Math.atan2(b[1], b[0]) / D2R;
      if (opts.onPick) opts.onPick(lat, lon);
    }

    /* presets */
    function regionRadius() { return regionGrid().half_m / 1000; }
    function sunAzScene() { return Math.atan2(st.sun[1], st.sun[0]); } // angle in scene x/z plane
    const api = {
      renderer,
      setRegion(region) {
        if (region === st.region && st.mesh) return;
        st.region = region; buildMesh(); buildTargets(); buildMarkers(); st.nowDirty = true;
        if (!st.fp) api.view('overview', null, 1);
        invalidate();
      },
      setMode(mode) { st.mode = mode; terrainMat.uniforms.uMode.value = ['sun', 'plan', 'avgSun', 'avgEarth', 'avgOps'].indexOf(mode); invalidate(); },
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
      setState(s) {
        st.sun = s.sun; st.earth = s.earth; st.earthIllum = s.earthIllum; st.dsnOk = s.dsnOk;
        terrainMat.uniforms.uDsnOk.value = s.dsnOk ? 1 : 0; terrainMat.uniforms.uEarthIllum.value = s.earthIllum;
        st.nowDirty = true; invalidate();
      },
      setSites(list, rebuild) { st.sites = list; if (rebuild !== false) buildMarkers(); invalidate(); },
      inRegion: s => inRegion(s),
      region: () => st.region,
      mode: () => st.mode,
      setSamples(samples) { st.samples = samples; invalidate(); },
      view(name, site, ms) {
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
