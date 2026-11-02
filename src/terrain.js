/*
 * CLPS Lunar Mission Browser — terrain module
 * --------------------------------------------
 * Compact LOLA south-polar DEM (polar stereographic grids) and terrain-horizon
 * ray casting. Pure JS: the same code runs in the browser, the REST API and the CLI.
 *
 * Grids (built by tools/make_assets.py from LOLA LDEM_60S_240M):
 *   fine   87.5-90 S, 240 m/px     coarse  75-90 S, 1 km/px
 * Heights are int16 metres above the 1737.4 km reference sphere.
 * Row 0 is +y (towards longitude 180), column 0 is -x (longitude 270).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.LunarTerrain = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const RM = 1737400;               // m
  const D2R = Math.PI / 180;

  /** South polar stereographic (true scale at the pole), metres. */
  function polarXY(lat, lon) {
    const r = 2 * RM * Math.tan(Math.PI / 4 + lat * D2R / 2);
    return [r * Math.sin(lon * D2R), r * Math.cos(lon * D2R)];
  }
  function polarLatLon(x, y) {
    const r = Math.hypot(x, y);
    return [2 * Math.atan(r / (2 * RM)) / D2R - 90, Math.atan2(x, y) / D2R];
  }

  function sampleGrid(G, x, y) {
    const c = (x + G.half_m) / G.px_m - 0.5, r = (G.half_m - y) / G.px_m - 0.5;
    const c0 = Math.floor(c), r0 = Math.floor(r);
    if (c0 < 0 || r0 < 0 || c0 >= G.n - 1 || r0 >= G.n - 1) return NaN;
    const fc = c - c0, fr = r - r0, n = G.n, h = G.h;
    const i = r0 * n + c0;
    return (h[i] * (1 - fc) + h[i + 1] * fc) * (1 - fr) + (h[i + n] * (1 - fc) + h[i + n + 1] * fc) * fr;
  }

  /**
   * Build a terrain object.
   * fine, coarse: Int16Array heights; meta: data/assets.json content.
   */
  function create(fine, coarse, meta) {
    const T = {
      fine: Object.assign({ h: fine }, meta.dem_fine),
      coarse: Object.assign({ h: coarse }, meta.dem_coarse),
      minLat: meta.dem_coarse.lat_edge
    };
    /** Height (m) at lat/lon, NaN outside the model. */
    T.height = function (lat, lon) {
      if (lat > T.minLat) return NaN;
      const [x, y] = polarXY(lat, lon);
      if (lat <= T.fine.lat_edge) { const v = sampleGrid(T.fine, x, y); if (isFinite(v)) return v; }
      return sampleGrid(T.coarse, x, y);
    };
    T.covers = lat => lat <= T.minLat;

    /** 360 horizon elevations (deg, 1 deg bins from north through east) and site height. */
    T.horizon = function (lat, lon, mastM) {
      mastM = mastM == null ? 2 : mastM;
      const h0 = T.height(lat, lon);
      if (!isFinite(h0)) throw new Error('Site is outside the terrain model (75-90 S).');
      const r0 = RM + h0 + mastM;
      const la1 = lat * D2R, lo1 = lon * D2R;
      const sl1 = Math.sin(la1), cl1 = Math.cos(la1);
      const dist = [];
      for (let d = 120; d < 600000; d += Math.max(120, d * 0.004)) dist.push(d);
      const ct = dist.map(d => Math.cos(d / RM)), st = dist.map(d => Math.sin(d / RM));
      const mask = new Array(360);
      for (let a = 0; a < 360; a++) {
        const az = a * D2R, ca = Math.cos(az), sa = Math.sin(az);
        let best = -90;
        for (let k = 0; k < dist.length; k++) {
          const s2 = sl1 * ct[k] + cl1 * st[k] * ca;
          const la2 = Math.asin(s2);
          const lo2 = lo1 + Math.atan2(sa * st[k] * cl1, ct[k] - sl1 * s2);
          const hh = T.height(la2 / D2R, lo2 / D2R);
          if (!isFinite(hh)) continue;
          const r1 = RM + hh;
          const el = Math.atan2(r1 * ct[k] - r0, r1 * st[k]) / D2R;
          if (el > best) best = el;
        }
        mask[a] = Math.round(best * 1000) / 1000;
      }
      return { heightM: Math.round(h0 * 10) / 10, mask };
    };

    /** Highest point within radiusM of lat/lon: [heightM, lat, lon]. */
    T.snapHigh = function (lat, lon, radiusM) {
      let best = [T.height(lat, lon), lat, lon];
      const step = 60;
      for (let d = step; d <= radiusM; d += step) {
        const th = d / RM, n = Math.max(12, Math.round(2 * Math.PI * d / step));
        const la1 = lat * D2R;
        for (let k = 0; k < n; k++) {
          const az = 2 * Math.PI * k / n;
          const s2 = Math.sin(la1) * Math.cos(th) + Math.cos(la1) * Math.sin(th) * Math.cos(az);
          const la2 = Math.asin(s2);
          const lo2 = lon * D2R + Math.atan2(Math.sin(az) * Math.sin(th) * Math.cos(la1), Math.cos(th) - Math.sin(la1) * s2);
          const h = T.height(la2 / D2R, lo2 / D2R);
          if (h > best[0]) best = [h, la2 / D2R, lo2 / D2R];
        }
      }
      return best;
    };
    return T;
  }

  /** Node only: load the compact DEM shipped in data/. */
  function loadNode(dataDir) {
    const fs = require('fs'), path = require('path'), zlib = require('zlib');
    const meta = JSON.parse(fs.readFileSync(path.join(dataDir, 'assets.json')));
    const rd = f => {
      const b = zlib.gunzipSync(fs.readFileSync(path.join(dataDir, f)));
      return new Int16Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
    };
    return create(rd('dem_fine.i16.gz'), rd('dem_coarse.i16.gz'), meta);
  }

  return { RM, polarXY, polarLatLon, sampleGrid, create, loadNode };
});
