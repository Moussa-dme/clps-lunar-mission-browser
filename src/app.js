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
      qualLabel: 'Quality', qualStd: 'Standard', qualHigh: 'High (sharper, heavier)', searchPh: 'Search a site…', searchNone: 'No match', popTitle: 'New site here', popName: 'Site name', popOk: 'Add', popCancel: 'Cancel', heatWindow: 'next 10 days from the cursor',
      bestBtn: 'Best site', bestMsg: 'Best south-pole site for the 10 days from {d}: {n}, grade {g} ({p}%).', vwLive: 'Live', vwHeat: 'Heat map', gradeTitle: 'Power + link score, next 10 days', gradeWord: 'Grade', poor: 'Poor', good: 'Good', stretched: 'colours stretched to show differences',
      gradeNote: 'A score of the next 10 days from the cursor time, not a landing-success probability.', dayBack: '1 day earlier', dayFwd: '1 day later', mkSunset: 'Sunset', mkEarthset: 'Earthset', modeSimple: 'Simple', modeAdvanced: 'Advanced', siteLabel: 'Site', viewOpts: 'View options', period: 'Period',
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
      qualLabel: 'Qualité', qualStd: 'Standard', qualHigh: 'Haute (plus net, plus lourd)', searchPh: 'Chercher un site…', searchNone: 'Aucun résultat', popTitle: 'Nouveau site ici', popName: 'Nom du site', popOk: 'Ajouter', popCancel: 'Annuler', heatWindow: 'les 10 jours suivant le curseur',
      bestBtn: 'Meilleur site', bestMsg: 'Meilleur site du pôle Sud pour les 10 jours à partir du {d} : {n}, note {g} ({p} %).', vwLive: 'Direct', vwHeat: 'Carte thermique', gradeTitle: 'Score énergie + liaison, 10 prochains jours', gradeWord: 'Note', poor: 'Mauvais', good: 'Bon', stretched: 'couleurs étirées pour montrer les écarts',
      gradeNote: 'Un score sur les 10 jours à partir du curseur, pas une probabilité de réussite de l’atterrissage.', dayBack: '1 jour plus tôt', dayFwd: '1 jour plus tard', mkSunset: 'Coucher du Soleil', mkEarthset: 'Coucher de la Terre', modeSimple: 'Simple', modeAdvanced: 'Avancé', siteLabel: 'Site', viewOpts: 'Options d’affichage', period: 'Période',
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
  const t = k => (I18N[lang] && I18N[lang][k]) || I18N.en[k] || k;
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

  /* time bar: compact when scrolling up / at the top, full when scrolling down */
  (function () {
    const bar = $('.cursor-bar'); let lastY = window.scrollY;
    const upd = () => {
      const y = window.scrollY, dy = y - lastY;
      if (y < 60 || dy < -6) bar.classList.add('compact'); else if (dy > 6) bar.classList.remove('compact');
      if (Math.abs(dy) > 6) lastY = y;
    };
    bar.classList.add('compact');
    window.addEventListener('scroll', upd, { passive: true });
  })();

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
    if (!initial) document.querySelectorAll('.side details.acc').forEach(d => { d.open = mode === 'advanced'; });
  }
  function setMode(m) {
    mode = m; store.set('mode', m); applyMode();
    showTab(m === 'advanced' ? store.get('tab', '3d') : '3d');
  }
  $('#modeSwitch').addEventListener('click', e => { const b = e.target.closest('[data-mode]'); if (b && b.dataset.mode !== mode) setMode(b.dataset.mode); });

  /* tabs */
  document.querySelector('.tabs').addEventListener('click', e => {
    const b = e.target.closest('[data-tab]'); if (b) showTab(b.dataset.tab);
  });
  function showTab(tab) {
    if (mode === 'simple') tab = '3d';
    state.tab = tab;
    document.querySelectorAll('.tabs [data-tab]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
    document.querySelectorAll('.view').forEach(v => { v.hidden = v.id !== 'view-' + tab; });
    try { history.replaceState(null, '', '#' + tab); } catch (e) { /* ignore */ }
    if (mode === 'advanced') store.set('tab', tab);
    renderTab();
  }

  /* ------------------------------------------------------------ rendering */
  function renderAll() { renderSiteList(); renderTab(); renderCursorLabel(); drawCursorTrack(); update3DButtons(); }
  function renderCursorLabel() {
    if (!state.grid) return;
    $('#cursorLabel').textContent = utc(timeOf(state.cursor)) + ' UTC';
    const ct = $('#cursorTime');
    if (document.activeElement !== ct) ct.value = utc(timeOf(state.cursor)).replace(' ', 'T');
    ct.min = utc(state.grid.start).replace(' ', 'T'); ct.max = utc(timeOf(state.grid.n - 1)).replace(' ', 'T');
    renderCursorChips();
  }
  /* time bar: the slider track shows the focused site's state over the whole period, with sunset / Earthset marks */
  function drawCursorTrack() {
    const cv = $('#cursorTrack'); if (!cv || !state.grid) return;
    const { ctx, w, h } = canvasSetup(cv), s = state.series[state.focus]; if (!s) return;
    const n = state.grid.n, bh = 10, y0 = Math.round((h - bh) / 2), x0 = 8, x1 = w - 8;
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
    else if (state.tab === 'plan') drawHeat();
    else if (state.tab === 'learn') renderLearn(true);
  }
  function renderTab() {
    const tab = state.tab;
    if (tab === 'method') { renderMethod(); return; }
    if (!state.grid) return;
    if (tab === '3d') { render3D(); renderProfile(); }
    else if (tab === 'compare') { renderTable(); drawStrip(); }
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
  let profOpen = false;
  function renderProfile() {
    const box = $('#prof'); if (!box) return;
    const id = state.focus, m = state.sums[id], s = state.series[id];
    if (!m || !s) { box.innerHTML = `<p class="muted">${t('computing')}</p>`; return; }
    const c = E.conditionsAt(s, state.grid, state.cursor), sc = profileScores(id), { pr, cn } = prosCons(m);
    const li = a => a.map(x => `<li>${esc(x)}</li>`).join('');
    const others = state.selected.filter(o => o !== id).length;
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
  }
  $('#prof').addEventListener('click', e => {
    if (e.target.closest('#hexBtn')) profOpen = !profOpen;
    else if (e.target.closest('#hexClose')) profOpen = false;
    else return;
    renderProfile();
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
  /* grade for any site: share of the next 10 days with power + link, from the cursor time */
  const GRADES = [[60, 'A', '#2166ac'], [45, 'B', '#4393c3'], [30, 'C', '#8c929b'], [15, 'D', '#d6604d'], [-1, 'E', '#b2182b']];
  const allSer = {};
  let allSerGrid = null;
  function anySeries(id) {
    if (!state.grid) return null;
    if (state.series[id]) return state.series[id];
    if (allSerGrid !== state.grid) { for (const k in allSer) delete allSer[k]; allSerGrid = state.grid; }
    if (!allSer[id]) allSer[id] = E.siteSeries(state.grid, site(id), state.cfg);
    return allSer[id];
  }
  function siteGrade(id) {
    const ser = anySeries(id); if (!ser) return null;
    const g = state.grid, w = Math.round(10 * DAY / g.stepMs);
    const i0 = Math.min(state.cursor, Math.max(0, g.n - 2)), i1 = Math.min(g.n, i0 + w);
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
    toast(t('bestMsg').replace('{n}', s.name).replace('{g}', b.gr.letter).replace('{p}', fmt(b.gr.pct, 0)).replace('{d}', utc(timeOf(state.cursor), false)));
    if (v3d) { if (!v3d.inRegion(s)) { $('#v3dRegion').value = 'south'; v3d.setRegion('south'); } v3d.view('overview'); }
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
  function openSite(id, scroll = true) {
    const s = site(id); if (!s) return;
    if (!state.selected.includes(id)) {
      if (!selectSite(id)) { state.selected.pop(); selectSite(id); }
      store.set('selected', state.selected);
      state.focus = id; computeSeries();
    } else setFocus(id);
    if (v3d) {
      if (!v3d.inRegion(s) && s.lat <= -75) { $('#v3dRegion').value = 'south'; v3d.setRegion('south'); }
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
    const g = state.grid, w = Math.round(10 * DAY / g.stepMs);
    const i0 = Math.min(state.cursor, Math.max(0, g.n - 2)), i1 = Math.min(g.n, i0 + w);
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
          onProgress: p => { $('#v3dStatus').textContent = p == null ? '' : `${t('averaging')} ${Math.round(p * 100)}%`; },
          onUserInput: () => { if (tour) stopTour(); }
        });
        v3d.setRules(state.cfg);
        v3d.setQuality($('#v3dQuality').value);
        v3d.setExag(+$('#v3dExag').value);
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
  function update3D() {
    if (!v3d || !state.grid) return;
    if (heatOn()) scheduleHeat();
    const list = v3dSites();
    const key = list.map(s => s.id + (s.selected ? 1 : 0) + (s.focus ? 1 : 0) + s.color + s.lat).join('|');
    v3d.setSites(list, key !== v3dSitesKey); v3dSitesKey = key;
    const S = v3dStateAt(state.cursor);
    v3d.setState(S);
    // HUD: Sun and Earth as seen from the pole itself
    const g = state.grid, i = state.cursor;
    const el = v => Math.asin(-v[2] / Math.hypot(v[0], v[1], v[2])) * 180 / Math.PI;
    const az = v => ((Math.atan2(v[1], v[0]) * 180 / Math.PI) + 360) % 360;
    const poleE = [S.earth[0], S.earth[1], S.earth[2] + 1737.4];
    const dsnIn = E.DSN.filter((d, k) => g.dsn[i * 3 + k] >= state.cfg.dsnMinDeg).map(d => d.name);
    $('#v3dHud').innerHTML = `<b>${utc(timeOf(i))} UTC</b><br>${t('hudSun')} ${fmt(el(S.sun), 2)}° · ${t('hudLon')} ${fmt(az(S.sun), 0)}°E<br>` +
      `${t('hudEarth')} ${fmt(el(poleE), 2)}° · ${t('phase')} ${fmt(S.earthIllum * 100, 0)}%<br>DSN: ${dsnIn.length ? dsnIn.join(', ') : t('none')}` +
      (state.series[state.focus] ? (() => { const c = E.conditionsAt(state.series[state.focus], g, i), a1 = changeInfo(c, 'sun'), a2 = changeInfo(c, 'earth');
        const gr = siteGrade(state.focus);
        return `<br><b style="font-size:13px">${esc(site(state.focus).name)}</b>${gr ? ' ' + gradeChip(gr) + ' ' + fmt(gr.pct, 0) + '%' : ''}: ${t('st_' + (c.ops ? 'ops' : c.sunlit ? 'sun' : c.link ? 'comm' : 'none'))} · ${a1.label} ${a1.val} · ${a2.label} ${a2.val}`; })() : '');
  }
  function set3DMode(mode) {
    $('#v3dMode').value = mode;
    if (v3d) v3d.setMode(mode);
    const L = $('#v3dLegend');
    if (mode === 'sun') L.innerHTML = `<span>${t('lgReal')}</span>`;
    else if (mode === 'plan') L.innerHTML = [['ops', 'lgOps'], ['sun', 'lgSun'], ['comm', 'lgComm'], ['none', 'lgNone']]
      .map(([k, l]) => `<span><i class="sw" style="background:var(--st-${k})"></i> ${t(l)}</span>`).join('');
    else {
      L.innerHTML = `<span>${t('poor')}</span><span class="ramp" style="background:linear-gradient(90deg,#b2182b,#ef8a62,#f5f5f5,#67a9cf,#2166ac)"></span><span>${t('good')} (${heatWin ? t('heatWindow') : t('ofPeriod')})</span><span class="muted">${t('stretched')}</span>`;
    }
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
    if (!v3d.inRegion(s)) { $('#v3dRegion').value = 'south'; v3d.setRegion('south'); }
    v3d.view('site', s, ms);
  }
  $('#v3dRegion').addEventListener('change', e => init3D().then(v => { if (v) { v.setRegion(e.target.value); update3D(); } }));
  $('#v3dMode').addEventListener('change', e => { heatWin = false; set3DMode(e.target.value); if (v3d && state.grid) v3d.setSamples(v3dSamples()); });
  $('#v3dView').addEventListener('click', e => {
    const b = e.target.closest('[data-view]'); if (!b) return;
    heatWin = b.dataset.view === 'heat';
    set3DMode(heatWin ? 'avgOps' : 'sun');
    if (v3d && state.grid) v3d.setSamples(heatWin ? windowSamples() : v3dSamples());
    if (b.dataset.view === 'heat' && v3d) {
      if (v3d.region() !== 'south') { $('#v3dRegion').value = 'south'; v3d.setRegion('south'); update3D(); }
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
    if (S.region && v.region() !== S.region) { $('#v3dRegion').value = S.region; v.setRegion(S.region); }
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
  $('#v3dTour').addEventListener('click', () => (tour ? stopTour() : startTour()));

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
    document.querySelectorAll('[data-i18n-aria]').forEach(el => { const v = I18N[lang][el.dataset.i18nAria]; if (v) { el.setAttribute('aria-label', v); el.title = v; } });
    $('#lang').textContent = lang === 'en' ? 'FR' : 'EN';
    buildMethod(); renderMethod();
  }
  $('#lang').addEventListener('click', () => { lang = lang === 'en' ? 'fr' : 'en'; store.set('lang', lang); applyI18n(); renderAll(); });
  const reTheme = () => { refreshCss(); renderAll(); };
  try { window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', reTheme); } catch (e) { /* old browser */ }
  new MutationObserver(reTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  let rz;
  new ResizeObserver(() => { clearTimeout(rz); rz = setTimeout(() => { renderTab(); drawCursorTrack(); }, 80); }).observe(document.querySelector('.main'));

  /* ---------- boot */
  applyI18n();
  initRange();
  renderSiteList();
  const hashTab = (location.hash || '').slice(1);
  const okTabs = ['3d', 'compare', 'scen', 'timeline', 'sky', 'plan', 'map', 'learn', 'method'];
  if (hashTab && hashTab !== '3d' && okTabs.includes(hashTab)) mode = 'advanced';
  applyMode(true);
  document.querySelectorAll('.side details.acc').forEach(d => { d.open = mode === 'advanced'; });
  showTab(okTabs.includes(hashTab) ? hashTab : '3d');
  computeGrid();
})();
