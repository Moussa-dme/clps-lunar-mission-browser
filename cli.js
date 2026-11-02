#!/usr/bin/env node
/*
 * CLPS Lunar Mission Browser — command line
 *
 *   node cli.js sites
 *   node cli.js summary        --site ptB --start 2026-11-14 --days 30
 *   node cli.js compare        --sites ptB,pns,dg2,m1 --start 2026-11-14 --days 90
 *   node cli.js windows        --site pns --kind power_and_link --format ics > windows.ics
 *   node cli.js landing-dates  --site nobile2 --start 2027-01-01 --days 120 --mission_days 10
 *   node cli.js horizon        --lat -89.45 --lon -138 --snap_m 500 --format csv
 *   node cli.js timeseries     --site im2 --days 5 --format csv
 *
 * Every option is the same as the REST API query parameter of the same name.
 */
'use strict';
const { ops, toCSV } = require('./server/core.js');

const CMDS = {
  sites: ops.sites, summary: ops.summary, compare: ops.compare, windows: ops.windows,
  timeseries: ops.timeseries, 'landing-dates': ops.landingDates, horizon: ops.horizon, health: ops.health
};

function parse(argv) {
  const q = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const [k, v] = a.slice(2).split('=');
    q[k.replace(/-/g, '_')] = v != null ? v : (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : 'true');
  }
  return q;
}

function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  if (!cmd || !CMDS[cmd] || cmd === 'help') {
    process.stdout.write(require('fs').readFileSync(__filename, 'utf8').split('\n').slice(2, 13).map(l => l.replace(/^ \* ?/, '')).join('\n') + '\n');
    process.exit(cmd && cmd !== 'help' ? 1 : 0);
  }
  const q = parse(rest);
  try {
    const out = CMDS[cmd](q);
    const fmt = (q.format || 'json').toLowerCase();
    if (fmt === 'ics' && out._ics) process.stdout.write(out._ics());
    else if (fmt === 'csv') {
      const rows = out.windows || out.rows || (out.mask_deg && out.mask_deg.map((e, a) => ({ azimuth_deg: a, elevation_deg: e })))
        || (out.sites && out.sites.map(x => x.summary ? Object.assign({ id: x.site.id, name: x.site.name }, x.summary) : x))
        || (out.best && out.best.map(b => Object.assign({ touchdown: b.touchdown, score_pct: b.score_pct }, b.mission_summary)));
      process.stdout.write(toCSV(rows || []));
    } else { delete out._ics; process.stdout.write(JSON.stringify(out, null, 2) + '\n'); }
  } catch (err) {
    process.stderr.write(`error: ${err.message}\n`);
    process.exit(2);
  }
}
main();
