# Use of AI

This project was built with the help of **Claude (Anthropic)**, an AI assistant.
Space Apps asks teams to say where and how AI was used; this file is that statement.

| Part | How AI was used | How the team checked it |
|---|---|---|
| Computation engine (`src/engine.js`, `src/terrain.js`) | Code written by Claude from the team's specification | `tests/engine.test.js`: comparison with published illumination values and with real missions (Chandrayaan-3, IM-1, Blue Ghost 1) |
| 3D view (`src/view3d.js`) and web app (`src/app.js`, `src/styles.css`, `src/index.html`) | Code written by Claude | GPU results compared with the engine (`tests/gpu_consistency.py`), manual review |
| REST API, CLI, Dockerfile, CI (`server/`, `cli.js`, `openapi.yaml`, `.github/`) | Code written by Claude | `tests/api.test.js` |
| Data processing (`tools/`) | Scripts written by Claude | Heights checked against published landing elevations (IM-1: 2579 m) |
| Documentation (`README.md`, `docs/`) | Drafted by Claude, edited by the team | Read by the team |

Not AI-generated: the terrain and the basemap come from NASA LRO/LOLA elevation data;
site coordinates come from the sources listed in `data/sites.json`; the Earth texture in
the 3D view is drawn procedurally and is labelled as illustrative. No NASA logo or
branding is used.
