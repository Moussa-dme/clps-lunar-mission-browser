/* CLPS Lunar Mission Browser — user interface.
 * Depends on: window.Astronomy (astronomy-engine), window.LunarEngine (src/engine.js),
 * window.__DATA__ (sites, LOLA horizon masks, basemap and compact DEM, built by build.js).
 */
(function () {
  'use strict';
  const E = window.LunarEngine;
  const DATA = window.__DATA__;
  const $ = s => document.querySelector(s);
  const HOUR = 3600000, DAY = 86400000;
  const MAX_SEL = 8;
  const DSN_NAMES = E.DSN.map(d => d.name);

  /* ------------------------------------------------------------------ i18n */
  const I18N = {
    en: {
      tagline: 'Sun and Earth over the real south-pole horizon', from: 'From (UTC)', to: 'To (UTC)', step: 'Step',
      sites: 'Sites', sitesHelp: 'Tick up to 8 sites to compare. Click a name to focus it.', addSite: 'Add a site',
      name: 'Name', lat: 'Latitude (°)', lon: 'Longitude (°E)', snap: 'Move to the highest point within 500 m',
      addBtn: 'Add and compute horizon', addHelp: 'Tip: click anywhere on the Map tab to fill these in.',
      rules: 'Mission rules', sunRule: 'Counts as sunlit when', anyDisk: 'any part of the Sun is visible',
      halfDisk: 'half the solar disk is visible', fullDisk: 'the whole disk is visible',
      earthRule: 'Earth must clear the horizon by', dsnRule: 'Direct-to-Earth also needs a Deep Space Network dish to see the Moon',
      dsnMin: 'DSN minimum elevation', legend: 'Legend', lgOps: 'Power and direct-to-Earth link', lgSun: 'Sunlit, no Earth link',
      lgComm: 'Earth link, in shadow', lgNone: 'Dark and out of contact',
      tCompare: 'Compare', tTimeline: 'Elevation', tSky: 'Horizon view', tPlan: 'Pick a landing date', tMap: 'Map', tMethod: 'Method',
      cmpTitle: 'Site comparison over the selected period', copyCsv: 'Copy CSV', dlCsv: 'Download CSV',
      stripTitle: 'When each site has power and a link to Earth',
      sunClearTitle: 'Sun height above the terrain horizon',
      sunClearHelp: 'Above 0° the centre of the Sun clears the local terrain. At the pole the Sun skims the horizon, so a degree of terrain decides between power and darkness.',
      earthClearTitle: 'Earth height above the terrain horizon',
      earthClearHelp: 'Earth hangs almost still in the lunar sky and wobbles a few degrees each month (libration). Below 0° no direct-to-Earth link is possible.',
      dsnTitle: 'Deep Space Network: stations that see the Moon', skyTitle: '360° horizon from', exag: 'Vertical stretch',
      skyHelp: 'The grey band is the terrain horizon computed from LOLA elevation data. Dotted tracks show where the Sun and Earth travel during the whole period; the disks show the cursor time. Disks are enlarged so they stay visible.',
      nextEvents: 'Upcoming events at this site', planTitle: 'Find the best landing date for each site',
      duration: 'Surface mission (days)', score: 'Rank by', scOps: 'time with power and Earth link', scLit: 'time in sunlight',
      scDte: 'time with Earth link', tdLit: 'Sunlit at touchdown', tdComm: 'Earth link at touchdown', minSun: 'Min. Sun height at touchdown',
      bestTitle: 'Best landing opportunities', bestHelp: 'Click a row to move the time cursor to that touchdown.',
      mapTitle: 'South pole, 80°S to 90°S', mapHelp: 'LOLA shaded relief. Click to place a new site.',
      mapNote: 'Arrows from the pole show where the Sun and Earth stand at the cursor time. Filled rings: sunlit now. Polar stereographic projection, 0° longitude (toward Earth) at the top.',
      colSite: 'Site', colLit: 'Sunlit', colEnergy: 'Solar energy', colEarth: 'Earth visible', colDte: 'Earth link', colOps: 'Power + link',
      colNight: 'Longest night', colGap: 'Longest link gap', colElev: 'Elevation', colHz: 'Horizon',
      selected: 'selected', noSel: 'Tick at least one site in the list.', computing: 'Computing ephemerides…',
      sunNow: 'Sun', earthNow: 'Earth', clearance: 'above terrain', visibleDisk: 'of the disk visible', phase: 'Earth phase',
      dsnNow: 'DSN in view', none: 'none', power: 'Power', link: 'Earth link', dark: 'No power', noLink: 'No link',
      sunrise: 'Sunrise', sunset: 'Sunset', earthrise: 'Earth rises', earthset: 'Earth sets', linkOn: 'Link opens', linkOff: 'Link closes',
      evType: 'Event', evTime: 'Time (UTC)', evIn: 'In', noEvents: 'No change in the remaining period.',
      siteElev: 'Site elevation', hzSrc: 'Horizon from', rank: '#', touchdown: 'Touchdown (UTC)', scoreCol: 'Score',
      planShort: 'The period is shorter than the mission. Extend the end date.', infeasible: 'fails a touchdown rule',
      copied: 'CSV copied to the clipboard', copyFail: 'Clipboard blocked. The CSV is selected in the box below; copy it by hand.',
      added: 'Site added', coordsSet: 'Coordinates filled in. Press “Add and compute horizon”.', badCoord: 'Enter a latitude between -90 and 90 and a longitude between -180 and 360.',
      demLoading: 'Loading terrain…', outsideDem: 'Outside the polar terrain model (75°S–90°S): a smooth horizon is used.',
      importMask: 'Import horizon CSV', copyMask: 'Copy horizon CSV', maskImported: 'Horizon imported for',
      maxSel: 'You can compare up to 8 sites at once.', remove: 'Remove', h: 'h', d: 'd', now: 'now',
      smooth: 'smooth sphere', lolaPre: 'LOLA 40 m / 240 m', lolaBrowser: 'LOLA 240 m / 1 km', imported: 'imported CSV',
      fit: 'fitted', stretchNote: 'vertical stretch'
    },
    fr: {
      tagline: 'Le Soleil et la Terre au-dessus du vrai horizon du pôle Sud', from: 'Du (UTC)', to: 'Au (UTC)', step: 'Pas',
      sites: 'Sites', sitesHelp: 'Cochez jusqu’à 8 sites à comparer. Cliquez sur un nom pour le sélectionner.', addSite: 'Ajouter un site',
      name: 'Nom', lat: 'Latitude (°)', lon: 'Longitude (°E)', snap: 'Déplacer vers le point le plus haut à moins de 500 m',
      addBtn: 'Ajouter et calculer l’horizon', addHelp: 'Astuce : cliquez sur la carte (onglet Carte) pour remplir les coordonnées.',
      rules: 'Règles de mission', sunRule: 'Considéré ensoleillé quand', anyDisk: 'une partie du Soleil est visible',
      halfDisk: 'la moitié du disque solaire est visible', fullDisk: 'tout le disque est visible',
      earthRule: 'La Terre doit dépasser l’horizon de', dsnRule: 'La liaison directe exige aussi qu’une antenne du Deep Space Network voie la Lune',
      dsnMin: 'Élévation minimale DSN', legend: 'Légende', lgOps: 'Énergie et liaison directe avec la Terre', lgSun: 'Au soleil, sans liaison',
      lgComm: 'Liaison, dans l’ombre', lgNone: 'Dans le noir et sans contact',
      tCompare: 'Comparer', tTimeline: 'Élévation', tSky: 'Vue de l’horizon', tPlan: 'Choisir une date', tMap: 'Carte', tMethod: 'Méthode',
      cmpTitle: 'Comparaison des sites sur la période', copyCsv: 'Copier le CSV', dlCsv: 'Télécharger le CSV',
      stripTitle: 'Quand chaque site a de l’énergie et une liaison avec la Terre',
      sunClearTitle: 'Hauteur du Soleil au-dessus de l’horizon du relief',
      sunClearHelp: 'Au-dessus de 0°, le centre du Soleil dépasse le relief. Au pôle, le Soleil rase l’horizon : un degré de relief fait la différence entre énergie et obscurité.',
      earthClearTitle: 'Hauteur de la Terre au-dessus de l’horizon du relief',
      earthClearHelp: 'La Terre reste presque immobile dans le ciel lunaire et oscille de quelques degrés chaque mois (libration). Sous 0°, aucune liaison directe n’est possible.',
      dsnTitle: 'Deep Space Network : stations qui voient la Lune', skyTitle: 'Horizon à 360° depuis', exag: 'Étirement vertical',
      skyHelp: 'La bande grise est l’horizon du relief calculé à partir des données d’altitude LOLA. Les pointillés montrent la course du Soleil et de la Terre sur toute la période ; les disques, leur position à l’instant choisi. Les disques sont agrandis pour rester visibles.',
      nextEvents: 'Prochains événements sur ce site', planTitle: 'Trouver la meilleure date d’atterrissage pour chaque site',
      duration: 'Mission en surface (jours)', score: 'Classer selon', scOps: 'le temps avec énergie et liaison', scLit: 'le temps au soleil',
      scDte: 'le temps avec liaison', tdLit: 'Au soleil à l’atterrissage', tdComm: 'Liaison à l’atterrissage', minSun: 'Hauteur min. du Soleil à l’atterrissage',
      bestTitle: 'Meilleures opportunités d’atterrissage', bestHelp: 'Cliquez sur une ligne pour placer le curseur sur cet atterrissage.',
      mapTitle: 'Pôle Sud, de 80°S à 90°S', mapHelp: 'Relief ombré LOLA. Cliquez pour placer un nouveau site.',
      mapNote: 'Les flèches partant du pôle indiquent la direction du Soleil et de la Terre à l’instant choisi. Anneau plein : site au soleil. Projection stéréographique polaire, longitude 0° (vers la Terre) en haut.',
      colSite: 'Site', colLit: 'Au soleil', colEnergy: 'Énergie solaire', colEarth: 'Terre visible', colDte: 'Liaison Terre', colOps: 'Énergie + liaison',
      colNight: 'Plus longue nuit', colGap: 'Plus longue coupure', colElev: 'Altitude', colHz: 'Horizon',
      selected: 'sélectionnés', noSel: 'Cochez au moins un site dans la liste.', computing: 'Calcul des éphémérides…',
      sunNow: 'Soleil', earthNow: 'Terre', clearance: 'au-dessus du relief', visibleDisk: 'du disque visible', phase: 'Phase de la Terre',
      dsnNow: 'DSN en vue', none: 'aucune', power: 'Énergie', link: 'Liaison', dark: 'Sans énergie', noLink: 'Sans liaison',
      sunrise: 'Lever du Soleil', sunset: 'Coucher du Soleil', earthrise: 'Lever de la Terre', earthset: 'Coucher de la Terre', linkOn: 'Liaison ouverte', linkOff: 'Liaison fermée',
      evType: 'Événement', evTime: 'Heure (UTC)', evIn: 'Dans', noEvents: 'Aucun changement sur le reste de la période.',
      siteElev: 'Altitude du site', hzSrc: 'Horizon', rank: 'N°', touchdown: 'Atterrissage (UTC)', scoreCol: 'Score',
      planShort: 'La période est plus courte que la mission. Repoussez la date de fin.', infeasible: 'ne respecte pas une règle d’atterrissage',
      copied: 'CSV copié dans le presse-papiers', copyFail: 'Presse-papiers bloqué. Le CSV est sélectionné dans la zone ci-dessous ; copiez-le à la main.',
      added: 'Site ajouté', coordsSet: 'Coordonnées remplies. Appuyez sur « Ajouter et calculer l’horizon ».', badCoord: 'Entrez une latitude entre -90 et 90 et une longitude entre -180 et 360.',
      demLoading: 'Chargement du relief…', outsideDem: 'Hors du modèle de relief polaire (75°S–90°S) : horizon lisse utilisé.',
      importMask: 'Importer un horizon CSV', copyMask: 'Copier l’horizon CSV', maskImported: 'Horizon importé pour',
      maxSel: 'Vous pouvez comparer 8 sites au maximum.', remove: 'Supprimer', h: 'h', d: 'j', now: 'maintenant',
      smooth: 'sphère lisse', lolaPre: 'LOLA 40 m / 240 m', lolaBrowser: 'LOLA 240 m / 1 km', imported: 'CSV importé',
      fit: 'ajusté', stretchNote: 'étirement vertical'
    }
  };

  /* --------------------------------------------------------------- storage */
  const store = {
    get(k, d) { try { const v = localStorage.getItem('clps.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('clps.' + k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } }
  };
  let lang = store.get('lang', (navigator.language || 'en').toLowerCase().startsWith('fr') ? 'fr' : 'en');
  const t = k => (I18N[lang] && I18N[lang][k]) || I18N.en[k] || k;
  const locale = () => (lang === 'fr' ? 'fr-FR' : 'en-GB');

  /* ----------------------------------------------------------------- sites */
  function presetSites() {
    return DATA.sites.map(s => {
      const h = DATA.horizons[s.id];
      const ll = h && h.snapped ? h.snapped : [s.lat, s.lon];
      return {
        id: s.id, name: s.name, group: s.group, note: s.note, source: s.source,
        lat: ll[0], lon: ll[1], pubLat: s.lat, pubLon: s.lon, snapped: !!(h && h.snapped),
        heightM: h ? h.elev_m : 0, mask: h ? h.mask : null, hsrc: h ? 'lolaPre' : 'smooth', custom: false
      };
    });
  }
  const customSaved = store.get('custom', []);
  const state = {
    sites: presetSites().concat(customSaved.map(s => Object.assign(s, { custom: true }))),
    selected: [], slots: {}, focus: null,
    start: Date.UTC(2026, 10, 1), end: Date.UTC(2027, 1, 1), step: 'auto',
    cfg: { sunFracMin: 0.5, earthMarginDeg: 0, dsnMinDeg: 10, requireDSN: true },
    grid: null, series: {}, sums: {}, cursor: 0, tab: 'compare',
    sortKey: 'opsPct', sortDir: -1, exag: 3, playing: false, plan: null
  };
  const maskOverrides = store.get('maskOverrides', {});
  Object.keys(maskOverrides).forEach(id => {
    const s = state.sites.find(x => x.id === id);
    if (s && maskOverrides[id].length === 360) { s.mask = maskOverrides[id]; s.hsrc = 'imported'; }
  });
  const savedSel = store.get('selected', null);
  (savedSel && savedSel.length ? savedSel : ['im2', 'nobile2', 'pns', 'dg2', 'm1', 'ptB'])
    .filter(id => state.sites.some(s => s.id === id)).slice(0, MAX_SEL).forEach(selectSite);
  state.focus = store.get('focus', null);
  if (!state.sites.some(s => s.id === state.focus)) state.focus = state.selected[0] || state.sites[0].id;

  function site(id) { return state.sites.find(s => s.id === id); }
  function selectSite(id) {
    if (state.selected.includes(id) || state.selected.length >= MAX_SEL) return false;
    const used = new Set(Object.values(state.slots));
    let k = 0; while (used.has(k)) k++;
    state.slots[id] = k; state.selected.push(id);
    return true;
  }
  function unselectSite(id) {
    state.selected = state.selected.filter(x => x !== id);
    delete state.slots[id];
  }
  const colorOf = id => cssv('--s' + ((state.slots[id] ?? 0) + 1));

  /* ------------------------------------------------------------ utilities */
  let cssCache = null;
  function cssv(name) {
    if (!cssCache) cssCache = getComputedStyle(document.documentElement);
    return cssCache.getPropertyValue(name).trim();
  }
  function refreshCss() { cssCache = null; }
  const fmt = (v, d = 1) => (v == null || !isFinite(v)) ? '–' : v.toFixed(d);
  const pad = n => String(n).padStart(2, '0');
  function utc(ms, withTime = true) {
    const d = new Date(ms);
    const s = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
    return withTime ? `${s} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}` : s;
  }
  function dur(h) {
    if (!isFinite(h)) return '–';
    if (h < 48) return `${Math.round(h)} ${t('h')}`;
    return `${(h / 24).toFixed(1)} ${t('d')}`;
  }
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const frame = () => new Promise(r => setTimeout(r, 0));
  function toast(msg) {
    const el = $('#toast'); el.textContent = msg; el.hidden = false;
    clearTimeout(toast._t); toast._t = setTimeout(() => { el.hidden = true; }, 3200);
  }
  function timeOf(i) { return state.grid.start + i * state.grid.stepMs; }
  function indexOf(ms) { const g = state.grid; return Math.max(0, Math.min(g.n - 1, Math.round((ms - g.start) / g.stepMs))); }
  function autoStep(spanMs) {
    const d = spanMs / DAY;
    return d <= 10 ? 10 : d <= 45 ? 20 : d <= 120 ? 30 : d <= 400 ? 60 : 180;
  }
  function canvasSetup(cv) {
    const box = cv.parentElement;
    const w = Math.max(10, box.clientWidth), h = Math.max(10, box.clientHeight);
    const dpr = window.devicePixelRatio || 1;
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    }
    const ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.font = '11px ' + cssv('--f-mono');
    return { ctx, w, h };
  }

  /* --------------------------------------------------------------- compute */
  let gridToken = 0;
  async function computeGrid() {
    const token = ++gridToken;
    const span = state.end - state.start;
    const stepMin = state.step === 'auto' ? autoStep(span) : +state.step;
    const stepMs = stepMin * 60000;
    const n = Math.max(2, Math.floor(span / stepMs) + 1);
    const g = { start: state.start, stepMs, n, stepMin,
      earth: new Float64Array(n * 3), sun: new Float64Array(n * 3),
      earthIllum: new Float32Array(n), dsn: new Float32Array(n * 3) };
    const prog = $('#progress'), bar = $('#progressBar');
    prog.hidden = false; bar.style.width = '0%';
    const keepTime = state.grid ? timeOf(state.cursor) : null;
    for (let i = 0; i < n; i++) {
      const s = E.stateAt(new Date(state.start + i * stepMs), { dsn: true });
      g.earth.set(s.earthBF, i * 3); g.sun.set(s.sunBF, i * 3);
      g.earthIllum[i] = s.earthIllum; g.dsn.set(s.dsn, i * 3);
      if (i % 300 === 299) {
        bar.style.width = (100 * i / n).toFixed(1) + '%';
        await frame();
        if (token !== gridToken) return;
      }
    }
    prog.hidden = true;
    state.grid = g;
    const cur = $('#cursor'); cur.max = n - 1;
    state.cursor = keepTime != null && keepTime >= state.start && keepTime <= state.end ? indexOf(keepTime) : 0;
    cur.value = state.cursor;
    computeSeries();
  }

  function computeSeries() {
    if (!state.grid) return;
    state.series = {}; state.sums = {};
    for (const id of state.selected) {
      const s = site(id);
      state.series[id] = E.siteSeries(state.grid, s, state.cfg);
      state.sums[id] = E.summarize(state.series[id], state.grid);
    }
    // focused site always computed (may be unselected)
    if (state.focus && !state.series[state.focus]) {
      const s = site(state.focus);
      state.series[state.focus] = E.siteSeries(state.grid, s, state.cfg);
      state.sums[state.focus] = E.summarize(state.series[state.focus], state.grid);
    }
    state.plan = null;
    renderAll();
  }

  /* ------------------------------------------------------------ sidebar */
  function renderSiteList() {
    const list = $('#siteList');
    const groups = [];
    state.sites.forEach(s => { const g = s.custom ? 'My sites' : s.group; if (!groups.includes(g)) groups.push(g); });
    let html = '';
    for (const g of groups) {
      const GFR = { 'My sites': 'Mes sites', 'CLPS landed': 'CLPS posés', 'Artemis III region': 'Régions Artemis III',
        'High-illumination point': 'Points très éclairés', 'Earlier Artemis candidate': 'Anciens candidats Artemis', 'Other missions': 'Autres missions' };
      html += `<div class="grp">${esc(lang === 'fr' ? (GFR[g] || g) : g)}</div>`;
      for (const s of state.sites.filter(x => (x.custom ? 'My sites' : x.group) === g)) {
        const sel = state.selected.includes(s.id);
        const col = sel ? colorOf(s.id) : 'transparent';
        html += `<div class="site${state.focus === s.id ? ' focus' : ''}" title="${esc([s.note, s.source ? (lang === 'fr' ? 'Source : ' : 'Source: ') + s.source : ''].filter(Boolean).join('\n'))}">
          <input type="checkbox" id="cb-${esc(s.id)}" data-id="${esc(s.id)}" ${sel ? 'checked' : ''} aria-label="${esc(s.name)}">
          <i class="dot" style="background:${col};border-color:${sel ? col : 'var(--line)'}"></i>
          <button class="nm" type="button" data-focus="${esc(s.id)}">${esc(s.name)}</button>
          ${s.custom ? `<button class="del" type="button" data-del="${esc(s.id)}" aria-label="${t('remove')} ${esc(s.name)}">×</button>`
                     : `<span class="lat">${Math.abs(s.lat).toFixed(1)}°${s.lat < 0 ? 'S' : 'N'}</span>`}
        </div>`;
      }
    }
    list.innerHTML = html;
    $('#selCount').textContent = `${state.selected.length}/${MAX_SEL} ${t('selected')}`;
  }
  $('#siteList').addEventListener('change', e => {
    const id = e.target.dataset.id; if (!id) return;
    if (e.target.checked) {
      if (!selectSite(id)) { e.target.checked = false; toast(t('maxSel')); return; }
      if (!state.selected.includes(state.focus)) state.focus = id;
    } else unselectSite(id);
    store.set('selected', state.selected);
    computeSeries();
  });
  $('#siteList').addEventListener('click', e => {
    const f = e.target.closest('[data-focus]');
    if (f) { setFocus(f.dataset.focus); return; }
    const d = e.target.closest('[data-del]');
    if (d) {
      const id = d.dataset.del;
      unselectSite(id);
      state.sites = state.sites.filter(s => s.id !== id);
      if (state.focus === id) state.focus = state.selected[0] || state.sites[0].id;
      saveCustom(); store.set('selected', state.selected);
      computeSeries();
    }
  });
  function setFocus(id) {
    state.focus = id; store.set('focus', id);
    if (!state.series[id] && state.grid) {
      state.series[id] = E.siteSeries(state.grid, site(id), state.cfg);
      state.sums[id] = E.summarize(state.series[id], state.grid);
    }
    renderAll();
  }
  function saveCustom() {
    store.set('custom', state.sites.filter(s => s.custom).map(s => ({
      id: s.id, name: s.name, group: 'My sites', lat: s.lat, lon: s.lon, heightM: s.heightM, mask: s.mask, hsrc: s.hsrc, note: s.note
    })));
  }

  /* --------------------------------------------------- in-browser terrain */
  let demPromise = null;
  async function inflate(b64) {
    const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    if (typeof DecompressionStream === 'undefined') throw new Error('This browser cannot decompress the terrain model.');
    const ds = new Blob([bin]).stream().pipeThrough(new DecompressionStream('gzip'));
    const buf = await new Response(ds).arrayBuffer();
    return new Int16Array(buf);
  }
  function loadDEM() {
    if (!demPromise) {
      demPromise = Promise.all([inflate(DATA.demFine), inflate(DATA.demCoarse)]).then(([fine, coarse]) => ({
        fine: Object.assign({ h: fine }, DATA.assets.dem_fine),
        coarse: Object.assign({ h: coarse }, DATA.assets.dem_coarse)
      }));
    }
    return demPromise;
  }
  const RM = 1737400;
  function polarXY(lat, lon) {
    const r = 2 * RM * Math.tan(Math.PI / 4 + lat * Math.PI / 360);
    return [r * Math.sin(lon * Math.PI / 180), r * Math.cos(lon * Math.PI / 180)];
  }
  function sampleGrid(G, x, y) {
    const c = (x + G.half_m) / G.px_m - 0.5, r = (G.half_m - y) / G.px_m - 0.5;
    const c0 = Math.floor(c), r0 = Math.floor(r);
    if (c0 < 0 || r0 < 0 || c0 >= G.n - 1 || r0 >= G.n - 1) return NaN;
    const fc = c - c0, fr = r - r0, n = G.n, h = G.h;
    const i = r0 * n + c0;
    return (h[i] * (1 - fc) + h[i + 1] * fc) * (1 - fr) + (h[i + n] * (1 - fc) + h[i + n + 1] * fc) * fr;
  }
  function demHeight(dem, lat, lon) {
    if (lat > -75) return NaN;
    const [x, y] = polarXY(lat, lon);
    if (lat <= -87.5) { const v = sampleGrid(dem.fine, x, y); if (isFinite(v)) return v; }
    return sampleGrid(dem.coarse, x, y);
  }
  function horizonFromDEM(dem, lat, lon, mastM = 2) {
    const h0 = demHeight(dem, lat, lon);
    const r0 = RM + h0 + mastM;
    const D2R = Math.PI / 180;
    const la1 = lat * D2R, lo1 = lon * D2R;
    const sl1 = Math.sin(la1), cl1 = Math.cos(la1);
    const dist = [];
    for (let d = 120; d < 600000; d += Math.max(120, d * 0.004)) dist.push(d);
    const mask = new Array(360);
    for (let a = 0; a < 360; a++) {
      const az = a * D2R, ca = Math.cos(az), sa = Math.sin(az);
      let best = -90;
      for (const d of dist) {
        const th = d / RM, ct = Math.cos(th), st = Math.sin(th);
        const s2 = sl1 * ct + cl1 * st * ca;
        const la2 = Math.asin(s2);
        const lo2 = lo1 + Math.atan2(sa * st * cl1, ct - sl1 * s2);
        const hh = demHeight(dem, la2 / D2R, lo2 / D2R);
        if (!isFinite(hh)) continue;
        const r1 = RM + hh;
        const el = Math.atan2(r1 * ct - r0, r1 * st) / D2R;
        if (el > best) best = el;
      }
      mask[a] = Math.round(best * 1000) / 1000;
    }
    return { h0, mask };
  }
  function snapHigh(dem, lat, lon, radiusM) {
    let best = [demHeight(dem, lat, lon), lat, lon];
    const D2R = Math.PI / 180;
    for (let d = 60; d <= radiusM; d += 60) {
      const th = d / RM, n = Math.max(12, Math.round(2 * Math.PI * d / 60));
      for (let k = 0; k < n; k++) {
        const az = 2 * Math.PI * k / n, la1 = lat * D2R;
        const s2 = Math.sin(la1) * Math.cos(th) + Math.cos(la1) * Math.sin(th) * Math.cos(az);
        const la2 = Math.asin(s2);
        const lo2 = lon * D2R + Math.atan2(Math.sin(az) * Math.sin(th) * Math.cos(la1), Math.cos(th) - Math.sin(la1) * s2);
        const h = demHeight(dem, la2 / D2R, lo2 / D2R);
        if (h > best[0]) best = [h, la2 / D2R, lo2 / D2R];
      }
    }
    return best;
  }

  $('#addSiteForm').addEventListener('submit', async e => {
    e.preventDefault();
    const msg = $('#addMsg'); msg.className = 'form-msg full';
    let lat = parseFloat($('#newLat').value), lon = parseFloat($('#newLon').value);
    if (!(lat >= -90 && lat <= 90 && lon >= -180 && lon <= 360)) { msg.textContent = t('badCoord'); msg.classList.add('err'); return; }
    if (lon > 180) lon -= 360;
    const name = ($('#newName').value || '').trim() || `${Math.abs(lat).toFixed(2)}°${lat < 0 ? 'S' : 'N'} ${lon.toFixed(2)}°E`;
    const s = { id: 'u' + Date.now().toString(36), name, group: 'My sites', lat, lon, heightM: 0, mask: null, hsrc: 'smooth', custom: true, note: '' };
    if (lat <= -75) {
      msg.textContent = t('demLoading');
      try {
        const dem = await loadDEM();
        await frame();
        if ($('#newSnap').checked) { const b = snapHigh(dem, lat, lon, 500); s.lat = b[1]; s.lon = b[2]; }
        const hz = horizonFromDEM(dem, s.lat, s.lon);
        s.heightM = Math.round(hz.h0); s.mask = hz.mask; s.hsrc = 'lolaBrowser';
      } catch (err) { msg.textContent = err.message; msg.classList.add('err'); }
    } else {
      s.note = t('outsideDem');
    }
    state.sites.push(s); saveCustom();
    if (selectSite(s.id)) store.set('selected', state.selected);
    state.focus = s.id;
    msg.textContent = `${t('added')}: ${s.name}${s.hsrc === 'smooth' ? ' — ' + t('outsideDem') : ''}`;
    $('#newName').value = '';
    computeSeries();
  });

  /* rules */
  function readRules() {
    state.cfg.sunFracMin = +$('#sunFrac').value;
    state.cfg.earthMarginDeg = Math.max(0, +$('#earthMargin').value || 0);
    state.cfg.requireDSN = $('#reqDSN').checked;
    state.cfg.dsnMinDeg = +$('#dsnMin').value || 0;
    $('#dsnMin').disabled = !state.cfg.requireDSN;
    computeSeries();
  }
  ['#sunFrac', '#earthMargin', '#reqDSN', '#dsnMin'].forEach(s => $(s).addEventListener('change', readRules));

  /* range */
  function initRange() {
    $('#start').value = utc(state.start, false); $('#end').value = utc(state.end, false);
    $('#step').value = state.step;
  }
  function readRange() {
    const s = Date.parse($('#start').value + 'T00:00:00Z'), e = Date.parse($('#end').value + 'T00:00:00Z');
    if (!isFinite(s) || !isFinite(e) || e <= s) return;
    const maxSpan = 3 * 366 * DAY;
    state.start = s; state.end = Math.min(e, s + maxSpan);
    if (e > s + maxSpan) $('#end').value = utc(state.end, false);
    state.step = $('#step').value;
    computeGrid();
  }
  ['#start', '#end', '#step'].forEach(s => $(s).addEventListener('change', readRange));

  /* cursor + play */
  $('#cursor').addEventListener('input', e => { state.cursor = +e.target.value; renderCursorDependent(); });
  $('#play').addEventListener('click', () => {
    state.playing = !state.playing;
    $('#playIcon').setAttribute('d', state.playing ? 'M4 2.5h3v11H4zM9 2.5h3v11H9z' : 'M4 2.5v11l9-5.5z');
    if (state.playing) requestAnimationFrame(tick);
  });
  let lastTick = 0;
  function tick(ts) {
    if (!state.playing || !state.grid) return;
    if (ts - lastTick > 40) {
      lastTick = ts;
      const stepN = Math.max(1, Math.round(state.grid.n / 500));
      state.cursor = (state.cursor + stepN) % state.grid.n;
      $('#cursor').value = state.cursor;
      renderCursorDependent();
    }
    requestAnimationFrame(tick);
  }
  function setCursor(i) { state.cursor = i; $('#cursor').value = i; renderCursorDependent(); }

  /* tabs */
  document.querySelector('.tabs').addEventListener('click', e => {
    const b = e.target.closest('[data-tab]'); if (b) showTab(b.dataset.tab);
  });
  function showTab(tab) {
    state.tab = tab;
    document.querySelectorAll('.tabs [data-tab]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
    document.querySelectorAll('.view').forEach(v => { v.hidden = v.id !== 'view-' + tab; });
    try { history.replaceState(null, '', '#' + tab); } catch (e) { /* ignore */ }
    store.set('tab', tab);
    renderTab();
  }

  /* ------------------------------------------------------------ rendering */
  function renderAll() { renderSiteList(); renderTab(); renderCursorLabel(); }
  function renderCursorLabel() {
    if (!state.grid) return;
    $('#cursorLabel').textContent = utc(timeOf(state.cursor)) + ' UTC';
  }
  function renderCursorDependent() {
    renderCursorLabel();
    if (state.tab === 'compare') drawStrip();
    else if (state.tab === 'timeline') drawTimeline();
    else if (state.tab === 'sky') renderSky();
    else if (state.tab === 'map') drawMap();
    else if (state.tab === 'plan') drawHeat();
  }
  function renderTab() {
    const tab = state.tab;
    if (tab === 'method') { renderMethod(); return; }
    if (!state.grid) return;
    if (tab === 'compare') { renderTable(); drawStrip(); }
    else if (tab === 'timeline') drawTimeline();
    else if (tab === 'sky') renderSky();
    else if (tab === 'plan') renderPlan();
    else if (tab === 'map') drawMap();
  }

  /* time axis */
  function timeTicks(t0, t1, w) {
    const span = t1 - t0, maxTicks = Math.max(2, Math.floor(w / 85));
    const steps = [6 * HOUR, 12 * HOUR, DAY, 2 * DAY, 5 * DAY, 7 * DAY, 14 * DAY];
    const out = [];
    const st = steps.find(s => span / s <= maxTicks);
    if (st) {
      let tt = Math.ceil(t0 / st) * st;
      for (; tt <= t1; tt += st) out.push(tt);
      return { ticks: out, fmt: ms => st < DAY ? `${pad(new Date(ms).getUTCDate())} ${pad(new Date(ms).getUTCHours())}h`
        : new Date(ms).toLocaleDateString(locale(), { day: 'numeric', month: 'short', timeZone: 'UTC' }) };
    }
    const months = Math.max(1, Math.ceil((span / (30.44 * DAY)) / maxTicks));
    const d = new Date(t0); let y = d.getUTCFullYear(), m = d.getUTCMonth() + 1;
    if (m > 11) { m = 0; y++; }
    for (;;) {
      const ms = Date.UTC(y, m, 1); if (ms > t1) break;
      if (ms >= t0 && (m % months === 0)) out.push(ms);
      m++; if (m > 11) { m = 0; y++; }
    }
    return { ticks: out, fmt: ms => new Date(ms).toLocaleDateString(locale(), { month: 'short', year: '2-digit', timeZone: 'UTC' }) };
  }
  function drawTimeAxis(ctx, x0, x1, y, t0, t1, gridTop) {
    const { ticks, fmt: f } = timeTicks(t0, t1, x1 - x0);
    ctx.fillStyle = cssv('--muted'); ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    for (const tt of ticks) {
      const x = x0 + (tt - t0) / (t1 - t0) * (x1 - x0);
      if (gridTop != null) {
        ctx.strokeStyle = cssv('--line'); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(Math.round(x) + .5, gridTop); ctx.lineTo(Math.round(x) + .5, y); ctx.stroke();
      }
      ctx.fillText(f(tt), x, y + 4);
    }
  }
  function drawCursor(ctx, x, top, bottom) {
    ctx.strokeStyle = cssv('--fg'); ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]);
    ctx.beginPath(); ctx.moveTo(Math.round(x) + .5, top); ctx.lineTo(Math.round(x) + .5, bottom); ctx.stroke();
    ctx.setLineDash([]);
  }

  /* tooltip */
  const tip = $('#tip');
  function showTip(html, cx, cy) {
    tip.innerHTML = html; tip.hidden = false;
    const r = tip.getBoundingClientRect();
    let x = cx + 14, y = cy + 14;
    if (x + r.width > window.innerWidth - 8) x = cx - r.width - 14;
    if (y + r.height > window.innerHeight - 8) y = cy - r.height - 14;
    tip.style.left = Math.max(8, x) + 'px'; tip.style.top = Math.max(8, y) + 'px';
  }
  function hideTip() { tip.hidden = true; }

  /* ---------- compare table */
  const COLS = [
    { k: 'litPct', l: 'colLit', f: v => fmt(v, 0) + '%' },
    { k: 'energyPct', l: 'colEnergy', f: v => fmt(v, 0) + '%' },
    { k: 'earthPct', l: 'colEarth', f: v => fmt(v, 0) + '%' },
    { k: 'dtePct', l: 'colDte', f: v => fmt(v, 0) + '%' },
    { k: 'opsPct', l: 'colOps', f: v => fmt(v, 0) + '%', bar: true },
    { k: 'longestNightH', l: 'colNight', f: dur, low: true },
    { k: 'longestBlackoutH', l: 'colGap', f: dur, low: true },
    { k: 'heightM', l: 'colElev', f: v => fmt(v, 0) + ' m' }
  ];
  function renderTable() {
    const tb = $('#cmpTable');
    if (!state.selected.length) { tb.innerHTML = `<tr><td>${t('noSel')}</td></tr>`; $('#cmpNote').textContent = ''; return; }
    const rows = state.selected.map(id => Object.assign({ id, heightM: site(id).heightM }, state.sums[id]));
    rows.sort((a, b) => state.sortDir * ((a[state.sortKey] ?? 0) - (b[state.sortKey] ?? 0)));
    const arrow = k => k === state.sortKey ? (state.sortDir < 0 ? ' ↓' : ' ↑') : '';
    let html = `<thead><tr><th class="nosort">${t('colSite')}</th>` +
      COLS.map(c => `<th data-k="${c.k}" scope="col">${t(c.l)}${arrow(c.k)}</th>`).join('') + `</tr></thead><tbody>`;
    for (const r of rows) {
      const s = site(r.id);
      html += `<tr class="click" data-id="${esc(r.id)}"><td class="nm"><i class="dot" style="background:${colorOf(r.id)}"></i>${esc(s.name)}</td>` +
        COLS.map(c => `<td class="num">${c.f(r[c.k])}${c.bar ? `<i class="bar" style="width:${(r[c.k] * 0.5).toFixed(0)}px"></i>` : ''}</td>`).join('') + `</tr>`;
    }
    tb.innerHTML = html + '</tbody>';
    const g = state.grid;
    $('#cmpNote').textContent = `${utc(g.start, false)} → ${utc(timeOf(g.n - 1), false)} · ${g.n} × ${g.stepMin} min. ` +
      (lang === 'fr' ? 'Énergie solaire : fraction moyenne du disque solaire visible (panneau vertical orienté vers le Soleil).'
        : 'Solar energy: mean visible fraction of the solar disk (sun-tracking vertical panel).');
  }
  $('#cmpTable').addEventListener('click', e => {
    const th = e.target.closest('th[data-k]');
    if (th) { const k = th.dataset.k; if (state.sortKey === k) state.sortDir *= -1; else { state.sortKey = k; state.sortDir = COLS.find(c => c.k === k).low ? 1 : -1; } renderTable(); return; }
    const tr = e.target.closest('tr[data-id]'); if (tr) setFocus(tr.dataset.id);
  });

  /* ---------- state strip */
  const stripGeom = {};
  function stateColor(ops, lit, dte) {
    return ops ? cssv('--ops') : lit ? cssv('--sun') : dte ? cssv('--earth') : cssv('--none');
  }
  function rowLayout(w, rows) {
    const narrow = w < 560;
    const lw = narrow ? 8 : Math.min(170, w * 0.3);
    const rh = 22, gap = narrow ? 24 : 8, top = narrow ? 18 : 4;
    return { narrow, x0: lw, x1: w - 8, rh, gap, top, height: top + rows * (rh + gap) - gap + 24 };
  }
  function rowLabel(ctx, L, id, y) {
    const nm = site(id).name;
    ctx.font = '12px ' + cssv('--f-body'); ctx.textBaseline = 'middle';
    if (L.narrow) {
      ctx.fillStyle = colorOf(id); ctx.beginPath(); ctx.arc(L.x0 + 5, y - 9, 4.5, 0, 7); ctx.fill();
      ctx.fillStyle = cssv('--fg'); ctx.textAlign = 'left'; ctx.fillText(nm, L.x0 + 15, y - 9);
    } else {
      ctx.fillStyle = cssv('--fg'); ctx.textAlign = 'right';
      ctx.fillText(nm.length > 24 ? nm.slice(0, 23) + '…' : nm, L.x0 - 22, y + L.rh / 2);
      ctx.fillStyle = colorOf(id); ctx.beginPath(); ctx.arc(L.x0 - 12, y + L.rh / 2, 4.5, 0, 7); ctx.fill();
    }
  }
  function drawStrip() {
    const cv = $('#strip'), box = $('#stripBox');
    const rows = state.selected.length;
    const L0 = rowLayout(box.clientWidth, rows);
    box.style.height = Math.max(90, L0.height) + 'px';
    const { ctx, w } = canvasSetup(cv);
    if (!rows) return;
    const L = rowLayout(w, rows), { x0, x1, rh, gap, top } = L;
    const g = state.grid, n = g.n;
    Object.assign(stripGeom, { x0, x1, rh, gap, top });
    const colors = { ops: cssv('--ops'), sun: cssv('--sun'), earth: cssv('--earth'), none: cssv('--none') };
    state.selected.forEach((id, r) => {
      const s = state.series[id], y = top + r * (rh + gap);
      rowLabel(ctx, L, id, y);
      const pxPer = (x1 - x0) / n;
      let runStart = 0, runCol = null;
      const flush = (iEnd) => {
        ctx.fillStyle = runCol;
        ctx.fillRect(x0 + runStart * pxPer, y, Math.max(0.6, (iEnd - runStart) * pxPer), rh);
      };
      for (let i = 0; i < n; i++) {
        const c = s.ops[i] ? colors.ops : s.lit[i] ? colors.sun : s.dte[i] ? colors.earth : colors.none;
        if (c !== runCol) { if (runCol) flush(i); runStart = i; runCol = c; }
      }
      flush(n);
    });
    ctx.font = '11px ' + cssv('--f-mono');
    const yb = top + rows * (rh + gap) - gap;
    drawTimeAxis(ctx, x0, x1, yb + 2, g.start, timeOf(n - 1));
    drawCursor(ctx, x0 + (state.cursor + 0.5) / n * (x1 - x0), 0, yb + 2);
  }
  function stripHit(e) {
    const r = $('#strip').getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    const { x0, x1, rh, gap, top } = stripGeom;
    if (x < x0 || x > x1) return null;
    const i = Math.min(state.grid.n - 1, Math.max(0, Math.floor((x - x0) / (x1 - x0) * state.grid.n)));
    const row = Math.floor((y - top) / (rh + gap));
    return { i, id: state.selected[row] };
  }
  $('#strip').addEventListener('mousemove', e => {
    const hit = stripHit(e); if (!hit || !hit.id) { hideTip(); return; }
    const s = state.series[hit.id], i = hit.i;
    const st = s.ops[i] ? t('lgOps') : s.lit[i] ? t('lgSun') : s.dte[i] ? t('lgComm') : t('lgNone');
    showTip(`<div class="t">${utc(timeOf(i))} UTC</div><b>${esc(site(hit.id).name)}</b><div>${st}</div>
      <div class="r"><span>${t('sunNow')}</span><span>${fmt(s.sunEl[i] - s.sunHz[i], 2)}° ${t('clearance')}</span></div>
      <div class="r"><span>${t('earthNow')}</span><span>${fmt(s.earthEl[i] - s.earthHz[i], 2)}° ${t('clearance')}</span></div>`, e.clientX, e.clientY);
  });
  $('#strip').addEventListener('mouseleave', hideTip);
  $('#strip').addEventListener('click', e => { const hit = stripHit(e); if (hit) { if (hit.id) state.focus = hit.id; setCursor(hit.i); renderSiteList(); } });

  /* ---------- line charts */
  const lineGeom = {};
  function drawLineChart(cvId, key, hzKey, label) {
    const cv = $(cvId);
    const { ctx, w, h } = canvasSetup(cv);
    const ids = state.selected; if (!ids.length) return;
    const g = state.grid, n = g.n;
    let lo = 0, hi = 0;
    for (const id of ids) { const s = state.series[id]; for (let i = 0; i < n; i += 3) { const v = s[key][i] - s[hzKey][i]; if (v < lo) lo = v; if (v > hi) hi = v; } }
    lo = Math.max(-15, Math.floor(lo - 0.5)); hi = Math.min(25, Math.ceil(hi + 0.5));
    if (hi - lo < 4) { hi += 1; lo -= 1; }
    const x0 = 44, x1 = w - 12, y0 = 10, y1 = h - 26;
    const X = i => x0 + i / (n - 1) * (x1 - x0), Y = v => y1 - (v - lo) / (hi - lo) * (y1 - y0);
    lineGeom[cvId] = { x0, x1, y0, y1, lo, hi, key, hzKey };
    // below-horizon band
    ctx.fillStyle = cssv('--none'); ctx.globalAlpha = 0.35;
    ctx.fillRect(x0, Y(0), x1 - x0, y1 - Y(0)); ctx.globalAlpha = 1;
    // y grid
    const stepY = (hi - lo) > 20 ? 5 : (hi - lo) > 8 ? 2 : 1;
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (let v = Math.ceil(lo / stepY) * stepY; v <= hi; v += stepY) {
      ctx.strokeStyle = v === 0 ? cssv('--fg2') : cssv('--line'); ctx.lineWidth = v === 0 ? 1.2 : 1;
      ctx.beginPath(); ctx.moveTo(x0, Math.round(Y(v)) + .5); ctx.lineTo(x1, Math.round(Y(v)) + .5); ctx.stroke();
      ctx.fillStyle = cssv('--muted'); ctx.fillText(v + '°', x0 - 6, Y(v));
    }
    drawTimeAxis(ctx, x0, x1, y1, g.start, timeOf(n - 1), y0);
    // lines
    ctx.lineWidth = 1.6; ctx.lineJoin = 'round';
    for (const id of ids) {
      const s = state.series[id];
      ctx.strokeStyle = colorOf(id);
      ctx.beginPath();
      const stride = Math.max(1, Math.floor(n / ((x1 - x0) * 2)));
      for (let i = 0; i < n; i += stride) {
        const v = Math.max(lo, Math.min(hi, s[key][i] - s[hzKey][i]));
        if (i === 0) ctx.moveTo(X(i), Y(v)); else ctx.lineTo(X(i), Y(v));
      }
      ctx.stroke();
    }
    ctx.save(); ctx.font = '11px ' + cssv('--f-body'); ctx.fillStyle = cssv('--muted'); ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText(label, x0 + 6, Y(0) + 4); ctx.restore();
    drawCursor(ctx, X(state.cursor), y0, y1);
    // legend (always present for >= 2 series) drawn as small chips at top right
    let lx = x1;
    ctx.font = '11px ' + cssv('--f-body'); ctx.textBaseline = 'middle'; ctx.textAlign = 'right';
    for (const id of ids.slice().reverse()) {
      const nm = site(id).name, tw = ctx.measureText(nm).width;
      ctx.fillStyle = cssv('--panel'); ctx.globalAlpha = 0.85; ctx.fillRect(lx - tw - 20, y0 + 1, tw + 18, 16); ctx.globalAlpha = 1;
      ctx.fillStyle = cssv('--fg2'); ctx.fillText(nm, lx - 4, y0 + 9);
      ctx.fillStyle = colorOf(id); ctx.fillRect(lx - tw - 16, y0 + 8, 8, 2.5);
      lx -= tw + 24;
      if (lx < x0 + 140) break;
    }
  }
  function drawDSN() {
    const cv = $('#dsnChart'); const { ctx, w, h } = canvasSetup(cv);
    const g = state.grid, n = g.n, x0 = 74, x1 = w - 12, rh = 16, gap = 6, top = 4;
    const col = cssv('--earth'), none = cssv('--none');
    const names = DSN_NAMES.concat([lang === 'fr' ? 'Au moins une' : 'Any station']);
    names.forEach((nm, r) => {
      const y = top + r * (rh + gap);
      ctx.fillStyle = cssv('--fg2'); ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.font = '11px ' + cssv('--f-body');
      ctx.fillText(nm, x0 - 8, y + rh / 2);
      ctx.fillStyle = none; ctx.fillRect(x0, y, x1 - x0, rh);
      ctx.fillStyle = col;
      for (let i = 0; i < n; i++) {
        let on;
        if (r < 3) on = g.dsn[i * 3 + r] >= state.cfg.dsnMinDeg;
        else on = g.dsn[i * 3] >= state.cfg.dsnMinDeg || g.dsn[i * 3 + 1] >= state.cfg.dsnMinDeg || g.dsn[i * 3 + 2] >= state.cfg.dsnMinDeg;
        if (on) ctx.fillRect(x0 + i / n * (x1 - x0), y, Math.max(0.6, (x1 - x0) / n + 0.3), rh);
      }
    });
    ctx.font = '11px ' + cssv('--f-mono');
    const yb = top + 4 * (rh + gap) - gap;
    drawTimeAxis(ctx, x0, x1, yb + 2, g.start, timeOf(n - 1));
    drawCursor(ctx, x0 + (state.cursor + 0.5) / n * (x1 - x0), 0, yb + 2);
  }
  function drawTimeline() {
    drawLineChart('#sunChart', 'sunEl', 'sunHz', lang === 'fr' ? 'Soleil caché par le relief' : 'Sun hidden by terrain');
    drawLineChart('#earthChart', 'earthEl', 'earthHz', lang === 'fr' ? 'Terre cachée par le relief' : 'Earth hidden by terrain');
    drawDSN();
  }
  function lineHover(cvId, e) {
    const G = lineGeom[cvId]; if (!G) return;
    const r = $(cvId).getBoundingClientRect(), x = e.clientX - r.left;
    if (x < G.x0 || x > G.x1) { hideTip(); return null; }
    const i = Math.round((x - G.x0) / (G.x1 - G.x0) * (state.grid.n - 1));
    const rows = state.selected.map(id => ({ id, v: state.series[id][G.key][i] - state.series[id][G.hzKey][i] })).sort((a, b) => b.v - a.v);
    showTip(`<div class="t">${utc(timeOf(i))} UTC</div>` + rows.map(r =>
      `<div class="r"><span><i style="background:${colorOf(r.id)}"></i>${esc(site(r.id).name)}</span><span>${fmt(r.v, 2)}°</span></div>`).join(''), e.clientX, e.clientY);
    return i;
  }
  ['#sunChart', '#earthChart'].forEach(id => {
    $(id).addEventListener('mousemove', e => lineHover(id, e));
    $(id).addEventListener('mouseleave', hideTip);
    $(id).addEventListener('click', e => { const i = lineHover(id, e); if (i != null) setCursor(i); });
  });

  /* ---------- sky / horizon panorama */
  function renderSky() {
    const id = state.focus, s = site(id), ser = state.series[id];
    if (!ser) return;
    $('#skySiteName').textContent = s.name;
    const i = state.cursor, g = state.grid;
    const sunClr = ser.sunEl[i] - ser.sunHz[i], eClr = ser.earthEl[i] - ser.earthHz[i];
    const dsnIn = E.DSN.filter((d, k) => g.dsn[i * 3 + k] >= state.cfg.dsnMinDeg).map(d => d.name);
    const pill = (on, a, b, cls) => `<span class="pill ${on ? cls : 'off'}">${on ? a : b}</span>`;
    const latS = `${Math.abs(s.lat).toFixed(3)}°${s.lat < 0 ? 'S' : 'N'}, ${s.lon.toFixed(3)}°E`;
    $('#skyReadouts').innerHTML = `
      <div class="ro"><span class="k">${utc(timeOf(i))} UTC</span><span class="d">${pill(ser.lit[i], t('power'), t('dark'), 'on-sun')} ${pill(ser.dte[i], t('link'), t('noLink'), 'on-earth')}</span></div>
      <div class="ro"><span class="k">${t('sunNow')}</span><span class="v">${fmt(sunClr, 2)}°</span><span class="d">${t('clearance')} · ${fmt(ser.sunFrac[i] * 100, 0)}% ${t('visibleDisk')}</span><span class="d mono">el ${fmt(ser.sunEl[i], 2)}° az ${fmt(ser.sunAz[i], 1)}°</span></div>
      <div class="ro"><span class="k">${t('earthNow')}</span><span class="v">${fmt(eClr, 2)}°</span><span class="d">${t('clearance')} · ${t('phase')} ${fmt(g.earthIllum[i] * 100, 0)}%</span><span class="d mono">el ${fmt(ser.earthEl[i], 2)}° az ${fmt(ser.earthAz[i], 1)}°</span></div>
      <div class="ro"><span class="k">${t('dsnNow')}</span><span class="v" style="font-size:17px">${dsnIn.length ? dsnIn.join(', ') : t('none')}</span><span class="d">≥ ${state.cfg.dsnMinDeg}°</span></div>
      <div class="ro"><span class="k">${t('siteElev')}</span><span class="v">${fmt(s.heightM, 0)} m</span><span class="d mono">${latS}</span><span class="d">${t('hzSrc')}: ${t(s.hsrc)}${s.snapped ? ' (' + t('fit') + ')' : ''}</span></div>`;
    drawPano();
    renderEvents();
  }
  function drawPano() {
    const id = state.focus, s = site(id), ser = state.series[id], g = state.grid, n = g.n;
    const { ctx, w, h } = canvasSetup($('#pano'));
    const hz = E.makeHorizon(s);
    const x0 = 36, x1 = w - 8, y0 = 8, y1 = h - 24;
    const ppdH = (x1 - x0) / 360;
    let lo = 0, hi = 0;
    for (let a = 0; a < 360; a++) { const v = hz(a); lo = Math.min(lo, v); hi = Math.max(hi, v); }
    for (let i = 0; i < n; i += 4) { lo = Math.min(lo, ser.sunEl[i], ser.earthEl[i]); hi = Math.max(hi, ser.sunEl[i], ser.earthEl[i]); }
    let mMin = 0; for (let a = 0; a < 360; a++) mMin = Math.min(mMin, hz(a));
    lo = Math.floor(Math.max(lo, mMin - 4) - 1.5); hi = Math.ceil(Math.min(hi, 80) + 2.5);
    let ppdV = ppdH * state.exag;
    const need = (hi - lo) * ppdV;
    let fitted = false;
    if (need > (y1 - y0)) { ppdV = (y1 - y0) / (hi - lo); fitted = true; }
    const mid = (lo + hi) / 2, yMid = (y0 + y1) / 2;
    const X = az => x0 + az * ppdH, Y = el => yMid - (el - mid) * ppdV;
    // sky
    const sky = ctx.createLinearGradient(0, y0, 0, y1);
    sky.addColorStop(0, cssv('--sky-top')); sky.addColorStop(1, cssv('--sky-bot'));
    ctx.fillStyle = sky; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    // elevation grid
    const stepE = (y1 - y0) / ppdV > 30 ? 10 : (y1 - y0) / ppdV > 12 ? 5 : 2;
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.font = '11px ' + cssv('--f-mono');
    for (let v = Math.ceil((mid - (yMid - y0) / ppdV) / stepE) * stepE; Y(v) >= y0; v += stepE) {
      if (Y(v) > y1) continue;
      ctx.strokeStyle = cssv('--line'); ctx.lineWidth = 1; ctx.setLineDash(v === 0 ? [5, 4] : []);
      ctx.beginPath(); ctx.moveTo(x0, Math.round(Y(v)) + .5); ctx.lineTo(x1, Math.round(Y(v)) + .5); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = cssv('--muted'); ctx.fillText(v + '°', x0 - 5, Y(v));
    }
    // tracks
    const stride = Math.max(1, Math.floor(n / 1500));
    const dot = (az, el, col, a) => { ctx.globalAlpha = a; ctx.fillStyle = col; ctx.fillRect(X(az) - 1, Y(el) - 1, 2, 2); };
    for (let i = 0; i < n; i += stride) { dot(ser.sunAz[i], ser.sunEl[i], cssv('--sun'), 0.55); dot(ser.earthAz[i], ser.earthEl[i], cssv('--earth'), 0.55); }
    ctx.globalAlpha = 1;
    // bodies at cursor
    const i = state.cursor;
    const sunD = Math.hypot(g.sun[i * 3], g.sun[i * 3 + 1], g.sun[i * 3 + 2]);
    const rSun = Math.asin(E.SUN_R / sunD) * 180 / Math.PI;
    const eD = Math.hypot(g.earth[i * 3], g.earth[i * 3 + 1], g.earth[i * 3 + 2]);
    const rE = Math.asin(E.EARTH_R / eD) * 180 / Math.PI;
    const sx = X(ser.sunAz[i]), sy = Y(ser.sunEl[i]);
    const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, 26);
    glow.addColorStop(0, cssv('--sun')); glow.addColorStop(1, 'transparent');
    ctx.globalAlpha = 0.45; ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(sx, sy, 26, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
    const rs = Math.max(6, rSun * ppdV);
    ctx.fillStyle = cssv('--sun');
    ctx.beginPath(); ctx.arc(sx, sy, rs, 0, 7); ctx.fill();
    // Earth with phase
    const ex = X(ser.earthAz[i]), ey = Y(ser.earthEl[i]);
    const rx = Math.max(8, rE * ppdV), ry = rx;
    ctx.fillStyle = cssv('--none'); ctx.beginPath(); ctx.arc(ex, ey, rx, 0, 7); ctx.fill();
    ctx.strokeStyle = cssv('--earth'); ctx.lineWidth = 1; ctx.stroke();
    let dAz = ser.sunAz[i] - ser.earthAz[i]; dAz = ((dAz + 540) % 360) - 180;
    const ang = Math.atan2(-(ser.sunEl[i] - ser.earthEl[i]) * ppdV, dAz * ppdH);
    const f = g.earthIllum[i];
    ctx.save(); ctx.translate(ex, ey); ctx.rotate(ang);
    ctx.fillStyle = cssv('--earth');
    ctx.beginPath(); ctx.arc(0, 0, rx, -Math.PI / 2, Math.PI / 2, false);
    const k = (2 * f - 1) * rx;
    ctx.ellipse(0, 0, Math.abs(k), rx, 0, Math.PI / 2, -Math.PI / 2, k > 0 ? false : true);
    ctx.fill(); ctx.restore();
    // terrain on top so it hides what is behind it
    ctx.fillStyle = cssv('--terrain');
    ctx.beginPath(); ctx.moveTo(x0, y1);
    for (let a = 0; a <= 360; a += 0.5) ctx.lineTo(X(a), Math.min(y1, Y(hz(a % 360))));
    ctx.lineTo(x1, y1); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = cssv('--fg2'); ctx.lineWidth = 1;
    ctx.beginPath(); for (let a = 0; a <= 360; a += 0.5) { const yy = Math.min(y1, Y(hz(a % 360))); if (a === 0) ctx.moveTo(X(a), yy); else ctx.lineTo(X(a), yy); } ctx.stroke();
    // labels on bodies
    ctx.font = '600 12px ' + cssv('--f-body'); ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    const lbl = (x, y, txt, col, hidden) => {
      const yy = Math.max(y0 + 14, y - 14);
      ctx.fillStyle = col; ctx.fillText(txt + (hidden ? (lang === 'fr' ? ' (caché)' : ' (hidden)') : ''), x, yy);
    };
    lbl(sx, sy - rs, t('sunNow'), cssv('--fg'), ser.sunFrac[i] <= 0);
    lbl(ex, ey - ry, t('earthNow'), cssv('--fg'), ser.earthEl[i] < ser.earthHz[i]);
    // azimuth axis
    ctx.font = '11px ' + cssv('--f-mono'); ctx.textBaseline = 'top'; ctx.fillStyle = cssv('--muted');
    const card = { 0: 'N', 90: 'E', 180: 'S', 270: 'W', 360: 'N' };
    for (let a = 0; a <= 360; a += 30) {
      ctx.textAlign = a === 0 ? 'left' : a === 360 ? 'right' : 'center';
      ctx.fillText(card[a] ? `${card[a]}` : a + '°', X(a), y1 + 5);
    }
    ctx.textAlign = 'right'; ctx.textBaseline = 'top';
    ctx.fillStyle = cssv('--fg2');
    const realEx = ppdV / ppdH;
    ctx.fillText(`${realEx.toFixed(1)}× ${t('stretchNote')}${fitted ? ' (' + t('fit') + ')' : ''}`, x1 - 6, y0 + 6);
  }
  function renderEvents() {
    const ser = state.series[state.focus], g = state.grid;
    const kinds = [['lit', 'sunrise', 'sunset'], ['earthUp', 'earthrise', 'earthset'], ['dte', 'linkOn', 'linkOff']];
    const ev = [];
    for (let i = Math.max(1, state.cursor + 1); i < g.n && ev.length < 40; i++) {
      for (const [k, on, off] of kinds) if (ser[k][i] !== ser[k][i - 1]) ev.push([i, ser[k][i] ? on : off]);
    }
    ev.sort((a, b) => a[0] - b[0]);
    const tb = $('#eventsTable');
    if (!ev.length) { tb.innerHTML = `<tr><td>${t('noEvents')}</td></tr>`; return; }
    const now = timeOf(state.cursor);
    tb.innerHTML = `<thead><tr><th class="nosort">${t('evType')}</th><th class="nosort">${t('evTime')}</th><th class="nosort">${t('evIn')}</th></tr></thead><tbody>` +
      ev.slice(0, 14).map(([i, k]) => `<tr class="click" data-i="${i}"><td>${t(k)}</td><td class="num">${utc(timeOf(i))}</td><td class="num">${dur((timeOf(i) - now) / HOUR)}</td></tr>`).join('') + '</tbody>';
  }
  $('#eventsTable').addEventListener('click', e => { const tr = e.target.closest('tr[data-i]'); if (tr) setCursor(+tr.dataset.i); });
  $('#exag').addEventListener('change', e => { state.exag = +e.target.value; drawPano(); });

  /* ---------- planner */
  function planInputs() {
    return {
      days: Math.max(1, Math.min(60, +$('#planDays').value || 10)), score: $('#planScore').value,
      litTD: $('#planLitTD').checked, commTD: $('#planCommTD').checked, sunMin: +$('#planSunMin').value
    };
  }
  function computePlan() {
    const P = planInputs(), g = state.grid;
    const win = Math.round(P.days * DAY / g.stepMs);
    const candStep = Math.max(1, Math.round(6 * HOUR / g.stepMs));
    const cands = [];
    for (let i = 0; i + win < g.n; i += candStep) cands.push(i);
    const rows = state.selected.map(id => {
      const s = state.series[id];
      const arr = P.score === 'ops' ? s.ops : P.score === 'lit' ? s.lit : s.dte;
      const pre = new Float64Array(g.n + 1);
      for (let i = 0; i < g.n; i++) pre[i + 1] = pre[i] + arr[i];
      const cells = cands.map(i => {
        const ok = (!P.litTD || s.lit[i]) && (!P.commTD || s.dte[i]) && (s.sunEl[i] - s.sunHz[i] >= P.sunMin);
        return { i, score: 100 * (pre[i + win] - pre[i]) / win, ok };
      });
      return { id, cells };
    });
    state.plan = { P, win, cands, rows };
    return state.plan;
  }
  function renderPlan() {
    if (!state.selected.length) { $('#bestTable').innerHTML = `<tr><td>${t('noSel')}</td></tr>`; canvasSetup($('#heat')); return; }
    const plan = computePlan();
    drawHeat();
    const legend = $('#heatLegend');
    legend.innerHTML = `<span>0%</span><span class="ramp" style="background:linear-gradient(90deg,var(--heat0),var(--heat1),var(--heat2),var(--heat3))"></span><span>100%</span>
      <span><i class="sw" style="background:var(--none);opacity:.5"></i> ${t('infeasible')}</span>`;
    if (!plan.cands.length) { $('#bestTable').innerHTML = `<tr><td>${t('planShort')}</td></tr>`; return; }
    // best opportunities: greedy, at least 3 days apart per site
    const all = [];
    plan.rows.forEach(r => r.cells.forEach(c => { if (c.ok) all.push({ id: r.id, i: c.i, score: c.score }); }));
    all.sort((a, b) => b.score - a.score);
    const picked = [];
    for (const c of all) {
      if (picked.length >= 12) break;
      if (picked.some(p => p.id === c.id && Math.abs(p.i - c.i) * state.grid.stepMs < 3 * DAY)) continue;
      picked.push(c);
    }
    const g = state.grid;
    $('#bestTable').innerHTML = `<thead><tr><th class="nosort">${t('rank')}</th><th class="nosort l">${t('colSite')}</th><th class="nosort">${t('touchdown')}</th><th class="nosort">${t('scoreCol')}</th><th class="nosort">${t('colLit')}</th><th class="nosort">${t('colDte')}</th><th class="nosort">${t('colNight')}</th><th class="nosort">${t('colGap')}</th></tr></thead><tbody>` +
      picked.map((p, k) => {
        const s = state.series[p.id], i1 = p.i + plan.win;
        const sm = E.summarize(s, g, p.i, i1);
        return `<tr class="click" data-i="${p.i}" data-id="${esc(p.id)}"><td class="num">${k + 1}</td><td class="nm l"><i class="dot" style="background:${colorOf(p.id)}"></i>${esc(site(p.id).name)}</td>
          <td class="num">${utc(timeOf(p.i))}</td><td class="num">${fmt(p.score, 0)}%</td><td class="num">${fmt(sm.litPct, 0)}%</td><td class="num">${fmt(sm.dtePct, 0)}%</td>
          <td class="num">${dur(sm.longestNightH)}</td><td class="num">${dur(sm.longestBlackoutH)}</td></tr>`;
      }).join('') + '</tbody>';
  }
  const heatGeom = {};
  function drawHeat() {
    const box = $('#heatBox');
    const rows = state.selected.length;
    box.style.height = Math.max(90, rowLayout(box.clientWidth, rows).height) + 'px';
    const { ctx, w } = canvasSetup($('#heat'));
    const plan = state.plan; if (!plan || !plan.cands.length) return;
    const L = rowLayout(w, rows), { x0, x1, rh, gap, top } = L;
    Object.assign(heatGeom, { x0, x1, rh, gap, top });
    const g = state.grid, nC = plan.cands.length;
    const ramp = [cssv('--heat0'), cssv('--heat1'), cssv('--heat2'), cssv('--heat3')].map(hex2rgb);
    const tEnd = timeOf(g.n - 1);
    const XT = ms => x0 + (ms - g.start) / (tEnd - g.start) * (x1 - x0);
    plan.rows.forEach((r, k) => {
      const y = top + k * (rh + gap);
      rowLabel(ctx, L, r.id, y);
      const cw = (XT(timeOf(plan.cands[Math.min(1, nC - 1)])) - XT(timeOf(plan.cands[0]))) || (x1 - x0) / nC;
      r.cells.forEach(c => {
        const x = XT(timeOf(c.i));
        if (c.ok) { ctx.fillStyle = rampColor(ramp, c.score / 100); ctx.globalAlpha = 1; }
        else { ctx.fillStyle = cssv('--none'); ctx.globalAlpha = 0.5; }
        ctx.fillRect(x, y, Math.max(1, cw + 0.4), rh);
      });
      ctx.globalAlpha = 1;
    });
    ctx.font = '11px ' + cssv('--f-mono');
    const yb = top + rows * (rh + gap) - gap;
    drawTimeAxis(ctx, x0, x1, yb + 2, g.start, tEnd);
    drawCursor(ctx, XT(timeOf(state.cursor)), 0, yb + 2);
  }
  function hex2rgb(hx) {
    hx = hx.replace('#', ''); if (hx.length === 3) hx = hx.split('').map(c => c + c).join('');
    return [parseInt(hx.slice(0, 2), 16), parseInt(hx.slice(2, 4), 16), parseInt(hx.slice(4, 6), 16)];
  }
  function rampColor(r, f) {
    f = Math.max(0, Math.min(1, f)) * (r.length - 1);
    const k = Math.min(r.length - 2, Math.floor(f)), u = f - k;
    const c = r[k].map((v, j) => Math.round(v + (r[k + 1][j] - v) * u));
    return `rgb(${c[0]},${c[1]},${c[2]})`;
  }
  function heatHit(e) {
    const plan = state.plan; if (!plan || !plan.cands.length) return null;
    const rc = $('#heat').getBoundingClientRect(), x = e.clientX - rc.left, y = e.clientY - rc.top;
    const { x0, x1, rh, gap, top } = heatGeom;
    if (x < x0 || x > x1) return null;
    const row = plan.rows[Math.floor((y - top) / (rh + gap))]; if (!row) return null;
    const g = state.grid, ms = g.start + (x - x0) / (x1 - x0) * (timeOf(g.n - 1) - g.start);
    let best = row.cells[0];
    for (const c of row.cells) if (Math.abs(timeOf(c.i) - ms) < Math.abs(timeOf(best.i) - ms)) best = c;
    return { row, cell: best };
  }
  $('#heat').addEventListener('mousemove', e => {
    const hit = heatHit(e); if (!hit) { hideTip(); return; }
    showTip(`<div class="t">${t('touchdown')}: ${utc(timeOf(hit.cell.i))}</div><b>${esc(site(hit.row.id).name)}</b>
      <div class="r"><span>${t('scoreCol')}</span><span>${fmt(hit.cell.score, 0)}%</span></div>${hit.cell.ok ? '' : `<div>${t('infeasible')}</div>`}`, e.clientX, e.clientY);
  });
  $('#heat').addEventListener('mouseleave', hideTip);
  $('#heat').addEventListener('click', e => { const hit = heatHit(e); if (hit) { state.focus = hit.row.id; setCursor(hit.cell.i); renderSiteList(); } });
  $('#bestTable').addEventListener('click', e => { const tr = e.target.closest('tr[data-i]'); if (tr) { state.focus = tr.dataset.id; setCursor(+tr.dataset.i); renderSiteList(); } });
  $('#planForm').addEventListener('change', renderPlan);
  $('#planForm').addEventListener('submit', e => e.preventDefault());

  /* ---------- map */
  const baseImg = new Image();
  baseImg.onload = () => { if (state.tab === 'map') drawMap(); };
  baseImg.src = DATA.basemap;
  const mapGeom = {};
  function drawMap() {
    const { ctx, w, h } = canvasSetup($('#map'));
    const S = Math.min(w, h), ox = (w - S) / 2, oy = (h - S) / 2, half = DATA.assets.basemap.half_m;
    Object.assign(mapGeom, { S, ox, oy, half });
    const P = (lat, lon) => { const [x, y] = polarXY(lat, lon); return [ox + S / 2 + x / half * S / 2, oy + S / 2 - y / half * S / 2]; };
    mapGeom.P = P;
    ctx.save(); ctx.beginPath(); ctx.arc(ox + S / 2, oy + S / 2, S / 2, 0, 7); ctx.clip();
    if (baseImg.complete && baseImg.naturalWidth) ctx.drawImage(baseImg, ox, oy, S, S);
    // rings and meridians
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1; ctx.fillStyle = 'rgba(255,255,255,.85)';
    ctx.font = '11px ' + cssv('--f-mono'); ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
    for (const lat of [-82, -84, -86, -88]) {
      const r = P(lat, 0)[1] - (oy + S / 2);
      ctx.beginPath(); ctx.arc(ox + S / 2, oy + S / 2, Math.abs(r), 0, 7); ctx.stroke();
      ctx.fillText(`${-lat}°S`, ox + S / 2 + 3, oy + S / 2 - Math.abs(r) - 1);
    }
    for (let lon = 0; lon < 360; lon += 30) {
      const [ex, ey] = P(-80, lon);
      ctx.beginPath(); ctx.moveTo(ox + S / 2, oy + S / 2); ctx.lineTo(ex, ey); ctx.stroke();
    }
    ctx.restore();
    // longitude labels inside the edge
    ctx.fillStyle = cssv('--fg'); ctx.font = '11px ' + cssv('--f-mono'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let lon = 0; lon < 360; lon += 30) {
      const [lx, ly] = P(-80.45, lon);
      const lbl = lon === 0 ? '0°' : lon <= 180 ? `${lon}°E` : `${360 - lon}°W`;
      ctx.save(); ctx.fillStyle = 'rgba(0,0,0,.55)';
      const tw = ctx.measureText(lbl).width; ctx.fillRect(lx - tw / 2 - 3, ly - 8, tw + 6, 16);
      ctx.fillStyle = '#fff'; ctx.fillText(lbl, lx, ly); ctx.restore();
    }
    // Sun / Earth direction arrows from the pole
    if (state.grid) {
      const g = state.grid, i = state.cursor;
      const arrow = (v, col, label) => {
        const lon = Math.atan2(v[1], v[0]) * 180 / Math.PI;
        const [ax, ay] = P(-81.3, lon), cx = ox + S / 2, cy = oy + S / 2;
        ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.setLineDash([7, 5]);
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(ax, ay); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = col; ctx.beginPath(); ctx.arc(ax, ay, 7, 0, 7); ctx.fill();
        ctx.font = '600 12px ' + cssv('--f-body'); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
        ctx.save(); ctx.fillStyle = 'rgba(0,0,0,.6)'; const tw = ctx.measureText(label).width; ctx.fillRect(ax - tw / 2 - 4, ay - 26, tw + 8, 17); ctx.restore();
        ctx.fillText(label, ax, ay - 11);
      };
      arrow([g.sun[i * 3], g.sun[i * 3 + 1]], cssv('--sun'), t('sunNow'));
      arrow([g.earth[i * 3], g.earth[i * 3 + 1]], cssv('--earth'), t('earthNow'));
    }
    // sites
    mapGeom.pts = [];
    const labels = [];
    for (const s of state.sites) {
      if (s.lat > -80) continue;
      const [x, y] = P(s.lat, s.lon);
      const sel = state.selected.includes(s.id);
      const ser = state.series[s.id];
      const lit = ser && ser.lit[state.cursor];
      mapGeom.pts.push({ id: s.id, x, y });
      ctx.lineWidth = 2;
      if (lit) { ctx.fillStyle = cssv('--sun'); ctx.beginPath(); ctx.arc(x, y, 10, 0, 7); ctx.fill(); }
      ctx.fillStyle = sel ? colorOf(s.id) : 'rgba(0,0,0,.5)';
      ctx.strokeStyle = '#fff';
      ctx.beginPath(); ctx.arc(x, y, sel ? 6 : 4, 0, 7); ctx.fill(); ctx.stroke();
      if (sel || s.id === state.focus) labels.push({ s, x, y });
    }
    // labels: try right, left, below, above; skip a label that cannot be placed without overlap
    const boxes = [];
    const hitsBox = b => boxes.some(o => b.x < o.x + o.w && b.x + b.w > o.x && b.y < o.y + o.h && b.y + b.h > o.y);
    labels.sort((a, b) => (b.s.id === state.focus) - (a.s.id === state.focus));
    for (const { s, x, y } of labels) {
      ctx.font = (s.id === state.focus ? '600 ' : '') + '12px ' + cssv('--f-body');
      const tw = ctx.measureText(s.name).width + 8, th = 18;
      const tries = [{ x: x + 11, y: y - 9 }, { x: x - 11 - tw, y: y - 9 }, { x: x - tw / 2, y: y + 10 }, { x: x - tw / 2, y: y - 28 }];
      const spot = tries.map(p => ({ x: p.x, y: p.y, w: tw, h: th })).find(b => !hitsBox(b));
      if (!spot) continue;
      boxes.push(spot);
      ctx.fillStyle = 'rgba(0,0,0,.62)'; ctx.fillRect(spot.x, spot.y, tw, th);
      ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(s.name, spot.x + 4, spot.y + th / 2);
    }
    // outside-map sites note
    const off = state.sites.filter(s => s.lat > -80 && state.selected.includes(s.id)).map(s => s.name);
    if (off.length) {
      ctx.font = '11px ' + cssv('--f-body'); ctx.fillStyle = cssv('--muted'); ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillText((lang === 'fr' ? 'Hors carte : ' : 'Off map: ') + off.join(', '), 4, 4);
    }
  }
  function mapLatLon(e) {
    const r = $('#map').getBoundingClientRect(), { S, ox, oy, half } = mapGeom;
    const x = (e.clientX - r.left - ox - S / 2) / (S / 2) * half, y = -(e.clientY - r.top - oy - S / 2) / (S / 2) * half;
    const rr = Math.hypot(x, y);
    const lat = 2 * Math.atan(rr / (2 * RM)) * 180 / Math.PI - 90;
    const lon = Math.atan2(x, y) * 180 / Math.PI;
    return { lat, lon, inside: rr <= half, mx: e.clientX - r.left, my: e.clientY - r.top };
  }
  function mapHitSite(m) { return (mapGeom.pts || []).find(p => Math.hypot(p.x - m.mx, p.y - m.my) < 9); }
  $('#map').addEventListener('mousemove', e => {
    const m = mapLatLon(e); if (!m.inside) { hideTip(); return; }
    const hs = mapHitSite(m);
    if (hs) {
      const s = site(hs.id), sm = state.sums[hs.id];
      showTip(`<b>${esc(s.name)}</b><div class="t">${Math.abs(s.lat).toFixed(3)}°S ${s.lon.toFixed(3)}°E · ${fmt(s.heightM, 0)} m</div>` +
        (sm ? `<div class="r"><span>${t('colLit')}</span><span>${fmt(sm.litPct, 0)}%</span></div><div class="r"><span>${t('colDte')}</span><span>${fmt(sm.dtePct, 0)}%</span></div>` : '') +
        (s.note ? `<div>${esc(s.note)}</div>` : '') + (s.source ? `<div class="t">${esc(s.source)}</div>` : ''), e.clientX, e.clientY);
    } else showTip(`<div class="t">${Math.abs(m.lat).toFixed(3)}°S ${m.lon.toFixed(3)}°E</div>`, e.clientX, e.clientY);
  });
  $('#map').addEventListener('mouseleave', hideTip);
  $('#map').addEventListener('click', e => {
    const m = mapLatLon(e); if (!m.inside) return;
    const hs = mapHitSite(m);
    if (hs) { setFocus(hs.id); return; }
    $('#newLat').value = m.lat.toFixed(4); $('#newLon').value = m.lon.toFixed(4);
    $('#addSiteBox').open = true; $('#addMsg').textContent = t('coordsSet'); $('#addMsg').className = 'form-msg full';
    toast(t('coordsSet'));
    if (window.innerWidth <= 900) $('#addSiteBox').scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  /* ---------- CSV export */
  function buildCSV() {
    const g = state.grid, ids = state.selected;
    const head = ['utc'];
    for (const id of ids) for (const c of ['sun_el', 'sun_az', 'sun_horizon', 'sun_visible_frac', 'earth_el', 'earth_az', 'earth_horizon', 'earth_link', 'power_and_link'])
      head.push(`${id}_${c}`);
    const lines = [head.join(',')];
    for (let i = 0; i < g.n; i++) {
      const row = [new Date(timeOf(i)).toISOString().slice(0, 16) + 'Z'];
      for (const id of ids) {
        const s = state.series[id];
        row.push(s.sunEl[i].toFixed(3), s.sunAz[i].toFixed(2), s.sunHz[i].toFixed(3), s.sunFrac[i].toFixed(3),
          s.earthEl[i].toFixed(3), s.earthAz[i].toFixed(2), s.earthHz[i].toFixed(3), s.dte[i], s.ops[i]);
      }
      lines.push(row.join(','));
    }
    return lines.join('\n') + '\n';
  }
  $('#copyCsv').addEventListener('click', () => {
    const csv = buildCSV();
    navigator.clipboard.writeText(csv).then(() => toast(t('copied')), () => fallbackText(csv));
  });
  $('#dlCsv').addEventListener('click', () => {
    const blob = new Blob([buildCSV()], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `clps-sites-${utc(state.start, false)}.csv`; document.body.appendChild(a); a.click(); a.remove();
  });
  function fallbackText(text) {
    let ta = $('#csvFallback');
    if (!ta) {
      ta = document.createElement('textarea'); ta.id = 'csvFallback'; ta.rows = 6; ta.style.width = '100%';
      ta.setAttribute('aria-label', 'CSV'); $('#cmpNote').after(ta);
    }
    ta.value = text; ta.focus(); ta.select(); toast(t('copyFail'));
  }

  /* ---------- horizon CSV import/export (focused site) */
  const skyHead = document.querySelector('#view-sky .panel-head');
  const hzTools = document.createElement('div'); hzTools.className = 'actions';
  hzTools.innerHTML = `<label class="btn ghost" for="maskFile" id="maskLbl"></label><input type="file" id="maskFile" accept=".csv,.txt" hidden>
    <button class="btn ghost" type="button" id="copyMask"></button>`;
  skyHead.appendChild(hzTools);
  $('#maskFile').addEventListener('change', async e => {
    const f = e.target.files[0]; if (!f) return;
    try {
      const mask = E.parseMask(await f.text());
      const s = site(state.focus); s.mask = mask; s.hsrc = 'imported';
      maskOverrides[s.id] = mask; store.set('maskOverrides', maskOverrides);
      if (s.custom) saveCustom();
      toast(`${t('maskImported')} ${s.name}`);
      computeSeries();
    } catch (err) { toast(err.message); }
    e.target.value = '';
  });
  $('#copyMask').addEventListener('click', () => {
    const s = site(state.focus), hz = E.makeHorizon(s);
    const csv = 'azimuth_deg,elevation_deg\n' + Array.from({ length: 360 }, (_, a) => `${a},${hz(a).toFixed(3)}`).join('\n') + '\n';
    navigator.clipboard.writeText(csv).then(() => toast(t('copied')), () => toast(t('copyFail')));
  });

  /* ---------- method */
  function renderMethod() {
    const el = $('#methodText');
    el.innerHTML = lang === 'fr' ? METHOD_FR : METHOD_EN;
    $('#maskLbl').textContent = t('importMask'); $('#copyMask').textContent = t('copyMask');
  }
  const VALID = DATA.validation;
  const vtable = () => `<table><thead><tr><th class="nosort">Point</th><th class="nosort">${lang === 'fr' ? 'Publié' : 'Published'}</th><th class="nosort">${lang === 'fr' ? 'Cet outil' : 'This tool'}</th></tr></thead><tbody>` +
    VALID.map(v => `<tr><td>${esc(v.name)}</td><td class="num">${v.pub}%</td><td class="num">${v.ours.toFixed(1)}%</td></tr>`).join('') + '</tbody></table>';
  const METHOD_EN_F = () => `
    <h2>What this tool computes</h2>
    <p>For every site and every time step it finds where the Sun and the Earth stand in the local sky (elevation and azimuth) and compares them with the terrain horizon of that exact spot. From this it derives when a lander has solar power, when it can talk directly to Earth, and how long the nights and communication gaps last.</p>
    <h3>Ephemerides and lunar orientation</h3>
    <ul>
      <li>Geocentric Moon and Sun from <a href="https://github.com/cosinekitty/astronomy" target="_blank" rel="noopener">Astronomy Engine</a> 2.1.19 (MIT): about 1 arcminute for the Moon, about 1 arcsecond for the Sun.</li>
      <li>Moon-fixed frame from the IAU/WGCCRE rotation model of the Moon (pole, prime meridian and libration terms). Cross-checked against an independent physical-libration series: the sub-Earth point agrees to 0.03° over a full year.</li>
      <li>Topocentric directions use the site position on the 1737.4 km sphere plus its LOLA height, so the 0.26° parallax of Earth is included.</li>
    </ul>
    <h3>Terrain horizon</h3>
    <ul>
      <li>Preset sites: 360 rays (1° apart) cast over 600 km of LOLA terrain, using the 40 m/px model within 80°S and 240 m/px beyond it (<code>tools/horizon_from_dem.py</code>). The curvature of the Moon is included; the observer stands 2 m above the ground (a lander's solar array or antenna).</li>
      <li>Sites you add: the same ray casting runs in your browser on a compact copy of the LOLA model (240 m/px near the pole, 1 km/px down to 75°S).</li>
      <li>Published coordinates of high-illumination points and Artemis regions are rounded or region-level, so these points are moved to the highest terrain within 1 to 2 km (marked “fitted”). Landed spacecraft keep their exact coordinates.</li>
      <li>You can import any horizon as a CSV of <code>azimuth,elevation</code> rows, for example from a finer DEM.</li>
    </ul>
    <h3>Rules</h3>
    <ul>
      <li><b>Sunlit</b>: the visible fraction of the solar disk (0.53° wide) above the terrain reaches the chosen threshold. <b>Solar energy</b> averages that fraction, as for a vertical panel that tracks the Sun.</li>
      <li><b>Earth link</b>: the centre of the Earth clears the horizon by the chosen margin and, if enabled, at least one Deep Space Network complex (Goldstone, Madrid, Canberra) sees the Moon above its minimum elevation.</li>
      <li><b>Pick a landing date</b> scores every touchdown time (every 6 h) by the share of the surface mission that meets the chosen goal, and greys out times that break a touchdown rule.</li>
    </ul>
    <h3>Validation</h3>
    <p>Annual illumination of the classic south-pole high-illumination points, 2020, Sun centre above terrain, compared with Bussey et al. (2010, Icarus 208), who used Kaguya topography. Their point coordinates come from that older terrain model, which is why the points are fitted to the local LOLA summit:</p>
    ${vtable()}
    <p>Mean difference ${DATA.validationMean.toFixed(1)} percentage points. Other checks, run by <code>tests/engine.test.js</code>: Chandrayaan-3 and Blue Ghost 1 touched down a few degrees after local sunrise; Blue Ghost 1's site goes dark on 2025-03-16, the day its mission ended; Odysseus' site stays in daylight until after its last contact on 2024-02-29.</p>
    <h3>Limits</h3>
    <ul>
      <li>Terrain at 40 to 240 m per pixel smooths small boulders and crater rims. Use a 5 m LOLA product through the Python tool for final site certification.</li>
      <li>The Earth link test is geometric: it does not model antenna patterns, link budgets, DSN scheduling, or lunar relay satellites.</li>
      <li>Earth is treated as a point for visibility and the Sun as a uniform disk; refraction is zero on the Moon.</li>
    </ul>
    <h3>Data sources</h3>
    <ul>
      <li>LOLA GDR polar DEMs LDEM_80S_40M and LDEM_60S_240M, NASA PDS Geosciences Node / <a href="https://imbrium.mit.edu/DATA/LOLA_GDR/POLAR/IMG/" target="_blank" rel="noopener">imbrium.mit.edu</a>.</li>
      <li>Site coordinates: see each site's tooltip. Artemis III points from Peña-Asensio et al., <a href="https://arxiv.org/abs/2406.19863" target="_blank" rel="noopener">arXiv:2406.19863</a>; high-illumination points as listed in <a href="https://en.wikipedia.org/wiki/Peak_of_eternal_light" target="_blank" rel="noopener">Peak of eternal light</a>; landed missions from LRO/LROC confirmations.</li>
    </ul>`;
  const METHOD_FR_F = () => `
    <h2>Ce que calcule l’outil</h2>
    <p>Pour chaque site et chaque pas de temps, l’outil calcule où se trouvent le Soleil et la Terre dans le ciel local (hauteur et azimut) et les compare à l’horizon du relief à cet endroit précis. Il en déduit quand un atterrisseur a de l’énergie solaire, quand il peut communiquer directement avec la Terre, et la durée des nuits et des coupures de liaison.</p>
    <h3>Éphémérides et orientation de la Lune</h3>
    <ul>
      <li>Positions géocentriques de la Lune et du Soleil par <a href="https://github.com/cosinekitty/astronomy" target="_blank" rel="noopener">Astronomy Engine</a> 2.1.19 (MIT) : environ 1 minute d’arc pour la Lune, 1 seconde d’arc pour le Soleil.</li>
      <li>Repère lunaire fixe issu du modèle de rotation IAU/WGCCRE (pôle, méridien origine, termes de libration). Vérifié avec une série de libration physique indépendante : le point sous-terrestre concorde à 0,03° près sur un an.</li>
      <li>Les directions sont calculées depuis la position réelle du site (sphère de 1737,4 km plus son altitude LOLA) : la parallaxe de la Terre (0,26°) est prise en compte.</li>
    </ul>
    <h3>Horizon du relief</h3>
    <ul>
      <li>Sites prédéfinis : 360 rayons (tous les 1°) lancés sur 600 km de relief LOLA, avec le modèle à 40 m/pixel jusqu’à 80°S et à 240 m/pixel au-delà (<code>tools/horizon_from_dem.py</code>). La courbure de la Lune est incluse ; l’observateur est à 2 m du sol (panneau ou antenne d’un atterrisseur).</li>
      <li>Sites ajoutés : le même calcul tourne dans le navigateur sur une copie compacte du relief LOLA (240 m/pixel près du pôle, 1 km/pixel jusqu’à 75°S).</li>
      <li>Les coordonnées publiées des points très éclairés et des régions Artemis sont arrondies ou valables pour une région : ces points sont déplacés vers le relief le plus haut à moins de 1 à 2 km (mention « ajusté »). Les sondes posées gardent leurs coordonnées exactes.</li>
      <li>Vous pouvez importer n’importe quel horizon sous forme de CSV <code>azimut,élévation</code>, par exemple issu d’un relief plus fin.</li>
    </ul>
    <h3>Règles</h3>
    <ul>
      <li><b>Au soleil</b> : la fraction visible du disque solaire (0,53°) au-dessus du relief atteint le seuil choisi. L’<b>énergie solaire</b> est la moyenne de cette fraction, comme pour un panneau vertical qui suit le Soleil.</li>
      <li><b>Liaison Terre</b> : le centre de la Terre dépasse l’horizon de la marge choisie et, si l’option est cochée, au moins un complexe du Deep Space Network (Goldstone, Madrid, Canberra) voit la Lune au-dessus de son élévation minimale.</li>
      <li><b>Choisir une date</b> évalue chaque heure d’atterrissage (toutes les 6 h) selon la part de la mission qui respecte l’objectif choisi, et grise les heures qui violent une règle d’atterrissage.</li>
    </ul>
    <h3>Validation</h3>
    <p>Ensoleillement annuel (2020, centre du Soleil au-dessus du relief) des points très éclairés du pôle Sud, comparé à Bussey et al. (2010, Icarus 208), qui utilisaient le relief Kaguya. Leurs coordonnées viennent de ce modèle plus ancien, d’où l’ajustement des points sur le sommet local LOLA :</p>
    ${vtable()}
    <p>Écart moyen : ${DATA.validationMean.toFixed(1).replace('.', ',')} points. Autres vérifications (<code>tests/engine.test.js</code>) : Chandrayaan-3 et Blue Ghost 1 se sont posés quelques degrés après le lever du Soleil local ; le site de Blue Ghost 1 passe dans la nuit le 16/03/2025, jour de la fin de sa mission ; celui d’Odysseus reste au soleil après son dernier contact du 29/02/2024.</p>
    <h3>Limites</h3>
    <ul>
      <li>Un relief à 40–240 m par pixel lisse les rochers et les petits rebords. Pour certifier un site, utilisez un produit LOLA à 5 m avec l’outil Python.</li>
      <li>Le test de liaison est géométrique : il ne modélise ni les diagrammes d’antenne, ni le bilan de liaison, ni le planning du DSN, ni les satellites relais.</li>
      <li>La Terre est un point pour la visibilité et le Soleil un disque uniforme ; il n’y a pas de réfraction sur la Lune.</li>
    </ul>
    <h3>Sources des données</h3>
    <ul>
      <li>Modèles de relief polaires LOLA GDR LDEM_80S_40M et LDEM_60S_240M, NASA PDS Geosciences Node / <a href="https://imbrium.mit.edu/DATA/LOLA_GDR/POLAR/IMG/" target="_blank" rel="noopener">imbrium.mit.edu</a>.</li>
      <li>Coordonnées : voir l’infobulle de chaque site. Points Artemis III : Peña-Asensio et al., <a href="https://arxiv.org/abs/2406.19863" target="_blank" rel="noopener">arXiv:2406.19863</a> ; points très éclairés : <a href="https://en.wikipedia.org/wiki/Peak_of_eternal_light" target="_blank" rel="noopener">Peak of eternal light</a> ; missions posées : confirmations LRO/LROC.</li>
    </ul>`;
  let METHOD_EN = '', METHOD_FR = '';
  function buildMethod() { METHOD_EN = METHOD_EN_F(); METHOD_FR = METHOD_FR_F(); }

  /* ---------- language, theme, resize */
  function applyI18n() {
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-i18n]').forEach(el => { const v = I18N[lang][el.dataset.i18n]; if (v) el.textContent = v; });
    $('#lang').textContent = lang === 'en' ? 'FR' : 'EN';
    buildMethod(); renderMethod();
  }
  $('#lang').addEventListener('click', () => { lang = lang === 'en' ? 'fr' : 'en'; store.set('lang', lang); applyI18n(); renderAll(); });
  const reTheme = () => { refreshCss(); renderAll(); };
  try { window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', reTheme); } catch (e) { /* old browser */ }
  new MutationObserver(reTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  let rz;
  new ResizeObserver(() => { clearTimeout(rz); rz = setTimeout(() => renderTab(), 80); }).observe(document.querySelector('.main'));

  /* ---------- boot */
  applyI18n();
  initRange();
  renderSiteList();
  const hashTab = (location.hash || '').slice(1);
  const okTabs = ['compare', 'timeline', 'sky', 'plan', 'map', 'method'];
  showTab(okTabs.includes(hashTab) ? hashTab : 'compare');
  computeGrid();
})();
