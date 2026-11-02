// Cross-check against NASA JPL Horizons: Sun and Earth azimuth/elevation seen from
// 13 lunar sites (south pole, Apollo, far side) at 33 dates 2026-2028 and at each
// historical touchdown. Reference built by tools/fetch_horizons_reference.py.
// Run: node tests/horizons.test.js
const A = require('astronomy-engine');
const E = require('../src/engine.js')(A);
const REF = require('./horizons_reference.json');
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };

const stats = { sun: [], earth: [] }, azErr = { sun: [], earth: [] };
for (const r of REF.rows) {
  const s = E.stateAt(new Date(r.t));
  const f = E.siteFrame(r.lat, r.lon, r.alt_km);
  const tp = E.topo(f, r.body === 'sun' ? s.sunBF : s.earthBF);
  stats[r.body].push(Math.abs(tp.el - r.el));
  // azimuth error expressed as an angle on the sky (shrinks near the zenith)
  let da = ((tp.az - r.az + 540) % 360) - 180;
  azErr[r.body].push(Math.abs(da) * Math.cos(r.el * Math.PI / 180));
}
const q = (a, p) => a.slice().sort((x, y) => x - y)[Math.min(a.length - 1, Math.floor(p * a.length))];
for (const b of ['sun', 'earth']) {
  const n = stats[b].length;
  ok(q(stats[b], 1) < 0.05, `${b}: elevation vs JPL Horizons, ${n} points: median ${(q(stats[b], 0.5) * 60).toFixed(2)}', max ${(q(stats[b], 1) * 60).toFixed(2)}' (arcmin)`);
  ok(q(azErr[b], 1) < 0.05, `${b}: azimuth vs JPL Horizons: median ${(q(azErr[b], 0.5) * 60).toFixed(2)}', max ${(q(azErr[b], 1) * 60).toFixed(2)}'`);
}
process.exit(fails ? 1 : 0);
