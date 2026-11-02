#!/usr/bin/env node
/*
 * CLPS Lunar Mission Browser — REST API + web app server
 * -------------------------------------------------------
 *   node server/server.js            (PORT env, default 8080)
 *
 *   GET /                     web app (dist/index.html)
 *   GET /openapi.yaml         API description (OpenAPI 3.0)
 *   GET /api/health
 *   GET /api/sites
 *   GET /api/horizon          ?site= | ?lat=&lon=            [&format=csv]
 *   GET /api/summary          ?site=...&start=&days=
 *   GET /api/compare          ?sites=a,b,c&start=&days=
 *   GET /api/windows          ?site=...&kind=power_and_link   [&format=csv|ics]
 *   GET /api/timeseries       ?site=...                      [&format=csv]
 *   GET /api/landing-dates    ?site=...&mission_days=10
 *
 * No dependencies beyond astronomy-engine. CORS is open so any web app can call it.
 */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { ops, toCSV, VERSION } = require('./core.js');

const ROOT = path.join(__dirname, '..');
const ROUTES = {
  '/api/health': q => ops.health(q),
  '/api/sites': q => ops.sites(q),
  '/api/horizon': q => ops.horizon(q),
  '/api/summary': q => ops.summary(q),
  '/api/compare': q => ops.compare(q),
  '/api/windows': q => ops.windows(q),
  '/api/timeseries': q => ops.timeseries(q),
  '/api/landing-dates': q => ops.landingDates(q)
};

function send(res, status, body, type, extra) {
  res.writeHead(status, Object.assign({
    'Content-Type': type || 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store',
    'X-CLPS-Version': VERSION
  }, extra || {}));
  res.end(body);
}

function handle(req, res) {
  const url = new URL(req.url, 'http://localhost');
  if (req.method === 'OPTIONS') return send(res, 204, '', 'text/plain', { 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': '*' });
  if (req.method !== 'GET') return send(res, 405, JSON.stringify({ error: 'only GET is supported' }));

  if (url.pathname === '/' || url.pathname === '/index.html') {
    const f = path.join(ROOT, 'dist/index.html');
    if (!fs.existsSync(f)) return send(res, 503, JSON.stringify({ error: 'web app not built: run npm run build' }));
    return send(res, 200, fs.readFileSync(f), 'text/html; charset=utf-8', { 'Cache-Control': 'public, max-age=300' });
  }
  if (url.pathname === '/openapi.yaml') return send(res, 200, fs.readFileSync(path.join(ROOT, 'openapi.yaml')), 'application/yaml; charset=utf-8');

  const route = ROUTES[url.pathname];
  if (!route) return send(res, 404, JSON.stringify({ error: `no route ${url.pathname}. See /openapi.yaml` }));
  const q = Object.fromEntries(url.searchParams);
  const t0 = Date.now();
  try {
    const out = route(q);
    const fmt = (q.format || 'json').toLowerCase();
    const timing = { 'Server-Timing': `compute;dur=${Date.now() - t0}` };
    if (fmt === 'ics') {
      if (!out._ics) return send(res, 400, JSON.stringify({ error: 'format=ics is available on /api/windows' }));
      return send(res, 200, out._ics(), 'text/calendar; charset=utf-8', Object.assign({ 'Content-Disposition': 'attachment; filename="lunar-windows.ics"' }, timing));
    }
    if (fmt === 'csv') {
      const rows = out.windows || out.rows || (out.mask_deg && out.mask_deg.map((e, a) => ({ azimuth_deg: a, elevation_deg: e })))
        || (out.sites && out.sites.map(x => Object.assign({ id: x.site.id, name: x.site.name }, x.summary)))
        || (out.best && out.best.map(b => Object.assign({ touchdown: b.touchdown, score_pct: b.score_pct }, b.mission_summary)));
      if (!rows) return send(res, 400, JSON.stringify({ error: 'format=csv is not available on this route' }));
      return send(res, 200, toCSV(rows), 'text/csv; charset=utf-8', timing);
    }
    if (fmt !== 'json') return send(res, 400, JSON.stringify({ error: 'format must be json, csv or ics' }));
    delete out._ics;
    return send(res, 200, JSON.stringify(out), null, timing);
  } catch (err) {
    const status = err.status || 500;
    if (status === 500) console.error(err);
    return send(res, status, JSON.stringify({ error: status === 500 ? 'internal error' : err.message }));
  }
}

function createServer() { return http.createServer(handle); }

if (require.main === module) {
  const port = +process.env.PORT || 8080;
  createServer().listen(port, () => console.log(`CLPS Lunar Mission Browser ${VERSION} on http://localhost:${port}  (API: /api/health, spec: /openapi.yaml)`));
}
module.exports = { createServer };
