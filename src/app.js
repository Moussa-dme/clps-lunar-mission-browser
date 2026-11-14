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
      qualLabel: 'Quality', qualStd: 'Standard', qualHigh: 'High (sharper, heavier)', searchPh: 'Search a site…', searchNone: 'No match', popTitle: 'New site here', popName: 'Site name', popOk: 'Add', popCancel: 'Cancel', heatWindow: 'the {days}-day window',
      bestBtn: 'Best site', bestMsg: 'Best south-pole site for {days} days from {d}: {n}, grade {g} ({p}%).', vwLive: 'Live', vwHeat: 'Heat map', gradeTitle: 'Power + link, {days}-day window', gradeWord: 'Grade', poor: 'Poor', good: 'Good', stretched: 'colours stretched to show differences',
      gradeNote: 'Share of a {days}-day window (the mission if a landing date is set, otherwise from the cursor) with power + link. Not a landing-success probability.', dayBack: '1 day earlier', dayFwd: '1 day later', mkSunset: 'Sunset', mkEarthset: 'Earthset', modeSimple: 'Simple', modeAdvanced: 'Advanced', siteLabel: 'Site', viewOpts: 'View options', period: 'Period',
      tProfile: 'Profile', profTitle: 'Site profile', profHelp: 'Click the hexagon for details. Scores run from 0 to 100, higher is better.',
      axSun: 'Sunlight', axEnergy: 'Solar energy', axLink: 'Earth link', axOps: 'Power + link', axNight: 'Short nights', axGap: 'Short link gaps',
      dSun: 'Share of the period with the Sun above the local terrain horizon.',
      dEnergy: 'Mean visible fraction of the solar disk: what a sun-tracking panel would collect.',
      dLink: 'Share of the time Earth is above the terrain horizon and a Deep Space Network antenna sees the Moon.',
      dOps: 'Power and link at the same time: the time the mission can really use.',
      dNight: '100 minus the longest continuous night as a share of the period.',
      dGap: '100 minus the longest continuous loss of direct Earth link as a share of the period.',
      pros: 'Strengths', cons: 'Weaknesses', noPros: 'Nothing stands out.', noCons: 'No major weakness over this period.',
      prSun: 'Sunlit {v} of the period', prLink: 'Direct Earth link {v} of the time', prOps: 'Power and link together {v} of the time',
      prNight: 'Longest night only {v}', prGap: 'Longest link gap only {v}',
      cnSun: 'Sunlit only {v} of the period', cnLink: 'Direct Earth link only {v} of the time', cnOps: 'Power and link together only {v} of the time',
      cnNight: 'A night of {v}: batteries and heaters must carry the lander', cnGap: 'A link gap of {v}: no direct commands',
      profNow: 'At the cursor time', profBack: 'Close details', profOpen: 'Show details',
      profPower: 'Power depends on where the Sun is; communication depends on where Earth is.',
      rngSun: 'Sun elevation range', rngEarth: 'Earth elevation range', litWin: 'Sunlit windows', profOthers: 'Other selected sites (outline)',
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
      fit: 'fitted', stretchNote: 'vertical stretch',
      tScen: 'Scenarios', tLearn: 'Why it’s hard', goTo: 'Go to (UTC)', nextSunrise: 'Next sunrise', nextSunset: 'Next sunset',
      outOfRange: 'That time is outside the period. Change the dates at the top first.', noSunrise: 'No sunrise at this site before the end of the period.', noSunset: 'No sunset at this site before the end of the period.',
      sunsetIn: 'Sunset in', sunriseIn: 'Sunrise in', earthsetIn: 'Earthset in', earthriseIn: 'Earthrise in', linkEndsIn: 'Link ends in', linkStartsIn: 'Link opens in',
      st_ops: 'Power + link', st_sun: 'Sun only', st_comm: 'Link only', st_none: 'Dark, no link', countdown: 'Time left',
      colNow: 'Now', colSunNow: 'Sun height', colSunNext: 'Sun', colEarthNext: 'Earth', nowNote: 'Now = cursor time,',
      scenTitle: 'Compare landing scenarios: site, date and mission length', scenHistory: 'Load historical landings', scenCopy: 'Copy summary',
      scenHelp: 'When a launch slips, add the new date or another site and compare. Each row is computed for its own mission window.',
      scenAdd: 'Add scenario', scenStripTitle: 'Each mission, from touchdown to the end', scenExample: 'Example scenarios: replace them with your own, or load the historical landings.',
      scenEmpty: 'No scenario yet. Add one above.', daysShort: 'Days', atTouchdown: 'At touchdown', firstLoss: 'First loss of power or link',
      never: 'never', atOnce: 'at touchdown', actual: 'actual', slipTitle: 'Copy this scenario shifted in time', badTime: 'Enter a touchdown date and time.',
      copiedText: 'Summary copied. Paste it into an e-mail or a chat.',
      t3d: '3D view', v3dRegion: 'Area', v3dPole: 'Pole, 87.5–90°S (240 m)', v3dSouth: 'South polar region, 75–90°S (1 km)',
      v3dShow: 'Show', mSun: 'Sunlight now', mPlan: 'Power and Earth link now', mAvgSun: 'Sunlight, share of the period',
      mAvgEarth: 'Earth link, share of the period', mAvgOps: 'Power + link, share of the period',
      vOverview: 'Overview', vSun: 'Look toward the Sun', vStand: 'Stand at', vTour: 'Guided tour', vTourStop: 'Stop the tour',
      v3dNote: 'Drag to rotate, right-drag or Shift-drag to pan, scroll to zoom. Right-click the terrain (without dragging) to add a site there. Shadows and Earth visibility are computed on your graphics card from LOLA terrain; the vertical stretch is visual only.',
      vwLight: 'Light everywhere', lightTip: 'Fictional even lighting: see the terrain itself, without real shadows or colours. This is not the real Sun.',
      flatTag: 'Fictional lighting: real shadows and colours are hidden', scMoon: 'Whole Moon', scPole: 'South pole', v3dMoon: 'Whole Moon (overview)',
      lgMoon: 'Lit side = the real Sun at the cursor time. The surface texture is illustrative (maria positions approximate); the south pole cap is real LOLA relief. Discs = zones with sites; click one to zoom.',
      zPolar: 'South pole · Artemis & CLPS', zApollo: 'Apollo & SLIM · near side', zWest: 'Reiner Gamma & Chang’e 5 · west', zFar: 'Chang’e 4 & 6 · far side',
      zoneTip: '{n} sites · click to zoom', zoneToast: '{z}: LOLA terrain only covers the south pole, so these sites use a smooth horizon (less precise). Click a marker for its profile.', hudSubSolar: 'Sun overhead',
      secExplore: 'Explore', secCompare: 'Compare', secPlan: 'Plan mission', secLearn: 'Learn & Method',
      sub3d: 'Globe 3D', subMap: 'Map 2D', subSky: 'Horizon', subElev: 'Elevation', subSites: 'Sites', subScen: 'Scenarios', subLearn: 'Learn', subMethod: 'Method',
      spKicker: 'Selected site', spSun: 'Sun', spEarth: 'Earth', spLink: 'Direct link to Earth', spVisible: 'Visible', spHiddenM: 'Hidden', spHiddenF: 'Hidden',
      spAvail: 'Available', spUnavail: 'Unavailable', spAnalyze: 'Analyze this site', spCompare: 'Compare this site',
      spSunPos: 'Sun height / bearing', spEarthPos: 'Earth height / bearing', spState: 'State', spPole: 'At the pole: Sun / Earth',
      cdTitle: 'Compare {n} with…', cdAll: 'All sites', cdAllSub: 'Rank every site against this one', cdOne: 'One specific site', cdOneSub: 'Side by side, with the reasons', cdGo: 'Compare', cdCancel: 'Cancel',
      cfTitle: 'Comparing', cfWithAll: 'With all sites', cfWithOne: 'With one site', cfPeriod: 'From {a} to {b} (the selected period)', cfRank: '{n} ranks {r} of {t} sites for power + link',
      cfHint: 'Click a site to compare it side by side.', cfApprox: '≈ smooth horizon: no LOLA terrain for this site, so its numbers are approximate.',
      cmSun: 'Sunlight', cmEarth: 'Earth in view', cmOps: 'Power + link', cmDte: 'Direct link', cmNight: 'Longest night', cmGap: 'Longest blackout', cmSame: 'same', cmSite: 'Site', cmDiff: 'Difference',
      cfBetter: '{n} is better for power + link ({d})', cfAbout: 'About the same for power + link', cfWith: 'With',
      cfNoScore: 'No overall score: the verdict uses power + link (time with both); the lines below show the trade-offs.',
      why_litPct: '{n} gets more sunlight (+{d})', why_earthPct: '{n} sees the Earth more often (+{d})', why_dtePct: '{n} has a direct link more often (+{d})',
      why_longestNightH: '{n} has a shorter longest night (−{d})', why_longestBlackoutH: '{n} has a shorter longest blackout (−{d})', spCollapse: 'Collapse', spExpand: 'Expand',
      msSet: 'Set landing date', msLength: 'Mission length', msHint: 'Drop the flag, then drag it along the bar to try other landing dates.', msClear: 'Remove landing date',
      msOpsWord: 'of the mission with power and a link', msFlag: 'Landing date',
      msAddB: 'Add date B', msSeeAB: 'Compare A and B', msClearB: 'Remove date B', msFlagB: 'Landing date B',
      cfWithDates: 'Another date', scenA: 'Scenario A', scenB: 'Scenario B', cdDates: 'Another date', cdDatesSub: 'Same site: move a second flag to see the effect of a delay',
      dtPromptA: 'Drop a landing flag (A) on the time bar, then add a second date (B) to compare them.', dtSetA: 'Set landing date A here',
      dtPromptB: 'Add a second landing date (B) and compare it with A.', dtAddB: 'Add date B (A + 7 days)', dtSiteB: 'Site of scenario B', dtSame: 'Same site as A',
      dtShift: 'Shift B:', dtToScen: 'Add A and B to my scenarios', dtBetter: 'Find a better landing date', dtExplore: 'Explore this site', dtAdded: 'Added to the scenario list',
      dtLen: 'Both missions last {days} days; change the length on the time bar.', cmLoss: 'Power + link last for', cmLossNow: 'lost at once',
      why_loss: '{n} keeps power and a link for longer (+{d})',
      learnTitle: 'Why the lunar south pole is so hard', learnLead: 'Six facts, computed live from the same data as the rest of the tool. They explain why a few hundred metres or a few days can decide whether a lander survives.',
      pzTitle: 'Which day is best to land?', pzSub: '{n}, for a {days}-day mission. Days are ranked by the time with power and a link; the landing itself must be in sunlight with an Earth link.',
      pzGood: 'Good (60% or more)', pzFair: 'Fair (30 to 60%)', pzPoor: 'Poor (under 30%)', pzNo: 'Not possible (no sunlight or no link at touchdown)',
      pzBest: 'Best days to land', pzUse: 'Use this date', pzNone: 'No safe landing date for this site in the selected period. Try another site or a longer period.',
      pzPlaced: 'Landing date set: {d}', pzAria: 'Quality of each landing day over the selected period; click to set the landing date',
      cbDateTip: 'Date, sunrise / sunset jumps and mission',
      helpBtnLabel: 'Explain: click here, then click anything', chatBtnLabel: 'Assistant', helpBanner: 'Click anything to see what it does. Esc to stop.', helpOk: 'Got it', helpAsk: 'Ask the assistant', helpExit: 'Stop help', demoBtn: 'Demo', demoStop: 'Stop',
      chatTitle: 'Assistant', chatSub: 'Built-in help, no AI model', chatPh: 'Ask a question…', chatSend: 'Send', chatShow: 'Show me', chatClose: 'Close',
      tourStopBtn: 'Stop',
      hintGlobe: 'Drag to rotate · scroll to zoom · click a site',
      lgSunset: 'Sunset (on the time bar)', lgEarthset: 'Earthset (on the time bar)', lgFlags: 'A and B: landing dates. The outlined band is the mission.',
      lgUp: 'Green arrow: better than your site', lgDown: 'Red arrow: worse than your site', lgGrade: 'Grade: share of the mission with power and a link (A is best). Not a landing-success probability.',
      hudSun: 'Sun at the pole', hudEarth: 'Earth at the pole', hudLon: 'toward', averaging: 'Averaging over the period…',
      lgReal: 'Rendered as a camera would see it, with shadows lifted slightly so the terrain stays readable.',
      ofPeriod: 'of the period', noWebGL: 'The 3D view needs WebGL, which this browser or device does not provide.',
      noWebGLHelp: 'Every other tab works without it.', copyIcs: 'Copy calendar (.ics)', dlIcs: 'Download calendar (.ics)',
      icsCopied: 'Calendar copied. Paste it into a .ics file to import into Outlook or Google Calendar.',
      tour1: 'The lunar south pole, measured by NASA’s Lunar Reconnaissance Orbiter. Every shadow is computed live from the real terrain.',
      tour2: 'Here the Sun never rises more than a few degrees. It circles the horizon, and crater rims cast shadows tens of kilometres long.',
      tour3: 'The planning map: green has power and a direct link to Earth, yellow has sunlight only, blue sees Earth only.',
      tour4: 'Averaged over the whole period, the brightest ridges are where a solar-powered lander keeps power and contact longest.',
      tour5: 'Standing on the Shackleton connecting ridge: the Sun skims the horizon, Earth hangs low in the sky.',
      tour6: 'Pick any site and date: the same calculation is available as an API, a command-line tool and a calendar export.'
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
      qualLabel: 'Qualité', qualStd: 'Standard', qualHigh: 'Haute (plus net, plus lourd)', searchPh: 'Chercher un site…', searchNone: 'Aucun résultat', popTitle: 'Nouveau site ici', popName: 'Nom du site', popOk: 'Ajouter', popCancel: 'Annuler', heatWindow: 'la fenêtre de {days} jours',
      bestBtn: 'Meilleur site', bestMsg: 'Meilleur site du pôle Sud pour {days} jours à partir du {d} : {n}, note {g} ({p} %).', vwLive: 'Direct', vwHeat: 'Carte thermique', gradeTitle: 'Énergie + liaison, fenêtre de {days} jours', gradeWord: 'Note', poor: 'Mauvais', good: 'Bon', stretched: 'couleurs étirées pour montrer les écarts',
      gradeNote: 'Part d’une fenêtre de {days} jours (la mission si une date d’atterrissage est posée, sinon à partir du curseur) avec énergie et liaison. Pas une probabilité de réussite de l’atterrissage.', dayBack: '1 jour plus tôt', dayFwd: '1 jour plus tard', mkSunset: 'Coucher du Soleil', mkEarthset: 'Coucher de la Terre', modeSimple: 'Simple', modeAdvanced: 'Avancé', siteLabel: 'Site', viewOpts: 'Options d’affichage', period: 'Période',
      tProfile: 'Profil', profTitle: 'Profil du site', profHelp: 'Cliquez sur l’hexagone pour les détails. Les scores vont de 0 à 100, plus c’est haut, mieux c’est.',
      axSun: 'Ensoleillement', axEnergy: 'Énergie solaire', axLink: 'Liaison Terre', axOps: 'Énergie + liaison', axNight: 'Nuits courtes', axGap: 'Coupures courtes',
      dSun: 'Part de la période où le Soleil est au-dessus de l’horizon du relief local.',
      dEnergy: 'Fraction moyenne visible du disque solaire : ce que capterait un panneau orienté vers le Soleil.',
      dLink: 'Part du temps où la Terre est au-dessus de l’horizon du relief et où une antenne du Deep Space Network voit la Lune.',
      dOps: 'Énergie et liaison en même temps : le temps réellement utilisable par la mission.',
      dNight: '100 moins la plus longue nuit continue, en part de la période.',
      dGap: '100 moins la plus longue perte continue de liaison directe, en part de la période.',
      pros: 'Points forts', cons: 'Points faibles', noPros: 'Rien ne ressort.', noCons: 'Aucune faiblesse majeure sur cette période.',
      prSun: 'Au soleil {v} de la période', prLink: 'Liaison directe avec la Terre {v} du temps', prOps: 'Énergie et liaison ensemble {v} du temps',
      prNight: 'Plus longue nuit de seulement {v}', prGap: 'Plus longue coupure de seulement {v}',
      cnSun: 'Au soleil seulement {v} de la période', cnLink: 'Liaison directe seulement {v} du temps', cnOps: 'Énergie et liaison ensemble seulement {v} du temps',
      cnNight: 'Une nuit de {v} : batteries et chauffage doivent tenir seuls', cnGap: 'Une coupure de {v} : pas de commandes directes',
      profNow: 'À l’instant du curseur', profBack: 'Fermer les détails', profOpen: 'Voir les détails',
      profPower: 'L’énergie dépend de la position du Soleil ; la communication dépend de la position de la Terre.',
      rngSun: 'Hauteur du Soleil (min–max)', rngEarth: 'Hauteur de la Terre (min–max)', litWin: 'Fenêtres au soleil', profOthers: 'Autres sites sélectionnés (contour)',
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
      fit: 'ajusté', stretchNote: 'étirement vertical',
      tScen: 'Scénarios', tLearn: 'Pourquoi c’est difficile', goTo: 'Aller à (UTC)', nextSunrise: 'Prochain lever', nextSunset: 'Prochain coucher',
      outOfRange: 'Cette date est hors de la période. Changez d’abord les dates en haut.', noSunrise: 'Pas de lever du Soleil sur ce site avant la fin de la période.', noSunset: 'Pas de coucher du Soleil sur ce site avant la fin de la période.',
      sunsetIn: 'Coucher dans', sunriseIn: 'Lever dans', earthsetIn: 'Coucher de la Terre dans', earthriseIn: 'Lever de la Terre dans', linkEndsIn: 'Fin de liaison dans', linkStartsIn: 'Liaison dans',
      st_ops: 'Énergie + liaison', st_sun: 'Soleil seul', st_comm: 'Liaison seule', st_none: 'Noir, sans liaison', countdown: 'Temps restant',
      colNow: 'Maintenant', colSunNow: 'Hauteur du Soleil', colSunNext: 'Soleil', colEarthNext: 'Terre', nowNote: 'Maintenant = instant du curseur,',
      scenTitle: 'Comparer des scénarios : site, date et durée de mission', scenHistory: 'Charger les alunissages historiques', scenCopy: 'Copier le résumé',
      scenHelp: 'Quand un lancement glisse, ajoutez la nouvelle date ou un autre site et comparez. Chaque ligne est calculée sur sa propre fenêtre de mission.',
      scenAdd: 'Ajouter le scénario', scenStripTitle: 'Chaque mission, de l’atterrissage à la fin', scenExample: 'Scénarios d’exemple : remplacez-les par les vôtres ou chargez les alunissages historiques.',
      scenEmpty: 'Aucun scénario. Ajoutez-en un ci-dessus.', daysShort: 'Jours', atTouchdown: 'À l’atterrissage', firstLoss: 'Première perte d’énergie ou de liaison',
      never: 'jamais', atOnce: 'dès l’atterrissage', actual: 'réel', slipTitle: 'Copier ce scénario décalé dans le temps', badTime: 'Entrez une date et une heure d’atterrissage.',
      copiedText: 'Résumé copié. Collez-le dans un e-mail ou une discussion.',
      t3d: 'Vue 3D', v3dRegion: 'Zone', v3dPole: 'Pôle, 87,5–90°S (240 m)', v3dSouth: 'Région polaire sud, 75–90°S (1 km)',
      v3dShow: 'Afficher', mSun: 'Ensoleillement maintenant', mPlan: 'Énergie et liaison maintenant', mAvgSun: 'Ensoleillement, part de la période',
      mAvgEarth: 'Liaison Terre, part de la période', mAvgOps: 'Énergie + liaison, part de la période',
      vOverview: 'Vue d’ensemble', vSun: 'Regarder vers le Soleil', vStand: 'Se placer sur', vTour: 'Visite guidée', vTourStop: 'Arrêter la visite',
      v3dNote: 'Glissez pour tourner, clic droit ou Maj + glisser pour déplacer, molette pour zoomer. Clic droit sur le relief (sans glisser) pour y ajouter un site. Ombres et visibilité de la Terre sont calculées par votre carte graphique à partir du relief LOLA ; l’étirement vertical est seulement visuel.',
      vwLight: 'Lumière partout', lightTip: 'Éclairage fictif uniforme : voir le relief lui-même, sans ombres ni couleurs réelles. Ce n’est pas le vrai Soleil.',
      flatTag: 'Éclairage fictif : ombres et couleurs réelles masquées', scMoon: 'Toute la Lune', scPole: 'Pôle sud', v3dMoon: 'Toute la Lune (vue d’ensemble)',
      lgMoon: 'Côté éclairé = le vrai Soleil à l’heure du curseur. La texture de surface est illustrative (positions des mers approximatives) ; la calotte du pôle sud est le vrai relief LOLA. Disques = zones avec des sites ; cliquez pour zoomer.',
      zPolar: 'Pôle sud · Artemis et CLPS', zApollo: 'Apollo et SLIM · face visible', zWest: 'Reiner Gamma et Chang’e 5 · ouest', zFar: 'Chang’e 4 et 6 · face cachée',
      zoneTip: '{n} sites · cliquer pour zoomer', zoneToast: '{z} : le relief LOLA ne couvre que le pôle sud, ces sites utilisent donc un horizon lisse (moins précis). Cliquez sur un marqueur pour son profil.', hudSubSolar: 'Soleil au zénith',
      secExplore: 'Explorer', secCompare: 'Comparer', secPlan: 'Planifier la mission', secLearn: 'Comprendre et méthode',
      sub3d: 'Globe 3D', subMap: 'Carte 2D', subSky: 'Horizon', subElev: 'Élévation', subSites: 'Sites', subScen: 'Scénarios', subLearn: 'Comprendre', subMethod: 'Méthode',
      spKicker: 'Site sélectionné', spSun: 'Soleil', spEarth: 'Terre', spLink: 'Liaison directe avec la Terre', spVisible: 'Visible', spHiddenM: 'Caché', spHiddenF: 'Cachée',
      spAvail: 'Disponible', spUnavail: 'Indisponible', spAnalyze: 'Analyser ce site', spCompare: 'Comparer ce site',
      spSunPos: 'Soleil : hauteur / azimut', spEarthPos: 'Terre : hauteur / azimut', spState: 'État', spPole: 'Au pôle : Soleil / Terre',
      cdTitle: 'Comparer {n} avec…', cdAll: 'Tous les sites', cdAllSub: 'Classer tous les sites par rapport à celui-ci', cdOne: 'Un site précis', cdOneSub: 'Côte à côte, avec les raisons', cdGo: 'Comparer', cdCancel: 'Annuler',
      cfTitle: 'Comparaison', cfWithAll: 'Avec tous les sites', cfWithOne: 'Avec un site', cfPeriod: 'Du {a} au {b} (la période choisie)', cfRank: '{n} : n° {r} sur {t} sites pour énergie + liaison',
      cfHint: 'Cliquez sur un site pour le comparer côte à côte.', cfApprox: '≈ horizon lisse : pas de relief LOLA pour ce site, ses chiffres sont approximatifs.',
      cmSun: 'Ensoleillement', cmEarth: 'Terre visible', cmOps: 'Énergie + liaison', cmDte: 'Liaison directe', cmNight: 'Nuit la plus longue', cmGap: 'Plus longue coupure', cmSame: 'égal', cmSite: 'Site', cmDiff: 'Écart',
      cfBetter: '{n} est meilleur pour énergie + liaison ({d})', cfAbout: 'À peu près pareil pour énergie + liaison', cfWith: 'Avec',
      cfNoScore: 'Pas de score global : le verdict s’appuie sur énergie + liaison (temps avec les deux) ; les lignes ci-dessous montrent les compromis.',
      why_litPct: '{n} reçoit plus de soleil (+{d})', why_earthPct: '{n} voit plus souvent la Terre (+{d})', why_dtePct: '{n} a plus souvent une liaison directe (+{d})',
      why_longestNightH: '{n} a une nuit maximale plus courte (−{d})', why_longestBlackoutH: '{n} a une coupure maximale plus courte (−{d})', spCollapse: 'Réduire', spExpand: 'Déplier',
      msSet: 'Poser la date d’atterrissage', msLength: 'Durée de la mission', msHint: 'Posez le drapeau, puis faites-le glisser sur la barre pour essayer d’autres dates.', msClear: 'Retirer la date d’atterrissage',
      msOpsWord: 'de la mission avec énergie et liaison', msFlag: 'Date d’atterrissage',
      msAddB: 'Ajouter une date B', msSeeAB: 'Comparer A et B', msClearB: 'Retirer la date B', msFlagB: 'Date d’atterrissage B',
      cfWithDates: 'Autre date', scenA: 'Scénario A', scenB: 'Scénario B', cdDates: 'Une autre date', cdDatesSub: 'Même site : déplacez un second drapeau pour voir l’effet d’un retard',
      dtPromptA: 'Posez un drapeau d’atterrissage (A) sur la barre de temps, puis ajoutez une seconde date (B) pour les comparer.', dtSetA: 'Poser la date A ici',
      dtPromptB: 'Ajoutez une seconde date d’atterrissage (B) et comparez-la avec A.', dtAddB: 'Ajouter la date B (A + 7 jours)', dtSiteB: 'Site du scénario B', dtSame: 'Même site que A',
      dtShift: 'Décaler B :', dtToScen: 'Ajouter A et B à mes scénarios', dtBetter: 'Trouver une meilleure date', dtExplore: 'Explorer ce site', dtAdded: 'Ajoutés à la liste des scénarios',
      dtLen: 'Les deux missions durent {days} jours ; changez la durée sur la barre de temps.', cmLoss: 'Énergie + liaison tiennent', cmLossNow: 'perdues aussitôt',
      why_loss: '{n} garde énergie et liaison plus longtemps (+{d})',
      learnTitle: 'Pourquoi le pôle Sud lunaire est si difficile', learnLead: 'Six faits, calculés en direct à partir des mêmes données que le reste de l’outil. Ils expliquent pourquoi quelques centaines de mètres ou quelques jours peuvent décider du sort d’un atterrisseur.',
      pzTitle: 'Quel est le meilleur jour pour atterrir ?', pzSub: '{n}, pour une mission de {days} jours. Les jours sont classés selon le temps avec énergie et liaison ; l’atterrissage lui-même doit se faire au soleil, avec une liaison avec la Terre.',
      pzGood: 'Bon (60 % ou plus)', pzFair: 'Moyen (30 à 60 %)', pzPoor: 'Mauvais (moins de 30 %)', pzNo: 'Impossible (pas de soleil ou pas de liaison à l’atterrissage)',
      pzBest: 'Meilleurs jours pour atterrir', pzUse: 'Utiliser cette date', pzNone: 'Aucune date d’atterrissage sûre pour ce site sur la période choisie. Essayez un autre site ou une période plus longue.',
      pzPlaced: 'Date d’atterrissage posée : {d}', pzAria: 'Qualité de chaque jour d’atterrissage sur la période choisie ; cliquez pour poser la date d’atterrissage',
      cbDateTip: 'Date, sauts lever / coucher et mission',
      helpBtnLabel: 'Expliquer : cliquez ici, puis sur n’importe quoi', chatBtnLabel: 'Assistant', helpBanner: 'Cliquez sur n’importe quoi pour voir à quoi ça sert. Échap pour arrêter.', helpOk: 'Compris', helpAsk: 'Demander à l’assistant', helpExit: 'Arrêter l’aide', demoBtn: 'Démo', demoStop: 'Arrêter',
      chatTitle: 'Assistant', chatSub: 'Aide intégrée, sans modèle d’IA', chatPh: 'Posez une question…', chatSend: 'Envoyer', chatShow: 'Montre-moi', chatClose: 'Fermer',
      tourStopBtn: 'Arrêter',
      hintGlobe: 'Glissez pour tourner · molette pour zoomer · cliquez sur un site',
      lgSunset: 'Coucher du Soleil (sur la barre de temps)', lgEarthset: 'Coucher de la Terre (sur la barre de temps)', lgFlags: 'A et B : dates d’atterrissage. La bande encadrée est la mission.',
      lgUp: 'Flèche verte : mieux que votre site', lgDown: 'Flèche rouge : moins bien que votre site', lgGrade: 'Note : part de la mission avec énergie et liaison (A est la meilleure). Pas une probabilité de réussite.',
      hudSun: 'Soleil au pôle', hudEarth: 'Terre au pôle', hudLon: 'vers', averaging: 'Moyenne sur la période…',
      lgReal: 'Rendu comme le verrait une caméra, avec les ombres légèrement éclaircies pour garder le relief lisible.',
      ofPeriod: 'de la période', noWebGL: 'La vue 3D a besoin de WebGL, que ce navigateur ou cet appareil ne fournit pas.',
      noWebGLHelp: 'Tous les autres onglets fonctionnent sans.', copyIcs: 'Copier le calendrier (.ics)', dlIcs: 'Télécharger le calendrier (.ics)',
      icsCopied: 'Calendrier copié. Collez-le dans un fichier .ics pour l’importer dans Outlook ou Google Agenda.',
      tour1: 'Le pôle Sud de la Lune, mesuré par la sonde LRO de la NASA. Chaque ombre est calculée en direct à partir du vrai relief.',
      tour2: 'Ici, le Soleil ne monte jamais à plus de quelques degrés. Il tourne autour de l’horizon et les bords des cratères projettent des ombres de dizaines de kilomètres.',
      tour3: 'La carte de planification : en vert, énergie et liaison directe avec la Terre ; en jaune, soleil seul ; en bleu, Terre seule.',
      tour4: 'En moyenne sur toute la période, les crêtes les plus claires sont celles où un atterrisseur solaire garde le plus longtemps énergie et contact.',
      tour5: 'Debout sur la crête qui relie Shackleton : le Soleil rase l’horizon, la Terre reste basse dans le ciel.',
      tour6: 'Choisissez n’importe quel site et date : le même calcul est disponible en API, en ligne de commande et en export calendrier.'
    }
  };

  /* --------------------------------------------------------------- storage */
  const store = {
    get(k, d) { try { const v = localStorage.getItem('clps.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('clps.' + k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } }
  };
  let lang = store.get('lang', (navigator.language || 'en').toLowerCase().startsWith('fr') ? 'fr' : 'en');
  const t = k => { const v = (I18N[lang] && I18N[lang][k]) || I18N.en[k] || k; return v.indexOf('{days}') >= 0 ? v.replace('{days}', state.mission ? state.mission.days : 10) : v; };
  const locale = () => (lang === 'fr' ? 'fr-FR' : 'en-GB');

  /* ----------------------------------------------------------------- sites */
  function presetSites() {
    return DATA.sites.map(s => {
      const h = DATA.horizons[s.id];
      const ll = h && h.snapped ? h.snapped : [s.lat, s.lon];
      return {
        id: s.id, name: s.name, group: s.group, note: s.note, source: s.source, landed: s.landed,
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
    allSumGrid = null; allSerGrid = null;
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
      html += `<div class="grp">${esc(groupLabel(g))}</div>`;
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
    const q = $('#siteQuick');
    if (q) {
      q.innerHTML = groups.map(g => `<optgroup label="${esc(groupLabel(g))}">` + state.sites.filter(x => (x.custom ? 'My sites' : x.group) === g)
        .map(s => `<option value="${esc(s.id)}"${s.id === state.focus ? ' selected' : ''}>${esc(s.name)}</option>`).join('') + '</optgroup>').join('');
    }
    $('#selCount').textContent = `${state.selected.length}/${MAX_SEL} ${t('selected')}`;
  }
  $('#siteQuick').addEventListener('change', e => {
    const id = e.target.value;
    if (state.selected.includes(id)) { setFocus(id); return; }
    if (!selectSite(id)) { toast(t('maxSel')); renderSiteList(); return; }
    state.focus = id; store.set('selected', state.selected);
    computeSeries();
  });
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

  /* ------------------------------------------- terrain (shared module) */
  const LT = window.LunarTerrain;
  const RM = LT.RM, polarXY = LT.polarXY;
  let terrainPromise = null;
  async function inflate(b64) {
    const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    if (typeof DecompressionStream === 'undefined') throw new Error('This browser cannot decompress the terrain model.');
    const ds = new Blob([bin]).stream().pipeThrough(new DecompressionStream('gzip'));
    const buf = await new Response(ds).arrayBuffer();
    return new Int16Array(buf);
  }
  function loadTerrain() {
    if (!terrainPromise) {
      terrainPromise = Promise.all([inflate(DATA.demFine), inflate(DATA.demCoarse)])
        .then(([fine, coarse]) => LT.create(fine, coarse, DATA.assets));
    }
    return terrainPromise;
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
        const T = await loadTerrain();
        await frame();
        if ($('#newSnap').checked) { const b = T.snapHigh(lat, lon, 500); s.lat = b[1]; s.lon = b[2]; }
        const hz = T.horizon(s.lat, s.lon);
        s.heightM = Math.round(hz.heightM); s.mask = hz.mask; s.hsrc = 'lolaBrowser';
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
    if (v3d) v3d.setRules(state.cfg);
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

  /* time bar: always slim. The date button opens a drop-down with the exact date, sunrise/sunset jumps and the mission controls */
  (function () {
    const bar = $('.cursor-bar'), drop = $('#cbDrop'), btn = $('#cbDate');
    bar.classList.add('compact');
    drop.append(document.querySelector('.cursor-tools'), $('#cbMission'));
    const setOpen = on => { drop.hidden = !on; btn.setAttribute('aria-expanded', String(on)); };
    btn.addEventListener('click', () => setOpen(drop.hidden));
    document.addEventListener('pointerdown', e => { if (!drop.hidden && !e.target.closest('#cbDrop') && !e.target.closest('#cbDate')) setOpen(false); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !drop.hidden) { setOpen(false); btn.focus(); } });
  })();
  function renderDateChip() {
    const b = $('#cbDate'); if (!b || !state.grid) return;
    const flag = state.mission && missionIdx() != null ? '🚩 ' : '';
    const d = utc(timeOf(state.cursor));
    b.textContent = `${flag}${window.matchMedia && window.matchMedia('(max-width: 700px)').matches ? d.slice(5) : d} ▾`;
    b.title = t('cbDateTip');
  }

  /* cursor + play */
  $('#cursor').addEventListener('input', e => { state.cursor = +e.target.value; renderCursorDependent(); });
  $('#play').addEventListener('click', () => setPlaying(!state.playing));
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

  /* mode: Simple = 3D first, details in drop-downs; Advanced = every tab and number */
  let mode = store.get('mode', 'simple');
  function applyMode(initial) {
    document.body.dataset.mode = mode;
    document.querySelectorAll('#modeSwitch [data-mode]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === mode)));
    if (!initial) { document.querySelectorAll('.side details.acc').forEach(d => { d.open = mode === 'advanced' || d.id === 'accLegend'; }); $('#accProfile').open = mode === 'advanced'; }
  }
  function setMode(m) {
    mode = m; store.set('mode', m); applyMode();
    showTab(state.tab);   // same section and view (an Advanced-only view falls back to the globe); site, date and camera are untouched
  }
  $('#modeSwitch').addEventListener('click', e => { const b = e.target.closest('[data-mode]'); if (b && b.dataset.mode !== mode) setMode(b.dataset.mode); });

  /* drop-down panels open and close smoothly */
  const reduceMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.addEventListener('click', e => {
    const sm = e.target.closest('details.acc > summary'); if (!sm) return;
    e.preventDefault();
    const d = sm.parentElement, opening = !d.open;
    if (d._anim) d._anim.cancel();
    if (reduceMotion() || !d.animate) { d.open = opening; return; }
    const from = d.offsetHeight;
    let to;
    if (opening) { d.open = true; to = d.offsetHeight; } else { d.open = false; to = d.offsetHeight; d.open = true; }
    d.style.overflow = 'hidden';
    d._anim = d.animate({ height: [from + 'px', to + 'px'] }, { duration: 320, easing: 'cubic-bezier(.2,.8,.2,1)' });
    const done = () => { d.open = opening; d.style.overflow = ''; d._anim = null; };
    d._anim.onfinish = done; d._anim.oncancel = () => { d.style.overflow = ''; };
  });

  /* navigation: 4 sections, each with one or more views (the nine original views are kept) */
  const SECTIONS = { explore: ['3d', 'map', 'sky', 'timeline'], compare: ['compare', 'scen'], plan: ['plan'], learn: ['learn', 'method'] };
  const VIEW_SEC = {};
  Object.keys(SECTIONS).forEach(sec => SECTIONS[sec].forEach(v => { VIEW_SEC[v] = sec; }));
  const ADV_VIEWS = ['timeline', 'sky', 'map', 'scen'];  // graphs, 2D map and the scenario table: Advanced only (old links still work)
  const allowedView = v => !!VIEW_SEC[v] && !(mode === 'simple' && ADV_VIEWS.includes(v));
  const lastView = store.get('views', {});
  for (const nav of ['#sections', '#subnav']) document.querySelector(nav).addEventListener('keydown', e => {
    const k = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : e.key === 'Home' ? 'first' : e.key === 'End' ? 'last' : 0; if (!k) return;
    const btns = [...document.querySelectorAll(nav + ' button')].filter(b => !b.hidden), cur = btns.indexOf(document.activeElement); if (cur < 0) return;
    e.preventDefault();
    const nx = k === 'first' ? btns[0] : k === 'last' ? btns[btns.length - 1] : btns[(cur + k + btns.length) % btns.length];
    nx.focus(); nx.click();
  });
  document.querySelector('#sections').addEventListener('click', e => {
    const b = e.target.closest('[data-section]'); if (!b) return;
    const sec = b.dataset.section, v = lastView[sec];
    showTab(v && SECTIONS[sec].includes(v) ? v : SECTIONS[sec][0]);
  });
  document.querySelector('#subnav').addEventListener('click', e => {
    const b = e.target.closest('[data-tab]'); if (b) showTab(b.dataset.tab);
  });
  function showTab(tab) {
    if (SECTIONS[tab] && !VIEW_SEC[tab]) tab = SECTIONS[tab][0];   // 'explore' -> first view
    if (!allowedView(tab)) tab = '3d';
    state.tab = tab;
    const sec = VIEW_SEC[tab];
    lastView[sec] = tab; store.set('views', lastView);
    document.querySelectorAll('#sections [data-section]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.section === sec)));
    let shown = 0;
    document.querySelectorAll('#subnav [data-tab]').forEach(b => {
      const vis = b.dataset.sec === sec && allowedView(b.dataset.tab);
      b.hidden = !vis; if (vis) shown++;
      b.setAttribute('aria-selected', String(b.dataset.tab === tab));
    });
    $('#subnav').hidden = shown < 2;
    document.querySelectorAll('.view').forEach(v => {
      const show = v.id === 'view-' + tab, was = !v.hidden;
      v.hidden = !show;
      if (show && !was) { v.classList.remove('view-in'); void v.offsetWidth; v.classList.add('view-in'); }
    });
    try { history.replaceState(null, '', '#' + tab); } catch (e) { /* ignore */ }
    store.set('tab', tab);
    renderTab();
  }

  /* ------------------------------------------------------------ rendering */
  function renderAll() { renderSiteList(); renderTab(); renderCursorLabel(); drawCursorTrack(); update3DButtons(); renderMission(); }
  function renderCursorLabel() {
    if (!state.grid) return;
    $('#cursorLabel').textContent = utc(timeOf(state.cursor)) + ' UTC';
    const ct = $('#cursorTime');
    if (document.activeElement !== ct) ct.value = utc(timeOf(state.cursor)).replace(' ', 'T');
    ct.min = utc(state.grid.start).replace(' ', 'T'); ct.max = utc(timeOf(state.grid.n - 1)).replace(' ', 'T');
    renderCursorChips();
    renderCtx();
    renderDateChip();
  }
  /* time bar: the slider track shows the focused site's state over the whole period, with sunset / Earthset marks */
  function drawCursorTrack() {
    const cv = $('#cursorTrack'); if (!cv || !state.grid) return;
    const { ctx, w, h } = canvasSetup(cv), s = state.series[state.focus]; if (!s) return;
    const n = state.grid.n, bh = 10, topPad = 14, y0 = topPad + Math.round((h - topPad - bh) / 2), x0 = 8, x1 = w - 8;
    const colors = { ops: cssv('--ops'), sun: cssv('--sun'), earth: cssv('--earth'), none: cssv('--none') };
    ctx.save();
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x0, y0, x1 - x0, bh, bh / 2) : ctx.rect(x0, y0, x1 - x0, bh); ctx.clip();
    for (let x = 0; x < x1 - x0; x++) {
      const i = Math.min(n - 1, Math.floor(x / (x1 - x0) * n));
      ctx.fillStyle = s.ops[i] ? colors.ops : s.lit[i] ? colors.sun : s.dte[i] ? colors.earth : colors.none;
      ctx.fillRect(x0 + x, y0, 1.5, bh);
    }
    ctx.restore();
    const X = i => x0 + (i + 0.5) / n * (x1 - x0);
    const mark = (i, up, col) => {
      const x = X(i), y = up ? y0 - 2 : y0 + bh + 2, d = up ? -5 : 5;
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x - 4, y + d); ctx.lineTo(x + 4, y + d); ctx.lineTo(x, y); ctx.closePath(); ctx.fill();
    };
    let cnt = 0;
    for (let i = 1; i < n && cnt < 80; i++) {
      if (s.lit[i - 1] && !s.lit[i]) { mark(i, true, colors.sun); cnt++; }
      if (s.earthUp[i - 1] && !s.earthUp[i]) { mark(i, false, colors.earth); cnt++; }
    }
    drawMissionBand(ctx, X, y0, bh, n);
  }
  function drawMissionBand(ctx, X, y0, bh, n) {
    [['landing', $('#lmFlag'), 'A', cssv('--accent'), 'msFlag', false], ['b', $('#lmFlagB'), 'B', cssv('--fg'), 'msFlagB', true]].forEach(([key, fl, letter, col, lab, dashed]) => {
      const li = missionIdx(key);
      if (li == null || (key === 'b' && missionIdx('landing') == null)) { fl.hidden = true; return; }
      const wI = Math.max(1, Math.round(state.mission.days * DAY / state.grid.stepMs)), xa = X(li), xb = X(Math.min(n - 1, li + wI));
      ctx.save();
      ctx.fillStyle = col; ctx.globalAlpha = 0.14;
      const yy = y0 - (dashed ? 6 : 4), hh = bh + (dashed ? 12 : 8);
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(xa, yy, Math.max(2, xb - xa), hh, 6) : ctx.rect(xa, yy, Math.max(2, xb - xa), hh); ctx.fill();
      ctx.globalAlpha = 1; ctx.strokeStyle = col; ctx.lineWidth = 2; if (dashed) ctx.setLineDash([5, 3]); ctx.stroke();
      ctx.restore();
      fl.hidden = false; fl.style.left = xa + 'px'; fl.textContent = letter;
      fl.setAttribute('aria-label', t(lab)); fl.setAttribute('aria-valuetext', utc(timeOf(li)) + ' UTC');
      fl.setAttribute('aria-valuemin', '0'); fl.setAttribute('aria-valuemax', String(n - 1)); fl.setAttribute('aria-valuenow', String(li));
    });
  }
  function renderCursorChips() {
    const box = $('#cursorChips'), s = state.series[state.focus]; if (!box || !s || !state.grid) return;
    const c = E.conditionsAt(s, state.grid, state.cursor);
    box.innerHTML = `<span class="cb-site"><i class="dot" style="background:${colorOf(state.focus)}"></i>${esc(site(state.focus).name)}</span> ${stPill(c)} ${cdHtml(changeInfo(c, 'sun'))} ${cdHtml(changeInfo(c, 'earth'))}` +
      `<span class="cb-key"><i class="mk down" style="border-top-color:var(--sun)"></i>${t('mkSunset')}<i class="mk up" style="border-bottom-color:var(--earth)"></i>${t('mkEarthset')}</span>`;
  }
  function stepDays(d) {
    if (!state.grid) return;
    setCursor(Math.max(0, Math.min(state.grid.n - 1, state.cursor + d * Math.round(DAY / state.grid.stepMs))));
  }
  $('#dayBack').addEventListener('click', () => stepDays(-1));
  $('#dayFwd').addEventListener('click', () => stepDays(1));
  $('#cursorTime').addEventListener('change', e => {
    const ms = Date.parse(e.target.value + ':00Z');
    if (!isFinite(ms) || !state.grid) return;
    if (ms < state.start || ms > timeOf(state.grid.n - 1)) { toast(t('outOfRange')); renderCursorLabel(); return; }
    setCursor(indexOf(ms));
  });
  function jump(rise) {
    const ser = state.series[state.focus]; if (!ser) return;
    for (let j = state.cursor + 1; j < state.grid.n; j++) {
      if (ser.lit[j] !== ser.lit[j - 1] && !!ser.lit[j] === rise) { setCursor(j); return; }
    }
    toast(t(rise ? 'noSunrise' : 'noSunset'));
  }
  $('#jumpSunrise').addEventListener('click', () => jump(true));
  $('#jumpSunset').addEventListener('click', () => jump(false));
  function renderCursorDependent() {
    renderCursorLabel();
    if (state.tab === '3d') { update3D(); renderProfile(); }
    else if (state.tab === 'compare') { renderTable(); drawStrip(); }
    else if (state.tab === 'timeline') drawTimeline();
    else if (state.tab === 'sky') renderSky();
    else if (state.tab === 'map') drawMap();
    else if (state.tab === 'plan') { if (mode === 'simple') drawPlanStrip(); else drawHeat(); }
    else if (state.tab === 'learn') renderLearn(true);
  }
  function renderTab() {
    const tab = state.tab;
    if (tab === 'method') { renderMethod(); return; }
    if (!state.grid) return;
    if (tab === '3d') { render3D(); renderProfile(); }
    else if (tab === 'compare') { renderCmpFocus(); renderTable(); drawStrip(); }
    else if (tab === 'timeline') drawTimeline();
    else if (tab === 'sky') renderSky();
    else if (tab === 'plan') renderPlan();
    else if (tab === 'map') drawMap();
    else if (tab === 'scen') renderScenarios();
    else if (tab === 'learn') renderLearn();
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

  /* ---------- countdowns: time left before sunset / Earthset (or until sunrise / Earthrise) */
  function changeInfo(c, kind) {
    const on = kind === 'sun' ? c.sunlit : kind === 'earth' ? c.earthUp : c.link;
    const hrs = kind === 'sun' ? c.sunChangeH : kind === 'earth' ? c.earthChangeH : c.linkChangeH;
    const label = t(kind === 'sun' ? (on ? 'sunsetIn' : 'sunriseIn') : kind === 'earth' ? (on ? 'earthsetIn' : 'earthriseIn') : (on ? 'linkEndsIn' : 'linkStartsIn'));
    return { label, val: hrs == null ? `> ${dur(c.remainingH)}` : dur(hrs), warn: on && hrs != null && hrs < 24, on };
  }
  const cdHtml = ci => `<span class="cd${ci.warn ? ' warn' : ''}">${ci.label} ${ci.val}</span>`;
  function stPill(c) {
    const k = c.ops ? 'ops' : c.sunlit ? 'sun' : c.link ? 'comm' : 'none';
    return `<span class="st ${k}">${t('st_' + k)}</span>`;
  }

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
    const nowT = utc(timeOf(state.cursor));
    let html = `<thead><tr><th class="nosort">${t('colSite')}</th>` +
      `<th class="nosort grp-now" title="${nowT} UTC">${t('colNow')}</th><th class="nosort grp-now">${t('colSunNow')}</th><th class="nosort grp-now">${t('colSunNext')}</th><th class="nosort grp-now">${t('colEarthNext')}</th>` +
      COLS.map(c => `<th data-k="${c.k}" scope="col">${t(c.l)}${arrow(c.k)}</th>`).join('') + `</tr></thead><tbody>`;
    for (const r of rows) {
      const s = site(r.id);
      const c = E.conditionsAt(state.series[r.id], state.grid, state.cursor);
      html += `<tr class="click" data-id="${esc(r.id)}"><td class="nm"><i class="dot" style="background:${colorOf(r.id)}"></i>${esc(s.name)}</td>` +
        `<td class="now">${stPill(c)}</td><td class="num now">${fmt(c.sunClearance, 1)}°</td><td class="now">${cdHtml(changeInfo(c, 'sun'))}</td><td class="now">${cdHtml(changeInfo(c, 'earth'))}</td>` +
        COLS.map(c => `<td class="num">${c.f(r[c.k])}${c.bar ? `<i class="bar" style="width:${(r[c.k] * 0.5).toFixed(0)}px"></i>` : ''}</td>`).join('') + `</tr>`;
    }
    tb.innerHTML = html + '</tbody>';
    const g = state.grid;
    $('#cmpNote').textContent = `${t('nowNote')} ${nowT} UTC. ${utc(g.start, false)} → ${utc(timeOf(g.n - 1), false)} · ${g.n} × ${g.stepMin} min. ` +
      (lang === 'fr' ? 'Énergie solaire : fraction moyenne du disque solaire visible (panneau vertical orienté vers le Soleil).'
        : 'Solar energy: mean visible fraction of the solar disk (sun-tracking vertical panel).');
  }
  $('#cmpTable').addEventListener('click', e => {
    const th = e.target.closest('th[data-k]');
    if (th) { const k = th.dataset.k; if (state.sortKey === k) state.sortDir *= -1; else { state.sortKey = k; state.sortDir = COLS.find(c => c.k === k).low ? 1 : -1; } renderTable(); return; }
    const tr = e.target.closest('tr[data-id]'); if (tr) setFocus(tr.dataset.id);
  });

  /* ---------- profile: hexagon of 0-100 scores, strengths/weaknesses, details */
  const AXES = [
    { k: 'axSun', d: 'dSun', v: (m) => m.litPct },
    { k: 'axEnergy', d: 'dEnergy', v: (m) => m.energyPct },
    { k: 'axLink', d: 'dLink', v: (m) => m.dtePct },
    { k: 'axOps', d: 'dOps', v: (m) => m.opsPct },
    { k: 'axNight', d: 'dNight', v: (m, H) => 100 * (1 - m.longestNightH / H) },
    { k: 'axGap', d: 'dGap', v: (m, H) => 100 * (1 - m.longestBlackoutH / H) }
  ];
  const tf = (k, v) => t(k).replace('{v}', v);
  function profileScores(id) {
    const m = state.sums[id]; if (!m || !state.grid) return null;
    const H = state.grid.n * state.grid.stepMs / HOUR;
    return AXES.map(a => Math.max(0, Math.min(100, a.v(m, H))));
  }
  function hexPoints(scores, cx, cy, R) {
    return scores.map((s, i) => {
      const a = -Math.PI / 2 + i * Math.PI / 3, r = R * s / 100;
      return (cx + r * Math.cos(a)).toFixed(1) + ',' + (cy + r * Math.sin(a)).toFixed(1);
    }).join(' ');
  }
  function hexSvg(id) {
    const cx = 170, cy = 150, R = 100, sc = profileScores(id);
    let g = '';
    [25, 50, 75, 100].forEach(p => { g += `<polygon class="hx-ring" points="${hexPoints(AXES.map(() => p), cx, cy, R)}"/>`; });
    AXES.forEach((a, i) => {
      const an = -Math.PI / 2 + i * Math.PI / 3, c = Math.cos(an), s = Math.sin(an);
      g += `<line class="hx-spoke" x1="${cx}" y1="${cy}" x2="${(cx + R * c).toFixed(1)}" y2="${(cy + R * s).toFixed(1)}"/>`;
      const anchor = Math.abs(c) < 0.2 ? 'middle' : c > 0 ? 'start' : 'end';
      g += `<text class="hx-lab" x="${(cx + (R + 12) * c).toFixed(1)}" y="${(cy + (R + 14) * s + 4).toFixed(1)}" text-anchor="${anchor}">${esc(t(a.k))}</text>`;
    });
    state.selected.filter(o => o !== id && state.sums[o]).forEach(o => {
      g += `<polygon class="hx-other" style="stroke:${colorOf(o)}" points="${hexPoints(profileScores(o), cx, cy, R)}"/>`;
    });
    const col = colorOf(id) || cssv('--accent');
    g += `<polygon class="hx-area" style="fill:${col};stroke:${col}" points="${hexPoints(sc, cx, cy, R)}"/>`;
    sc.forEach((s, i) => {
      const an = -Math.PI / 2 + i * Math.PI / 3;
      g += `<circle class="hx-pt" style="fill:${col}" r="3.5" cx="${(cx + R * s / 100 * Math.cos(an)).toFixed(1)}" cy="${(cy + R * s / 100 * Math.sin(an)).toFixed(1)}"/>`;
    });
    return `<svg viewBox="-30 0 400 300" role="img" aria-label="${esc(t('profTitle'))}: ${esc(site(id).name)}">${g}</svg>`;
  }
  function prosCons(m) {
    const pr = [], cn = [], pc = v => fmt(v, 0) + '%';
    if (m.litPct >= 70) pr.push(tf('prSun', pc(m.litPct))); else if (m.litPct < 40) cn.push(tf('cnSun', pc(m.litPct)));
    if (m.dtePct >= 80) pr.push(tf('prLink', pc(m.dtePct))); else if (m.dtePct < 60) cn.push(tf('cnLink', pc(m.dtePct)));
    if (m.opsPct >= 60) pr.push(tf('prOps', pc(m.opsPct))); else if (m.opsPct < 30) cn.push(tf('cnOps', pc(m.opsPct)));
    if (m.longestNightH <= 48) pr.push(tf('prNight', dur(m.longestNightH))); else if (m.longestNightH >= 100) cn.push(tf('cnNight', dur(m.longestNightH)));
    if (m.longestBlackoutH <= 24) pr.push(tf('prGap', dur(m.longestBlackoutH))); else if (m.longestBlackoutH >= 72) cn.push(tf('cnGap', dur(m.longestBlackoutH)));
    return { pr, cn };
  }
  let profOpen = false, profLast = null;
  function renderProfile() {
    const box = $('#prof'); if (!box) return;
    const id = state.focus, m = state.sums[id], s = state.series[id];
    if (!m || !s) { box.innerHTML = `<p class="muted">${t('computing')}</p>`; return; }
    const c = E.conditionsAt(s, state.grid, state.cursor), sc = profileScores(id), { pr, cn } = prosCons(m);
    const li = a => a.map(x => `<li>${esc(x)}</li>`).join('');
    const others = state.selected.filter(o => o !== id).length;
    const grow = profLast !== id; profLast = id;
    box.className = 'prof' + (profOpen ? ' open' : '');
    box.innerHTML = `
      <div class="prof-main">
        <h3><i class="dot" style="background:${colorOf(id)}"></i>${esc(site(id).name)}${(() => { const gr = siteGrade(id); return gr ? ` <span class="grade-line">${gradeChip(gr)}<small>${t('gradeTitle')}: ${fmt(gr.pct, 0)}%</small></span>` : ''; })()}</h3>
        <button class="hexbtn" type="button" id="hexBtn" aria-expanded="${profOpen}" aria-label="${esc(profOpen ? t('profBack') : t('profOpen'))}">${hexSvg(id)}</button>
        <p class="muted small">${t('gradeNote')}</p>
        ${others ? `<p class="muted small">${t('profOthers')}</p>` : ''}
        <div class="now-line">${stPill(c)} ${cdHtml(changeInfo(c, 'sun'))} ${cdHtml(changeInfo(c, 'earth'))}</div>
        <div class="pc">
          <div><h4>${t('pros')}</h4><ul class="pro">${pr.length ? li(pr) : `<li class="none">${t('noPros')}</li>`}</ul></div>
          <div><h4>${t('cons')}</h4><ul class="con">${cn.length ? li(cn) : `<li class="none">${t('noCons')}</li>`}</ul></div>
        </div>
      </div>
      <div class="prof-detail" aria-hidden="${!profOpen}"><div class="prof-detail-in">
        <button class="btn ghost" type="button" id="hexClose">${t('profBack')}</button>
        <p class="small">${t('profPower')}</p>
        ${AXES.map((a, i) => `<div class="dm" style="--i:${i}">
          <div class="dm-h"><b>${t(a.k)}</b><span class="num">${fmt(sc[i], 0)}</span></div>
          <div class="dm-bar"><i style="width:${sc[i].toFixed(0)}%"></i></div>
          <p class="muted small">${t(a.d)}</p></div>`).join('')}
        <div class="dm-x" style="--i:6">
          <div class="r"><span>${t('rngSun')}</span><span class="num">${fmt(m.sunMin, 1)}° → ${fmt(m.sunMax, 1)}°</span></div>
          <div class="r"><span>${t('rngEarth')}</span><span class="num">${fmt(m.earthMin, 1)}° → ${fmt(m.earthMax, 1)}°</span></div>
          <div class="r"><span>${t('litWin')}</span><span class="num">${m.litWindows}</span></div>
          <div class="r"><span>${t('profNow')}</span><span class="num">${t('sunNow')} ${fmt(c.sunClearance, 1)}° · ${t('earthNow')} ${fmt(c.earthClearance, 1)}°</span></div>
        </div>
      </div></div>`;
    if (grow) { const sv = box.querySelector('.hexbtn svg'); if (sv) sv.classList.add('grow'); }
  }
  $('#prof').addEventListener('click', e => {
    if (e.target.closest('#hexBtn')) profOpen = !profOpen;
    else if (e.target.closest('#hexClose')) profOpen = false;
    else return;
    // toggle in place so the CSS transitions can run (a rebuild would skip them)
    const box = $('#prof'); box.classList.toggle('open', profOpen);
    const d = box.querySelector('.prof-detail'); if (d) d.setAttribute('aria-hidden', String(!profOpen));
    const hb = $('#hexBtn'); if (hb) { hb.setAttribute('aria-expanded', String(profOpen)); hb.setAttribute('aria-label', profOpen ? t('profBack') : t('profOpen')); }
  });

  /* ---------- state strip */
  const stripGeom = {};
  function stateColor(ops, lit, dte) {
    return ops ? cssv('--ops') : lit ? cssv('--sun') : dte ? cssv('--earth') : cssv('--none');
  }
  function rowLayout(w, rows, wide) {
    const narrow = w < 560;
    const lw = narrow ? 8 : wide ? Math.min(250, w * 0.34) : Math.min(170, w * 0.3);
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
      <div class="ro"><span class="k">${t('countdown')}</span>${(() => { const c = E.conditionsAt(ser, g, i); return ['sun', 'earth', 'link'].map(k => `<span class="d">${cdHtml(changeInfo(c, k))}</span>`).join(''); })()}</div>
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
    const o = { days: P.days, goal: P.score, sunlitAtTouchdown: P.litTD, linkAtTouchdown: P.commTD,
      minSunClearanceDeg: P.sunMin, candidateStepH: 6 };
    const win = Math.round(P.days * DAY / g.stepMs);
    const rows = state.selected.map(id => ({ id, cells: E.landingDates(state.series[id], g, o) }));
    const cands = rows.length ? rows[0].cells.map(c => c.i) : [];
    state.plan = { P, win, cands, rows };
    return state.plan;
  }
  /* Simple view: best landing days for the active site, in plain words */
  let pzCells = [];
  function renderPlanEasy() {
    const box = $('#planEasy'), g = state.grid, s = site(state.focus);
    if (!box) return;
    if (!g || !s) { box.innerHTML = ''; return; }
    const ser = state.series[state.focus] || anySeries(state.focus), days = state.mission.days;
    pzCells = E.landingDates(ser, g, { days, goal: 'ops', sunlitAtTouchdown: true, linkAtTouchdown: true, minSunClearanceDeg: 0.5, candidateStepH: 6 });
    const picked = [];
    pzCells.filter(c => c.ok).sort((a, b) => b.score - a.score).forEach(c => {
      if (picked.length < 3 && !picked.some(p => Math.abs(p.i - c.i) * g.stepMs < 3 * DAY)) picked.push(c);
    });
    const leg = `<div class="pz-leg"><span><i style="background:var(--ops)"></i>${t('pzGood')}</span><span><i style="background:var(--sun)"></i>${t('pzFair')}</span><span><i style="background:var(--danger)"></i>${t('pzPoor')}</span><span><i style="background:var(--none);opacity:.6"></i>${t('pzNo')}</span></div>`;
    const best = picked.length ? picked.map((c, k) => `<button type="button" class="pz-best" data-ms="${c.time}"><span class="rk">${k + 1}</span><span><b>${utc(c.time)} UTC</b><small>${fmt(c.score, 0)}% ${t('msOpsWord')}</small></span><span class="go">🚩 ${t('pzUse')}</span></button>`).join('')
      : `<p class="pz-none">${t('pzNone')}</p>`;
    box.innerHTML = `<h2>${t('pzTitle')}</h2><p class="pz-sub">${t('pzSub').replace('{n}', esc(s.name)).replace('{days}', days)}</p>` +
      `<div class="pz-strip"><canvas id="planStrip" role="img" aria-label="${t('pzAria')}"></canvas></div>${leg}` +
      `<h3 class="pz-h">${t('pzBest')}</h3>${best}` +
      `<div class="pz-actions"><button type="button" class="btn" data-pz="explore">${t('dtExplore')}</button><button type="button" class="btn ghost" data-pz="compare">${t('spCompare')}</button></div>`;
    drawPlanStrip();
  }
  function drawPlanStrip() {
    const cv = $('#planStrip'), g = state.grid; if (!cv || !g || !pzCells.length) return;
    const { ctx, w, h } = canvasSetup(cv), x0 = 6, x1 = w - 6, y0 = 16, bh = 30, tEnd = timeOf(g.n - 1);
    const XT = ms => x0 + (ms - g.start) / (tEnd - g.start) * (x1 - x0);
    const cw = pzCells.length > 1 ? Math.max(1, XT(pzCells[1].time) - XT(pzCells[0].time)) : 4;
    ctx.save(); ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x0, y0, x1 - x0, bh, 8) : ctx.rect(x0, y0, x1 - x0, bh); ctx.clip();
    pzCells.forEach(c => {
      ctx.globalAlpha = c.ok ? 1 : 0.45;
      ctx.fillStyle = !c.ok ? cssv('--none') : c.score >= 60 ? cssv('--ops') : c.score >= 30 ? cssv('--sun') : cssv('--danger');
      ctx.fillRect(XT(c.time), y0, cw + 0.5, bh);
    });
    ctx.restore(); ctx.globalAlpha = 1;
    const mark = (ms, col, lab) => { const x = XT(ms); ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x - 6, 2); ctx.lineTo(x + 6, 2); ctx.lineTo(x, 13); ctx.closePath(); ctx.fill();
      ctx.fillStyle = cssv('--fg'); ctx.font = '700 10px ' + cssv('--f-body'); ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText(lab, x, 1 + 0); };
    if (missionIdx('landing') != null) mark(state.mission.landing, cssv('--accent'), '');
    drawCursor(ctx, XT(timeOf(state.cursor)), y0 - 3, y0 + bh + 3);
    ctx.font = '11px ' + cssv('--f-mono');
    drawTimeAxis(ctx, x0, x1, y0 + bh + 6, g.start, tEnd);
  }
  $('#planEasy').addEventListener('click', e => {
    const b = e.target.closest('.pz-best'), a = e.target.closest('[data-pz]'), cv = e.target.closest('#planStrip');
    if (b) { setMissionTime('landing', +b.dataset.ms, true); renderPlanEasy(); toast(t('pzPlaced').replace('{d}', utc(+b.dataset.ms))); }
    else if (a) { if (a.dataset.pz === 'explore') showTab('3d'); else openCmpDialog(); }
    else if (cv && state.grid) {
      const r = cv.getBoundingClientRect(), g = state.grid, ms = g.start + Math.max(0, Math.min(1, (e.clientX - r.left - 6) / (r.width - 12))) * (timeOf(g.n - 1) - g.start);
      setMissionTime('landing', ms, true); renderPlanEasy();
    }
  });
  function renderPlan() {
    renderPlanEasy();
    if (mode === 'simple') return;
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
    fillNewSite(m.lat, m.lon);
  });
  function fillNewSite(lat, lon) {
    $('#newLat').value = lat.toFixed(4); $('#newLon').value = lon.toFixed(4);
    $('#addSiteBox').open = true; $('#addMsg').textContent = t('coordsSet'); $('#addMsg').className = 'form-msg full';
    toast(`${Math.abs(lat).toFixed(3)}°S ${lon.toFixed(3)}°E — ${t('coordsSet')}`);
    if (window.innerWidth <= 900) $('#addSiteBox').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  /* ---------- calendar export (.ics) */
  function buildICS() {
    const ev = [];
    for (const id of state.selected) ev.push(...E.siteEvents(site(id).name, id, state.series[id], state.grid, ['ops']));
    return E.toICS(ev.sort((a, b) => a.start - b.start), lang === 'fr' ? 'Fenêtres lunaires (énergie + liaison)' : 'Lunar windows (power + link)');
  }
  $('#copyIcs').addEventListener('click', () => {
    const ics = buildICS();
    navigator.clipboard.writeText(ics).then(() => toast(t('icsCopied')), () => fallbackText(ics));
  });
  if ($('#dlIcs')) $('#dlIcs').addEventListener('click', () => {
    const blob = new Blob([buildICS()], { type: 'text/calendar' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `clps-windows-${utc(state.start, false)}.ics`; document.body.appendChild(a); a.click(); a.remove();
  });

  /* ---------- 3D view */
  const ST_COL = { ops: '#2fbf8c', sun: '#f2b84b', comm: '#5fa2f0', none: '#6b717a' };
  let v3d = null, v3dInit = null, v3dFailed = false;
  function v3dFallback(msg) {
    const f = $('#v3dFallback'); f.hidden = false;
    f.innerHTML = `<div><p>${esc(msg)}</p><p class="small" style="margin-top:8px;color:var(--space-mut)">${t('noWebGLHelp')}</p></div>`;
    $('#v3dStatus').textContent = '';
  }
  /* grade for any site: share of the mission window (landing date + length, else cursor + length) with power + link */
  const GRADES = [[60, 'A', '#2166ac'], [45, 'B', '#4393c3'], [30, 'C', '#8c929b'], [15, 'D', '#d6604d'], [-1, 'E', '#b2182b']];
  const allSer = {}, allSum = {};
  let allSerGrid = null, allSerCfg = '', allSumGrid = null, allSumCfg = '';
  function anySeries(id) {
    if (!state.grid) return null;
    if (state.series[id]) return state.series[id];
    const ck = JSON.stringify(state.cfg);
    if (allSerGrid !== state.grid || allSerCfg !== ck) { for (const k in allSer) delete allSer[k]; allSerGrid = state.grid; allSerCfg = ck; }
    if (!allSer[id]) allSer[id] = E.siteSeries(state.grid, site(id), state.cfg);
    return allSer[id];
  }
  /* full-period summary for any site (cached, reset when the period or the rules change) */
  function anySum(id) {
    const ser = anySeries(id); if (!ser) return null;
    const ck = JSON.stringify(state.cfg);
    if (allSumGrid !== state.grid || allSumCfg !== ck) { for (const k in allSum) delete allSum[k]; allSumGrid = state.grid; allSumCfg = ck; }
    return allSum[id] || (allSum[id] = E.summarize(ser, state.grid));
  }
  function siteGrade(id) {
    const ser = anySeries(id); if (!ser) return null;
    const g = state.grid, W = missionWindow(), i0 = W.i0, i1 = W.i1;
    const m = E.summarize(ser, g, i0, i1), pct = m.opsPct;
    const [, letter, color] = GRADES.find(([min]) => pct >= min);
    return { pct, letter, color, days: (i1 - i0) * g.stepMs / DAY };
  }
  /* south-pole candidates ranked by their grade at the cursor time */
  function rankSouth() {
    return state.sites.filter(s => s.lat <= -75).map(s => ({ id: s.id, gr: siteGrade(s.id) })).filter(x => x.gr).sort((a, b) => b.gr.pct - a.gr.pct);
  }
  function bestSite() {
    if (!state.grid) return;
    const rk = rankSouth(); if (!rk.length) return;
    const b = rk[0], s = site(b.id);
    if (!state.selected.includes(b.id)) {
      if (!selectSite(b.id)) { state.selected.pop(); selectSite(b.id); }
      store.set('selected', state.selected);
      state.focus = b.id; computeSeries();
    } else setFocus(b.id);
    toast(t('bestMsg').replace('{n}', s.name).replace('{g}', b.gr.letter).replace('{p}', fmt(b.gr.pct, 0)).replace('{d}', utc(timeOf(missionWindow().i0), false)));
    if (v3d) { if (v3d.region() === 'moon' || !v3d.inRegion(s)) setRegionUI('south'); v3d.view('overview'); }
  }
  $('#bestBtn').addEventListener('click', bestSite);
  const gradeChip = gr => `<span class="grade" style="background:${gr.color}">${gr.letter}</span>`;
  function onSiteHover(id, x, y) {
    if (!id) { hideTip(); return; }
    const s = site(id), gr = siteGrade(id); if (!s || !gr) return;
    tip.innerHTML = `<div class="r"><b>${esc(s.name)}</b>${gradeChip(gr)}</div><div class="t">${utc(timeOf(state.cursor))} UTC</div>` +
      `<div class="r"><span>${t('gradeTitle')}</span><span>${fmt(gr.pct, 0)}%</span></div>`;
    tip.hidden = false;
    const r = tip.getBoundingClientRect();
    tip.style.left = Math.min(window.innerWidth - r.width - 8, x + 14) + 'px';
    tip.style.top = Math.max(8, Math.min(window.innerHeight - r.height - 8, y + 14)) + 'px';
  }
  /* open a site: select it, fly the camera to it, scroll down to its profile */
  function openSite(id, scroll = false) {
    const s = site(id); if (!s) return;
    if (!state.selected.includes(id)) {
      if (!selectSite(id)) { state.selected.pop(); selectSite(id); }
      store.set('selected', state.selected);
      state.focus = id; computeSeries();
    } else setFocus(id);
    if (v3d) {
      if (!v3d.inRegion(s) && s.lat <= -75) setRegionUI('south');
      v3d.flyTo(s, 900);
    }
    if (scroll && state.tab === '3d') {
      const acc = $('#accProfile'); acc.open = true;
      setTimeout(() => acc.scrollIntoView({ behavior: 'smooth', block: 'start' }), 350);
    }
  }
  /* right-click on the terrain: small popover to name and add a site */
  let popCoords = null;
  function showAddPop(lat, lon, x, y) {
    popCoords = [lat, lon];
    const pop = $('#addPop'); pop.hidden = false;
    $('#addPopCoords').textContent = `${Math.abs(lat).toFixed(3)}°${lat < 0 ? 'S' : 'N'} ${lon.toFixed(3)}°E`;
    const r = pop.getBoundingClientRect();
    pop.style.left = Math.max(8, Math.min(window.innerWidth - r.width - 8, x)) + 'px';
    pop.style.top = Math.max(8, Math.min(window.innerHeight - r.height - 8, y)) + 'px';
    $('#addPopName').value = ''; $('#addPopName').focus();
  }
  function hideAddPop() { $('#addPop').hidden = true; popCoords = null; }
  function submitAddPop() {
    if (!popCoords) return;
    $('#newLat').value = popCoords[0].toFixed(4); $('#newLon').value = popCoords[1].toFixed(4);
    $('#newName').value = $('#addPopName').value.trim(); $('#newSnap').checked = false;
    hideAddPop(); $('#addSiteForm').requestSubmit();
  }
  $('#addPopOk').addEventListener('click', submitAddPop);
  $('#addPopNo').addEventListener('click', hideAddPop);
  $('#addPopName').addEventListener('keydown', e => { if (e.key === 'Enter') submitAddPop(); else if (e.key === 'Escape') hideAddPop(); });
  document.addEventListener('pointerdown', e => { if (!$('#addPop').hidden && !e.target.closest('#addPop')) hideAddPop(); });

  /* search box */
  const sIn = $('#siteSearch'), sRes = $('#searchRes');
  function runSearch() {
    const q = sIn.value.trim().toLowerCase();
    if (!q) { sRes.hidden = true; return; }
    const hits = state.sites.filter(s => (s.name + ' ' + s.id + ' ' + (s.group || '')).toLowerCase().includes(q)).slice(0, 8);
    sRes.innerHTML = hits.length ? hits.map(s => `<button type="button" role="option" data-id="${esc(s.id)}">${esc(s.name)}<small>${Math.abs(s.lat).toFixed(1)}°${s.lat < 0 ? 'S' : 'N'}</small></button>`).join('')
      : `<p class="muted small">${t('searchNone')}</p>`;
    sRes.hidden = false;
  }
  sIn.addEventListener('input', runSearch);
  sIn.addEventListener('focus', runSearch);
  sIn.addEventListener('keydown', e => {
    if (e.key === 'Escape') { sRes.hidden = true; sIn.blur(); }
    if (e.key === 'Enter') { const f = sRes.querySelector('button'); if (f) f.click(); }
  });
  sRes.addEventListener('click', e => {
    const b = e.target.closest('[data-id]'); if (!b) return;
    sRes.hidden = true; sIn.value = '';
    if (state.tab !== '3d') showTab('3d');
    openSite(b.dataset.id);
  });
  document.addEventListener('pointerdown', e => { if (!e.target.closest('.search')) sRes.hidden = true; });

  /* heat map follows the cursor: score over the 10 days from the cursor time */
  try { const q = store.get('quality', 'high'); $('#v3dQuality').value = q === 'standard' ? 'standard' : 'high'; } catch (e) { /* ignore */ }
  let heatWin = false, heatT = 0;
  function windowSamples() {
    const g = state.grid, W = missionWindow(), i0 = W.i0, i1 = W.i1;
    const N = Math.max(2, Math.min(60, i1 - i0)), out = [];
    for (let k = 0; k < N; k++) out.push(v3dStateAt(Math.min(g.n - 1, Math.floor(i0 + (k + 0.5) * (i1 - i0) / N))));
    return out;
  }
  const heatOn = () => heatWin && $('#v3dMode').value.startsWith('avg');
  function scheduleHeat() {
    clearTimeout(heatT);
    heatT = setTimeout(() => { if (v3d && heatOn() && state.grid) v3d.setSamples(windowSamples()); }, 250);
  }
  function init3D() {
    if (v3d || v3dFailed) return Promise.resolve(v3d);
    if (!v3dInit) {
      v3dInit = (async () => {
        if (!window.THREE || !window.LunarView3D || !LunarView3D.available()) throw new Error(t('noWebGL'));
        $('#v3dStatus').textContent = t('demLoading');
        const T = await loadTerrain();
        v3d = LunarView3D.create($('#v3dStage'), T, {
          t,
          onSite: id => openSite(id),
          onContext: (lat, lon, x, y) => showAddPop(lat, lon, x, y),
          onHover: onSiteHover,
          onZone: openZone, onZoneHover,
          basemap: baseImg, basemapMeta: DATA.assets.basemap,
          onProgress: p => { $('#v3dStatus').textContent = p == null ? '' : `${t('averaging')} ${Math.round(p * 100)}%`; },
          onUserInput: () => { if (tour) stopTour(); const h = $('#v3dHint'); if (h) h.classList.add('gone'); }
        });
        v3d.setRules(state.cfg);
        v3d.setQuality($('#v3dQuality').value);
        v3d.setExag(+$('#v3dExag').value);
        v3d.setFlat(flat);
        syncZones();
        if ($('#v3dRegion').value === 'moon') v3d.setRegion('moon');
        set3DMode($('#v3dMode').value);
        $('#v3dStatus').textContent = '';
        return v3d;
      })().catch(err => { v3dFailed = true; v3dFallback(err.message); return null; });
    }
    return v3dInit;
  }
  function v3dSites() {
    const i = state.cursor, heat = $('#v3dMode').value.startsWith('avg') && v3d && v3d.region() === 'south';
    const top = {}, gcol = {};
    if (heat) rankSouth().forEach((x, k) => { gcol[x.id] = x.gr.color; if (k < 3) top[x.id] = true; });
    else if (v3d && v3d.region() === 'moon') state.sites.forEach(s => { const gr = siteGrade(s.id); if (gr) gcol[s.id] = gr.color; });
    return state.sites.map(s => {
      const ser = state.series[s.id], sel = state.selected.includes(s.id);
      const sc = ser ? (ser.ops[i] ? ST_COL.ops : ser.lit[i] ? ST_COL.sun : ser.dte[i] ? ST_COL.comm : ST_COL.none) : null;
      return { id: s.id, name: s.name, lat: s.lat, lon: s.lon, heightM: s.heightM, selected: sel, focus: s.id === state.focus,
        color: gcol[s.id] || (sel ? colorOf(s.id) : '#c9ced6'), stateColor: sc, label: !!top[s.id] };
    });
  }
  function v3dStateAt(i) {
    const g = state.grid, k = i * 3, m = state.cfg.dsnMinDeg;
    const dsnOk = !state.cfg.requireDSN || g.dsn[k] >= m || g.dsn[k + 1] >= m || g.dsn[k + 2] >= m;
    return { sun: [g.sun[k], g.sun[k + 1], g.sun[k + 2]], earth: [g.earth[k], g.earth[k + 1], g.earth[k + 2]],
      earthIllum: g.earthIllum[i], dsnOk, t: timeOf(i) };
  }
  function v3dSamples() {
    const g = state.grid, days = (g.n * g.stepMs) / DAY;
    const N = Math.min(g.n, Math.min(120, Math.max(48, Math.round(days * 1.4))));
    const out = [];
    for (let k = 0; k < N; k++) out.push(v3dStateAt(Math.floor((k + 0.5) * g.n / N)));
    return out;
  }
  let v3dSitesKey = '';
  function render3D() {
    init3D().then(v => {
      if (!v || !state.grid) return;
      v.setRules(state.cfg);
      v.setSamples(heatOn() ? windowSamples() : v3dSamples());
      v3dSitesKey = '';
      update3D();
      v.resize();
    });
  }
  /* ---------- mission: landing date + length, shared by the time bar, the header, grades and the heat map */
  const MISSION_DAYS = [3, 5, 7, 10, 14, 21, 30];
  state.mission = (() => { const m = store.get('mission', null) || {}; return { landing: typeof m.landing === 'number' ? m.landing : null, days: MISSION_DAYS.includes(m.days) ? m.days : 10, b: typeof m.b === 'number' ? m.b : null, bSite: typeof m.bSite === 'string' ? m.bSite : null }; })();
  const saveMission = () => store.set('mission', state.mission);
  function missionIdx(key = 'landing') {
    const g = state.grid, m = state.mission[key];
    if (!g || m == null || m < state.start || m > timeOf(g.n - 1)) return null;
    return indexOf(m);
  }
  function missionWindow() {
    const g = state.grid, li = missionIdx(), days = state.mission.days;
    const i0 = li != null ? Math.min(li, g.n - 2) : Math.min(state.cursor, Math.max(0, g.n - 2));
    return { i0, i1: Math.min(g.n, i0 + Math.max(2, Math.round(days * DAY / g.stepMs))), days, set: li != null };
  }
  function afterMissionChange() {
    renderMission(); drawCursorTrack(); renderCtx(); renderDateChip();
    if (state.tab === '3d') { update3D(); renderProfile(); } else if (state.tab === 'compare') renderCmpFocus(); else if (state.tab === 'plan') renderPlanEasy();
    try { $('#planDays').value = state.mission.days; } catch (e) { /* ignore */ }
  }
  function setMissionTime(key, ms, follow) {
    const g = state.grid; if (!g) return;
    const i = indexOf(Math.max(state.start, Math.min(timeOf(g.n - 1), ms)));
    state.mission[key] = timeOf(i); saveMission();
    if (follow) setCursor(i);
    afterMissionChange();
  }
  const setLanding = (ms, follow) => setMissionTime('landing', ms, follow);
  function renderMission() {
    const box = $('#cbMission'), g = state.grid; if (!box) return;
    if (!g) { box.innerHTML = ''; return; }
    const li = missionIdx(), days = state.mission.days;
    const sel = `<label class="ms-dur"><span>${t('msLength')}</span><select id="msDays">${MISSION_DAYS.map(d => `<option value="${d}"${d === days ? ' selected' : ''}>${d} ${t('d')}</option>`).join('')}</select></label>`;
    if (li == null) { box.innerHTML = `<button type="button" class="btn ms-btn" data-ms="set">🚩 ${t('msSet')}</button>${sel}<span class="ms-hint">${t('msHint')}</span>`; return; }
    const sh = d => `<button type="button" class="btn ghost ms-btn${Math.abs(d) > 1 ? ' adv-only' : ''}" data-ms-shift="${d}">${d > 0 ? '+' : '−'}${Math.abs(d)} ${t('d')}</button>`;
    const ser = state.series[state.focus] || anySeries(state.focus), W = missionWindow();
    const m = ser ? E.summarize(ser, g, W.i0, W.i1) : null;
    const lb = missionIdx('b');
    const bCtl = lb == null ? `<button type="button" class="btn ms-btn" data-ms="addB">＋ ${t('msAddB')}</button>`
      : `<span class="ms-when ms-b">B ${utc(state.mission.b)} UTC</span><button type="button" class="btn ghost ms-btn" data-ms="clearB" aria-label="${t('msClearB')}" title="${t('msClearB')}">✕</button><button type="button" class="btn ms-btn" data-ms="seeAB">${t('msSeeAB')}</button>`;
    const res = m ? `<span class="ms-res"><span class="adv-only">☀️ ${fmt(m.litPct, 0)}% · 🌍 ${fmt(m.earthPct, 0)}% · </span>⚡ ${fmt(m.opsPct, 0)}% <span class="ms-rh">${t('msOpsWord')}</span></span>` : '';
    box.innerHTML = `<span class="ms-when">🚩 ${utc(state.mission.landing)} UTC</span>${sel}${[-7, -3, -1, 1, 3, 7].map(sh).join('')}<button type="button" class="btn ghost ms-btn" data-ms="clear" aria-label="${t('msClear')}" title="${t('msClear')}">✕</button>${bCtl}${res}`;
  }
  $('#cbMission').addEventListener('click', e => {
    const b = e.target.closest('[data-ms]'), sh = e.target.closest('[data-ms-shift]');
    if (b && b.dataset.ms === 'set' && state.grid) setLanding(timeOf(state.cursor), false);
    else if (b && b.dataset.ms === 'clear') { state.mission.landing = null; saveMission(); afterMissionChange(); }
    else if (b && b.dataset.ms === 'addB') addDateB();
    else if (b && b.dataset.ms === 'clearB') { state.mission.b = null; saveMission(); afterMissionChange(); }
    else if (b && b.dataset.ms === 'seeAB') goCompare('dates');
    else if (sh) setLanding((state.mission.landing != null ? state.mission.landing : timeOf(state.cursor)) + (+sh.dataset.msShift) * DAY, true);
  });
  $('#cbMission').addEventListener('change', e => {
    if (e.target.id === 'msDays') { state.mission.days = +e.target.value; saveMission(); afterMissionChange(); }
  });
  function addDateB() {
    if (missionIdx('landing') == null) setMissionTime('landing', timeOf(state.cursor), false);
    setMissionTime('b', state.mission.landing + 7 * DAY, false);
  }
  /* drag a flag (A = landing, B = second date) along the bar; the cursor follows it */
  function bindFlag(fl, key) {
    let drag = false, pend = null, raf = 0;
    const apply = () => { raf = 0; if (pend == null) return; const i = pend; pend = null; if (i !== missionIdx(key)) { state.mission[key] = timeOf(i); setCursor(i); drawCursorTrack(); renderCtx(); } };
    fl.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); fl.setPointerCapture(e.pointerId); drag = true; });
    fl.addEventListener('pointermove', e => {
      if (!drag || !state.grid) return;
      const r = $('#cbTrack').getBoundingClientRect(), n = state.grid.n;
      pend = Math.max(0, Math.min(n - 1, Math.round((e.clientX - r.left - 8) / (r.width - 16) * n - 0.5)));
      if (!raf) raf = requestAnimationFrame(apply);
    });
    const end = () => { if (!drag) return; drag = false; apply(); saveMission(); afterMissionChange(); };
    fl.addEventListener('pointerup', end); fl.addEventListener('pointercancel', end);
    fl.addEventListener('keydown', e => {
      const k = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (!k) return;
      e.preventDefault(); setMissionTime(key, state.mission[key] + k * (e.shiftKey ? 7 : 1) * DAY, true);
    });
  }
  bindFlag($('#lmFlag'), 'landing'); bindFlag($('#lmFlagB'), 'b');
  /* context strip under the title: site, moment, Sun and Earth, always visible */
  let ctxLast = '';
  function renderCtx() {
    const box = $('#ctxBar'), s = site(state.focus), ser = state.series[state.focus], g = state.grid;
    if (!box) return;
    if (!s || !ser || !g) { if (ctxLast) { box.innerHTML = ''; ctxLast = ''; } return; }
    const c = E.conditionsAt(ser, g, state.cursor);
    const st = (on, ico, m) => `<span class="${on ? 'ok' : 'no'}">${ico} ${on ? '✓ ' + t('spVisible') : '✕ ' + t(m)}</span>`;
    const html = `<span class="cx-site">📍 ${esc(s.name)}</span><span class="cx-date">📅 ${utc(timeOf(state.cursor))} UTC</span>` +
      st(c.sunlit, '☀️', 'spHiddenM') + st(c.earthUp, '🌍', 'spHiddenF') + (missionIdx() != null ? `<span>🚩 ${state.mission.days} ${t('d')}</span>` : '');
    if (html !== ctxLast) { ctxLast = html; box.innerHTML = html; }
  }

  /* ---------- compare: chooser, ranking against the chosen site, side-by-side with reasons */
  state.cmp = { mode: ['one', 'dates'].includes(store.get('cmpMode', 'all')) ? store.get('cmpMode', 'all') : 'all', other: store.get('cmpOther', null) };
  const CM = [
    { k: 'litPct', l: 'cmSun', ico: '☀️', hi: true, pct: true },
    { k: 'earthPct', l: 'cmEarth', ico: '🌍', hi: true, pct: true },
    { k: 'opsPct', l: 'cmOps', ico: '⚡', hi: true, pct: true },
    { k: 'dtePct', l: 'cmDte', ico: '📡', hi: true, pct: true, adv: true },
    { k: 'longestNightH', l: 'cmNight', ico: '🌑', hi: false, adv: true },
    { k: 'longestBlackoutH', l: 'cmGap', ico: '📵', hi: false, adv: true }
  ];
  const cmVal = (m, v) => m.pct ? fmt(v, 0) + '%' : dur(v);
  function cmDelta(m, v, ref) {
    const d = v - ref;
    if (m.pct ? Math.abs(d) < 0.5 : Math.abs(d) < 1) return { cls: 'eq', txt: '＝ ' + t('cmSame'), same: true };
    const better = m.hi ? d > 0 : d < 0, mag = m.pct ? Math.abs(d).toFixed(0) + ' pp' : dur(Math.abs(d));
    return { cls: better ? 'up' : 'down', txt: `${better ? '▲' : '▼'} ${d > 0 ? '+' : '−'}${mag}`, better, mag };
  }
  const cmpRows = () => state.sites.map(s => ({ s, m: anySum(s.id) })).filter(r => r.m)
    .sort((a, b) => b.m.opsPct - a.m.opsPct || b.m.litPct - a.m.litPct);
  /* scenario (site + landing date + length) through the engine, cached like the Scenarios tab */
  function scenRes(siteId, ms, days) {
    const x = { siteId, t: ms, days }, k = scenKey(x);
    if (!scenCache.has(k)) scenCache.set(k, E.scenario(site(siteId), ms, days, state.cfg));
    return scenCache.get(k);
  }
  const LOSS = { k: 'loss', l: 'cmLoss', ico: '⏱️', hi: true, h: true };
  const fv = (m, ent) => m.k === 'loss' ? (ent.lossNone ? t('never') : ent.m.loss === 0 ? t('cmLossNow') : dur(ent.m.loss)) : cmVal(m, ent.m[m.k]);
  /* side-by-side table, verdict and reasons for two entries { name, sub, m } (period summary or scenario) */
  function pairHtml(EA, EB, headB) {
    const adv = m => m.adv ? ' adv-only' : '';
    const ms = CM.concat(EA.m.loss != null && EB.m.loss != null ? [LOSS] : []).filter(m => EA.m[m.k] != null && EB.m[m.k] != null);
    const trs = ms.map(m => { const d = cmDelta(m, EB.m[m.k], EA.m[m.k]);
      return `<tr class="${adv(m).trim()}"><td>${m.ico} ${t(m.l)}</td><td class="cv">${fv(m, EA)}</td><td class="cv">${fv(m, EB)}</td><td><span class="dl ${d.cls}">${d.txt}</span></td></tr>`; }).join('');
    const dOps = cmDelta(CM[2], EB.m.opsPct, EA.m.opsPct);
    const win = dOps.same ? null : (dOps.better ? EB : EA);
    const verdict = dOps.same ? t('cfAbout') : t('cfBetter').replace('{n}', esc(win.name)).replace('{d}', `+${dOps.mag}`);
    const whys = ms.filter(m => m.k !== 'opsPct').map(m => {
      const d = cmDelta(m, EB.m[m.k], EA.m[m.k]); if (d.same) return '';
      const better = d.better ? EB : EA, forWinner = better === win || !win;
      const text = t('why_' + m.k).replace('{n}', `<b>${esc(better.name)}</b>`).replace('{d}', d.mag);
      return `<li class="${adv(m).trim()}"><span class="dl ${forWinner ? 'up' : 'down'}" aria-hidden="true">${forWinner ? '▲' : '▼'}</span><span>${text}</span></li>`;
    }).join('');
    const th = e => `${esc(e.name)}${e.sub ? `<small>${esc(e.sub)}</small>` : ''}`;
    return `<table class="cf-two"><thead><tr><th>${t('cmSite')}</th><th>${th(EA)}</th><th>${headB}</th><th>${t('cmDiff')}</th></tr></thead><tbody>${trs}</tbody></table>` +
      `<p class="cf-verdict">${verdict}</p><ul class="cf-why">${whys}</ul>`;
  }
  function datesBody(A) {
    const li = missionIdx('landing'), lb = missionIdx('b');
    if (li == null) return `<div class="cf-empty"><p>${t('dtPromptA')}</p><button type="button" class="btn primary" data-dt="setA">🚩 ${t('dtSetA')}</button></div>`;
    if (lb == null) return `<div class="cf-empty"><p>${t('dtPromptB')}</p><button type="button" class="btn primary" data-dt="addB">＋ ${t('dtAddB')}</button></div>`;
    const days = state.mission.days, sB = (state.mission.bSite && site(state.mission.bSite)) || A.s;
    const rA = scenRes(A.s.id, state.mission.landing, days), rB = scenRes(sB.id, state.mission.b, days);
    const ent = (nm, st, ms, r) => ({ name: t(nm), sub: `${st.name} · ${utc(ms)}`, m: Object.assign({}, r.summary, { loss: r.firstPowerOrLinkLossH == null ? days * 24 : r.firstPowerOrLinkLossH }), lossNone: r.firstPowerOrLinkLossH == null });
    const EA = ent('scenA', A.s, state.mission.landing, rA), EB = ent('scenB', sB, state.mission.b, rB);
    const sel = `<select id="dtSiteB" aria-label="${t('dtSiteB')}"><option value=""${sB === A.s ? ' selected' : ''}>${t('dtSame')}</option>` +
      state.sites.filter(x => x.id !== A.s.id).map(x => `<option value="${esc(x.id)}"${sB.id === x.id && sB !== A.s ? ' selected' : ''}>${esc(x.name)}</option>`).join('') + '</select>';
    const shift = d => `<button type="button" class="btn ghost ms-btn${[-3, -7].includes(d) ? ' adv-only' : ''}" data-dt-shift="${d}">${d > 0 ? '+' : '−'}${Math.abs(d)} ${t('d')}</button>`;
    return `<div class="cf-shift"><span>${t('dtShift')}</span>${[-7, -3, -1, 1, 3, 7].map(shift).join('')}</div>` + pairHtml(EA, EB, `${esc(EB.name)}<small>${esc(EB.sub)}</small>${sel}`) +
      `<p class="cf-note">${t('cfNoScore')} ${t('dtLen').replace('{days}', days)}</p>` +
      `<div class="cf-actions"><button type="button" class="btn" data-dt="better">${t('dtBetter')}</button><button type="button" class="btn ghost" data-dt="explore">${t('dtExplore')}</button><button type="button" class="btn ghost adv-only" data-dt="toScen">${t('dtToScen')}</button></div>`;
  }
  function renderCmpFocus() {
    const box = $('#cmpFocus'); if (!box) return;
    if (!state.grid || !site(state.focus)) { box.innerHTML = ''; return; }
    const mode = state.cmp.mode, rows = mode === 'dates' ? [] : cmpRows(), A = mode === 'dates' ? { s: site(state.focus) } : rows.find(r => r.s.id === state.focus);
    if (!A) { box.innerHTML = ''; return; }
    const per = mode === 'dates' ? '' : t('cfPeriod').replace('{a}', utc(state.start, false)).replace('{b}', utc(timeOf(state.grid.n - 1), false));
    const seg = `<div class="seg seg-plain" role="group" aria-label="${t('cfTitle')}">${[['all', 'cfWithAll'], ['one', 'cfWithOne'], ['dates', 'cfWithDates']].map(([k, l]) => `<button type="button" data-cm="${k}" aria-pressed="${mode === k}">${t(l)}</button>`).join('')}</div>`;
    const top = `<div class="cf-top"><h2>${t('cfTitle')}: ${esc(A.s.name)}</h2>${seg}</div>${per ? `<p class="cf-sub">${esc(per)}</p>` : ''}`;
    const approx = n => n.s.hsrc === 'smooth' ? ' ≈' : '';
    const adv = m => m.adv ? ' adv-only' : '';
    let body = '';
    if (mode === 'dates') body = datesBody(A);
    else if (mode === 'all') {
      const rank = rows.indexOf(A) + 1;
      const pin = `<div class="cf-pin"><div class="nm">${esc(A.s.name)}<span class="rk">${t('cfRank').replace('{n}', esc(A.s.name)).replace('{r}', rank).replace('{t}', rows.length)}</span></div>` +
        CM.map(m => `<div class="cf-m${adv(m)}"><small>${m.ico} ${t(m.l)}</small><b>${cmVal(m, A.m[m.k])}</b></div>`).join('') + '</div>';
      const head = `<div class="cf-row cf-head-row"><span></span><span>${t('cmSite')}</span>${CM.map(m => `<span class="${adv(m).trim()}">${m.ico} ${t(m.l)}</span>`).join('')}</div>`;
      const list = rows.map((r, k) => {
        const me = r === A;
        const cells = CM.map(m => { const d = me ? null : cmDelta(m, r.m[m.k], A.m[m.k]);
          return `<span class="mx${adv(m)}"><span class="cv">${cmVal(m, r.m[m.k])}</span>${d ? `<span class="dl ${d.cls}">${d.txt}</span>` : ''}</span>`; }).join('');
        return `<button type="button" class="cf-row${me ? ' me' : ''}" ${me ? 'disabled aria-current="true"' : `data-pick="${esc(r.s.id)}"`}><span class="rn">${k + 1}</span><span class="nm">${esc(r.s.name)}${approx(r)}<small>${esc(groupLabel(r.s.custom ? 'My sites' : r.s.group))}</small></span>${cells}</button>`;
      }).join('');
      body = pin + `<div class="cf-list" tabindex="0" role="region" aria-label="${t('cfWithAll')}">${head}${list}</div><p class="cf-note">${t('cfHint')} ${rows.some(r => r.s.hsrc === 'smooth') ? t('cfApprox') : ''}</p>`;
    } else {
      const B = rows.find(r => r.s.id === state.cmp.other && r !== A) || rows.find(r => r !== A);
      if (!B) { box.innerHTML = top; return; }
      state.cmp.other = B.s.id;
      const opts = rows.filter(r => r !== A).map(r => `<option value="${esc(r.s.id)}"${r === B ? ' selected' : ''}>${esc(r.s.name)}</option>`).join('');
      body = pairHtml({ name: A.s.name, m: A.m }, { name: B.s.name, m: B.m }, `<select id="cmpOther" aria-label="${t('cfWith')}">${opts}</select>`) +
        `<p class="cf-note">${t('cfNoScore')} ${[A, B].some(r => r.s.hsrc === 'smooth') ? t('cfApprox') : ''}</p>`;
    }
    const keep = $('#cmpFocus .cf-list') ? $('#cmpFocus .cf-list').scrollTop : 0;
    box.innerHTML = top + body;
    const l = $('#cmpFocus .cf-list'); if (l) l.scrollTop = keep;
  }
  $('#cmpFocus').addEventListener('click', e => {
    const m = e.target.closest('[data-cm]'), pk = e.target.closest('[data-pick]'), dt = e.target.closest('[data-dt]'), sh = e.target.closest('[data-dt-shift]');
    if (m) { state.cmp.mode = m.dataset.cm; store.set('cmpMode', state.cmp.mode); renderCmpFocus(); }
    else if (pk) { state.cmp.mode = 'one'; state.cmp.other = pk.dataset.pick; store.set('cmpMode', 'one'); store.set('cmpOther', state.cmp.other); renderCmpFocus(); $('#cmpFocus').scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    else if (sh) setMissionTime('b', state.mission.b + (+sh.dataset.dtShift) * DAY, false);
    else if (dt) {
      const a = dt.dataset.dt;
      if (a === 'setA') setMissionTime('landing', timeOf(state.cursor), false);
      else if (a === 'addB') addDateB();
      else if (a === 'better') showTab('plan');
      else if (a === 'explore') showTab('3d');
      else if (a === 'toScen') {
        if (scenIsExample) scenarios = [];
        const sB = (state.mission.bSite && site(state.mission.bSite)) || site(state.focus);
        scenarios.push({ siteId: state.focus, t: state.mission.landing, days: state.mission.days }, { siteId: sB.id, t: state.mission.b, days: state.mission.days });
        saveScen(); toast(t('dtAdded'));
      }
    }
  });
  $('#cmpFocus').addEventListener('change', e => {
    if (e.target.id === 'cmpOther') { state.cmp.other = e.target.value; store.set('cmpOther', state.cmp.other); renderCmpFocus(); }
    else if (e.target.id === 'dtSiteB') { state.mission.bSite = e.target.value || null; saveMission(); renderCmpFocus(); }
  });
  /* "Compare this site" asks: against all sites, against one, or the same site on another date */
  function openCmpDialog() {
    const A = site(state.focus); if (!A) return;
    $('#cmpDlgTitle').textContent = t('cdTitle').replace('{n}', A.name);
    $('#cdSite').innerHTML = state.sites.filter(x => x.id !== A.id).map(x => `<option value="${esc(x.id)}">${esc(x.name)}</option>`).join('');
    if (state.cmp.other && state.cmp.other !== A.id) $('#cdSite').value = state.cmp.other;
    $('#cdPick').hidden = true;
    document.querySelectorAll('#cmpDlg [data-cd]').forEach(b => b.setAttribute('aria-pressed', 'false'));
    $('#cmpDlg').showModal();
  }
  function goCompare(mode, other) {
    state.cmp.mode = mode; store.set('cmpMode', mode);
    if (other) { state.cmp.other = other; store.set('cmpOther', other); }
    if (!state.selected.includes(state.focus)) {
      if (!selectSite(state.focus)) { state.selected.pop(); selectSite(state.focus); }
      store.set('selected', state.selected); computeSeries();
    }
    if (mode === 'dates' && missionIdx('b') == null) addDateB();
    if ($('#cmpDlg').open) $('#cmpDlg').close();
    showTab('compare');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  $('#cmpDlg').addEventListener('click', e => {
    if (e.target === $('#cmpDlg')) { $('#cmpDlg').close(); return; }
    const b = e.target.closest('[data-cd]'); if (!b) return;
    if (b.dataset.cd === 'all') goCompare('all');
    else if (b.dataset.cd === 'dates') goCompare('dates');
    else { document.querySelectorAll('#cmpDlg [data-cd]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); $('#cdPick').hidden = false; $('#cdSite').focus(); }
  });
  $('#cdGo').addEventListener('click', () => goCompare('one', $('#cdSite').value));

  /* selected-site panel: plain-language state of the focused site at the cursor time */
  let spOpen = store.get('spOpen', null), spLast = '';
  if (spOpen === null) spOpen = !(window.matchMedia && window.matchMedia('(max-width: 700px)').matches);
  function renderSitePanel(S) {
    const box = $('#sitePanel'), s = site(state.focus), ser = state.series[state.focus], g = state.grid;
    if (!box || !s || !ser || !g) { box.innerHTML = ''; spLast = ''; return; }
    const i = state.cursor, c = E.conditionsAt(ser, g, i), a1 = changeInfo(c, 'sun'), a2 = changeInfo(c, 'earth'), a3 = changeInfo(c, 'link');
    const gr = siteGrade(state.focus);
    const flag = (on, yes, no, noKey) => on ? `<span class="ok">✓ ${t(yes)}</span>` : `<span class="no">✕ ${t(noKey || no)}</span>`;
    const row = (ico, lab, val, sub) => `<div class="sp-row"><span class="sp-ico" aria-hidden="true">${ico}</span><div><div class="sp-lab">${lab}</div><div class="sp-val">${val}</div>${sub ? `<div class="sp-sub">${sub}</div>` : ''}</div></div>`;
    let adv = '';
    const poleEl = v => Math.asin(-v[2] / Math.hypot(v[0], v[1], v[2])) * 180 / Math.PI;
    const dsnIn = E.DSN.filter((d, k) => g.dsn[i * 3 + k] >= state.cfg.dsnMinDeg).map(d => d.name);
    const line = (l, v) => `<div><span>${l}</span><span>${v}</span></div>`;
    adv = `<div class="sp-adv adv-only">${line('UTC', utc(timeOf(i)))}` +
      line(t('spSunPos'), `${fmt(c.sunEl, 1)}° / ${fmt(c.sunAz, 0)}°`) + line(t('spEarthPos'), `${fmt(c.earthEl, 1)}° / ${fmt(c.earthAz, 0)}°`) +
      line(t('spState'), t('st_' + (c.ops ? 'ops' : c.sunlit ? 'sun' : c.link ? 'comm' : 'none'))) +
      (gr ? line(t('gradeTitle'), `${fmt(gr.pct, 0)}%`) : '') + line('DSN', dsnIn.length ? dsnIn.join(', ') : t('none')) +
      line(t('phase'), fmt(S.earthIllum * 100, 0) + '%') + line(t('spPole'), `${fmt(poleEl(S.sun), 2)}° / ${fmt(poleEl([S.earth[0], S.earth[1], S.earth[2] + 1737.4]), 2)}°`) + '</div>';
    const html = `<div class="sp-kick">${t('spKicker')}</div>` +
      `<button type="button" class="sp-head" id="spHead" aria-expanded="${spOpen}" title="${t(spOpen ? 'spCollapse' : 'spExpand')}"><span class="sp-name">${esc(s.name)}</span>${gr ? gradeChip(gr) : ''}<span class="sp-chev" aria-hidden="true">${spOpen ? '▾' : '▸'}</span></button>` +
      `<div class="sp-rows">` +
      row('☀️', t('spSun'), flag(c.sunlit, 'spVisible', 'spHiddenM'), `${a1.label} ${a1.val}`) +
      row('🌍', t('spEarth'), flag(c.earthUp, 'spVisible', 'spHiddenF'), `${a2.label} ${a2.val}`) +
      row('📡', t('spLink'), flag(c.link, 'spAvail', 'spUnavail'), `${a3.label} ${a3.val}`) + `</div>` + adv +
      `<div class="sp-actions"><button type="button" class="sp-btn main" data-sp="analyze">${t('spAnalyze')}</button><button type="button" class="sp-btn" data-sp="compare">${t('spCompare')}</button></div>`;
    const cls = 'site-panel' + (spOpen ? '' : ' collapsed'), key = cls + html;
    if (key === spLast) return;
    spLast = key; box.className = cls; box.innerHTML = html;
  }
  $('#sitePanel').addEventListener('click', e => {
    if (e.target.closest('#spHead')) { spOpen = !spOpen; store.set('spOpen', spOpen); spLast = ''; renderSitePanel(v3dStateAt(state.cursor)); return; }
    const b = e.target.closest('[data-sp]'); if (!b) return;
    if (b.dataset.sp === 'analyze') {
      const acc = $('#accProfile'); acc.open = true;
      acc.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else openCmpDialog();
  });
  function update3D() {
    if (!v3d || !state.grid) return;
    if (heatOn()) scheduleHeat();
    syncZones();
    const list = v3dSites();
    const key = list.map(s => s.id + (s.selected ? 1 : 0) + (s.focus ? 1 : 0) + s.color + s.lat).join('|');
    v3d.setSites(list, key !== v3dSitesKey); v3dSitesKey = key;
    const S = v3dStateAt(state.cursor);
    v3d.setState(S);
    renderLegend();
    renderSitePanel(S);
  }
  /* region / scope: 'moon' = whole Moon, 'south' (75-90 S) and 'pole' (87.5-90 S) = LOLA terrain */
  function syncScope() {
    const moon = $('#v3dRegion').value === 'moon';
    document.querySelectorAll('#v3dScope [data-scope]').forEach(b => b.setAttribute('aria-pressed', String((b.dataset.scope === 'moon') === moon)));
  }
  function setRegionUI(r) {
    $('#v3dRegion').value = r;
    if (v3d) v3d.setRegion(r);
    syncScope(); renderLegend(); update3D();
  }
  /* fictional even lighting ("light everywhere") */
  let flat = store.get('flat', false) === true;
  function applyFlat() {
    $('#v3dLight').setAttribute('aria-pressed', String(flat));
    $('#v3dFlatTag').hidden = !flat;
    if (v3d) v3d.setFlat(flat);
    renderLegend();
  }
  $('#v3dLight').addEventListener('click', () => { flat = !flat; store.set('flat', flat); applyFlat(); });
  /* zones shown as discs on the whole-Moon view */
  const ZONE_DEFS = [
    { id: 'polar', key: 'zPolar', color: '#f2b84b', south: true },
    { id: 'apollo', key: 'zApollo', color: '#5fa2f0', ids: ['a11', 'a12', 'a14', 'a15', 'a16', 'a17', 'slim'] },
    { id: 'west', key: 'zWest', color: '#5fa2f0', ids: ['im3', 'ce5'] },
    { id: 'far', key: 'zFar', color: '#5fa2f0', ids: ['ce4', 'ce6'] }
  ];
  let zonesCache = [], zonesKey = '';
  function zoneList() {
    const D = Math.PI / 180, U = (la, lo) => [Math.cos(la * D) * Math.cos(lo * D), Math.cos(la * D) * Math.sin(lo * D), Math.sin(la * D)];
    return ZONE_DEFS.map(d => {
      const ss = d.south ? state.sites.filter(s => s.lat <= -75) : d.ids.map(site).filter(Boolean);
      if (!ss.length) return null;
      let lat = -90, lon = 0, rad = 15;
      if (!d.south) {
        let v = [0, 0, 0]; ss.forEach(s => { const u = U(s.lat, s.lon); v = v.map((x, k) => x + u[k]); });
        const n = Math.hypot(...v); v = v.map(x => x / n);
        lat = Math.asin(v[2]) / D; lon = Math.atan2(v[1], v[0]) / D;
        rad = Math.max(8, 5 + Math.max(...ss.map(s => { const u = U(s.lat, s.lon); return Math.acos(Math.max(-1, Math.min(1, u[0] * v[0] + u[1] * v[1] + u[2] * v[2]))) / D; })));
      }
      return { id: d.id, name: t(d.key), color: d.color, lat, lon, rad, siteIds: ss.map(s => s.id) };
    }).filter(Boolean);
  }
  function syncZones() {
    const zl = zoneList(), key = lang + '|' + zl.map(z => z.id + z.rad.toFixed(1) + z.siteIds.length).join(',');
    zonesCache = zl;
    if (v3d && key !== zonesKey) { v3d.setZones(zl); zonesKey = key; }
  }
  function openZone(id) {
    const z = zonesCache.find(q => q.id === id); if (!z || !v3d) return;
    if (id === 'polar') { setRegionUI('south'); v3d.view('overview'); return; }
    v3d.focusZone(id);
    toast(t('zoneToast').replace('{z}', z.name));
  }
  function onZoneHover(id, x, y) {
    if (!id) { hideTip(); return; }
    const z = zonesCache.find(q => q.id === id); if (!z) return;
    tip.innerHTML = `<div class="r"><b>${esc(z.name)}</b></div><div class="t">${t('zoneTip').replace('{n}', z.siteIds.length)}</div>`;
    tip.hidden = false;
    const r = tip.getBoundingClientRect();
    tip.style.left = Math.min(window.innerWidth - r.width - 8, x + 14) + 'px';
    tip.style.top = Math.max(8, Math.min(window.innerHeight - r.height - 8, y + 14)) + 'px';
  }
  function renderLegend() {
    const L = $('#v3dLegend'), mode = $('#v3dMode').value, moon = $('#v3dRegion').value === 'moon';
    L.classList.toggle('is-heat', mode.startsWith('avg') && !moon);
    if (flat) { L.innerHTML = `<span>${t('flatTag')}</span>`; return; }
    if (moon) { L.innerHTML = `<span>${t('lgMoon')}</span>`; return; }
    if (mode === 'sun') L.innerHTML = `<span>${t('lgReal')}</span>`;
    else if (mode === 'plan') L.innerHTML = [['ops', 'lgOps'], ['sun', 'lgSun'], ['comm', 'lgComm'], ['none', 'lgNone']]
      .map(([k, l]) => `<span><i class="sw" style="background:var(--st-${k})"></i> ${t(l)}</span>`).join('');
    else {
      L.innerHTML = `<span>${t('poor')}</span><span class="ramp" style="background:linear-gradient(90deg,#b2182b,#ef8a62,#f5f5f5,#67a9cf,#2166ac)"></span><span>${t('good')} (${heatWin ? t('heatWindow') : t('ofPeriod')})</span><span class="muted">${t('stretched')}</span>`;
    }
  }
  function set3DMode(mode) {
    $('#v3dMode').value = mode;
    if (v3d) v3d.setMode(mode);
    renderLegend();
    document.querySelectorAll('#v3dView [data-view]').forEach(b => b.setAttribute('aria-pressed', String((b.dataset.view === 'heat') === mode.startsWith('avg'))));
  }
  function update3DButtons() {
    const b = $('#v3dStand'); if (!b) return;
    const s = site(state.focus);
    b.textContent = `${t('vStand')} ${s ? s.name : ''}`;
    b.disabled = !s || s.lat > -75;
    b.title = b.disabled ? t('outsideDem') : '';
  }
  function standAt(id, ms) {
    const s = site(id); if (!s || s.lat > -75 || !v3d) return;
    if (v3d.region() === 'moon' || !v3d.inRegion(s)) setRegionUI('south');
    v3d.view('site', s, ms);
  }
  $('#v3dRegion').addEventListener('change', e => init3D().then(v => { if (v) setRegionUI(e.target.value); }));
  $('#v3dScope').addEventListener('click', e => {
    const b = e.target.closest('[data-scope]'); if (!b) return;
    if (tour) stopTour();
    init3D().then(v => { if (!v) return; setRegionUI(b.dataset.scope === 'moon' ? 'moon' : (v.region() === 'moon' ? 'south' : v.region())); });
  });
  $('#v3dMode').addEventListener('change', e => { heatWin = false; set3DMode(e.target.value); if (v3d && state.grid) v3d.setSamples(v3dSamples()); });
  $('#v3dView').addEventListener('click', e => {
    const b = e.target.closest('[data-view]'); if (!b) return;
    heatWin = b.dataset.view === 'heat';
    set3DMode(heatWin ? 'avgOps' : 'sun');
    if (v3d && state.grid) v3d.setSamples(heatWin ? windowSamples() : v3dSamples());
    if (b.dataset.view === 'heat' && v3d) {
      if (v3d.region() !== 'south') setRegionUI('south');
      v3d.view('overview');
    }
  });
  $('#v3dExag').addEventListener('input', e => { $('#v3dExagOut').textContent = e.target.value + '×'; });
  $('#v3dQuality').addEventListener('change', e => { store.set('quality', e.target.value); if (v3d) v3d.setQuality(e.target.value); });
  $('#v3dExag').addEventListener('change', e => { if (v3d) v3d.setExag(+e.target.value); });
  $('#v3dOverview').addEventListener('click', () => { if (v3d) v3d.view('overview'); });
  $('#v3dSunView').addEventListener('click', () => { if (v3d) v3d.view('sun'); });
  $('#v3dStand').addEventListener('click', () => standAt(state.focus));

  // test hook: compare the GPU terrain computation with the CPU engine
  window.__clpsTest = {
    ready: () => init3D(),
    gpuVsCpu(ids, times) {
      const out = [];
      for (const i of times) {
        setCursor(i);
        for (const id of ids) {
          const s = site(id); if (!v3d.inRegion(s)) continue;
          const gpu = v3d.sampleNow(s.lat, s.lon);
          const ser = state.series[id] || E.siteSeries(state.grid, s, state.cfg);
          out.push({ id, i, gpuFrac: gpu.sunFrac, cpuFrac: ser.sunFrac[i], gpuEarth: gpu.earthClearanceDeg, cpuEarth: ser.earthEl[i] - ser.earthHz[i] });
        }
      }
      return out;
    }
  };

  /* guided tour: a fixed 45-second story for demos and the pitch video */
  let tour = null;
  const TOUR = [
    // 29 s in total: a screen recording of the tour is the <=30 s demo video, captions = English subtitles
    { cap: 'tour1', region: 'pole', mode: 'sun', view: 'overview', play: true, ms: 5000 },
    { cap: 'tour2', mode: 'sun', view: 'sun', play: true, ms: 5000 },
    { cap: 'tour3', mode: 'plan', view: 'overview', play: true, ms: 5000 },
    { cap: 'tour4', mode: 'avgOps', view: 'overview', play: false, ms: 5500 },
    { cap: 'tour5', mode: 'sun', site: 'ptB', play: true, ms: 5000 },
    { cap: 'tour6', mode: 'sun', view: 'overview', play: false, ms: 3500 }
  ];
  function setPlaying(on) {
    if (state.playing === on) return;
    state.playing = on;
    $('#playIcon').setAttribute('d', on ? 'M4 2.5h3v11H4zM9 2.5h3v11H9z' : 'M4 2.5v11l9-5.5z');
    if (on) requestAnimationFrame(tick);
  }
  async function runTourStep(k) {
    if (!tour) return;
    if (k >= TOUR.length) { stopTour(); return; }
    const S = TOUR[k];
    const v = await init3D(); if (!v || !tour) return;
    if (S.region && v.region() !== S.region) setRegionUI(S.region);
    set3DMode(S.mode);
    if (S.site) standAt(S.site, 1200); else v.view(S.view, null, 1300);
    setPlaying(S.play);
    const cap = $('#v3dCaption'); cap.hidden = false;
    cap.innerHTML = `${t(S.cap)}<small>${k + 1} / ${TOUR.length}</small>`;
    tour.timer = setTimeout(() => runTourStep(k + 1), S.ms || 7500);
  }
  function startTour() {
    if (state.tab !== '3d') showTab('3d');
    tour = { timer: 0 };
    $('#v3dTour').textContent = t('vTourStop');
    runTourStep(0);
  }
  function stopTour() {
    if (!tour) return;
    clearTimeout(tour.timer); tour = null;
    $('#v3dCaption').hidden = true; $('#v3dTour').textContent = t('vTour');
    setPlaying(false);
  }

  /* ---------- scenarios: site x touchdown x mission length */
  const SCEN_EXAMPLE = [
    { siteId: 'ptB', t: Date.UTC(2026, 10, 18, 18), days: 10 },
    { siteId: 'ptB', t: Date.UTC(2026, 10, 21, 18), days: 10 },
    { siteId: 'dg2', t: Date.UTC(2026, 10, 18, 18), days: 10 },
    { siteId: 'nobile2', t: Date.UTC(2026, 10, 18, 18), days: 10 }
  ];
  let scenarios = store.get('scenarios', null);
  let scenIsExample = !scenarios;
  if (!scenarios) scenarios = SCEN_EXAMPLE.map(x => Object.assign({}, x));
  scenarios = scenarios.filter(x => state.sites.some(s => s.id === x.siteId));
  const scenCache = new Map();
  let scenBusy = false, scenAgain = false;
  const scenKey = x => { const s = site(x.siteId); return [x.siteId, x.t, x.days, s.lat, s.lon, s.hsrc, JSON.stringify(state.cfg)].join('|'); };
  function saveScen() { scenIsExample = false; store.set('scenarios', scenarios); }
  function fillScenSites() {
    const sel = $('#scenSite'), cur = sel.value || state.focus;
    const groups = [];
    state.sites.forEach(s => { const g = s.custom ? 'My sites' : s.group; if (!groups.includes(g)) groups.push(g); });
    sel.innerHTML = groups.map(g => `<optgroup label="${esc(groupLabel(g))}">` +
      state.sites.filter(s => (s.custom ? 'My sites' : s.group) === g).map(s => `<option value="${esc(s.id)}">${esc(s.name)}</option>`).join('') + '</optgroup>').join('');
    sel.value = state.sites.some(s => s.id === cur) ? cur : state.sites[0].id;
    if (!$('#scenTime').value && state.grid) $('#scenTime').value = utc(timeOf(state.cursor)).replace(' ', 'T');
  }
  async function renderScenarios() {
    fillScenSites();
    const tb = $('#scenTable');
    $('#scenNote').textContent = scenIsExample ? t('scenExample') : '';
    if (!scenarios.length) { tb.innerHTML = `<tr><td>${t('scenEmpty')}</td></tr>`; drawScenStrip(); return; }
    const missing = scenarios.filter(x => !scenCache.has(scenKey(x)));
    if (missing.length) {
      if (scenBusy) { scenAgain = true; return; }
      scenBusy = true;
      tb.innerHTML = `<tr><td>${t('computing')}</td></tr>`;
      for (const x of missing) { await frame(); scenCache.set(scenKey(x), E.scenario(site(x.siteId), x.t, x.days, state.cfg)); }
      scenBusy = false;
      if (scenAgain || scenarios.some(x => !scenCache.has(scenKey(x)))) { scenAgain = false; return renderScenarios(); }
    }
    let html = `<thead><tr><th class="nosort">#</th><th class="nosort l">${t('colSite')}</th><th class="nosort">${t('touchdown')}</th><th class="nosort">${t('daysShort')}</th>` +
      `<th class="nosort grp-now">${t('atTouchdown')}</th><th class="nosort grp-now">${t('colSunNow')}</th><th class="nosort grp-now">${t('colSunNext')}</th><th class="nosort grp-now">${t('colEarthNext')}</th>` +
      `<th class="nosort">${t('colLit')}</th><th class="nosort">${t('colOps')}</th><th class="nosort">${t('colNight')}</th><th class="nosort">${t('colGap')}</th><th class="nosort">${t('firstLoss')}</th><th class="nosort"></th></tr></thead><tbody>`;
    scenarios.forEach((x, k) => {
      const r = scenCache.get(scenKey(x)), c = r.touchdown, sm = r.summary, s = site(x.siteId);
      const hist = s.landed && Date.parse(s.landed) === x.t ? `<span class="tag">${t('actual')}</span>` : '';
      html += `<tr class="click" data-k="${k}"><td class="num">S${k + 1}</td><td class="nm l">${esc(s.name)}${hist}</td><td class="num">${utc(x.t)}</td><td class="num">${x.days}</td>` +
        `<td class="now">${stPill(c)}</td><td class="num now">${fmt(c.sunClearance, 1)}°</td><td class="now">${cdHtml(changeInfo(c, 'sun'))}</td><td class="now">${cdHtml(changeInfo(c, 'earth'))}</td>` +
        `<td class="num">${fmt(sm.litPct, 0)}%</td><td class="num">${fmt(sm.opsPct, 0)}%<i class="bar" style="width:${(sm.opsPct * 0.5).toFixed(0)}px"></i></td>` +
        `<td class="num">${dur(sm.longestNightH)}</td><td class="num">${dur(sm.longestBlackoutH)}</td>` +
        `<td class="num">${r.firstPowerOrLinkLossH == null ? t('never') : r.firstPowerOrLinkLossH === 0 ? t('atOnce') : dur(r.firstPowerOrLinkLossH)}</td>` +
        `<td><div class="row-actions"><button type="button" data-act="slip" data-d="-1" data-k="${k}" title="${t('slipTitle')}">−1 ${t('d')}</button><button type="button" data-act="slip" data-d="1" data-k="${k}" title="${t('slipTitle')}">+1 ${t('d')}</button><button type="button" data-act="slip" data-d="3" data-k="${k}">+3 ${t('d')}</button><button type="button" data-act="slip" data-d="7" data-k="${k}">+7 ${t('d')}</button><button type="button" data-act="del" data-k="${k}" aria-label="${t('remove')} S${k + 1}">×</button></div></td></tr>`;
    });
    tb.innerHTML = html + '</tbody>';
    drawScenStrip();
  }
  const scenGeom = {};
  function drawScenStrip() {
    const box = $('#scenStripBox'), rows = scenarios.length;
    const L0 = rowLayout(box.clientWidth, rows, true);
    box.style.height = Math.max(90, L0.height) + 'px';
    const { ctx, w } = canvasSetup($('#scenStrip'));
    if (!rows) return;
    const L = rowLayout(w, rows, true), maxD = Math.max(...scenarios.map(x => x.days));
    Object.assign(scenGeom, L, { maxD });
    const colors = { ops: cssv('--ops'), sun: cssv('--sun'), earth: cssv('--earth'), none: cssv('--none') };
    scenarios.forEach((x, k) => {
      const r = scenCache.get(scenKey(x)); if (!r) return;
      const y = L.top + k * (L.rh + L.gap), s = r.series, g = r.grid;
      const label = `S${k + 1} · ${site(x.siteId).name} · ${utc(x.t, false)}`;
      ctx.font = '12px ' + cssv('--f-body'); ctx.textBaseline = 'middle';
      if (L.narrow) { ctx.fillStyle = cssv('--fg'); ctx.textAlign = 'left'; ctx.fillText(label, L.x0, y - 9); }
      else { ctx.fillStyle = cssv('--fg'); ctx.textAlign = 'right'; let lb = label; while (lb.length > 4 && ctx.measureText(lb).width > L.x0 - 16) lb = lb.slice(0, -2); if (lb !== label) lb = lb.slice(0, -1) + '…'; ctx.fillText(lb, L.x0 - 10, y + L.rh / 2); }
      const pxPerStep = (L.x1 - L.x0) * (g.stepMs / (maxD * DAY));
      let run = 0, col = null;
      const flush = i1 => { ctx.fillStyle = col; ctx.fillRect(L.x0 + run * pxPerStep, y, Math.max(0.6, (i1 - run) * pxPerStep), L.rh); };
      for (let i = 0; i < g.n; i++) {
        const c = s.ops[i] ? colors.ops : s.lit[i] ? colors.sun : s.dte[i] ? colors.earth : colors.none;
        if (c !== col) { if (col) flush(i); run = i; col = c; }
      }
      flush(g.n);
    });
    // day axis
    const yb = L.top + rows * (L.rh + L.gap) - L.gap + 4;
    ctx.fillStyle = cssv('--muted'); ctx.font = '11px ' + cssv('--f-mono'); ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    const stepD = maxD <= 10 ? 1 : maxD <= 30 ? 5 : 10;
    for (let d = 0; d <= maxD; d += stepD) ctx.fillText(`${lang === 'fr' ? 'J' : 'D'}+${d}`, L.x0 + d / maxD * (L.x1 - L.x0), yb);
  }
  $('#scenForm').addEventListener('submit', e => {
    e.preventDefault();
    const ms = Date.parse($('#scenTime').value + ':00Z'), days = Math.max(1, Math.min(60, +$('#scenDays').value || 10));
    if (!isFinite(ms)) { toast(t('badTime')); return; }
    if (scenIsExample) scenarios = [];
    scenarios.push({ siteId: $('#scenSite').value, t: ms, days }); saveScen(); renderScenarios();
  });
  $('#scenTable').addEventListener('click', e => {
    const b = e.target.closest('button[data-act]');
    if (b) {
      const k = +b.dataset.k;
      if (b.dataset.act === 'del') scenarios.splice(k, 1);
      else scenarios.splice(k + 1, 0, Object.assign({}, scenarios[k], { t: scenarios[k].t + (+b.dataset.d) * DAY }));
      saveScen(); renderScenarios(); return;
    }
    const tr = e.target.closest('tr[data-k]'); if (!tr) return;
    const x = scenarios[+tr.dataset.k];
    if (state.grid && x.t >= state.start && x.t <= timeOf(state.grid.n - 1)) setCursor(indexOf(x.t));
    setFocus(x.siteId);
  });
  $('#scenHistory').addEventListener('click', () => {
    scenarios = state.sites.filter(s => s.landed).sort((a, b) => Date.parse(a.landed) - Date.parse(b.landed))
      .map(s => ({ siteId: s.id, t: Date.parse(s.landed), days: 14 }));
    saveScen(); renderScenarios();
  });
  $('#scenCopy').addEventListener('click', () => {
    const lines = scenarios.map((x, k) => {
      const r = scenCache.get(scenKey(x)); if (!r) return '';
      const c = r.touchdown, sm = r.summary, a1 = changeInfo(c, 'sun'), a2 = changeInfo(c, 'earth');
      return `S${k + 1} · ${site(x.siteId).name} · ${utc(x.t)} UTC · ${x.days} ${t('d')} — ${t('atTouchdown')}: ${t('st_' + (c.ops ? 'ops' : c.sunlit ? 'sun' : c.link ? 'comm' : 'none'))}, ` +
        `${t('colSunNow').toLowerCase()} ${fmt(c.sunClearance, 1)}°, ${a1.label.toLowerCase()} ${a1.val}, ${a2.label.toLowerCase()} ${a2.val}. ` +
        `${t('colOps')} ${fmt(sm.opsPct, 0)}%, ${t('colNight').toLowerCase()} ${dur(sm.longestNightH)}, ${t('colGap').toLowerCase()} ${dur(sm.longestBlackoutH)}.`;
    }).filter(Boolean).join('\n');
    navigator.clipboard.writeText(lines).then(() => toast(t('copiedText')), () => fallbackText(lines));
  });
  function groupLabel(g) {
    const GFR = { 'My sites': 'Mes sites', 'CLPS landed': 'CLPS posés', 'Artemis III region': 'Régions Artemis III',
      'High-illumination point': 'Points très éclairés', 'Earlier Artemis candidate': 'Anciens candidats Artemis',
      'Upcoming targets': 'Cibles à venir', 'Apollo': 'Apollo', 'Other countries': 'Autres pays', 'Other missions': 'Autres missions' };
    return lang === 'fr' ? (GFR[g] || g) : g;
  }

  /* ---------- learn: why the south pole is hard (live numbers) */
  const learn = { key: '', sens: null, sensKey: '', tracks: null };
  const polarFocus = () => { const s = site(state.focus); return s && s.lat <= -84 && s.mask ? s : site('ptB'); };
  function hbars(cv, items, unit) {
    const { ctx, w, h } = canvasSetup(cv);
    const max = Math.max(...items.map(i => i.v)), lw = Math.min(200, w * 0.42), x0 = lw, x1 = w - 112;
    const rh = Math.min(26, (h - 8) / items.length - 8);
    items.forEach((it, k) => {
      const y = 6 + k * (rh + 10);
      ctx.fillStyle = cssv('--fg2'); ctx.font = '12px ' + cssv('--f-body'); ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      ctx.fillText(it.label, x0 - 8, y + rh / 2);
      ctx.fillStyle = it.color || cssv('--accent');
      const bw = Math.max(2, (x1 - x0) * it.v / max);
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x0, y, bw, rh, [0, 4, 4, 0]) : ctx.rect(x0, y, bw, rh); ctx.fill();
      ctx.fillStyle = cssv('--fg'); ctx.font = '600 12px ' + cssv('--f-mono'); ctx.textAlign = 'left';
      ctx.fillText(it.text, x0 + bw + 6, y + rh / 2);
    });
  }
  function lineChart(cv, series, opt) {
    const { ctx, w, h } = canvasSetup(cv);
    const x0 = 40, x1 = w - 10, y0 = 10, y1 = h - 24;
    const X = v => x0 + (v - opt.xmin) / (opt.xmax - opt.xmin) * (x1 - x0), Y = v => y1 - (v - opt.ymin) / (opt.ymax - opt.ymin) * (y1 - y0);
    if (opt.below != null) { ctx.fillStyle = cssv('--none'); ctx.globalAlpha = .35; ctx.fillRect(x0, Y(opt.below), x1 - x0, y1 - Y(opt.below)); ctx.globalAlpha = 1; }
    ctx.font = '11px ' + cssv('--f-mono'); ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (const v of opt.yticks) { ctx.strokeStyle = v === 0 ? cssv('--fg2') : cssv('--line'); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0, Math.round(Y(v)) + .5); ctx.lineTo(x1, Math.round(Y(v)) + .5); ctx.stroke(); ctx.fillStyle = cssv('--muted'); ctx.fillText(v + '°', x0 - 5, Y(v)); }
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    for (const [v, l] of opt.xticks) { ctx.fillStyle = cssv('--muted'); ctx.fillText(l, X(v), y1 + 5); }
    for (const sr of series) {
      ctx.strokeStyle = sr.color; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.beginPath();
      let pen = false, prevX = null;
      for (const [xv, yv] of sr.pts) {
        const px = X(xv), py = Y(Math.max(opt.ymin, Math.min(opt.ymax, yv)));
        if (pen && prevX != null && Math.abs(px - prevX) > (x1 - x0) / 2) pen = false;   // azimuth wrap
        if (!pen) { ctx.moveTo(px, py); pen = true; } else ctx.lineTo(px, py);
        prevX = px;
      }
      ctx.stroke();
    }
  }
  function renderLearn(cursorOnly) {
    if (!state.grid) return;
    const g = state.grid, i = state.cursor, P = polarFocus(), fr = lang === 'fr';
    const cfg = state.cfg;
    const ser = id => state.series[id] || E.siteSeries(g, site(id), cfg);
    // 3. shadows (depends on the cursor)
    const sunPole = Math.asin(-g.sun[i * 3 + 2] / Math.hypot(g.sun[i * 3], g.sun[i * 3 + 1], g.sun[i * 3 + 2])) * 180 / Math.PI;
    const elUse = Math.max(0.3, Math.abs(sunPole)), shadowKm = 1 / Math.tan(elUse * Math.PI / 180);
    $('#lc3t').textContent = fr ? `Une colline de 1 km projette une ombre de ${fmt(shadowKm, 0)} km` : `A 1 km hill casts a shadow ${fmt(shadowKm, 0)} km long`;
    $('#lc3p').innerHTML = fr
      ? `Au pôle, à ${utc(timeOf(i))} UTC, le Soleil est à <b>${fmt(sunPole, 2)}°</b> au-dessus de l’horizon. Une ombre mesure 1/tan(hauteur) fois la taille de l’objet. Au fond de certains cratères, le Soleil n’arrive jamais : ces régions en ombre permanente gardent de la glace d’eau.`
      : `At the pole at ${utc(timeOf(i))} UTC the Sun is <b>${fmt(sunPole, 2)}°</b> above the horizon. A shadow is 1/tan(Sun height) times the object's height. Some crater floors never see the Sun at all: these permanently shadowed regions keep water ice.`;
    { const { ctx, w, h } = canvasSetup($('#lc3c'));
      const gy = h - 30, hx = 40, hh = 46, scale = Math.min((w - hx - 40) / shadowKm, 60);
      const len = shadowKm * scale;
      ctx.fillStyle = cssv('--none'); ctx.fillRect(hx, gy, Math.min(len, w - hx - 20), 10);
      ctx.fillStyle = cssv('--sun'); ctx.fillRect(Math.min(hx + len, w - 20), gy, w - Math.min(hx + len, w - 20), 4);
      ctx.fillStyle = cssv('--fg2'); ctx.beginPath(); ctx.moveTo(hx - 30, gy); ctx.lineTo(hx, gy - hh); ctx.lineTo(hx + 30, gy); ctx.closePath(); ctx.fill();
      ctx.font = '11px ' + cssv('--f-mono'); ctx.fillStyle = cssv('--muted'); ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillText(fr ? '1 km' : '1 km', hx + 8, gy - hh);
      ctx.fillText(`${fr ? 'ombre' : 'shadow'} ${fmt(shadowKm, 0)} km${len > w - hx - 20 ? (fr ? ' (coupée)' : ' (cut)') : ''}`, hx + 40, gy + 14);
      ctx.fillStyle = cssv('--sun'); ctx.beginPath(); ctx.arc(w - 18, gy - 6, 7, 0, 7); ctx.fill(); }
    if (cursorOnly && learn.key) return;

    const key = [g.start, g.n, P.id, JSON.stringify(cfg), lang].join('|');
    if (key === learn.key) return;
    learn.key = key;
    // 1. day length
    const sP = state.sums[P.id] || E.summarize(ser(P.id), g);
    const a11 = site('a11'), sA = E.summarize(ser('a11'), g);
    $('#lc1t').textContent = fr ? 'Une journée lunaire dure un mois' : 'A day on the Moon lasts a month';
    $('#lc1p').innerHTML = fr
      ? `La Lune fait un tour sur elle-même par orbite : le Soleil revient tous les <b>29,5 jours</b>. Au site d’Apollo 11, la nuit dure <b>${dur(sA.longestNightH)}</b>, à environ −170 °C. Près du pôle, certaines crêtes restent éclairées bien plus longtemps : sur votre période, la plus longue nuit à ${esc(P.name)} dure <b>${dur(sP.longestNightH)}</b>.`
      : `The Moon turns once per orbit, so the Sun comes back every <b>29.5 days</b>. At the Apollo 11 site the night lasts <b>${dur(sA.longestNightH)}</b>, at about −170 °C. Near the pole some ridges stay lit far longer: in your period the longest night at ${esc(P.name)} lasts <b>${dur(sP.longestNightH)}</b>.`;
    const short = n => n.length > 18 ? n.slice(0, 17) + '…' : n;
    hbars($('#lc1c'), [
      { label: fr ? 'Jour sur Terre' : 'Day on Earth', v: 24, text: '24 h', color: cssv('--earth') },
      { label: fr ? 'Nuit · Apollo 11' : 'Night · Apollo 11', v: Math.max(1, sA.longestNightH), text: dur(sA.longestNightH), color: cssv('--fg2') },
      { label: (fr ? 'Nuit · ' : 'Night · ') + short(P.name), v: Math.max(1, sP.longestNightH), text: dur(sP.longestNightH), color: cssv('--sun') }
    ]);
    // 2. Sun tracks: Apollo 11 vs pole over one lunar day
    const g30 = E.buildGrid(g.start, g.start + 29.6 * DAY, 120);
    const tA = E.siteSeries(g30, a11, cfg), tP = E.siteSeries(g30, P, cfg);
    const pts = sr => Array.from({ length: g30.n }, (_, k) => [k * g30.stepMs / DAY, sr.sunEl[k]]);
    let maxA = -90, maxP = -90, minP = 90;
    for (let k = 0; k < g30.n; k++) { maxA = Math.max(maxA, tA.sunEl[k]); maxP = Math.max(maxP, tP.sunEl[k]); minP = Math.min(minP, tP.sunEl[k]); }
    $('#lc2t').textContent = fr ? 'Au pôle, le Soleil rase l’horizon' : 'At the pole the Sun skims the horizon';
    $('#lc2p').innerHTML = fr
      ? `L’axe de la Lune n’est incliné que de <b>1,54°</b> (Terre : 23,4°). Sur un jour lunaire, le Soleil monte à <b>${fmt(maxA, 0)}°</b> au site d’Apollo 11 puis disparaît deux semaines ; à ${esc(P.name)}, il reste entre <b>${fmt(minP, 1)}°</b> et <b>${fmt(maxP, 1)}°</b> et fait le tour de l’horizon. Les panneaux solaires y sont verticaux et suivent le Soleil.`
      : `The Moon's axis is tilted only <b>1.54°</b> (Earth: 23.4°). Over one lunar day the Sun climbs to <b>${fmt(maxA, 0)}°</b> at the Apollo 11 site, then is gone for two weeks; at ${esc(P.name)} it stays between <b>${fmt(minP, 1)}°</b> and <b>${fmt(maxP, 1)}°</b> and circles the horizon. Solar panels there stand vertical and track the Sun.`;
    lineChart($('#lc2c'), [{ pts: pts(tA), color: cssv('--earth') }, { pts: pts(tP), color: cssv('--sun') }],
      { xmin: 0, xmax: 29.6, ymin: -10, ymax: 90, yticks: [0, 30, 60, 90], below: 0, xticks: [0, 7, 14, 21, 28].map(d => [d, `${fr ? 'J' : 'D'}+${d}`]) });
    $('#lc2l').innerHTML = `<span><i class="sw" style="background:var(--earth)"></i> Apollo 11 (0.7°N)</span><span><i class="sw" style="background:var(--sun)"></i> ${esc(P.name)} (${fmt(Math.abs(P.lat), 1)}°S)</span><span class="muted">${fr ? 'hauteur du Soleil sur un jour lunaire' : 'Sun height over one lunar day'}</span>`;
    // 4. Earth bobbing
    const sPe = ser(P.id), ea = E.summarize(ser('a11'), g), ec = E.summarize(ser('ce4'), g);
    $('#lc4t').textContent = fr ? 'Au pôle, la Terre se lève et se couche chaque mois' : 'At the pole, Earth rises and sets every month';
    $('#lc4p').innerHTML = fr
      ? `Vue de la Lune, la Terre reste presque fixe mais oscille jusqu’à 6,8° (libration). Près du pôle, cela suffit à la faire passer sous l’horizon : elle est visible <b>${fmt(sP.earthPct, 0)}%</b> du temps à ${esc(P.name)}, <b>${fmt(ea.earthPct, 0)}%</b> à Apollo 11, et <b>${fmt(ec.earthPct, 0)}%</b> depuis Chang’e 4 sur la face cachée.`
      : `Seen from the Moon, Earth hardly moves but wobbles by up to 6.8° (libration). Near the pole that is enough to drop it below the horizon: it is visible <b>${fmt(sP.earthPct, 0)}%</b> of the time at ${esc(P.name)}, <b>${fmt(ea.earthPct, 0)}%</b> at Apollo 11 and <b>${fmt(ec.earthPct, 0)}%</b> from Chang'e 4 on the far side.`;
    { const stride = Math.max(1, Math.floor(g.n / 600)), pe = [];
      for (let k = 0; k < g.n; k += stride) pe.push([k, sPe.earthEl[k] - sPe.earthHz[k]]);
      const days = g.n * g.stepMs / DAY, xt = [];
      for (let d = 0; d <= days; d += days > 60 ? 30 : 7) xt.push([d * DAY / g.stepMs, `${fr ? 'J' : 'D'}+${Math.round(d)}`]);
      lineChart($('#lc4c'), [{ pts: pe, color: cssv('--earth') }], { xmin: 0, xmax: g.n - 1, ymin: -12, ymax: 12, yticks: [-10, -5, 0, 5, 10], below: 0, xticks: xt }); }
    // 6. date sensitivity
    const t0 = timeOf(i), sc = [0, 3, 7].map(d => E.scenario(P, t0 + d * DAY, 10, cfg));
    $('#lc6t').textContent = fr ? 'Trois jours plus tard, une autre mission' : 'Three days later, a different mission';
    $('#lc6p').innerHTML = fr
      ? `Mission de 10 jours à ${esc(P.name)} : en se posant le ${utc(t0, false)}, on a énergie et liaison <b>${fmt(sc[0].summary.opsPct, 0)}%</b> du temps ; 3 jours plus tard <b>${fmt(sc[1].summary.opsPct, 0)}%</b> ; 7 jours plus tard <b>${fmt(sc[2].summary.opsPct, 0)}%</b>. L’onglet Scénarios compare ces reports en détail.`
      : `A 10-day mission at ${esc(P.name)}: landing on ${utc(t0, false)} gives power and a link <b>${fmt(sc[0].summary.opsPct, 0)}%</b> of the time; 3 days later <b>${fmt(sc[1].summary.opsPct, 0)}%</b>; 7 days later <b>${fmt(sc[2].summary.opsPct, 0)}%</b>. The Scenarios tab compares such slips in detail.`;
    hbars($('#lc6c'), [0, 3, 7].map((d, k) => ({ label: d ? `+${d} ${t('d')}` : (fr ? 'Date choisie' : 'Chosen date'), v: Math.max(0.5, sc[k].summary.opsPct), text: fmt(sc[k].summary.opsPct, 0) + '%', color: k ? cssv('--fg2') : cssv('--ops') })));
    // 5. location sensitivity (terrain ray casting, async)
    renderSensitivity(P);
  }
  async function renderSensitivity(P) {
    const fr = lang === 'fr', g = state.grid, cfg = state.cfg;
    const key = [P.id, g.start, g.n, JSON.stringify(cfg)].join('|');
    $('#lc5t').textContent = fr ? 'À 500 m près, tout peut changer' : 'Moving 500 m can change everything';
    if (learn.sensKey !== key) {
      learn.sensKey = key; learn.sens = null;
      $('#lc5p').textContent = fr ? 'Calcul de l’horizon autour du site…' : 'Computing the horizon around the site…';
      canvasSetup($('#lc5c'));
      const T = await loadTerrain();
      const pts = [{ r: 0, az: 0, lat: P.lat, lon: P.lon, mask: P.mask, h: P.heightM }];
      for (const r of [250, 500]) for (let a = 0; a < 360; a += 45) {
        const th = r / LT.RM, la1 = P.lat * Math.PI / 180, az = a * Math.PI / 180;
        const s2 = Math.sin(la1) * Math.cos(th) + Math.cos(la1) * Math.sin(th) * Math.cos(az);
        const la2 = Math.asin(s2), lo2 = P.lon * Math.PI / 180 + Math.atan2(Math.sin(az) * Math.sin(th) * Math.cos(la1), Math.cos(th) - Math.sin(la1) * s2);
        pts.push({ r, az: a, lat: la2 * 180 / Math.PI, lon: lo2 * 180 / Math.PI });
      }
      for (const p of pts) {
        if (learn.sensKey !== key) return;
        if (!p.mask) { await frame(); const hz = T.horizon(p.lat, p.lon); p.mask = hz.mask; p.h = hz.heightM; }
        p.lit = E.summarize(E.siteSeries(g, { lat: p.lat, lon: p.lon, heightM: p.h, mask: p.mask }, cfg), g).litPct;
      }
      learn.sens = pts;
    }
    const pts = learn.sens; if (!pts) return;
    const vals = pts.map(p => p.lit), lo = Math.min(...vals), hi = Math.max(...vals);
    $('#lc5t').textContent = fr ? `À 500 m près, l’ensoleillement va de ${fmt(lo, 0)}% à ${fmt(hi, 0)}%` : `Within 500 m, sunlight ranges from ${fmt(lo, 0)}% to ${fmt(hi, 0)}%`;
    $('#lc5p').innerHTML = fr
      ? `Part du temps au soleil sur la période, calculée avec le relief LOLA pour ${esc(P.name)} (centre) et 16 points à 250 m et 500 m. Au pôle, le Soleil est si bas qu’un petit relief voisin suffit à le cacher.`
      : `Share of the period in sunlight, computed with LOLA terrain at ${esc(P.name)} (centre) and 16 points 250 m and 500 m away. At the pole the Sun is so low that a small nearby rise is enough to hide it.`;
    const { ctx, w, h } = canvasSetup($('#lc5c'));
    if (w < 70 || h < 70) return;   // the card is hidden or not laid out yet
    const cx = w / 2, cy = h / 2 + 2, R = Math.min(w, h) / 2 - 26, ramp = [cssv('--heat0'), cssv('--heat1'), cssv('--heat2'), cssv('--heat3')].map(hex2rgb);
    ctx.strokeStyle = cssv('--line'); ctx.lineWidth = 1;
    for (const r of [0.5, 1]) { ctx.beginPath(); ctx.arc(cx, cy, R * r, 0, 7); ctx.stroke(); }
    ctx.font = '11px ' + cssv('--f-mono'); ctx.fillStyle = cssv('--muted'); ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    const d225 = 225 * Math.PI / 180;
    ctx.fillText('250 m', cx + R * 0.5 * Math.sin(d225) - 14, cy - R * 0.5 * Math.cos(d225) + 12);
    ctx.fillText('500 m', cx + R * Math.sin(d225) - 14, cy - R * Math.cos(d225) + 12);
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText(fr ? 'N (opposé au pôle)' : 'N (away from pole)', cx, cy - R - 14);
    // legend
    const lgW = Math.min(120, w * 0.3), lgx = 8, lgy = h - 16;
    const grad = ctx.createLinearGradient(lgx, 0, lgx + lgW, 0); ramp.forEach((c, k) => grad.addColorStop(k / (ramp.length - 1), `rgb(${c[0]},${c[1]},${c[2]})`));
    ctx.fillStyle = grad; ctx.fillRect(lgx, lgy, lgW, 8);
    ctx.fillStyle = cssv('--muted'); ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'; ctx.fillText(fmt(lo, 0) + '%', lgx, lgy - 2);
    ctx.textAlign = 'right'; ctx.fillText(fmt(hi, 0) + '%', lgx + lgW, lgy - 2);
    for (const p of pts) {
      const rr = p.r / 500 * R, a = p.az * Math.PI / 180, x = cx + rr * Math.sin(a), y = cy - rr * Math.cos(a);
      ctx.fillStyle = rampColor(ramp, (p.lit - lo) / Math.max(1, hi - lo));
      ctx.strokeStyle = cssv('--fg2'); ctx.lineWidth = p.r ? 1 : 2;
      ctx.beginPath(); ctx.arc(x, y, p.r ? 11 : 14, 0, 7); ctx.fill(); ctx.stroke();
      if (!p.r) { ctx.fillStyle = cssv('--fg'); ctx.font = '600 11px ' + cssv('--f-mono'); ctx.textBaseline = 'top'; ctx.textAlign = 'center'; ctx.fillText(fmt(p.lit, 0) + '%', x, y + 17); }
    }
    $('#lc5s').textContent = fr ? 'Chaque point : part de la période au soleil. Valeur affichée : le site lui-même.' : 'Each dot: share of the period in sunlight. Number shown: the site itself.';
  }

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
  if ($('#dlCsv')) $('#dlCsv').addEventListener('click', () => {
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
      <li>Sites away from the pole (Apollo, Chang’e, SLIM, Blue Ghost…) use the global LOLA model at 64 pixels per degree (about 470 m); its heights match published landing elevations to within 30 m.</li>
      <li>Sites you add: the same ray casting runs in your browser on a compact copy of the LOLA model (240 m/px near the pole, 1 km/px down to 75°S).</li>
      <li>Published coordinates of high-illumination points and Artemis regions are rounded or region-level, so these points are moved to the highest terrain within 1 to 2 km (marked “fitted”). Landed spacecraft keep their exact coordinates.</li>
      <li>You can import any horizon as a CSV of <code>azimuth,elevation</code> rows, for example from a finer DEM.</li>
      <li>3D view: the same terrain-horizon test runs on your graphics card for every terrain cell (240 m near the pole, 1 km down to 75°S), toward the Sun and toward the Earth. It agrees with the site calculation for 99% of site-times near the pole and 90% on the 1 km regional view.</li>
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
    <p><b>Against NASA JPL Horizons</b>: Sun and Earth azimuth and elevation agree to within 0.44 arcminute (0.007°) over 848 positions at 13 sites (south pole, Apollo, far side), from 1969 to 2028 (<code>tests/horizons.test.js</code>).</p>
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
      <li>Les sites loin du pôle (Apollo, Chang’e, SLIM, Blue Ghost…) utilisent le modèle LOLA global à 64 pixels par degré (environ 470 m) ; ses altitudes concordent à 30 m près avec les altitudes d’alunissage publiées.</li>
      <li>Sites ajoutés : le même calcul tourne dans le navigateur sur une copie compacte du relief LOLA (240 m/pixel près du pôle, 1 km/pixel jusqu’à 75°S).</li>
      <li>Les coordonnées publiées des points très éclairés et des régions Artemis sont arrondies ou valables pour une région : ces points sont déplacés vers le relief le plus haut à moins de 1 à 2 km (mention « ajusté »). Les sondes posées gardent leurs coordonnées exactes.</li>
      <li>Vous pouvez importer n’importe quel horizon sous forme de CSV <code>azimut,élévation</code>, par exemple issu d’un relief plus fin.</li>
      <li>Vue 3D : le même test d’horizon tourne sur votre carte graphique pour chaque cellule du relief (240 m près du pôle, 1 km jusqu’à 75°S), vers le Soleil et vers la Terre. Il concorde avec le calcul par site dans 99 % des cas près du pôle et 90 % sur la vue régionale à 1 km.</li>
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
    <p><b>Face à JPL Horizons (NASA)</b> : azimut et hauteur du Soleil et de la Terre concordent à 0,44 minute d’arc près (0,007°) sur 848 positions, 13 sites (pôle Sud, Apollo, face cachée), de 1969 à 2028 (<code>tests/horizons.test.js</code>).</p>
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
    document.querySelectorAll('[data-i18n-ph]').forEach(el => { const v = I18N[lang][el.dataset.i18nPh]; if (v) { el.placeholder = v; el.setAttribute('aria-label', v); } });
    document.querySelectorAll('[data-i18n-title]').forEach(el => { const v = I18N[lang][el.dataset.i18nTitle]; if (v) el.title = v; });
    document.querySelectorAll('[data-i18n-aria]').forEach(el => { const v = I18N[lang][el.dataset.i18nAria]; if (v) { el.setAttribute('aria-label', v); el.title = v; } });
    $('#lang').textContent = lang === 'en' ? 'FR' : 'EN';
    buildMethod(); renderMethod(); applyHelpI18n();
  }
  $('#lang').addEventListener('click', () => { lang = lang === 'en' ? 'fr' : 'en'; store.set('lang', lang); applyI18n(); renderAll(); });
  const reTheme = () => { refreshCss(); renderAll(); };
  try { window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', reTheme); } catch (e) { /* old browser */ }
  new MutationObserver(reTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  let rz;
  new ResizeObserver(() => { clearTimeout(rz); rz = setTimeout(() => { renderTab(); drawCursorTrack(); }, 80); }).observe(document.querySelector('.main'));

  /* ---------- help: click-to-explain mode and a small built-in assistant (no AI model, no network) */
  const HELP_TXT = {
    en: {
      mode: ['Simple / Advanced', 'Simple keeps the globe, the site card and the main choices. Advanced adds every graph, table, export and technical detail. Your site, date and flags stay when you switch.'],
      lang: ['Language', 'Switches the whole interface between English and French.'],
      search: ['Search a site', 'Type a name (Malapert, Apollo…) and pick a result: the site is selected and the globe turns to it.'],
      ctx: ['Context strip', 'Always shows the active site, the date you are looking at, and whether the Sun and the Earth are visible from there. It follows the time bar. A 🚩 and a number of days appear when a landing flag is set.'],
      sections: ['Four sections', 'Explore the Moon and one site · Compare sites or dates · Plan the best landing day · Learn the science and the method. You can move freely between them, and the arrow keys work too.'],
      subnav: ['Views', 'A section can offer several views, for example the 3D globe or the 2D map. Advanced shows more of them.'],
      scope: ['Whole Moon / South pole', 'Whole Moon shows all the sites on a globe lit by the real Sun. South pole shows the real LOLA terrain around the pole, where the Sun stays low and shadows decide everything.'],
      view: ['Live / Heat map', 'Live shows the lighting at the chosen time. Heat map paints the terrain from red (poor) to blue (good) by the share of the mission window with power and an Earth link.'],
      light: ['Light everywhere', 'Switches to a fictional, even light so you can see the terrain itself. It hides the real shadows and colours: it is not the real Sun.'],
      best: ['Best site', 'Ranks the south-pole sites for your mission window and jumps to the best one.'],
      tour: ['Guided tour', 'A short automatic tour of the main views, with captions.'],
      demo: ['Demo', 'Plays a 30-second story: a landing slips by 7 days and the power and link numbers change.'],
      overview: ['Overview', 'Puts the camera back to the default view.'],
      sunview: ['Look toward the Sun', 'Moves the camera to see the terrain from the Sun side.'],
      stand: ['Stand at the site', 'A first-person view from the surface of the chosen site, looking toward the Sun.'],
      sitequick: ['Site list', 'Pick any site from the list: the globe and the card follow.'],
      globe: ['The globe', 'Drag to rotate, scroll to zoom, click a dot to select a site, hover for its name and grade. Right-click the terrain to add your own site. A disc marks a zone with several sites: click it to zoom in.'],
      spHead: ['Site card', 'The selected site and its grade (A to E). The round arrow folds the card to leave more room for the globe.'],
      spRows: ['Sun, Earth, link', 'Is the Sun above the real horizon right now? Is the Earth? Can the site talk to a Deep Space Network antenna directly? Each line also says when it changes next.'],
      spAnalyze: ['Analyze this site', 'Opens the site profile below: strengths, weaknesses and the hexagon of six scores.'],
      spCompare: ['Compare this site', 'Asks what to compare it with: all sites, one site, or the same site on another date.'],
      spAdv: ['Technical details', 'Advanced only: Sun and Earth heights and bearings, antennas in view, Earth phase and the window score.'],
      flat: ['Fictional lighting', 'The terrain is drawn with an even, fictional light. Press "Light everywhere" again to return to the real Sun.'],
      hint: ['Hint', 'How to move the globe. It fades after your first move.'],
      legend3d: ['Colour legend', 'Explains the colours of the heat map: red is poor, blue is good.'],
      profile: ['Site profile', 'Click the hexagon to see what each of the six scores means. Scores run from 0 to 100; higher is better.'],
      flagA: ['Landing flag A', 'Your landing date. Drag it along the bar or use the arrow keys (Shift = 7 days). The outlined band is the mission window.'],
      flagB: ['Date B', 'A second landing date to compare with A. Drag it to see how a delay changes the result.'],
      track: ['Time bar', 'The coloured track shows the selected site over the whole period: green = power and link, yellow = Sun only, blue = link only, grey = dark. Triangles mark sunsets (top) and Earthsets (bottom). Click or drag to move in time.'],
      play: ['Play', 'Plays time forward so you can watch the light move.'],
      day: ['Day buttons', 'Move one day earlier or later.'],
      date: ['Date menu', 'Opens the exact date, jumps to the next sunrise or sunset, and the mission controls: landing flag, length, shifts and date B.'],
      cursorTime: ['Exact date', 'Type a UTC date and time to jump straight there.'],
      jump: ['Sunrise / sunset jumps', 'Jumps to the next time the Sun rises or sets at the selected site.'],
      msDays: ['Mission length', 'How many days the surface mission lasts. Grades, the heat map and the comparisons all use this window.'],
      msSet: ['Set landing date', 'Drops flag A at the time you are looking at.'],
      msAddB: ['Add date B', 'Adds a second flag a week after A so you can compare two dates.'],
      msShift: ['Shift buttons', 'Move the landing date earlier or later by that many days.'],
      msRes: ['Mission result', 'The share of the mission window with power and a direct link to the Earth.'],
      cmpMode: ['Comparison mode', 'All sites ranks every site against yours. One site puts two side by side. Another date compares the same site on two landing dates.'],
      cmpPin: ['Your site', 'The site you are comparing, with its rank and its numbers.'],
      cmpList: ['Ranking', 'Every site with its numbers. A green ▲ means better than your site, a red ▼ worse. Click a row to compare side by side. ≈ marks a smooth horizon (less precise).'],
      cmpTwo: ['Side by side', 'Each row is one measure for both sides; the last column is the difference.'],
      cmpVerdict: ['Verdict', 'Which side keeps power and a link for longer. It is not an overall score: the lines below show the trade-offs.'],
      cmpActions: ['Next steps', 'Look for a better landing date in Plan mission, or go back to explore the site.'],
      pzStrip: ['Day-by-day strip', 'Every possible landing day for this site: green good, yellow fair, red poor, grey impossible. Click a day to place flag A there.'],
      pzBest: ['Best days', 'The three best landing days. One click places the flag.'],
      pzLeg: ['Strip legend', 'What the colours of the strip mean.'],
      planAdv: ['Planner (Advanced)', 'A heat map and a table of landing opportunities for several sites, with your own rules.'],
      accLegend: ['Legend', 'Explains the colours, triangles, flags, arrows and grades used in the tool.'],
      accPeriod: ['Period', 'The first and last day the tool computes. The bar, the rankings and the plans all stay inside this period.'],
      accRules: ['Constraints', 'Advanced: how much of the Sun must be visible, the Earth margin and the antenna elevation behind "lit" and "link".'],
      accSites: ['Sites', 'Advanced: choose up to 8 sites for the tables, or add your own by coordinates.'],
      learn: ['Learn', 'Six short explanations, computed live, about why the lunar south pole is hard.'],
      method: ['Method', 'The data, the models, the validation and the limits of the tool.'],
      timeline: ['Elevation view', 'Sun and Earth height above the real horizon over time.'],
      sky: ['Horizon view', 'The 360° horizon seen from the site, with the paths of the Sun and the Earth.'],
      map: ['Map 2D', 'Shaded relief of the pole with the sites; click to pick a place.'],
      none: ['No help for this yet', 'This part has no explanation yet. Try the assistant (the robot button) or click another element.'],
      f_hello: ['Assistant', 'Hello! I answer questions about this tool from its built-in help. Pick a question or type your own. I am not an AI model: I match your words to the help topics.'],
      f_colours: ['Colours', 'The bar and the globe use four colours: green = Sun and a direct link to the Earth (the good case), yellow = Sun but no link, blue = link but in shadow, grey = dark and out of contact. The legend at the bottom of the page lists them all.'],
      f_grade: ['The A to E grade', 'The grade is the share of the mission window with power and a link: A is 60% or more, B 45%, C 30%, D 15%, E below. It measures time, not the probability that a landing succeeds.'],
      f_earth: ['Why the Earth disappears', 'Near the lunar south pole the Earth stays very low on the horizon. Hills can hide it, and as the Moon turns the Earth sinks behind the terrain: then there is no direct link. The Learn section shows it with live numbers.'],
      f_flag: ['Set a landing date', 'Open the date menu on the time bar (the date button) and press "Set landing date". Then drag flag A along the bar, or use the arrow keys. The mission length is in the same menu.'],
      f_compare: ['Compare', 'Press "Compare this site" on the site card, then choose: all sites, one site, or another date. In Compare you can also move date B to see how a delay changes the result.'],
      f_plan: ['Best landing day', 'Open Plan mission: the strip shows every possible landing day for the site, and the three best days are buttons that place your landing flag.'],
      f_addsite: ['Add a site', 'Right-click the terrain on the globe, name the place and add it. In Advanced you can also type coordinates in the Sites panel. Sites outside the south pole have no terrain data, so their horizon is smooth and less precise.'],
      f_moon: ['Whole Moon', 'Whole Moon shows all sites on a globe lit by the real Sun, with discs on zones that hold several sites. The surface texture is illustrative; the south pole cap is real LOLA relief.'],
      f_data: ['Data and sources', 'Terrain comes from NASA LRO LOLA. Sun, Earth and Moon positions come from an astronomy library checked against NASA JPL Horizons. The Method page lists data, models, validation and limits.'],
      f_accuracy: ['How precise is it?', 'Positions match JPL Horizons to within 0.007°. Sites without LOLA data use a smooth horizon and are less precise (marked ≈).'],
      f_export: ['Export', 'In Advanced, the Compare section has buttons to copy or download a CSV and a calendar (.ics) of the power-and-link windows.'],
      f_dsn: ['Direct link', 'A direct link needs the Earth above the horizon with a safety margin, and at least one Deep Space Network antenna (Goldstone, Madrid or Canberra) seeing the Moon.'],
      f_triangles: ['Triangles on the bar', 'On the time bar, a yellow ▼ marks a sunset and a blue ▲ an Earthset at the selected site.'],
      f_unknown: ['I do not know that yet', 'I could not match your question to a help topic. Try one of the questions below, or click the pointer button and then any part of the page.']
    },
    fr: {
      mode: ['Simple / Avancé', 'Simple garde le globe, la fiche du site et les choix principaux. Avancé ajoute tous les graphiques, tableaux, exports et détails techniques. Votre site, votre date et vos drapeaux restent quand vous changez.'],
      lang: ['Langue', 'Passe toute l’interface de l’anglais au français, et inversement.'],
      search: ['Chercher un site', 'Tapez un nom (Malapert, Apollo…) et choisissez un résultat : le site est sélectionné et le globe se tourne vers lui.'],
      ctx: ['Bandeau de contexte', 'Montre toujours le site actif, la date regardée, et si le Soleil et la Terre sont visibles depuis ce site. Il suit la barre de temps. Un 🚩 et un nombre de jours apparaissent quand un drapeau d’atterrissage est posé.'],
      sections: ['Quatre sections', 'Explorer la Lune et un site · Comparer des sites ou des dates · Planifier le meilleur jour d’atterrissage · Comprendre la science et la méthode. On passe librement de l’une à l’autre, les flèches du clavier aussi.'],
      subnav: ['Vues', 'Une section peut proposer plusieurs vues, par exemple le globe 3D ou la carte 2D. Le mode Avancé en montre davantage.'],
      scope: ['Toute la Lune / Pôle sud', 'Toute la Lune montre tous les sites sur un globe éclairé par le vrai Soleil. Pôle sud montre le vrai relief LOLA autour du pôle, où le Soleil reste bas et où les ombres décident de tout.'],
      view: ['Direct / Carte thermique', 'Direct montre l’éclairage à l’heure choisie. La carte thermique colore le relief du rouge (mauvais) au bleu (bon) selon la part de la fenêtre de mission avec énergie et liaison.'],
      light: ['Lumière partout', 'Passe à une lumière fictive et uniforme pour voir le relief lui-même. Cela masque les vraies ombres et couleurs : ce n’est pas le vrai Soleil.'],
      best: ['Meilleur site', 'Classe les sites du pôle sud pour votre fenêtre de mission et saute au meilleur.'],
      tour: ['Visite guidée', 'Un court tour automatique des vues principales, avec des légendes.'],
      demo: ['Démo', 'Joue une histoire de 30 secondes : un atterrissage glisse de 7 jours et les chiffres d’énergie et de liaison changent.'],
      overview: ['Vue d’ensemble', 'Remet la caméra dans la vue par défaut.'],
      sunview: ['Regarder vers le Soleil', 'Déplace la caméra pour voir le relief du côté du Soleil.'],
      stand: ['Se placer sur le site', 'Une vue à la première personne depuis la surface du site choisi, tournée vers le Soleil.'],
      sitequick: ['Liste des sites', 'Choisissez n’importe quel site : le globe et la fiche suivent.'],
      globe: ['Le globe', 'Glissez pour tourner, molette pour zoomer, cliquez sur un point pour choisir un site, survolez-le pour voir son nom et sa note. Clic droit sur le relief pour ajouter votre site. Un disque marque une zone avec plusieurs sites : cliquez pour zoomer.'],
      spHead: ['Fiche du site', 'Le site choisi et sa note (de A à E). La flèche ronde replie la fiche pour laisser de la place au globe.'],
      spRows: ['Soleil, Terre, liaison', 'Le Soleil est-il au-dessus du vrai horizon en ce moment ? Et la Terre ? Le site peut-il parler directement à une antenne du Deep Space Network ? Chaque ligne dit aussi quand cela change.'],
      spAnalyze: ['Analyser ce site', 'Ouvre le profil du site plus bas : points forts, points faibles et hexagone de six scores.'],
      spCompare: ['Comparer ce site', 'Demande avec quoi le comparer : tous les sites, un site, ou le même site à une autre date.'],
      spAdv: ['Détails techniques', 'Avancé seulement : hauteurs et azimuts du Soleil et de la Terre, antennes en vue, phase de la Terre et score de la fenêtre.'],
      flat: ['Éclairage fictif', 'Le relief est dessiné avec une lumière uniforme et fictive. Appuyez de nouveau sur « Lumière partout » pour revenir au vrai Soleil.'],
      hint: ['Astuce', 'Comment bouger le globe. Elle disparaît après votre premier geste.'],
      legend3d: ['Légende des couleurs', 'Explique les couleurs de la carte thermique : rouge mauvais, bleu bon.'],
      profile: ['Profil du site', 'Cliquez sur l’hexagone pour voir ce que veut dire chacun des six scores. Les scores vont de 0 à 100 ; plus c’est haut, mieux c’est.'],
      flagA: ['Drapeau d’atterrissage A', 'Votre date d’atterrissage. Faites-le glisser sur la barre ou utilisez les flèches du clavier (Maj = 7 jours). La bande encadrée est la fenêtre de la mission.'],
      flagB: ['Date B', 'Une seconde date d’atterrissage à comparer avec A. Faites-la glisser pour voir comment un retard change le résultat.'],
      track: ['Barre de temps', 'La piste colorée montre le site choisi sur toute la période : vert = énergie et liaison, jaune = Soleil seul, bleu = liaison seule, gris = noir. Les triangles marquent les couchers du Soleil (en haut) et de la Terre (en bas). Cliquez ou glissez pour voyager dans le temps.'],
      play: ['Lecture', 'Fait avancer le temps pour voir la lumière bouger.'],
      day: ['Boutons jour', 'Reculent ou avancent d’un jour.'],
      date: ['Menu de date', 'Ouvre la date exacte, les sauts vers le prochain lever ou coucher du Soleil, et les réglages de mission : drapeau, durée, décalages et date B.'],
      cursorTime: ['Date exacte', 'Tapez une date et une heure UTC pour y aller directement.'],
      jump: ['Sauts lever / coucher', 'Saute au prochain lever ou coucher du Soleil sur le site choisi.'],
      msDays: ['Durée de la mission', 'Le nombre de jours de la mission en surface. Les notes, la carte thermique et les comparaisons utilisent cette fenêtre.'],
      msSet: ['Poser la date d’atterrissage', 'Pose le drapeau A à l’instant que vous regardez.'],
      msAddB: ['Ajouter la date B', 'Ajoute un second drapeau une semaine après A pour comparer deux dates.'],
      msShift: ['Boutons de décalage', 'Décalent la date d’atterrissage de ce nombre de jours, avant ou après.'],
      msRes: ['Résultat de la mission', 'La part de la fenêtre de mission avec énergie et liaison directe avec la Terre.'],
      cmpMode: ['Mode de comparaison', 'Tous les sites classe chaque site par rapport au vôtre. Un site en met deux côte à côte. Autre date compare le même site à deux dates d’atterrissage.'],
      cmpPin: ['Votre site', 'Le site que vous comparez, avec son rang et ses chiffres.'],
      cmpList: ['Classement', 'Chaque site avec ses chiffres. ▲ vert veut dire mieux que votre site, ▼ rouge moins bien. Cliquez sur une ligne pour comparer côte à côte. ≈ marque un horizon lisse (moins précis).'],
      cmpTwo: ['Côte à côte', 'Chaque ligne est une mesure pour les deux côtés ; la dernière colonne est l’écart.'],
      cmpVerdict: ['Verdict', 'Quel côté garde énergie et liaison le plus longtemps. Ce n’est pas un score global : les lignes dessous montrent les compromis.'],
      cmpActions: ['Étapes suivantes', 'Chercher une meilleure date dans Planifier la mission, ou retourner explorer le site.'],
      pzStrip: ['Bande jour par jour', 'Chaque jour d’atterrissage possible pour ce site : vert bon, jaune moyen, rouge mauvais, gris impossible. Cliquez sur un jour pour y poser le drapeau A.'],
      pzBest: ['Meilleurs jours', 'Les trois meilleurs jours d’atterrissage. Un clic pose le drapeau.'],
      pzLeg: ['Légende de la bande', 'Ce que veulent dire les couleurs de la bande.'],
      planAdv: ['Planificateur (Avancé)', 'Une carte thermique et un tableau des occasions d’atterrissage pour plusieurs sites, avec vos propres règles.'],
      accLegend: ['Légende', 'Explique les couleurs, triangles, drapeaux, flèches et notes utilisés dans l’outil.'],
      accPeriod: ['Période', 'Le premier et le dernier jour calculés. La barre, les classements et les plans restent dans cette période.'],
      accRules: ['Contraintes', 'Avancé : la part du Soleil qui doit être visible, la marge sur la Terre et l’élévation d’antenne derrière « éclairé » et « liaison ».'],
      accSites: ['Sites', 'Avancé : choisissez jusqu’à 8 sites pour les tableaux, ou ajoutez les vôtres par coordonnées.'],
      learn: ['Comprendre', 'Six courtes explications, calculées en direct, sur la difficulté du pôle sud lunaire.'],
      method: ['Méthode', 'Les données, les modèles, la validation et les limites de l’outil.'],
      timeline: ['Vue Élévation', 'Hauteur du Soleil et de la Terre au-dessus du vrai horizon au fil du temps.'],
      sky: ['Vue Horizon', 'L’horizon à 360° vu depuis le site, avec les trajectoires du Soleil et de la Terre.'],
      map: ['Carte 2D', 'Relief ombré du pôle avec les sites ; cliquez pour choisir un endroit.'],
      none: ['Pas encore d’aide ici', 'Cette partie n’a pas encore d’explication. Essayez l’assistant (le bouton robot) ou cliquez sur un autre élément.'],
      f_hello: ['Assistant', 'Bonjour ! Je réponds aux questions sur cet outil à partir de son aide intégrée. Choisissez une question ou tapez la vôtre. Je ne suis pas un modèle d’IA : je rapproche vos mots des sujets d’aide.'],
      f_colours: ['Les couleurs', 'La barre et le globe utilisent quatre couleurs : vert = Soleil et liaison directe avec la Terre (le bon cas), jaune = Soleil sans liaison, bleu = liaison mais dans l’ombre, gris = noir et sans contact. La légende en bas de page les liste toutes.'],
      f_grade: ['La note de A à E', 'La note est la part de la fenêtre de mission avec énergie et liaison : A à 60 % ou plus, B 45 %, C 30 %, D 15 %, E en dessous. Elle mesure du temps, pas la probabilité de réussir un atterrissage.'],
      f_earth: ['Pourquoi la Terre disparaît', 'Près du pôle sud lunaire, la Terre reste très basse sur l’horizon. Des reliefs peuvent la cacher, et quand la Lune tourne la Terre passe derrière le terrain : il n’y a alors plus de liaison directe. La section Comprendre le montre avec des chiffres en direct.'],
      f_flag: ['Poser une date d’atterrissage', 'Ouvrez le menu de date sur la barre de temps (le bouton de date) et appuyez sur « Poser la date d’atterrissage ». Puis faites glisser le drapeau A sur la barre, ou utilisez les flèches du clavier. La durée de mission est dans le même menu.'],
      f_compare: ['Comparer', 'Appuyez sur « Comparer ce site » sur la fiche du site, puis choisissez : tous les sites, un site, ou une autre date. Dans Comparer, vous pouvez aussi déplacer la date B pour voir comment un retard change le résultat.'],
      f_plan: ['Meilleur jour d’atterrissage', 'Ouvrez Planifier la mission : la bande montre chaque jour d’atterrissage possible pour le site, et les trois meilleurs jours sont des boutons qui posent votre drapeau.'],
      f_addsite: ['Ajouter un site', 'Faites un clic droit sur le relief du globe, nommez l’endroit et ajoutez-le. En Avancé, vous pouvez aussi saisir des coordonnées dans le panneau Sites. Hors du pôle sud il n’y a pas de données de relief : l’horizon est lisse et moins précis.'],
      f_moon: ['Toute la Lune', 'Toute la Lune montre tous les sites sur un globe éclairé par le vrai Soleil, avec des disques sur les zones qui regroupent plusieurs sites. La texture de surface est illustrative ; la calotte du pôle sud est le vrai relief LOLA.'],
      f_data: ['Données et sources', 'Le relief vient de LOLA (NASA LRO). Les positions du Soleil, de la Terre et de la Lune viennent d’une bibliothèque d’astronomie vérifiée contre JPL Horizons de la NASA. La page Méthode liste données, modèles, validation et limites.'],
      f_accuracy: ['Quelle précision ?', 'Les positions concordent avec JPL Horizons à 0,007° près. Les sites sans données LOLA utilisent un horizon lisse et sont moins précis (marqués ≈).'],
      f_export: ['Exporter', 'En Avancé, la section Comparer a des boutons pour copier ou télécharger un CSV et un calendrier (.ics) des fenêtres d’énergie et de liaison.'],
      f_dsn: ['Liaison directe', 'Une liaison directe demande la Terre au-dessus de l’horizon avec une marge, et au moins une antenne du Deep Space Network (Goldstone, Madrid ou Canberra) qui voit la Lune.'],
      f_triangles: ['Triangles sur la barre', 'Sur la barre de temps, un ▼ jaune marque un coucher du Soleil et un ▲ bleu un coucher de la Terre sur le site choisi.'],
      f_unknown: ['Je ne sais pas encore', 'Je n’ai pas trouvé de sujet d’aide qui corresponde à votre question. Essayez une des questions ci-dessous, ou cliquez sur le bouton pointeur puis sur une partie de la page.']
    }
  };
  /* what each part of the page is: first match wins, most specific first */
  const HELP_MAP = [
    ['#demoBtn', 'demo'], ['#helpBtn, #chatBtn', 'none'], ['#modeSwitch', 'mode'], ['#lang', 'lang'], ['.search', 'search'], ['#ctxBar', 'ctx'], ['#sections', 'sections'], ['#subnav', 'subnav'],
    ['#v3dScope', 'scope'], ['#v3dView', 'view'], ['#v3dLight', 'light'], ['#bestBtn', 'best'], ['#v3dTour', 'tour'], ['#v3dOverview', 'overview'], ['#v3dSunView', 'sunview'], ['#v3dStand', 'stand'], ['.site-quick', 'sitequick'],
    ['[data-sp="analyze"]', 'spAnalyze'], ['[data-sp="compare"]', 'spCompare'], ['.sp-head', 'spHead'], ['.sp-row', 'spRows'], ['.sp-adv', 'spAdv'],
    ['#v3dFlatTag', 'flat'], ['#v3dHint', 'hint'], ['#v3dLegend', 'legend3d'], ['#v3dStage', 'globe'], ['#accProfile', 'profile'],
    ['#lmFlag', 'flagA'], ['#lmFlagB', 'flagB'], ['#play', 'play'], ['#dayBack, #dayFwd', 'day'], ['#cbDate', 'date'], ['#cursorTime', 'cursorTime'], ['#jumpSunrise, #jumpSunset', 'jump'],
    ['#msDays, .ms-dur', 'msDays'], ['[data-ms="set"]', 'msSet'], ['[data-ms="addB"]', 'msAddB'], ['[data-ms-shift], [data-dt-shift]', 'msShift'], ['.ms-res', 'msRes'], ['#cbTrack', 'track'], ['.cursor-bar', 'track'],
    ['#cmpFocus .seg', 'cmpMode'], ['.cf-pin', 'cmpPin'], ['.cf-list', 'cmpList'], ['.cf-two', 'cmpTwo'], ['.cf-verdict, .cf-why', 'cmpVerdict'], ['.cf-actions', 'cmpActions'],
    ['.pz-strip', 'pzStrip'], ['.pz-best', 'pzBest'], ['.pz-leg', 'pzLeg'], ['#view-plan', 'planAdv'],
    ['#accLegend', 'accLegend'], ['#accPeriod', 'accPeriod'], ['#accRules', 'accRules'], ['#accSites', 'accSites'],
    ['#view-learn', 'learn'], ['#view-method', 'method'], ['#view-timeline', 'timeline'], ['#view-sky', 'sky'], ['#view-map', 'map']
  ];
  const helpOf = key => (HELP_TXT[lang] && HELP_TXT[lang][key]) || HELP_TXT.en[key] || HELP_TXT.en.none;
  function helpKeyFor(el) {
    for (const [sel, key] of HELP_MAP) { const m = el.closest(sel); if (m) return { el: m, key }; }
    return null;
  }
  /* spotlight: everything dims except the part being explained, with a card next to it */
  let helpOn = false, spotEl = null, spotEls = [], spotCenter = false;
  function spotRect() {
    const vw = window.innerWidth, vh = window.innerHeight;
    if (spotCenter) return { left: vw / 2, top: vh / 2 - 60, right: vw / 2, bottom: vh / 2 - 60, width: 0, height: 0 };
    const rs = (spotEls.length ? spotEls : [spotEl]).map(e => e.getBoundingClientRect()).filter(r => r.width || r.height);
    if (!rs.length) return null;
    const l = Math.min(...rs.map(r => r.left)), tp = Math.min(...rs.map(r => r.top)), rt = Math.max(...rs.map(r => r.right)), bt = Math.max(...rs.map(r => r.bottom));
    return { left: l, top: tp, right: rt, bottom: bt, width: rt - l, height: bt - tp };
  }
  function placeSpot() {
    const spot = $('#helpSpot'), card = $('#helpCard');
    if (!spotEl || !document.body.contains(spotEl)) { spot.hidden = true; card.hidden = true; return; }
    const r = spotRect(), pad = 6, vw = window.innerWidth, vh = window.innerHeight;
    if (!r) { spot.hidden = true; card.hidden = true; return; }
    Object.assign(spot.style, { left: r.left - pad + 'px', top: r.top - pad + 'px', width: r.width + 2 * pad + 'px', height: r.height + 2 * pad + 'px' });
    spot.hidden = false; card.hidden = false;
    const cw = Math.min(spotCenter ? 500 : tourOn() ? 400 : 340, vw - 24), ch = card.offsetHeight || 150;
    card.style.width = cw + 'px';
    if (r.height > vh * 0.5 && r.width > vw * 0.5) {   // a big part (the globe): put the card inside it, top right
      card.style.top = Math.max(10, r.top + 16) + 'px';
      card.style.left = Math.max(12, Math.min(vw - cw - 12, r.right - cw - 16)) + 'px';
      return;
    }
    let top = r.bottom + 14;
    if (top + ch > vh - 10) top = r.top - ch - 14;
    if (top < 10) top = Math.max(10, Math.min(vh - ch - 10, r.top + 12));
    card.style.top = top + 'px';
    card.style.left = Math.max(12, Math.min(vw - cw - 12, r.left + r.width / 2 - cw / 2)) + 'px';
  }
  function showSpot(el, key) {
    const [title, text] = helpOf(key);
    spotEl = el; spotEls = []; spotCenter = false;
    $('#helpCardTitle').textContent = title; $('#helpCardText').textContent = text;
    $('#helpExit').hidden = !helpOn;
    const b = $('#helpBanner'); b.hidden = true;
    placeSpot();
    $('#helpOk').focus({ preventScroll: true });
  }
  function hideSpot() { spotEl = null; spotEls = []; spotCenter = false; $('#helpSpot').hidden = true; $('#helpCard').hidden = true; if (helpOn) $('#helpBanner').hidden = false; }
  function setHelp(on) {
    helpOn = on; document.body.classList.toggle('help-on', on);
    $('#helpBtn').setAttribute('aria-pressed', String(on));
    spotEl = null; $('#helpSpot').hidden = true; $('#helpCard').hidden = true;
    $('#helpBanner').hidden = !on; $('#helpBanner').textContent = t('helpBanner');
    if (on) { $('#chat').hidden = true; $('#chatBtn').setAttribute('aria-expanded', 'false'); }
  }
  function helpBlock(e) {
    if ((!helpOn && !tourOn()) || e.target.closest('#helpCard, #helpBanner, #helpBtn, #chat, #chatBtn, #v3dTour') || (tourOn() && e.target.closest('#demoBtn'))) return;
    if (tourOn() && !e.isTrusted) return;   // the tour drives the page itself
    e.preventDefault(); e.stopPropagation();
    if (e.type === 'click' && helpOn) {
      const hit = helpKeyFor(e.target);
      showSpot(hit ? hit.el : e.target, hit ? hit.key : 'none');
    }
  }
  ['click', 'pointerdown', 'pointerup', 'mousedown', 'mouseup', 'dblclick'].forEach(ev => document.addEventListener(ev, helpBlock, true));
  $('#helpBtn').addEventListener('click', () => setHelp(!helpOn));
  $('#helpOk').addEventListener('click', hideSpot);
  $('#helpExit').addEventListener('click', () => setHelp(false));
  $('#helpAsk').addEventListener('click', () => { const k = spotEl; hideSpot(); setHelp(false); openChat(); });
  window.addEventListener('scroll', () => { if (spotEl) placeSpot(); }, { passive: true });
  window.addEventListener('resize', () => { if (spotEl) placeSpot(); });
  document.addEventListener('keydown', e => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target.tagName || '')) || e.target.isContentEditable;
    if (e.key === '?' && !typing && !tourOn()) { e.preventDefault(); setHelp(!helpOn); }
    else if (e.key === 'Escape') {
      if (tourOn()) endSiteTour(); else if (spotEl) hideSpot(); else if (helpOn) setHelp(false); else if (!$('#chat').hidden) closeChat();
    }
  });

  /* ---------- site-wide guided tour: about 30 s, each stop dims the page and lights one part (made for a screen recording) */
  const TOUR_TXT = {
    en: {
      sections: ['Four sections', 'Explore · Compare · Plan · Learn. From first look to a landing plan.'],
      modes: ['Simple or Advanced', 'Simple for everyone. Advanced adds graphs, tables and exports.'],
      moon: ['The whole Moon', 'Lit by the real Sun. 26 landing sites; hover one for its grade.'],
      card: ['Sun, Earth, link', 'In plain words: is the Sun up, is the Earth visible, and when does it change?'],
      heat: ['Heat map', 'Red is poor, blue is good: where a mission keeps power and a link.'],
      light: ['Light everywhere', 'A fictional even light, to see the terrain itself.'],
      bar: ['Time bar', 'Green: power and link. Triangles: sunsets. Press play to watch the light move.'],
      flags: ['Landing dates', 'Drop flags A and B, drag them: the mission window updates live.'],
      compare: ['Compare, with reasons', 'All sites, one site, or one site on two dates, with ▲ ▼ and why.'],
      plan: ['Best landing day', 'Every possible day, green to red. One click sets the flag.'],
      learn: ['Learn and Method', 'Why the pole is hard, and the data and limits behind every number.'],
      help: ['Need help?', 'Click the pointer, then anything, for an explanation. Or ask the assistant.'],
      end: ['CLPS Lunar Mission Browser', 'Compare lunar landing sites and dates, on real NASA terrain.'],
      /* story mode (#demo): "what if the landing slips by 7 days?" ; {tokens} are filled with the real computed numbers */
      demoNote: 'Illustrative example, chosen for contrast. Geometry only: sunlight is not power, Earth in view is not a link.',
      d_pole: ['Lunar south pole', 'Real NASA LOLA terrain, with the real Sun and Earth.'],
      d_play: ['Watch the light move', 'Shadows sweep the relief as the days pass.'],
      d_site: ['Pick a landing site', '{site}: Sun, Earth and link, in plain words.'],
      d_land: ['Set the landing date', 'Flag A: {dA}, a {days}-day mission.'],
      d_good: ['On that date: all good', 'Sun and Earth in view. Power and link {a}% of the mission.'],
      d_slip: ['What if it slips 7 days?', 'Add date B = A + 7 days: {dB}.'],
      d_cmp: ['Same site, two dates', 'Scenario A and B side by side.'],
      d_ops: ['Power + link: {a}% → {b}%', 'A 7-day slip changes it by {d} points.'],
      d_why: ['Why?', 'Sun {sa}% → {sb}%. Longest night {na} → {nb}.'],
      d_honest: ['Geometry, not a guarantee', 'Sunlight is not power. Earth in view is not a link.'],
      d_plan: ['Or find the best day', 'Every landing day, green to red. One click sets the flag.'],
      d_all: ['Rank every site', 'Same period, all sites, with ▲ ▼ and the reasons.'],
      d_end: ['CLPS Lunar Mission Browser', 'Explore · Compare · Plan\nReal NASA LOLA terrain, checked against JPL Horizons.\nmoussa-dme.github.io/clps-lunar-mission-browser']
    },
    fr: {
      sections: ['Quatre sections', 'Explorer · Comparer · Planifier · Comprendre. Du premier regard au plan d’atterrissage.'],
      modes: ['Simple ou Avancé', 'Simple pour tous. Avancé ajoute graphiques, tableaux et exports.'],
      moon: ['Toute la Lune', 'Éclairée par le vrai Soleil. 26 sites ; survolez-en un pour sa note.'],
      card: ['Soleil, Terre, liaison', 'En clair : le Soleil est-il levé, la Terre visible, et quand cela change-t-il ?'],
      heat: ['Carte thermique', 'Rouge mauvais, bleu bon : où une mission garde énergie et liaison.'],
      light: ['Lumière partout', 'Une lumière fictive et uniforme, pour voir le relief lui-même.'],
      bar: ['Barre de temps', 'Vert : énergie et liaison. Triangles : couchers. Lecture pour voir la lumière bouger.'],
      flags: ['Dates d’atterrissage', 'Posez les drapeaux A et B, faites-les glisser : la mission se met à jour.'],
      compare: ['Comparer, avec les raisons', 'Tous les sites, un site, ou un site à deux dates, avec ▲ ▼ et pourquoi.'],
      plan: ['Meilleur jour d’atterrissage', 'Chaque jour possible, du vert au rouge. Un clic pose le drapeau.'],
      learn: ['Comprendre et méthode', 'Pourquoi le pôle est difficile, et les données et limites derrière chaque chiffre.'],
      help: ['Besoin d’aide ?', 'Cliquez sur le pointeur, puis sur n’importe quoi, pour une explication. Ou demandez à l’assistant.'],
      end: ['CLPS Lunar Mission Browser', 'Comparez des sites et des dates d’atterrissage lunaire, sur le vrai relief de la NASA.'],
      demoNote: 'Exemple illustratif, choisi pour le contraste. Géométrie seulement : Soleil visible n’est pas énergie, Terre visible n’est pas liaison.',
      d_pole: ['Pôle Sud lunaire', 'Vrai relief LOLA de la NASA, avec le vrai Soleil et la vraie Terre.'],
      d_play: ['La lumière bouge', 'Les ombres balaient le relief au fil des jours.'],
      d_site: ['Choisir un site', '{site} : Soleil, Terre et liaison, en clair.'],
      d_land: ['Fixer la date', 'Drapeau A : {dA}, mission de {days} jours.'],
      d_good: ['Ce jour-là : tout va bien', 'Soleil et Terre visibles. Énergie et liaison {a} % de la mission.'],
      d_slip: ['Et si elle glisse de 7 jours ?', 'Ajout de la date B = A + 7 jours : {dB}.'],
      d_cmp: ['Même site, deux dates', 'Scénarios A et B côte à côte.'],
      d_ops: ['Énergie + liaison : {a} % → {b} %', 'Un glissement de 7 jours change cela de {d} points.'],
      d_why: ['Pourquoi ?', 'Soleil {sa} % → {sb} %. Plus longue nuit {na} → {nb}.'],
      d_honest: ['Géométrie, pas garantie', 'Soleil visible n’est pas énergie. Terre visible n’est pas liaison.'],
      d_plan: ['Ou trouver le meilleur jour', 'Chaque jour d’atterrissage, du vert au rouge. Un clic pose le drapeau.'],
      d_all: ['Classer tous les sites', 'Même période, tous les sites, avec ▲ ▼ et les raisons.'],
      d_end: ['CLPS Lunar Mission Browser', 'Explorer · Comparer · Planifier\nVrai relief LOLA de la NASA, vérifié contre JPL Horizons.\nmoussa-dme.github.io/clps-lunar-mission-browser']
    }
  };
  let siteTour = null;
  const tourOn = () => !!siteTour;
  /* one stop = what to do, what to light, how long to stay (settling time included) */
  const TOUR_STEPS = [
    { k: 'sections', ms: 2000, els: ['#sections'], pre: () => { showTab('3d'); } },
    { k: 'modes', ms: 2100, els: ['#modeSwitch'] },
    { k: 'moon', ms: 2600, els: ['#v3dStage'], pre: async () => { setRegionUI('moon'); if (v3d) v3d.view('overview', null, 1); } },
    { k: 'card', ms: 2600, els: ['#sitePanel'], pre: () => { if (site('m1')) setFocus('m1'); spOpen = true; spLast = ''; update3D(); } },
    { k: 'heat', ms: 2600, els: ['#v3dView'], pre: () => { setRegionUI('south'); if (v3d) v3d.view('overview', null, 1); const b = document.querySelector('#v3dView [data-view="heat"]'); if (b) b.click(); } },
    { k: 'light', ms: 2100, els: ['#v3dLight'], pre: () => { const b = document.querySelector('#v3dView [data-view="live"]'); if (b) b.click(); if (!flat) $('#v3dLight').click(); } },
    { k: 'bar', ms: 2600, els: ['#cbTrack'], pre: () => { if (flat) $('#v3dLight').click(); setPlaying(true); } },
    { k: 'flags', ms: 2400, els: ['.cursor-bar'], pre: () => { setPlaying(false); setMissionTime('landing', timeOf(Math.min(state.grid.n - 2, Math.round(state.grid.n * 0.2))), true); addDateB(); } },
    { k: 'compare', ms: 2600, els: ['#cmpFocus'], pre: () => { state.cmp.mode = 'dates'; showTab('compare'); renderCmpFocus(); } },
    { k: 'plan', ms: 2200, els: ['#planEasy'], pre: () => { showTab('plan'); } },
    { k: 'learn', ms: 2100, els: ['.learn-intro'], pre: () => { showTab('learn'); } },
    { k: 'help', ms: 2000, els: ['#helpBtn', '#chatBtn'], pre: () => { showTab('3d'); } },
    { k: 'end', ms: 1600, els: [], pre: () => { showTab('3d'); } }
  ];
  /* story mode (open the page with #demo): one scenario told in 13 short stops, about 30 s, no voice-over.
     Everything shown is computed live by the engine: the site and dates are only the choice of the example. */
  function setDemoBtn(on) {
    const b = $('#demoBtn'); b.setAttribute('aria-pressed', String(on));
    b.querySelector('span').textContent = t(on ? 'demoStop' : 'demoBtn');
  }
  $('#demoBtn').addEventListener('click', () => (siteTour ? endSiteTour() : startSiteTour('story')));
  const DEMO = { site: 'dg2', landing: Date.UTC(2026, 11, 16), cursor: Date.UTC(2026, 11, 12) };
  function storyVars() {
    const s = site(DEMO.site) || site(state.focus), m = state.mission, days = m.days, v = { days };
    if (!s) return v;
    v.site = s.name;
    const pick = (r, p) => { v['a' + p] = fmt(r.opsPct, 0); v['s' + p] = fmt(r.litPct, 0); v['e' + p] = fmt(r.earthPct, 0); v['n' + p] = dur(r.longestNightH); };
    if (m.landing != null) { v.dA = utc(m.landing, false); const r = scenRes(s.id, m.landing, days).summary; pick(r, 'A'); v.a = v.aA; v.sa = v.sA; v.ea = v.eA; v.na = v.nA; v.rA = r; }
    if (m.landing != null && m.b != null) {
      v.dB = utc(m.b, false); const r = scenRes(s.id, m.b, days).summary; pick(r, 'B'); v.b = v.aB; v.sb = v.sB; v.eb = v.eB; v.nb = v.nB;
      const x = Math.round(r.opsPct - v.rA.opsPct); v.d = (x > 0 ? '+' : '−') + Math.abs(x);
    }
    return v;
  }
  const STORY_STEPS = [
    { k: 'd_pole', ms: 2200, els: ['#v3dStage'], pre: () => {
      setRegionUI('south'); if (flat) $('#v3dLight').click();
      const lb = document.querySelector('#v3dView [data-view="live"]'); if (lb) lb.click();
      state.mission.landing = null; state.mission.b = null; state.mission.bSite = null; state.mission.days = 10; afterMissionChange();
      if (site(DEMO.site)) setFocus(DEMO.site);
      spOpen = false; spLast = ''; setCursor(indexOf(DEMO.cursor)); showTab('3d'); if (v3d) v3d.view('overview', null, 1);
    } },
    { k: 'd_play', ms: 2200, els: ['#cbTrack'], pre: () => { setPlaying(true); } },
    { k: 'd_site', ms: 2300, els: ['#sitePanel'], pre: () => { setPlaying(false); spOpen = true; spLast = ''; update3D(); } },
    { k: 'd_land', ms: 2200, els: ['.cursor-bar'], pre: () => { setMissionTime('landing', DEMO.landing, true); } },
    { k: 'd_good', ms: 2300, els: ['#ctxBar'], pre: () => { renderCtx(); } },
    { k: 'd_slip', ms: 2300, els: ['.cursor-bar'], pre: () => { addDateB(); } },
    { k: 'd_cmp', ms: 2200, els: ['#cmpFocus'], pre: () => { state.cmp.mode = 'dates'; showTab('compare'); renderCmpFocus(); } },
    { k: 'd_ops', ms: 2500, els: ['.cf-two'], pre: () => { } },
    { k: 'd_why', ms: 2500, els: ['.cf-verdict', '.cf-why'], pre: () => { } },
    { k: 'd_honest', ms: 2200, els: ['.cf-note'], pre: () => { } },
    { k: 'd_plan', ms: 2200, els: ['#planEasy'], pre: () => { showTab('plan'); } },
    { k: 'd_all', ms: 2200, els: ['#cmpFocus'], pre: () => { state.cmp.mode = 'all'; showTab('compare'); renderCmpFocus(); } },
    { k: 'd_end', ms: 2100, els: [], pre: () => { showTab('3d'); } }
  ];
  function endSiteTour() {
    if (!siteTour) return;
    const S = siteTour; siteTour = null; clearTimeout(S.timer);
    document.body.classList.remove('tour-on', 'demo-on'); $('#demoNote').hidden = true; setDemoBtn(false);
    $('#helpCard').classList.remove('tour'); hideSpot();
    setPlaying(false);
    // put everything back as the visitor had it
    if (S.snap.lang !== lang) { lang = S.snap.lang; applyI18n(); renderAll(); }
    state.mission = S.snap.mission; saveMission();
    if (S.snap.flat !== flat) $('#v3dLight').click();
    const heatBtn = document.querySelector(`#v3dView [data-view="${S.snap.heat ? 'heat' : 'live'}"]`); if (heatBtn) heatBtn.click();
    if (S.snap.mode !== mode) setMode(S.snap.mode);
    setRegionUI(S.snap.region); spOpen = S.snap.spOpen; spLast = '';
    state.cmp.mode = S.snap.cmp;
    if (site(S.snap.focus)) setFocus(S.snap.focus);
    setCursor(S.snap.cursor); showTab(S.snap.tab);
    afterMissionChange();
    $('#v3dTour').textContent = t('vTour');
  }
  function scrollForTour(el) {
    const r = el.getBoundingClientRect(), vh = window.innerHeight;
    if (r.top >= 70 && r.bottom <= vh - 10) return;
    window.scrollBy(0, r.height > vh - 160 ? r.top - 110 : r.top + r.height / 2 - vh / 2);
  }
  async function tourStep(k) {
    const S = siteTour; if (!S) return;
    if (k >= S.steps.length) { endSiteTour(); return; }
    const st = S.steps[k];
    S.k = k;
    window.scrollTo(0, 0);
    try { if (st.pre) await st.pre(); } catch (e) { /* a step must never stop the tour */ }
    if (!siteTour) return;
    setTimeout(() => {
      if (!siteTour || siteTour !== S || S.k !== k) return;
      const els = st.els.map(s => document.querySelector(s)).filter(e => e && e.getBoundingClientRect().width);
      if (els[0]) scrollForTour(els[0]);
      let [title, text] = (TOUR_TXT[lang] || TOUR_TXT.en)[st.k];
      if (S.kind === 'story') {
        let V = {}; try { V = storyVars(); } catch (e) { /* the numbers are a bonus, the stop must still show */ }
        const fill = s => s.replace(/\{(\w+)\}/g, (m, key) => (V[key] != null ? V[key] : m));
        title = fill(title); text = fill(text);
      }
      spotEls = els; spotCenter = !els.length;
      $('#helpCardTitle').textContent = title; $('#helpCardText').textContent = text;
      $('#helpTourN').textContent = `${k + 1} / ${S.steps.length}`;
      spotEl = els[0] || document.body;
      placeSpot();
    }, 380);
    S.timer = setTimeout(() => tourStep(k + 1), st.ms);
  }
  function startSiteTour(kind) {
    if (siteTour) return;
    if (!state.grid) { toast(t('computing')); return; }
    setHelp(false); $('#chat').hidden = true;
    kind = kind === 'story' ? 'story' : 'site';
    siteTour = { k: 0, timer: 0, kind, steps: kind === 'story' ? STORY_STEPS : TOUR_STEPS, snap: { mode, tab: state.tab, region: $('#v3dRegion').value, heat: heatWin, flat, mission: JSON.parse(JSON.stringify(state.mission)), cursor: state.cursor, focus: state.focus, spOpen, cmp: state.cmp.mode, lang } };
    if (kind === 'story' && lang !== 'en') { lang = 'en'; applyI18n(); renderAll(); }   // the demo always plays in English (not saved: the visitor's language comes back at the end)
    document.body.classList.add('tour-on');
    if (kind === 'story') {
      setDemoBtn(true);
      document.body.classList.add('demo-on');
      const n = $('#demoNote'); n.textContent = (TOUR_TXT[lang] || TOUR_TXT.en).demoNote; n.hidden = false;
    }
    $('#helpCard').classList.add('tour'); $('#helpBanner').hidden = true;
    $('#v3dTour').textContent = t('vTourStop');
    if (mode !== 'simple') setMode('simple');
    if (flat) $('#v3dLight').click();                      // start from the real Sun
    if (heatWin) { const lv = document.querySelector('#v3dView [data-view="live"]'); if (lv) lv.click(); }
    setCursor(0);
    tourStep(0);
  }
  $('#v3dTour').addEventListener('click', () => (siteTour ? endSiteTour() : startSiteTour()));
  /* page.html#demo starts the story as soon as the numbers are ready (for the screen recording) */
  function demoWhenReady() {
    let tries = 0;
    const wait = setInterval(() => {
      if (siteTour || ++tries > 300) { clearInterval(wait); return; }
      if (state.grid && state.series[state.focus] && v3d && $('#progress').hidden) { clearInterval(wait); setTimeout(() => startSiteTour('story'), 600); }
    }, 200);
  }
  window.addEventListener('hashchange', () => { if (location.hash === '#demo') demoWhenReady(); });
  $('#helpTourStop').addEventListener('click', endSiteTour);

  /* the assistant: matches the words of a question to a help topic (works offline) */
  const FAQ = [
    { id: 'f_colours', kw: ['color', 'colour', 'couleur', 'legend', 'legende', 'green', 'vert', 'yellow', 'jaune', 'blue', 'bleu', 'grey', 'gray', 'gris', 'signifie', 'mean'], q: { en: 'What do the colours mean?', fr: 'Que veulent dire les couleurs ?' }, sel: '#accLegend' },
    { id: 'f_grade', kw: ['grade', 'note', 'score', 'letter', 'lettre', 'probability', 'probabilite', 'success', 'reussite'], q: { en: 'What is the A to E grade?', fr: 'Que veut dire la note de A à E ?' }, sel: '.sp-head' },
    { id: 'f_earth', kw: ['earth', 'terre', 'hidden', 'cache', 'disappear', 'disparait', 'horizon', 'visible', 'why', 'pourquoi', 'hide'], q: { en: 'Why does the Earth disappear?', fr: 'Pourquoi la Terre disparaît-elle ?' }, tab: 'learn' },
    { id: 'f_flag', kw: ['flag', 'drapeau', 'landing', 'atterrissage', 'date', 'set', 'poser', 'duration', 'duree', 'length', 'mission', 'days', 'jours'], q: { en: 'How do I set a landing date?', fr: 'Comment poser une date d’atterrissage ?' }, sel: '#cbDate' },
    { id: 'f_compare', kw: ['compare', 'comparer', 'comparison', 'comparaison', 'versus', 'two', 'deux', 'another', 'autre', 'difference', 'ecart'], q: { en: 'How do I compare sites or dates?', fr: 'Comment comparer des sites ou des dates ?' }, tab: 'compare', sel: '#cmpFocus' },
    { id: 'f_plan', kw: ['best', 'meilleur', 'day', 'jour', 'plan', 'planifier', 'when', 'quand', 'land', 'atterrir', 'window', 'fenetre'], q: { en: 'What is the best day to land?', fr: 'Quel est le meilleur jour pour atterrir ?' }, tab: 'plan', sel: '#planEasy' },
    { id: 'f_addsite', kw: ['add', 'ajouter', 'new', 'nouveau', 'site', 'right', 'droit', 'click', 'clic', 'coordinates', 'coordonnees', 'own', 'custom'], q: { en: 'How do I add my own site?', fr: 'Comment ajouter mon propre site ?' }, tab: '3d', sel: '#v3dStage' },
    { id: 'f_moon', kw: ['moon', 'lune', 'globe', 'zone', 'disc', 'disque', 'whole', 'toute', 'texture'], q: { en: 'What does “Whole Moon” show?', fr: 'Que montre « Toute la Lune » ?' }, tab: '3d', sel: '#v3dScope' },
    { id: 'f_data', kw: ['data', 'donnees', 'source', 'sources', 'lola', 'nasa', 'ephemeris', 'ephemerides', 'method', 'methode', 'where'], q: { en: 'Where does the data come from?', fr: 'D’où viennent les données ?' }, tab: 'method' },
    { id: 'f_accuracy', kw: ['precise', 'precision', 'accurate', 'accuracy', 'fiable', 'reliable', 'validation', 'error', 'erreur', 'trust'], q: { en: 'How precise is it?', fr: 'Quelle précision ?' }, tab: 'method' },
    { id: 'f_export', kw: ['export', 'csv', 'calendar', 'calendrier', 'ics', 'download', 'telecharger'], q: { en: 'Can I export the results?', fr: 'Puis-je exporter les résultats ?' } },
    { id: 'f_dsn', kw: ['dsn', 'antenna', 'antenne', 'link', 'liaison', 'communication', 'radio', 'direct'], q: { en: 'What is the direct link?', fr: 'Qu’est-ce que la liaison directe ?' }, sel: '.sp-row' },
    { id: 'f_triangles', kw: ['triangle', 'triangles', 'sunset', 'earthset', 'coucher', 'sunrise', 'lever', 'arrow', 'fleche', 'bar', 'barre'], q: { en: 'What are the triangles on the bar?', fr: 'À quoi servent les triangles de la barre ?' }, sel: '#cbTrack' },
    { id: 'mode', kw: ['simple', 'advanced', 'avance', 'mode', 'expert'], q: { en: 'Simple or Advanced?', fr: 'Simple ou Avancé ?' }, sel: '#modeSwitch' },
    { id: 'light', kw: ['light', 'lumiere', 'lighting', 'eclairage', 'fictional', 'fictif', 'shadow', 'ombre'], q: { en: 'What is “Light everywhere”?', fr: 'Que fait « Lumière partout » ?' }, sel: '#v3dLight' },
    { id: 'view', kw: ['heat', 'thermique', 'red', 'rouge', 'carte'], q: { en: 'What is the heat map?', fr: 'Qu’est-ce que la carte thermique ?' }, tab: '3d', sel: '#v3dView' }
  ];
  const norm = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  function answerFor(text) {
    const tok = norm(text).split(/[^a-z0-9]+/).filter(w => w.length >= 3);
    if (!tok.length) return null;
    let best = null, bs = 0;
    for (const f of FAQ) {
      let sc = 0;
      for (const w of tok) if (f.kw.some(k => k === w || (w.length >= 5 && (k.startsWith(w) || w.startsWith(k) && k.length >= 5)))) sc++;
      if (sc > bs) { bs = sc; best = f; }
    }
    return bs > 0 ? best : null;
  }
  let chatShown = false;
  function chatAdd(who, html) {
    const d = document.createElement('div'); d.className = 'ch-msg ' + who; d.innerHTML = html;
    $('#chatLog').appendChild(d); $('#chatLog').scrollTop = $('#chatLog').scrollHeight; return d;
  }
  function chatReply(f) {
    const id = f ? f.id : 'f_unknown', [title, text] = helpOf(id);
    let html = `<b>${esc(title)}</b><br>${esc(text)}`;
    if (f && (f.sel || f.tab)) html += `<br><button type="button" class="ch-show" data-faq="${esc(f.id)}">${t('chatShow')}</button>`;
    chatAdd('bot', html);
  }
  function chatChips() {
    $('#chatChips').innerHTML = FAQ.slice(0, 8).map(f => `<button type="button" class="ch-chip" data-faq="${f.id}">${esc(f.q[lang] || f.q.en)}</button>`).join('');
  }
  function openChat() {
    setHelp(false);
    $('#chat').hidden = false; $('#chatBtn').setAttribute('aria-expanded', 'true');
    if (!chatShown) { chatShown = true; chatAdd('bot', `<b>${esc(helpOf('f_hello')[0])}</b><br>${esc(helpOf('f_hello')[1])}`); }
    chatChips(); $('#chatIn').focus();
  }
  function closeChat() { $('#chat').hidden = true; $('#chatBtn').setAttribute('aria-expanded', 'false'); $('#chatBtn').focus(); }
  $('#chatBtn').addEventListener('click', () => ($('#chat').hidden ? openChat() : closeChat()));
  $('#chatClose').addEventListener('click', closeChat);
  $('#chatForm').addEventListener('submit', e => {
    e.preventDefault();
    const v = $('#chatIn').value.trim(); if (!v) return;
    chatAdd('me', esc(v)); $('#chatIn').value = '';
    chatReply(answerFor(v));
  });
  $('#chat').addEventListener('click', e => {
    const chip = e.target.closest('.ch-chip'), show = e.target.closest('.ch-show');
    if (chip) { const f = FAQ.find(x => x.id === chip.dataset.faq); chatAdd('me', esc(f.q[lang] || f.q.en)); chatReply(f); }
    else if (show) {
      const f = FAQ.find(x => x.id === show.dataset.faq); if (!f) return;
      if (f.tab) showTab(f.tab);
      setTimeout(() => {
        const el = f.sel && document.querySelector(f.sel);
        if (el && el.getBoundingClientRect().width) { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); setTimeout(() => showSpot(el, f.id.startsWith('f_') ? f.id : f.id), 450); }
      }, 400);
    }
  });
  function applyHelpI18n() { chatChips(); if (helpOn) $('#helpBanner').textContent = t('helpBanner'); }

  /* ---------- boot */
  applyI18n();
  applyFlat(); syncScope();
  initRange();
  renderSiteList();
  const hashTab = (location.hash || '').slice(1);
  const okTabs = ['3d', 'compare', 'scen', 'timeline', 'sky', 'plan', 'map', 'learn', 'method', 'explore'];   // old view ids stay valid links
  if (ADV_VIEWS.includes(hashTab)) mode = 'advanced';
  applyMode(true);
  document.querySelectorAll('.side details.acc').forEach(d => { d.open = mode === 'advanced' || d.id === 'accLegend'; });   // the legend stays open in Simple
  $('#accProfile').open = mode === 'advanced';
  showTab(okTabs.includes(hashTab) ? hashTab : '3d');
  computeGrid();
  if (hashTab === 'demo') demoWhenReady();   // read before showTab() rewrites the hash
})();
