#!/usr/bin/env python3
"""
Build the terrain assets embedded in the web app from a LOLA polar DEM.

  basemap.jpg       shaded relief of 80-90 S (polar stereographic, 1024 px)
  dem_coarse.i16.gz heights (m, int16 LE) 75-90 S at 1 km/px, for in-browser horizons
  dem_fine.i16.gz   heights (m, int16 LE) 87.5-90 S at 240 m/px, near-pole detail
  assets.json       grid geometry for the above

Usage: python tools/make_assets.py LDEM_60S_240M.IMG data/
"""
import gzip, json, math, os, sys
import numpy as np
from PIL import Image
from scipy.ndimage import map_coordinates

sys.path.insert(0, os.path.dirname(__file__))
from horizon_from_dem import PolarDEM, R_MOON


def radius_of(lat):
    return 2 * R_MOON * math.tan(math.pi / 4 + math.radians(lat) / 2)


def resample(dem, half_m, n):
    """Square grid centred on the pole, [-half_m, half_m] in projected x/y, n x n."""
    c = (np.arange(n) + 0.5) / n * 2 * half_m - half_m
    x, y = np.meshgrid(c, -c)       # row 0 = +y (towards lon 180), col 0 = -x (lon 270)
    p = dem.p
    line = p["l0"] - y / p["scale"]
    samp = p["s0"] + x / p["scale"]
    h = map_coordinates(dem.h, [line, samp], order=1, mode="nearest") * p["factor"]
    return h


def hillshade(h, px_m, az_deg=315, alt_deg=30, z=2.0):
    gy, gx = np.gradient(h, px_m)
    slope = np.arctan(z * np.hypot(gx, gy))
    aspect = np.arctan2(-gx, gy)
    az, alt = math.radians(az_deg), math.radians(alt_deg)
    s = np.sin(alt) * np.cos(slope) + np.cos(alt) * np.sin(slope) * np.cos(az - aspect)
    return np.clip(s, 0, 1)


def main():
    img, outdir = sys.argv[1], sys.argv[2]
    dem = PolarDEM(img)
    meta = {}

    # Basemap 80-90 S
    half = radius_of(-80.0)
    n = 1024
    h = resample(dem, half, n)
    hs = hillshade(h, 2 * half / n)
    tint = (h - h.min()) / (h.max() - h.min())
    g = np.clip(0.18 + 0.72 * hs * (0.75 + 0.25 * tint), 0, 1)
    Image.fromarray((g * 255).astype(np.uint8), "L").save(os.path.join(outdir, "basemap.jpg"), quality=78, optimize=True)
    meta["basemap"] = {"half_m": half, "n": n, "lat_edge": -80.0}

    for name, lat_edge, px in (("dem_coarse", -75.0, 1000.0), ("dem_fine", -87.5, 240.0)):
        half = radius_of(lat_edge)
        n = int(math.ceil(2 * half / px))
        half = n * px / 2
        hh = np.round(resample(dem, half, n)).astype("<i2")
        raw = gzip.compress(hh.tobytes(), 9)
        open(os.path.join(outdir, name + ".i16.gz"), "wb").write(raw)
        meta[name] = {"half_m": half, "n": n, "px_m": px, "lat_edge": lat_edge}
        print(name, n, "px", len(raw) // 1024, "KiB gz")

    meta["source"] = dem.name
    json.dump(meta, open(os.path.join(outdir, "assets.json"), "w"), indent=1)


if __name__ == "__main__":
    main()
