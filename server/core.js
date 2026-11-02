/*
 * CLPS Lunar Mission Browser — service core
 * ------------------------------------------
 * The operations behind the REST API and the CLI, as plain functions that take
 * a parameter object (strings are accepted, as they arrive from a query string)
 * and return JSON-ready objects. No HTTP in here.
 */
'use strict';
const path = require('path');
const fs = require('fs');
const A = require('astronomy-engine');
const E = require('../src/engine.js')(A);
const LT = require('../src/terrain.js');

const ROOT = path.join(__dirname, '..');
const VERSION = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'))).version;
const SITES = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/sites.json')));
const HORIZONS = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/horizons.json')));
let terrain = null;
const getTerrain = () => (terrain || (terrain = LT.loadNode(path.join(ROOT, 'data'))));

class InputError extends Error { constructor(msg) { super(msg); this.status = 400; } }
class NotFound extends Error { constructor(msg) { super(msg); this.status = 404; } }

const DAY = 86400000;
const MAX_STEPS = 60000;

/* ------------------------------------------------------------ parsing */
function num(v, name, def, lo, hi) {
  if (v == null || v === '') return def;
  const x = Number(v);
  if (!Number.isFinite(x)) throw new InputError(`${name} must be a number`);
  if ((lo != null && x < lo) || (hi != null && x > hi)) throw new InputError(`${name} must be between ${lo} and ${hi}`);
  return x;
}
function bool(v, def) {
  if (v == null || v === '') return def;
  return !['0', 'false', 'no', 'off'].includes(String(v).toLowerCase());
}
function time(v, name, def) {
  if (v == null || v === '') return def;
  const s = String(v);
  const ms = Date.parse(/^\d{4}-\d{2}-\d{2}$/.test(s) ? s + 'T00:00:00Z' : s);
  if (!Number.isFinite(ms)) throw new InputError(`${name} must be an ISO 8601 date or date-time (UTC), e.g. 2026-11-14 or 2026-11-14T09:00:00Z`);
  return ms;
}

/** Time range and step from start/end/days/step_min. */
function range(q) {
  const start = time(q.start, 'start', Math.floor(Date.now() / 3600000) * 3600000);
  let end;
  if (q.end) end = time(q.end, 'end');
  else end = start + num(q.days, 'days', 30, 0.1, 1100) * DAY;
  if (end <= start) throw new InputError('end must be after start');
  if (end - start > 1100 * DAY) throw new InputError('range is limited to 1100 days');
  const days = (end - start) / DAY;
  const auto = days <= 10 ? 10 : days <= 45 ? 20 : days <= 120 ? 30 : days <= 400 ? 60 : 180;
  const step = num(q.step_min, 'step_min', auto, 1, 1440);
  if ((end - start) / (step * 60000) > MAX_STEPS) throw new InputError(`too many time steps: use a larger step_min (max ${MAX_STEPS} steps)`);
  return { start, end, step };
}
function rules(q) {
  return {
    sunFracMin: num(q.sun_frac, 'sun_frac', 0.5, 0.001, 1),
    earthMarginDeg: num(q.earth_margin, 'earth_margin', 0, 0, 30),
    requireDSN: bool(q.dsn, true),
    dsnMinDeg: num(q.dsn_min, 'dsn_min', 10, 0, 45)
  };
}

/* -------------------------------------------------------------- sites */
const customCache = new Map();
function presetSite(id) {
  const s = SITES.find(x => x.id === id);
  if (!s) throw new NotFound(`unknown site "${id}". GET /api/sites lists the available ids.`);
  const h = HORIZONS[s.id];
  const [lat, lon] = h && h.snapped ? h.snapped : [s.lat, s.lon];
  return {
    id: s.id, name: s.name, group: s.group, lat, lon, published: { lat: s.lat, lon: s.lon }, source: s.source, note: s.note,
    heightM: h ? h.elev_m : null, mask: h ? h.mask : null,
    horizon: h ? 'LOLA LDEM_80S_40M + LDEM_60S_240M (precomputed)' : 'smooth sphere (outside the polar terrain model)'
  };
}
/** Site from ?site=id, or from ?lat=&lon= (horizon ray-cast on the compact LOLA model). */
function resolveSite(q) {
  if (q.site) return presetSite(String(q.site));
  if (q.lat == null || q.lon == null) throw new InputError('give site=<id> or lat=<deg>&lon=<deg>');
  const lat = num(q.lat, 'lat', null, -90, 90);
  let lon = num(q.lon, 'lon', null, -180, 360); if (lon > 180) lon -= 360;
  const snap = num(q.snap_m, 'snap_m', 0, 0, 3000);
  const key = `${lat.toFixed(5)},${lon.toFixed(5)},${snap}`;
  if (customCache.has(key)) return customCache.get(key);
  const site = { id: 'custom', name: q.name ? String(q.name).slice(0, 60) : `${Math.abs(lat).toFixed(4)}°${lat < 0 ? 'S' : 'N'} ${lon.toFixed(4)}°E`,
    lat, lon, heightM: null, mask: null, horizon: 'smooth sphere (outside the polar terrain model)' };
  const T = getTerrain();
  if (T.covers(lat)) {
    if (snap > 0) { const b = T.snapHigh(lat, lon, snap); site.lat = b[1]; site.lon = b[2]; site.snappedFrom = { lat, lon }; }
    const hz = T.horizon(site.lat, site.lon);
    site.heightM = hz.heightM; site.mask = hz.mask; site.horizon = 'LOLA 240 m / 1 km (computed on request)';
  }
  if (customCache.size > 500) customCache.delete(customCache.keys().next().value);
  customCache.set(key, site);
  return site;
}
const publicSite = s => { const { mask, ...rest } = s; return rest; };

/* -------------------------------------------------------------- grids */
const gridCache = new Map();
function grid(r) {
  const key = `${r.start}|${r.end}|${r.step}`;
  if (gridCache.has(key)) return gridCache.get(key);
  const g = E.buildGrid(r.start, r.end, r.step, { dsn: true });
  if (gridCache.size > 12) gridCache.delete(gridCache.keys().next().value);
  gridCache.set(key, g);
  return g;
}
const iso = ms => new Date(ms).toISOString().replace('.000Z', 'Z');
function rangeInfo(g, r) { return { start: iso(g.start), end: iso(g.start + (g.n - 1) * g.stepMs), step_min: r.step, steps: g.n }; }
function rulesInfo(c) { return { sun_frac: c.sunFracMin, earth_margin: c.earthMarginDeg, dsn: c.requireDSN, dsn_min: c.dsnMinDeg }; }
function summaryOut(sm) {
  const r1 = v => Math.round(v * 10) / 10;
  return {
    sunlit_pct: r1(sm.litPct), solar_energy_pct: r1(sm.energyPct), earth_visible_pct: r1(sm.earthPct),
    earth_link_pct: r1(sm.dtePct), power_and_link_pct: r1(sm.opsPct),
    longest_night_h: r1(sm.longestNightH), longest_link_gap_h: r1(sm.longestBlackoutH), longest_power_and_link_h: r1(sm.longestOpsH),
    sun_elevation_deg: { min: r1(sm.sunMin), max: r1(sm.sunMax) }, earth_elevation_deg: { min: r1(sm.earthMin), max: r1(sm.earthMax) }
  };
}
function compute(q) {
  const s = resolveSite(q), r = range(q), c = rules(q), g = grid(r);
  const series = E.siteSeries(g, s, c);
  return { s, r, c, g, series };
}

/* ---------------------------------------------------------- operations */
const KINDS = { lit: 'sunlit', dte: 'earth_link', ops: 'power_and_link', earthUp: 'earth_visible' };
function kindOf(v) {
  const k = String(v || 'ops');
  const map = { ops: 'ops', power_and_link: 'ops', lit: 'lit', sunlit: 'lit', dte: 'dte', earth_link: 'dte', earth: 'earthUp', earth_visible: 'earthUp' };
  if (!map[k]) throw new InputError('kind must be one of: power_and_link, sunlit, earth_link, earth_visible');
  return map[k];
}

const ops = {
  health() { return { status: 'ok', version: VERSION, sites: SITES.length }; },

  sites() {
    return { sites: SITES.map(s => publicSite(presetSite(s.id))) };
  },

  horizon(q) {
    const s = resolveSite(q);
    if (!s.mask) throw new InputError('no terrain horizon: the site is outside the polar terrain model (75-90 S)');
    return { site: publicSite(s), azimuth_step_deg: 1, azimuth_convention: 'degrees from north through east',
      mask_deg: s.mask };
  },

  summary(q) {
    const { s, r, c, g, series } = compute(q);
    return { site: publicSite(s), range: rangeInfo(g, r), rules: rulesInfo(c), summary: summaryOut(E.summarize(series, g)) };
  },

  compare(q) {
    const ids = String(q.sites || '').split(',').map(x => x.trim()).filter(Boolean);
    if (!ids.length) throw new InputError('give sites=<id>,<id>,...');
    if (ids.length > 30) throw new InputError('at most 30 sites');
    const r = range(q), c = rules(q), g = grid(r);
    const rows = ids.map(id => {
      const s = presetSite(id);
      return { site: publicSite(s), summary: summaryOut(E.summarize(E.siteSeries(g, s, c), g)) };
    });
    const key = q.sort || 'power_and_link_pct';
    if (rows[0] && !(key in rows[0].summary)) throw new InputError('sort must be a summary field, e.g. power_and_link_pct');
    rows.sort((a, b) => (b.summary[key] - a.summary[key]));
    return { range: rangeInfo(g, r), rules: rulesInfo(c), sorted_by: key, sites: rows };
  },

  windows(q) {
    const { s, r, c, g, series } = compute(q);
    const kind = kindOf(q.kind);
    const min = num(q.min_hours, 'min_hours', 0, 0, 10000);
    const w = E.windowList(series, g, kind).filter(x => x.hours >= min)
      .map(x => ({ start: iso(x.start), end: iso(x.end), hours: Math.round(x.hours * 100) / 100 }));
    return { site: publicSite(s), range: rangeInfo(g, r), rules: rulesInfo(c), kind: KINDS[kind], count: w.length, windows: w,
      _ics: () => E.toICS(E.siteEvents(s.name, s.id, series, g, [kind]).filter(e => (e.end - e.start) / 3600000 >= min), `${s.name} — ${KINDS[kind]}`) };
  },

  timeseries(q) {
    const { s, r, c, g, series } = compute(q);
    const rows = [];
    for (let i = 0; i < g.n; i++) {
      rows.push({
        t: iso(g.start + i * g.stepMs),
        sun_el: +series.sunEl[i].toFixed(3), sun_az: +series.sunAz[i].toFixed(2), sun_horizon: +series.sunHz[i].toFixed(3),
        sun_visible_frac: +series.sunFrac[i].toFixed(3),
        earth_el: +series.earthEl[i].toFixed(3), earth_az: +series.earthAz[i].toFixed(2), earth_horizon: +series.earthHz[i].toFixed(3),
        sunlit: series.lit[i], earth_link: series.dte[i], power_and_link: series.ops[i]
      });
    }
    return { site: publicSite(s), range: rangeInfo(g, r), rules: rulesInfo(c), rows };
  },

  landingDates(q) {
    const { s, r, c, g, series } = compute(q);
    const o = {
      days: num(q.mission_days, 'mission_days', 10, 0.5, 120),
      goal: ({ power_and_link: 'ops', ops: 'ops', sunlit: 'lit', lit: 'lit', earth_link: 'dte', dte: 'dte' })[q.goal || 'ops'],
      sunlitAtTouchdown: bool(q.sunlit_at_touchdown, true), linkAtTouchdown: bool(q.link_at_touchdown, true),
      minSunClearanceDeg: num(q.min_sun_deg, 'min_sun_deg', 0.5, -10, 30), candidateStepH: num(q.candidate_step_h, 'candidate_step_h', 6, 0.5, 48)
    };
    if (!o.goal) throw new InputError('goal must be power_and_link, sunlit or earth_link');
    const count = num(q.count, 'count', 10, 1, 100);
    const cands = E.landingDates(series, g, o);
    if (!cands.length) throw new InputError('the range is shorter than the mission: extend end or days');
    const win = Math.round(o.days * DAY / g.stepMs);
    const best = E.bestLandings(cands, count, g, num(q.spacing_days, 'spacing_days', 3, 0, 60)).map(cd => {
      const sm = E.summarize(series, g, cd.i, Math.min(g.n, cd.i + win));
      return { touchdown: iso(cd.time), score_pct: Math.round(cd.score * 10) / 10, mission_summary: summaryOut(sm) };
    });
    return { site: publicSite(s), range: rangeInfo(g, r), rules: rulesInfo(c),
      mission: { days: o.days, goal: q.goal || 'power_and_link', sunlit_at_touchdown: o.sunlitAtTouchdown, link_at_touchdown: o.linkAtTouchdown, min_sun_deg: o.minSunClearanceDeg },
      candidates_evaluated: cands.length, feasible: cands.filter(x => x.ok).length, best };
  }
};

/* ------------------------------------------------------------- formats */
function flat(o, pre, out) {
  out = out || {};
  for (const [k, v] of Object.entries(o)) {
    if (v && typeof v === 'object' && !Array.isArray(v)) flat(v, pre + k + '_', out); else out[pre + k] = v;
  }
  return out;
}
function toCSV(rows) {
  if (!rows.length) return '';
  rows = rows.map(r => flat(r, ''));
  const keys = Object.keys(rows[0]);
  const cell = v => (typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v)).replace(/"/g, '""');
  return keys.join(',') + '\n' + rows.map(r => keys.map(k => { const c = cell(r[k]); return /[",\n]/.test(c) ? `"${c}"` : c; }).join(',')).join('\n') + '\n';
}

module.exports = { ops, toCSV, InputError, NotFound, VERSION, E, getTerrain };
