// REST API tests: starts the server on a free port and checks every route.
// Run: node tests/api.test.js
const { createServer } = require('../server/server.js');
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };

(async () => {
  const srv = createServer();
  await new Promise(r => srv.listen(0, r));
  const base = `http://127.0.0.1:${srv.address().port}`;
  const get = async (p) => { const r = await fetch(base + p); return { status: r.status, type: r.headers.get('content-type'), text: await r.text(), headers: r.headers }; };
  const json = async (p) => { const r = await get(p); return Object.assign(r, { body: JSON.parse(r.text) }); };

  let r = await json('/api/health');
  ok(r.status === 200 && r.body.status === 'ok', 'health');
  ok(r.headers.get('access-control-allow-origin') === '*', 'CORS header present');

  r = await json('/api/sites');
  ok(r.body.sites.length >= 14 && r.body.sites.every(s => s.id && s.name && 'lat' in s && !('mask' in s)), `sites list (${r.body.sites.length})`);

  r = await json('/api/summary?site=ptB&start=2020-01-01&end=2021-01-01&step_min=60&dsn=false');
  ok(r.status === 200 && Math.abs(r.body.summary.sunlit_pct - 89.2) < 0.2, `summary ptB 2020 sunlit ${r.body.summary.sunlit_pct}% (engine test value 89.2%)`);

  r = await json('/api/compare?sites=ptB,pns,dg2,m1&start=2026-11-14&days=60');
  const v = r.body.sites.map(x => x.summary.power_and_link_pct);
  ok(r.status === 200 && v.every((x, i) => i === 0 || v[i - 1] >= x), 'compare sorted by power_and_link_pct');

  r = await json('/api/windows?site=pns&start=2026-11-14&days=30&kind=power_and_link');
  ok(r.status === 200 && r.body.count > 0 && r.body.windows.every(w => Date.parse(w.end) > Date.parse(w.start)), `windows (${r.body.count})`);

  r = await get('/api/windows?site=pns&start=2026-11-14&days=30&format=ics');
  ok(r.status === 200 && r.type.startsWith('text/calendar') && r.text.startsWith('BEGIN:VCALENDAR\r\n') && r.text.trim().endsWith('END:VCALENDAR')
    && r.text.split('\r\n').every(l => l.length <= 75), 'windows as iCalendar (CRLF, folded lines)');

  r = await get('/api/timeseries?site=im2&start=2026-11-14&days=2&format=csv');
  const lines = r.text.trim().split('\n');
  ok(r.status === 200 && lines[0].startsWith('t,sun_el,sun_az') && lines.length === 2 * 24 * 6 + 2, `timeseries CSV (${lines.length - 1} rows at 10 min)`);

  r = await json('/api/landing-dates?site=ptB&start=2026-11-14&days=60&mission_days=7&count=3');
  ok(r.status === 200 && r.body.best.length === 3 && r.body.best[0].score_pct >= r.body.best[2].score_pct, 'landing dates ranked');

  r = await json('/api/horizon?lat=-89.45&lon=-138&snap_m=300');
  ok(r.status === 200 && r.body.mask_deg.length === 360 && r.body.site.heightM > 1500, `custom horizon (height ${r.body.site.heightM} m)`);

  r = await json('/api/summary?lat=18.56&lon=61.81&start=2025-03-02T08:34:00Z&days=15');
  ok(r.status === 200 && r.body.site.horizon.startsWith('smooth'), 'site outside polar terrain falls back to a smooth horizon');

  r = await json('/api/summary?site=nope');
  ok(r.status === 404 && /unknown site/.test(r.body.error), 'unknown site -> 404 with message');
  r = await json('/api/summary?site=ptB&start=yesterday');
  ok(r.status === 400 && /ISO 8601/.test(r.body.error), 'bad date -> 400 with message');
  r = await json('/api/summary?site=ptB&days=1000&step_min=1');
  ok(r.status === 400 && /too many time steps/.test(r.body.error), 'oversized request rejected');

  r = await get('/openapi.yaml');
  ok(r.status === 200 && r.text.includes('openapi: 3.0'), 'OpenAPI description served');

  srv.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
