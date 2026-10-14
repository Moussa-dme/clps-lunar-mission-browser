// Validation of the engine against independent references. Run: node tests/engine.test.js
const A = require('astronomy-engine');
const E = require('../src/engine.js')(A);
let fails = 0;
const ok = (cond, msg) => { console.log((cond ? 'PASS ' : 'FAIL ') + msg); if (!cond) fails++; };
const D2R = Math.PI/180, R2D = 180/Math.PI;

// 1. Earth direction: IAU-rotation pipeline vs. Meeus physical libration (independent code path)
let worst = 0;
for (let k = 0; k < 400; k++) {
  const d = new Date(Date.UTC(2025,0,1) + k * 0.913 * 86400000);
  const s = E.stateAt(d);
  const lib = A.Libration(A.MakeTime(d));
  const r = Math.hypot(...s.earthBF);
  const lat = Math.asin(s.earthBF[2]/r)*R2D, lon = Math.atan2(s.earthBF[1], s.earthBF[0])*R2D;
  let dl = ((lon - lib.elon + 540) % 360) - 180;
  const sep = Math.hypot(lat - lib.elat, dl*Math.cos(lat*D2R));
  worst = Math.max(worst, sep);
}
ok(worst < 0.1, `sub-Earth point agrees with Meeus libration over 1 yr (worst ${worst.toFixed(3)} deg)`);

// 2. Sub-solar latitude never exceeds lunar equator obliquity to ecliptic (1.54 deg) + margin
let maxSS = 0;
for (let k = 0; k < 2000; k++) {
  const s = E.stateAt(new Date(Date.UTC(2026,0,1) + k*0.5*86400000));
  const r = Math.hypot(...s.sunBF); maxSS = Math.max(maxSS, Math.abs(Math.asin(s.sunBF[2]/r)*R2D));
}
ok(maxSS > 1.5 && maxSS < 1.65, `max |sub-solar latitude| = ${maxSS.toFixed(3)} deg (lunar equator tilt 1.54 + physical libration)`);

// 3. Earth libration in latitude reaches ~6.7 deg
let maxEL = 0;
for (let k = 0; k < 1000; k++) {
  const s = E.stateAt(new Date(Date.UTC(2026,0,1) + k*0.37*86400000));
  const r = Math.hypot(...s.earthBF); maxEL = Math.max(maxEL, Math.abs(Math.asin(s.earthBF[2]/r)*R2D));
}
ok(maxEL > 6.4 && maxEL < 6.9, `max |sub-Earth latitude| = ${maxEL.toFixed(2)} deg (libration in latitude, max ~6.85)`);

// helper: next sunset after a date at a site (flat horizon)
function sunEvents(site, startISO, days) {
  const st = Date.parse(startISO), g = E.buildGrid(st, st + days*86400000, 10);
  const s = E.siteSeries(g, site, {sunFracMin: 0.5, earthMarginDeg: 0, dsnMinDeg: 10, requireDSN: false});
  const ev = [];
  for (let i = 1; i < g.n; i++) if (s.lit[i] !== s.lit[i-1]) ev.push((s.lit[i] ? 'rise ' : 'set  ') + new Date(st + i*g.stepMs).toISOString().slice(0,16));
  return { g, s, ev };
}

// 4. Chandrayaan-3 (69.373S 32.319E) landed 2023-08-23 12:32 UTC shortly after local sunrise;
//    ISRO planned ~1 lunar day of ops, sunset around 2023-09-05/06.
let r = sunEvents({lat:-69.373, lon:32.319}, '2023-08-23T12:32:00Z', 16);
ok(r.s.sunEl[0] > 2 && r.s.sunEl[0] < 12, `Chandrayaan-3 landing Sun elevation ${r.s.sunEl[0].toFixed(1)} deg (low morning Sun)`);
const set = r.ev.find(e => e.startsWith('set'));
// ISRO put Vikram to sleep on 2023-09-04 ~02:30 UTC, ahead of local sunset.
ok(set && set > 'set  2023-09-04T02:30' && set < 'set  2023-09-06', `Chandrayaan-3 site sunset after Vikram sleep: ${set}`);

// 5. IM-1 Odysseus (80.13S 1.44E) landed 2024-02-22 23:23 UTC; operated ~6-7 days until lunar night.
r = sunEvents({lat:-80.13, lon:1.44}, '2024-02-22T23:23:00Z', 15);
const set1 = r.ev.find(e => e.startsWith('set'));
// Last contact with Odysseus was on 2024-02-29; the site was still in daylight then.
ok(set1 && set1 > 'set  2024-02-29' && set1 < 'set  2024-03-05', `IM-1 site sunset after last contact: ${set1} (flat horizon)`);
let eMin = 99; for (let i=0;i<r.g.n;i++) eMin = Math.min(eMin, r.s.earthEl[i]);
ok(eMin > 0, `Earth stays above horizon at IM-1 site (min ${eMin.toFixed(1)} deg)`);

// 6. Blue Ghost 1 (18.56N 61.81E) landed 2025-03-02 08:34 UTC near local sunrise, ops ~14 days.
r = sunEvents({lat:18.56, lon:61.81}, '2025-03-02T08:34:00Z', 16);
ok(r.s.sunEl[0] > 0 && r.s.sunEl[0] < 15, `Blue Ghost 1 landing Sun elevation ${r.s.sunEl[0].toFixed(1)} deg`);
const set2 = r.ev.find(e => e.startsWith('set'));
ok(set2 && set2 >= 'set  2025-03-15' && set2 <= 'set  2025-03-17', `Blue Ghost 1 sunset: ${set2} (mission ended 2025-03-16)`);

// 7. Horizon dip and disk fraction sanity
ok(Math.abs(E.horizonDip(2) + 2.75) < 0.05, `dip from 2 km relief = ${E.horizonDip(2).toFixed(2)} deg`);
ok(E.diskFraction(0, .27) === 0.5 && E.diskFraction(1, .27) === 1 && E.diskFraction(-1, .27) === 0, 'disk fraction limits');
const m = E.parseMask('0,1\n90,2\n180,3\n270,2'); ok(Math.abs(m[45]-1.5)<1e-9 && Math.abs(m[315]-1.5)<1e-9, 'mask interpolation incl. wrap');

// 8. Performance: one year hourly with DSN
let t0 = Date.now();
const g = E.buildGrid(Date.UTC(2027,0,1), Date.UTC(2028,0,1), 60, {dsn: true});
const t1 = Date.now();
for (let k=0;k<12;k++) E.siteSeries(g, {lat:-89.4, lon:-141.8}, {sunFracMin:.5, earthMarginDeg:0, dsnMinDeg:10, requireDSN:true});
console.log(`perf: grid ${g.n} steps in ${t1-t0} ms, 12 sites in ${Date.now()-t1} ms`);

// 9. Peaks of eternal light: Shackleton ridge points should be lit far more than a crater-free equatorial site
const S = (lat, lon, reliefKm) => E.summarize(E.siteSeries(g, {lat, lon, reliefKm}, {sunFracMin:.5, earthMarginDeg:0, dsnMinDeg:10, requireDSN:true}), g);
const flat = S(-89.44,-141.8,0), peak = S(-89.44,-141.8,1.5);
console.log('Point B flat:', flat.litPct.toFixed(1)+'% lit, night', flat.longestNightH.toFixed(0)+'h;  with 1.5 km relief:', peak.litPct.toFixed(1)+'%');
ok(peak.litPct > flat.litPct, 'relief increases illumination');

// 10. End-to-end check with LOLA terrain masks: annual illumination of the classic
//     high-illumination points vs. published values (Bussey et al. 2010, Icarus 208, lunar year 2020).
const H = require('../data/horizons.json'), SITES = require('../data/sites.json');
const g20 = E.buildGrid(Date.UTC(2020,0,1), Date.UTC(2021,0,1), 60);
const pub = {ptA: 81, ptB: 82, ptD: 86, ptC: 85, m1: 74};
for (const id of Object.keys(pub)) {
  const s = SITES.find(x => x.id === id), h = H[id], [lat, lon] = h.snapped || [s.lat, s.lon];
  const r = E.summarize(E.siteSeries(g20, {lat, lon, heightM: h.elev_m, mask: h.mask}, {sunFracMin:.5, earthMarginDeg:0, dsnMinDeg:10, requireDSN:false}), g20);
  ok(Math.abs(r.litPct - pub[id]) <= 10, `${s.name}: ${r.litPct.toFixed(1)}% sunlit vs published ${pub[id]}%`);
}
process.exit(fails ? 1 : 0);
