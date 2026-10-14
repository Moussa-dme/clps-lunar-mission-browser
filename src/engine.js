/*
 * CLPS Lunar Mission Browser — computation engine
 * ------------------------------------------------
 * Sun and Earth positions as seen from a point on the lunar surface.
 *
 * Ephemerides: Astronomy Engine (Don Cross, MIT licence)
 *   - Geocentric Moon: truncated ELP/MPP02-class series (~1 arcmin)
 *   - Geocentric Sun:  VSOP87 (~1 arcsec)
 *   - Lunar orientation: IAU WGCCRE rotation model of the Moon
 *     (pole RA/Dec + prime meridian W with libration terms). This frame is
 *     within a few hundred metres of the Mean-Earth/Polar-Axis (ME) frame
 *     used by LOLA/LROC coordinates, i.e. far below 0.01 deg at the surface.
 *
 * All vectors are in km. Angles exposed to callers are in degrees.
 * The engine is pure: no DOM access, runs the same in Node and the browser.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory;
  else root.LunarEngine = factory(root.Astronomy);
})(typeof self !== 'undefined' ? self : this, function (A) {
  'use strict';

  const D2R = Math.PI / 180, R2D = 180 / Math.PI;
  const MOON_R = 1737.4;            // km, IAU mean radius (LOLA reference sphere)
  const AU_KM = 149597870.7;
  const SUN_R = 695700;             // km, IAU nominal
  const EARTH_R = 6371.0;           // km, mean

  // Deep Space Network complexes (approximate antenna-site coordinates)
  const DSN = [
    { id: 'GDS', name: 'Goldstone', lat: 35.4267, lon: -116.8900, h: 1000 },
    { id: 'MDS', name: 'Madrid',    lat: 40.4314, lon: -4.2481,   h: 800 },
    { id: 'CDS', name: 'Canberra',  lat: -35.4014, lon: 148.9817, h: 690 }
  ];

  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const norm = a => Math.hypot(a[0], a[1], a[2]);
  const scale = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];

  /** Rows of the EQJ -> Moon body-fixed rotation (IAU model). */
  function moonFixedAxes(t) {
    const ax = A.RotationAxis(A.Body.Moon, t);
    const z = [ax.north.x, ax.north.y, ax.north.z];
    const a0 = ax.ra * 15 * D2R;
    // Ascending node of the body equator on the ICRF equator: RA = a0 + 90 deg
    const Q = [-Math.sin(a0), Math.cos(a0), 0];
    const W = (ax.spin % 360) * D2R;
    const zq = cross(z, Q);
    const x = add(scale(Q, Math.cos(W)), scale(zq, Math.sin(W)));
    const y = cross(z, x);
    return [x, y, z];
  }

  const toFixed = (M, v) => [dot(M[0], v), dot(M[1], v), dot(M[2], v)];

  /**
   * Site-independent state at one instant.
   * Returns Earth and Sun position vectors relative to the Moon's centre,
   * expressed in the Moon body-fixed frame (km), plus Earth phase and
   * DSN station elevations of the Moon.
   */
  function stateAt(date, opts) {
    opts = opts || {};
    const t = A.MakeTime(date);
    const gm = A.GeoMoon(t);                      // AU, EQJ, geocentric Moon
    const gs = A.GeoVector(A.Body.Sun, t, false); // AU, EQJ, geocentric Sun
    const moon = [gm.x * AU_KM, gm.y * AU_KM, gm.z * AU_KM];
    const sun = [gs.x * AU_KM, gs.y * AU_KM, gs.z * AU_KM];
    const M = moonFixedAxes(t);
    const earthBF = toFixed(M, scale(moon, -1));
    const sunBF = toFixed(M, sub(sun, moon));
    // Earth phase seen from the Moon: angle at Earth between Sun and Moon
    const cosPhase = dot(sun, moon) / (norm(sun) * norm(moon));
    const earthIllum = (1 + cosPhase) / 2;
    let dsn = null;
    if (opts.dsn) {
      dsn = DSN.map(st => {
        const obs = new A.Observer(st.lat, st.lon, st.h);
        const eq = A.Equator(A.Body.Moon, t, obs, true, true);
        return A.Horizon(t, obs, eq.ra, eq.dec, null).altitude;
      });
    }
    return { earthBF, sunBF, earthIllum, dsn };
  }

  /** Local frame of a surface site: unit up/east/north in body-fixed frame. */
  function siteFrame(latDeg, lonDeg, heightKm) {
    const la = latDeg * D2R, lo = lonDeg * D2R;
    const up = [Math.cos(la) * Math.cos(lo), Math.cos(la) * Math.sin(lo), Math.sin(la)];
    const east = [-Math.sin(lo), Math.cos(lo), 0];
    const north = [-Math.sin(la) * Math.cos(lo), -Math.sin(la) * Math.sin(lo), Math.cos(la)];
    const r = MOON_R + (heightKm || 0);
    return { up, east, north, pos: scale(up, r), r };
  }

  /** Elevation/azimuth (deg) and distance (km) of a body vector seen from a site. */
  function topo(frame, bodyBF) {
    const v = sub(bodyBF, frame.pos);
    const d = norm(v);
    const el = Math.asin(Math.max(-1, Math.min(1, dot(v, frame.up) / d))) * R2D;
    let az = Math.atan2(dot(v, frame.east), dot(v, frame.north)) * R2D;
    if (az < 0) az += 360;
    return { el, az, d };
  }

  /** Fraction of a disk of angular radius r above a straight horizon at signed distance h (deg). */
  function diskFraction(h, r) {
    if (h >= r) return 1;
    if (h <= -r) return 0;
    const x = h / r;
    return 1 - (Math.acos(x) - x * Math.sqrt(1 - x * x)) / Math.PI;
  }

  /** Geometric horizon dip (deg, negative) for an observer h km above a smooth sphere. */
  function horizonDip(hKm) {
    if (!hKm || hKm <= 0) return 0;
    return -Math.acos(MOON_R / (MOON_R + hKm)) * R2D;
  }

  /**
   * Horizon model for a site.
   * mask: optional array of 360 elevations (deg) at az = 0..359 (1-deg bins),
   *       e.g. from a LOLA DEM ray-cast (see tools/horizon_from_dem.py).
   * When no mask is given, the horizon is a smooth sphere seen from
   * `reliefKm` above the surrounding terrain (0 = flat local horizon).
   */
  function makeHorizon(site) {
    if (site.mask && site.mask.length === 360) {
      const m = site.mask;
      return az => {
        const a = ((az % 360) + 360) % 360;
        const i = Math.floor(a), f = a - i;
        return m[i] * (1 - f) + m[(i + 1) % 360] * f;
      };
    }
    const dip = horizonDip(site.reliefKm || 0);
    return () => dip;
  }

  /**
   * Build the shared time grid. Computes the site-independent state once per
   * step; per-site work is then a few dot products.
   * onProgress(fraction) is called periodically if provided.
   */
  function buildGrid(startMs, endMs, stepMin, opts) {
    opts = opts || {};
    const stepMs = stepMin * 60000;
    const n = Math.max(2, Math.floor((endMs - startMs) / stepMs) + 1);
    const g = {
      start: startMs, stepMs, n,
      earth: new Float64Array(n * 3),
      sun: new Float64Array(n * 3),
      earthIllum: new Float32Array(n),
      dsn: opts.dsn ? new Float32Array(n * DSN.length) : null
    };
    for (let i = 0; i < n; i++) {
      const s = stateAt(new Date(startMs + i * stepMs), opts);
      g.earth.set(s.earthBF, i * 3);
      g.sun.set(s.sunBF, i * 3);
      g.earthIllum[i] = s.earthIllum;
      if (g.dsn) g.dsn.set(s.dsn, i * DSN.length);
      if (opts.onProgress && (i & 255) === 0) opts.onProgress(i / n);
    }
    return g;
  }

  /**
   * Per-site series on a grid.
   * cfg: { sunFracMin (0..1), earthMarginDeg, dsnMinDeg, requireDSN }
   */
  function siteSeries(grid, site, cfg) {
    const n = grid.n;
    const frame = siteFrame(site.lat, site.lon, (site.heightM || 0) / 1000);
    const hz = makeHorizon(site);
    const out = {
      sunEl: new Float32Array(n), sunAz: new Float32Array(n), sunFrac: new Float32Array(n),
      earthEl: new Float32Array(n), earthAz: new Float32Array(n),
      sunHz: new Float32Array(n), earthHz: new Float32Array(n),
      lit: new Uint8Array(n), earthUp: new Uint8Array(n), dte: new Uint8Array(n), ops: new Uint8Array(n)
    };
    const nd = DSN.length;
    for (let i = 0; i < n; i++) {
      const s = topo(frame, [grid.sun[i * 3], grid.sun[i * 3 + 1], grid.sun[i * 3 + 2]]);
      const e = topo(frame, [grid.earth[i * 3], grid.earth[i * 3 + 1], grid.earth[i * 3 + 2]]);
      const sh = hz(s.az), eh = hz(e.az);
      const rSun = Math.asin(SUN_R / s.d) * R2D;
      const frac = diskFraction(s.el - sh, rSun);
      out.sunEl[i] = s.el; out.sunAz[i] = s.az; out.sunFrac[i] = frac; out.sunHz[i] = sh;
      out.earthEl[i] = e.el; out.earthAz[i] = e.az; out.earthHz[i] = eh;
      const lit = frac >= cfg.sunFracMin && frac > 0;
      const eUp = e.el - eh >= cfg.earthMarginDeg;
      let dsnOk = true;
      if (cfg.requireDSN && grid.dsn) {
        dsnOk = false;
        for (let k = 0; k < nd; k++) if (grid.dsn[i * nd + k] >= cfg.dsnMinDeg) { dsnOk = true; break; }
      }
      out.lit[i] = lit ? 1 : 0;
      out.earthUp[i] = eUp ? 1 : 0;
      out.dte[i] = eUp && dsnOk ? 1 : 0;
      out.ops[i] = lit && eUp && dsnOk ? 1 : 0;
    }
    return out;
  }

  /** Longest run of zeros/ones in a Uint8Array slice, in samples. */
  function longestRun(arr, value, i0, i1) {
    let best = 0, cur = 0;
    for (let i = i0; i < i1; i++) {
      if (arr[i] === value) { cur++; if (cur > best) best = cur; } else cur = 0;
    }
    return best;
  }

  /** Contiguous windows where arr === 1, as [startIndex, endIndexExclusive]. */
  function windows(arr, i0, i1) {
    const w = [];
    let s = -1;
    for (let i = i0; i < i1; i++) {
      if (arr[i] && s < 0) s = i;
      if (!arr[i] && s >= 0) { w.push([s, i]); s = -1; }
    }
    if (s >= 0) w.push([s, i1]);
    return w;
  }

  /** Summary metrics for indices [i0, i1). */
  function summarize(series, grid, i0, i1) {
    i0 = i0 || 0; i1 = i1 == null ? grid.n : i1;
    const n = i1 - i0, h = grid.stepMs / 3600000;
    let lit = 0, eu = 0, dte = 0, ops = 0, energy = 0;
    let sunMax = -90, sunMin = 90, eMax = -90, eMin = 90;
    for (let i = i0; i < i1; i++) {
      lit += series.lit[i]; eu += series.earthUp[i]; dte += series.dte[i]; ops += series.ops[i];
      energy += series.sunFrac[i];
      const se = series.sunEl[i], ee = series.earthEl[i];
      if (se > sunMax) sunMax = se; if (se < sunMin) sunMin = se;
      if (ee > eMax) eMax = ee; if (ee < eMin) eMin = ee;
    }
    return {
      litPct: 100 * lit / n, earthPct: 100 * eu / n, dtePct: 100 * dte / n, opsPct: 100 * ops / n,
      energyPct: 100 * energy / n,
      longestNightH: longestRun(series.lit, 0, i0, i1) * h,
      longestBlackoutH: longestRun(series.dte, 0, i0, i1) * h,
      longestOpsH: longestRun(series.ops, 1, i0, i1) * h,
      litWindows: windows(series.lit, i0, i1).length,
      sunMax, sunMin, earthMax: eMax, earthMin: eMin
    };
  }

  /** Parse a horizon mask CSV ("az,elev" per line, any az spacing). Returns 360 values. */
  function parseMask(text) {
    const pts = [];
    text.split(/\r?\n/).forEach(line => {
      const m = line.trim().split(/[,;\t ]+/);
      if (m.length < 2) return;
      const az = parseFloat(m[0]), el = parseFloat(m[1]);
      if (isFinite(az) && isFinite(el)) pts.push([((az % 360) + 360) % 360, el]);
    });
    if (pts.length < 4) throw new Error('Need at least 4 "azimuth,elevation" rows');
    pts.sort((a, b) => a[0] - b[0]);
    const out = new Array(360);
    for (let a = 0; a < 360; a++) {
      let j = pts.findIndex(p => p[0] >= a);
      let p0, p1;
      if (j === -1) { p0 = pts[pts.length - 1]; p1 = [pts[0][0] + 360, pts[0][1]]; }
      else if (j === 0) { p0 = [pts[pts.length - 1][0] - 360, pts[pts.length - 1][1]]; p1 = pts[0]; }
      else { p0 = pts[j - 1]; p1 = pts[j]; }
      const span = p1[0] - p0[0];
      const aa = a < p0[0] ? a + 360 : a;
      out[a] = span === 0 ? p0[1] : p0[1] + (p1[1] - p0[1]) * (aa - p0[0]) / span;
    }
    return out;
  }

  return {
    MOON_R, AU_KM, SUN_R, EARTH_R, DSN,
    stateAt, siteFrame, topo, diskFraction, horizonDip, makeHorizon,
    buildGrid, siteSeries, summarize, windows, longestRun, parseMask, moonFixedAxes
  };
});
