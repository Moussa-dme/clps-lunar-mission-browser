# CLPS Lunar Mission Browser

**NASA Space Apps Challenge 2026 — "CLPS Lunar Mission Browser"**

Compare lunar south-pole landing sites and dates in seconds. For any site and any
date, the tool shows whether a lander has **sunlight** and a **direct line of sight to
Earth**, measured against the **real terrain horizon** from NASA LRO laser altimetry
(LOLA), and turns that into power and communication windows a mission team can use.

- **Web app**: open `dist/index.html` (no install), or the GitHub Pages link.
- **REST API + CLI + Docker**: the same calculation, ready to plug into a planning pipeline.

## Challenge coverage

Every objective and consideration of the challenge statement, and where the tool answers it.

| Challenge asks for | Where it is |
|---|---|
| Curated sites: Apollo, CLPS, other commercial missions, other countries; custom coordinates | 26 presets (6 Apollo, IM-1, IM-2, Blue Ghost 1, IM-3 target, Artemis III regions, Chang'e 4/5/6, Chandrayaan-3, SLIM, high-illumination points) + **Add a site** or a click on the map / 3D terrain |
| Side-by-side comparison of sites | **Compare** (up to 8 sites), **Scenarios** |
| Choose landing dates and times; how conditions change across lunar days and seasons | Date range up to 3 years, time cursor with a date-time box, **Pick a landing date** heatmap |
| Sun and Earth relative to the horizon at a site and date | **Horizon view** (360° LOLA panorama), **3D view** first-person |
| Time remaining before sunset or Earthset | "Sunset in / Earthset in" in **Compare**, **Horizon view**, **3D view** and **Scenarios**; red under 24 h; Next sunrise / Next sunset buttons |
| Solar elevation, sunlight duration, Earth visibility windows | Sun height above terrain everywhere; sunlit %, longest night, Earth link %, windows (CSV, calendar) |
| 2D maps, 3D surfaces, other visualizations | Shaded-relief map, GPU-lit 3D terrain, panorama, timelines, heatmaps |
| Animations and timelines over a lunar day | Play button, 3D shadows in motion, state timelines, guided tour |
| Planners and the public | Expert tables and API for planners; **Why it's hard** tab and guided tour for the public |
| Rapid comparison of site-date combinations when schedules slip | **Scenarios**: site × touchdown × mission length, one-click −1/+1/+3/+7 day slips, copyable summary |
| Ephemerides (JPL Horizons) | Astronomy Engine + IAU lunar orientation, **checked against JPL Horizons** (max 0.007°) |
| LOLA topography, no atmosphere, edge of the lunar sphere | LOLA 40 m / 240 m polar + 470 m global; rays include lunar curvature; no refraction |
| Earth libration, orbital variations | Full libration model; Earth bobbing explained in **Why it's hard** |
| Why small location or date changes matter | **Why it's hard**: sunlight within 500 m of a site, the same mission 3 and 7 days later |
| Steep slopes, deep craters, extreme shadows | Terrain horizons per site; 3D view ray-traces every shadow; average maps show permanently dark floors |
| Respond quickly to schedule changes; coordinate teams | Scenarios + copyable summary, calendar export, REST API, CLI |

## What you can do

| View | Question it answers |
|---|---|
| **3D view** | What is lit, and what sees Earth, right now? LOLA terrain with shadows ray-traced live on the GPU; planning map (power + link / sun only / Earth only / neither); share of the period lit or in contact; first-person view from any site; a 29-second guided tour. |
| **Compare** | Which site has the most power, the most Earth contact, the shortest night, and how long until sunset and Earthset right now? Sortable table, state timeline, CSV and calendar (.ics) export. |
| **Scenarios** | My landing slipped: what changes? Site × touchdown × mission length, one-click date slips, historical landings (Apollo 11 to IM-2) for reference. |
| **Elevation** | Sun and Earth height above the terrain horizon, hour by hour, plus which Deep Space Network complex sees the Moon. |
| **Horizon view** | 360° panorama of the LOLA horizon with Sun and Earth tracks and upcoming sunrise/sunset/Earth-rise events. |
| **Pick a landing date** | For a mission of N days, which touchdowns give the most power + link time, under touchdown rules. |
| **Map** | LOLA shaded relief of 80–90°S. Click anywhere (or on the 3D terrain) to add a site: its horizon is ray-cast in the browser. |
| **Why it's hard** | Six live explanations for the public: a month-long day, a Sun that skims the horizon, 40 km shadows, Earth rising and setting, 500 m that change everything, three days that change the mission. |
| **Method** | Models, validation, limits, sources (EN/FR). |

## Use it from your own software

```bash
npm ci && npm start                      # web app + API on http://localhost:8080
docker build -t clps-browser . && docker run -p 8080:8080 clps-browser
```

| Endpoint | Returns |
|---|---|
| `GET /api/sites` | Preset sites (CLPS landers, Artemis III regions, high-illumination points) |
| `GET /api/summary?site=ptB&start=2027-01-01&days=90` | Sunlit %, Earth link %, power + link %, longest night and link gap |
| `GET /api/compare?sites=ptB,pns,dg2,nobile2&days=90` | The same for several sites, ranked |
| `GET /api/windows?site=pns&kind=power_and_link&format=ics` | Windows as JSON, CSV or **iCalendar** (Outlook, Google Calendar) |
| `GET /api/landing-dates?site=ptB&mission_days=10` | Ranked touchdown times |
| `GET /api/timeseries?lat=-89.45&lon=-138&snap_m=500` | Any point: horizon ray-cast on request, full time series |
| `GET /api/horizon?site=m1&format=csv` | 360° terrain horizon mask |

Full description: [`openapi.yaml`](openapi.yaml) (generate a client in any language).
Python example (standard library only): [`examples/python_client.py`](examples/python_client.py).
Command line, same parameters: `node cli.js windows --site pns --format ics > windows.ics`.

## How it works

1. **Ephemerides**: geocentric Moon and Sun from [Astronomy Engine](https://github.com/cosinekitty/astronomy) (MIT); Moon-fixed frame from the IAU/WGCCRE rotation model.
2. **Site geometry**: topocentric elevation and azimuth from the site's true position (1737.4 km sphere + LOLA height).
3. **Terrain horizon**: 360 rays over 600 km of LOLA terrain (40 m/px within 80°S, 240 m/px to 60°S, global 64 px/deg elsewhere), lunar curvature included, observer 2 m above ground (`tools/horizon_from_dem.py`).
4. **3D view**: for every terrain texel, a GPU shader marches along the great circle toward the Sun and the Earth over the same terrain, with the finite solar disk. Vertical stretch is visual only.
5. **Rules**: sunlit = visible fraction of the 0.53° solar disk ≥ threshold; Earth link = Earth clears the horizon by a margin and a DSN complex (Goldstone, Madrid, Canberra) sees the Moon ≥ 10°.

### Validation (`npm test`, 37 checks)

| Check | Result |
|---|---|
| Sun and Earth azimuth/elevation vs. **NASA JPL Horizons**, 848 positions, 13 sites (pole, Apollo, far side), 1969–2028 (`tests/horizons.test.js`) | max 0.44 arcmin (0.007°) |
| Global LOLA heights vs. published landing elevations | SLIM −914 m (LROC −912 m), Chang'e 5 −2543 m (LROC −2570 m), IM-1 2594 m (2579 m) |
| Historical landings (Scenarios → Load historical landings) | all 14 touched down in sunlight; Chang'e 4 and 6 on the far side had no direct Earth link |
| Sub-Earth point vs. independent libration series, 1 year | worst 0.027° |
| Annual illumination 2020, five high-illumination points vs. Bussey et al. 2010 | mean difference 3.6 percentage points |
| Blue Ghost 1 site sunset | 2025-03-16, the day the mission ended |
| Chandrayaan-3, Blue Ghost 1 touchdown | a few degrees after local sunrise, as flown |
| GPU (3D view) vs. CPU engine, sunlit state (`tests/gpu_consistency.py`) | 99% agreement near the pole (240 m), 90% on the 1 km regional view |
| REST API: every route, formats, error messages | `tests/api.test.js` |

## Repository layout

```
src/engine.js        ephemerides, visibility, windows, landing dates, iCalendar (Node + browser)
src/terrain.js       compact LOLA DEM + horizon ray casting (Node + browser)
src/view3d.js        WebGL 3D view (three.js) with GPU illumination
src/app.js           web app; src/styles.css, src/index.html
server/core.js       API operations; server/server.js HTTP server; cli.js command line
openapi.yaml         API description
data/                sites, LOLA horizon masks, compact DEM, basemap (generated by tools/)
tools/               horizon_from_dem.py, make_assets.py (from LOLA .IMG files)
tests/               engine, API, GPU consistency
docs/                hackathon backlog, submission draft
build.js             assembles dist/index.html (standalone) and dist/artifact.html
```

## Rebuild the terrain data (optional, ~1.1 GB of LOLA files)

```bash
pip install numpy scipy pillow
curl -O https://imbrium.mit.edu/DATA/LOLA_GDR/POLAR/IMG/LDEM_80S_40M.{IMG,LBL}
curl -O https://imbrium.mit.edu/DATA/LOLA_GDR/POLAR/IMG/LDEM_60S_240M.{IMG,LBL}
curl -O https://imbrium.mit.edu/DATA/LOLA_GDR/CYLINDRICAL/IMG/LDEM_64.{IMG,LBL}
python tools/horizon_from_dem.py LDEM_80S_40M.IMG LDEM_60S_240M.IMG LDEM_64.IMG --sites data/sites.json --out data/horizons.json
python tools/fetch_horizons_reference.py      # refresh the JPL Horizons reference (optional)
python tools/make_assets.py LDEM_60S_240M.IMG data
npm run build
```

## Limits

- 40–240 m terrain smooths small rims and boulders; certify a final site with the 5 m LOLA products through the Python tool.
- The Earth link test is geometric: no antenna patterns, link budget, DSN scheduling or relay satellites.
- Published high-illumination coordinates come from older Kaguya topography, so those points are moved to the local LOLA summit (≤ 2 km, shown as "fitted").

## Data, credits, AI

- LOLA GDR polar DEMs — NASA LRO / PDS Geosciences Node.
- Site coordinates: see `data/sites.json` (NASA NSSDC for Apollo, LRO/LROC for CLPS, Chang'e and SLIM, Peña-Asensio et al. arXiv:2406.19863, Bussey et al. 2010, ISRO).
- Ephemeris check: NASA JPL Horizons API (ssd.jpl.nasa.gov).
- Astronomy Engine © Don Cross, three.js © three.js authors, both MIT.
- Built with the help of an AI assistant: see [`AI_DISCLOSURE.md`](AI_DISCLOSURE.md).

Licence: MIT (see `LICENSE`).
