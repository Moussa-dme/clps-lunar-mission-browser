#!/usr/bin/env node
/*
 * Assemble dist/index.html: one self-contained page (only the fonts and the
 * astronomy-engine library load from public CDNs).
 *
 *   node build.js
 *
 * Inputs: src/index.html, src/styles.css, src/engine.js, src/app.js,
 *         data/sites.json, data/horizons.json, data/assets.json,
 *         data/basemap.jpg, data/dem_fine.i16.gz, data/dem_coarse.i16.gz
 * The data files are produced by tools/horizon_from_dem.py and tools/make_assets.py.
 */
const fs = require('fs');
const path = require('path');
const A = require('astronomy-engine');
const E = require('./src/engine.js')(A);

const r = p => fs.readFileSync(path.join(__dirname, p));
const sites = JSON.parse(r('data/sites.json'));
const horizons = JSON.parse(r('data/horizons.json'));
const assets = JSON.parse(r('data/assets.json'));

// Validation figures shown on the Method tab (same computation as tests/engine.test.js)
const g = E.buildGrid(Date.UTC(2020, 0, 1), Date.UTC(2021, 0, 1), 60);
const pub = { ptA: 81, ptB: 82, ptD: 86, ptC: 85, m1: 74 };
const validation = Object.keys(pub).map(id => {
  const s = sites.find(x => x.id === id), h = horizons[id];
  const [lat, lon] = h.snapped || [s.lat, s.lon];
  const sum = E.summarize(E.siteSeries(g, { lat, lon, heightM: h.elev_m, mask: h.mask },
    { sunFracMin: 0.5, earthMarginDeg: 0, dsnMinDeg: 10, requireDSN: false }), g);
  return { name: s.name, pub: pub[id], ours: Math.round(sum.litPct * 10) / 10 };
});
const validationMean = validation.reduce((a, v) => a + Math.abs(v.ours - v.pub), 0) / validation.length;

const DATA = {
  sites: sites.map(({ snap_m, ...s }) => s),
  horizons, assets, validation, validationMean,
  basemap: 'data:image/jpeg;base64,' + r('data/basemap.jpg').toString('base64'),
  demFine: r('data/dem_fine.i16.gz').toString('base64'),
  demCoarse: r('data/dem_coarse.i16.gz').toString('base64')
};

let html = r('src/index.html').toString();
const put = (marker, text) => {
  if (!html.includes(marker)) throw new Error('missing ' + marker);
  html = html.split(marker).join(text.replace(/<\/script/gi, '<\\/script'));
};
put('/*__STYLE__*/', r('src/styles.css').toString());
put('/*__DATA__*/', JSON.stringify(DATA));
put('/*__ENGINE__*/', r('src/engine.js').toString());
put('/*__APP__*/', r('src/app.js').toString());

fs.mkdirSync(path.join(__dirname, 'dist'), { recursive: true });
// artifact.html: body fragment for hosts that supply the document skeleton (claude.ai artifacts)
// (no Download button there: the artifact viewer does not allow page-initiated downloads; Copy CSV remains)
fs.writeFileSync(path.join(__dirname, 'dist/artifact.html'),
  html.replace(/\s*<button class="btn ghost" id="dlCsv"[^>]*>[^<]*<\/button>/, ''));
// index.html: complete standalone page (GitHub Pages, any static host, or open from disk)
const standalone = '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n' +
  '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n' +
  '<style>[hidden]{display:none!important}body{margin:0}</style>\n</head>\n<body>\n' + html + '\n</body>\n</html>\n';
fs.writeFileSync(path.join(__dirname, 'dist/index.html'), standalone);
console.log(`dist/index.html ${(html.length / 1024 / 1024).toFixed(2)} MB; validation mean |diff| ${validationMean.toFixed(1)} pts`);
validation.forEach(v => console.log(`  ${v.name.padEnd(26)} published ${v.pub}%  computed ${v.ours}%`));
