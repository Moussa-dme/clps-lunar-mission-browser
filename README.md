# CLPS Lunar Mission Browser

**NASA Space Apps Challenge 2026 — "CLPS Lunar Mission Browser"**

A browser tool that lets mission planners, educators and the public compare lunar
south-pole landing sites and dates in seconds. For every site it computes where the
Sun and the Earth stand **relative to the real terrain horizon** (from NASA LRO/LOLA
elevation data), then shows when a lander has solar power, when it can talk directly
to Earth, and how long the nights and communication gaps last.

Open `dist/index.html` in any modern browser. No install, no server.

## What you can do

| View | Question it answers |
|---|---|
| **Compare** | Which site has the most power, the most Earth contact, the shortest night? Sortable table + a colour timeline of power/link states for up to 8 sites. |
| **Elevation** | How high are the Sun and Earth above the terrain, hour by hour? Plus which Deep Space Network complex can see the Moon. |
| **Horizon view** | What would I see standing there? 360° panorama of the LOLA horizon with the Sun and Earth tracks, Earth phase, live readouts and the next sunrise/sunset/Earth-rise events. |
| **Pick a landing date** | For a mission of N days, which touchdown dates give the most power + link time? Heatmap of every touchdown (every 6 h) per site, with touchdown rules (sunlit, Earth in view, minimum Sun height), and a ranked list. |
| **Map** | Shaded-relief LOLA map of 80–90°S with all sites, live Sun/Earth direction arrows, and **click-to-add any new site** — its terrain horizon is ray-traced in the browser. |
| **Method** | Models, validation, limits and data sources (EN/FR). |

Also: time cursor with playback, mission rules (Sun disk threshold, Earth margin,
DSN requirement and elevation), CSV export of all time series, import/export of
horizon masks as CSV, English/French interface, light and dark themes.

## How it works

1. **Ephemerides** — geocentric Moon and Sun from [Astronomy Engine](https://github.com/cosinekitty/astronomy)
   (MIT, ~1′ for the Moon). The Moon-fixed frame comes from the IAU/WGCCRE lunar
   rotation model, cross-checked against an independent physical-libration series
   (sub-Earth point agrees to 0.03° over a year).
2. **Site geometry** — topocentric elevation/azimuth from the site's true position
   (1737.4 km sphere + LOLA height), so Earth's 0.26° parallax is included.
3. **Terrain horizon** — 360 rays over 600 km of LOLA terrain (40 m/px within 80°S,
   240 m/px beyond), Moon curvature included, observer 2 m above ground
   (`tools/horizon_from_dem.py`).
4. **Rules** — sunlit = visible fraction of the 0.53° solar disk ≥ threshold;
   Earth link = Earth clears the horizon + a DSN complex (Goldstone/Madrid/Canberra)
   sees the Moon ≥ 10°.

### Validation (`npm test`)

| Check | Result |
|---|---|
| Sub-Earth point vs. independent libration series, 1 year | worst 0.027° |
| Max sub-solar latitude (lunar axis tilt 1.54° + libration) | 1.59° |
| Max libration in latitude | 6.86° |
| Annual illumination 2020 of Shackleton rim A / ridge B / point D / de Gerlache C / Malapert M1 vs. Bussey et al. 2010 | 85/89/83/82/76 % vs 81/82/86/85/74 % (mean diff 3.6 pts) |
| Chandrayaan-3, Blue Ghost 1 touchdown Sun elevation | a few degrees after local sunrise, as flown |
| Blue Ghost 1 site sunset | 2025-03-16, the day the mission ended |

## Repository layout

```
src/engine.js          computation engine (pure JS, runs in Node and the browser)
src/app.js             user interface (canvas charts, no framework)
src/styles.css         design tokens, light + dark themes
src/index.html         page template
data/sites.json        site list with coordinates and sources
data/horizons.json     LOLA horizon masks (generated)
data/*.gz, basemap.jpg compact DEM and shaded relief for the browser (generated)
tools/horizon_from_dem.py  horizon masks from any LOLA polar DEM
tools/make_assets.py       basemap + compact DEM for the browser
tests/engine.test.js   validation suite
build.js               assembles dist/index.html (standalone) and dist/artifact.html
```

## Build from scratch

```bash
npm install                      # astronomy-engine
npm test                         # validation
npm run build                    # -> dist/index.html

# regenerate terrain data (optional, ~580 MB of LOLA files)
pip install numpy scipy pillow
curl -O https://imbrium.mit.edu/DATA/LOLA_GDR/POLAR/IMG/LDEM_80S_40M.{IMG,LBL}
curl -O https://imbrium.mit.edu/DATA/LOLA_GDR/POLAR/IMG/LDEM_60S_240M.{IMG,LBL}
python tools/horizon_from_dem.py LDEM_80S_40M.IMG LDEM_60S_240M.IMG --sites data/sites.json --out data/horizons.json
python tools/make_assets.py LDEM_60S_240M.IMG data
npm run build
```

Add a site permanently: append it to `data/sites.json` (`snap_m` only for rounded
published coordinates, never for landed spacecraft), rerun the horizon script, rebuild.

## Limits

- 40–240 m terrain smooths small rims and boulders; certify a final site with the 5 m LOLA products through the Python tool.
- The Earth link test is geometric: no antenna patterns, link budget, DSN scheduling or relay satellites.
- Published high-illumination coordinates come from older Kaguya topography, so those points are moved to the local LOLA summit (≤ 2 km, shown as "fitted").

## Data and credits

- LOLA GDR polar DEMs — NASA LRO / PDS Geosciences Node (imbrium.mit.edu).
- Site coordinates — IM-1, IM-2, Blue Ghost 1 (LRO/LROC confirmations), Artemis III
  representative points (Peña-Asensio et al., arXiv:2406.19863), high-illumination
  points (Bussey et al. 2010 via Wikipedia), Chandrayaan-3 (ISRO).
- Astronomy Engine © Don Cross, MIT licence.

Licence: MIT (see `LICENSE`).
