#!/usr/bin/env python3
"""
Optional browser test: compare the GPU terrain computation (3D view) with the CPU engine.
Needs Python Playwright with Chromium:  pip install playwright && playwright install chromium
Usage: npm run build && python tests/gpu_consistency.py
Reference result (software WebGL): pole area 97/98 sunlit states agree, 1 km region 163/182.
"""
import asyncio, pathlib, sys
from playwright.async_api import async_playwright

PAGE = (pathlib.Path(__file__).resolve().parent.parent / 'dist' / 'index.html').as_uri()
SITES = ['ptA', 'ptB', 'ptC', 'ptD', 'pns', 'dg2', 'faustini', 'm1', 'im2', 'nobile2', 'mouton', 'amundsen', 'im1']

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        pg = await b.new_page(viewport={'width': 1100, 'height': 800})
        await pg.goto(PAGE)
        await pg.wait_for_function('document.querySelector("#progress").hidden', timeout=120000)
        await pg.evaluate('window.__clpsTest.ready()')
        ok_all = True
        for region, need in (('pole', 0.95), ('south', 0.85)):
            await pg.select_option('#v3dRegion', region)
            await pg.wait_for_timeout(1500)
            rows = await pg.evaluate('(a) => window.__clpsTest.gpuVsCpu(a[0], a[1])',
                                     [SITES, [k * 311 + 40 for k in range(14)]])
            agree = sum((r['gpuFrac'] >= 0.5) == (r['cpuFrac'] >= 0.5) for r in rows) / len(rows)
            print(f'{region}: {len(rows)} site-times, sunlit agreement {agree:.0%} (need {need:.0%})')
            ok_all &= agree >= need
        await b.close()
        sys.exit(0 if ok_all else 1)

asyncio.run(main())
