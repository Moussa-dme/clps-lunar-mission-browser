# Space Apps submission (draft, English)

Copy each section into the matching field of the project form. Keep the numbers identical to the README.

## Project Name
CLPS Lunar Mission Browser

## High-Level Project Summary
A browser tool that shows, for any landing site near the lunar south pole and any date, whether a lander has sunlight and a direct line of sight to Earth, using the real terrain horizon from NASA LRO laser altimetry. Mission planners compare up to eight sites in seconds, rank landing dates for a mission of N days, and export power and communication windows to CSV or to a calendar. Shadows are computed live on the graphics card and shown in 3D. The same calculation is exposed as a REST API, a command-line tool and a Docker image, so a CLPS team can plug it into its own planning pipeline.

## Link to Project Demo
<30-second video link>

## Link to Final Project
<GitHub Pages link> · <repository link>

## Detailed Project Description
**What it does.** For each site and time step the tool computes the Sun and Earth positions in the local sky and compares them with the terrain horizon of that exact spot. It derives sunlit time, direct-to-Earth link time (Earth above the terrain and a Deep Space Network complex in view), their overlap, the longest night and the longest communication gap.

**How it works.** Ephemerides from Astronomy Engine with the IAU lunar orientation model (sub-Earth point within 0.03° of an independent libration series). Terrain horizons ray-cast over 600 km of LOLA terrain (40 m and 240 m grids). In 3D, illumination and Earth visibility are ray-marched for every terrain texel on the GPU.

**Validation.** Sun and Earth positions agree with NASA JPL Horizons to within 0.007° over 848 positions at 13 sites from 1969 to 2028. Annual illumination of five classic high-illumination points matches published values with a mean difference of 3.6 percentage points. The tool reproduces the end of Blue Ghost Mission 1 at local sunset on 2025-03-16. GPU and CPU results agree for 99% of site-times near the pole. All 14 historical landings in the tool (Apollo 11 to IM-2) touched down in sunlight, as flown. 37 automated tests.

**When a schedule slips.** The Scenarios view compares site × touchdown × mission length side by side, with one-click slips of −1, +1, +3 and +7 days, and shows the time left before sunset and Earthset at touchdown.

**For the public.** A "Why it's hard" view explains, with live numbers, the month-long lunar day, the Sun skimming the polar horizon, 40 km shadows, Earth rising and setting, and why 500 m or 3 days can change a mission.

**Benefits.** Replaces hours in complex tools with a few clicks; the API and calendar export make it usable inside existing mission-ops workflows; the 3D view makes the problem understandable for educators and the public.

**Tools.** JavaScript, WebGL (three.js), Node.js, Python (NumPy, SciPy) for data preparation, Docker, GitHub Actions.

## NASA Data
- LRO Lunar Orbiter Laser Altimeter (LOLA) GDR polar digital elevation models LDEM_80S_40M and LDEM_60S_240M (PDS Geosciences Node): terrain horizons, 3D terrain, basemap.
- LOLA global DEM LDEM_64 for sites away from the pole.
- JPL Horizons API: reference positions of the Sun and Earth used to validate the ephemerides.
- Apollo landing coordinates (NSSDC) and CLPS landing sites (IM-1, IM-2, Blue Ghost Mission 1) as confirmed by LRO/LROC.
- Artemis III candidate landing regions.

## Space Agency Partner & Other Data
- Astronomy Engine (Don Cross, MIT licence): ephemerides.
- three.js (MIT licence): 3D rendering.
- Peña-Asensio et al., arXiv:2406.19863: representative points of Artemis III regions.
- Bussey et al. (2010), Icarus 208: published illumination of high-illumination points (validation).
- ISRO: Chandrayaan-3 landing site.
- Work prepared before the event: <describe, as agreed with the Local Lead>.

## Use of AI Disclosure
<paste AI_DISCLOSURE.md>
