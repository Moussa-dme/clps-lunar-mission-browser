#!/usr/bin/env python3
"""
Shaded relief for the three non-polar zones of the whole-Moon globe (Apollo / SLIM, west, far side).

Reads LOLA LDEM_64 (global, 64 px/deg = 474 m/px) and writes data/zone_relief.png, an equirectangular
2048 x 1024 overlay (grey-alpha). Grey = hill shading (128 = flat ground), alpha = the zone disc, feathered.
Outside the three discs the overlay is fully transparent: the app shows relief only where the circles are.

Only the rows and columns of the zones are read, so the 530 MB file is not needed: SOURCE can be a local
LDEM_64.IMG or the URL itself (HTTP range requests, about 25 MB in total).

  python tools/make_zone_relief.py https://imbrium.mit.edu/DATA/LOLA_GDR/CYLINDRICAL/IMG/LDEM_64.IMG data/sites.json data/zone_relief.png
  python tools/make_zone_relief.py LDEM_64.IMG data/sites.json data/zone_relief.png

The zone discs follow ZONE_DEFS / zoneList() in src/app.js: centre = mean direction of the zone's sites,
radius = 5 deg + the largest angular distance to the centre (at least 8 deg).
The heights are sampled every 4th row and averaged over 4 columns (16 px/deg, about 1.9 km/px): this is a
coarse view meant for the globe, not terrain for shadows or horizons (those stay on the polar DEM).
"""
import http.client
import json
import math
import sys
import urllib.parse
from concurrent.futures import ThreadPoolExecutor
import threading

import numpy as np
from PIL import Image
from scipy.ndimage import map_coordinates

ROWS, COLS, PPD = 11520, 23040, 64      # LDEM_64: 90 N at row 0, longitude 0 at column 0, east-positive
STRIDE = 4                              # 64 -> 16 px/deg
M_PER_DEG = math.pi * 1737400.0 / 180.0
EXAG = 3.0                              # same vertical exaggeration as the polar 3D terrain
LIGHT_AZ, LIGHT_ALT = 300.0, 35.0       # degrees (azimuth clockwise from north)
W, H = 2048, 1024                       # output overlay, same grid as the globe texture

# mirror of ZONE_DEFS in src/app.js (the polar zone has its own LOLA terrain)
ZONES = {
    'apollo': ['a11', 'a12', 'a14', 'a15', 'a16', 'a17', 'slim'],
    'west': ['im3', 'ce5'],
    'far': ['ce4', 'ce6'],
}


def unit(lat, lon):
    la, lo = math.radians(lat), math.radians(lon)
    return np.array([math.cos(la) * math.cos(lo), math.cos(la) * math.sin(lo), math.sin(la)])


def zone_disc(sites, ids):
    ss = [s for s in sites if s['id'] in ids]
    v = sum(unit(s['lat'], s['lon']) for s in ss)
    v = v / np.linalg.norm(v)
    lat, lon = math.degrees(math.asin(v[2])), math.degrees(math.atan2(v[1], v[0]))
    far = max(math.degrees(math.acos(max(-1.0, min(1.0, float(unit(s['lat'], s['lon']) @ v))))) for s in ss)
    return lat, lon, max(8.0, 5.0 + far)


class Source:
    """Rows of LDEM_64 from a local file or by HTTP range requests."""

    def __init__(self, where):
        self.url = where if where.startswith('http') else None
        if self.url:
            u = urllib.parse.urlparse(self.url)
            self.host, self.path = u.netloc, u.path
            self.local = threading.local()
        else:
            self.mm = np.memmap(where, dtype='<i2', mode='r', shape=(ROWS, COLS))

    def _conn(self):
        c = getattr(self.local, 'c', None)
        if c is None:
            c = self.local.c = http.client.HTTPSConnection(self.host, timeout=60)
        return c

    def segment(self, row, c0, c1):
        """int16 samples of one row, columns c0..c1-1 (no wrap)."""
        if not self.url:
            return np.array(self.mm[row, c0:c1])
        a = (row * COLS + c0) * 2
        b = (row * COLS + c1) * 2 - 1
        for attempt in range(4):
            try:
                c = self._conn()
                c.request('GET', self.path, headers={'Range': f'bytes={a}-{b}'})
                r = c.getresponse()
                body = r.read()
                if r.status != 206 or len(body) != b - a + 1:
                    raise IOError(f'bad range response {r.status}')
                return np.frombuffer(body, dtype='<i2')
            except Exception:
                self.local.c = None
                if attempt == 3:
                    raise
        return None

    def row(self, row, lon0, lon1):
        """Samples of one row for longitudes lon0..lon1 (degrees east, may cross 0/360), as int16."""
        c0 = int(math.floor(lon0 * PPD)); c1 = int(math.ceil(lon1 * PPD))
        parts, c = [], c0
        while c < c1:
            cm = c % COLS
            end = min(c1, c + (COLS - cm))
            parts.append(self.segment(row, cm, cm + (end - c)))
            c = end
        return np.concatenate(parts)


def read_patch(src, lat, lon, rad):
    """Heights (m) on a lat/lon grid of 16 px/deg around the disc, plus its geometry."""
    lat_n, lat_s = min(90.0, lat + rad), max(-90.0, lat - rad)
    half = min(180.0, rad / max(0.2, math.cos(math.radians(min(89.0, max(abs(lat_n), abs(lat_s)))))))
    lon0 = lon - half
    lon0 -= STRIDE / PPD * 0  # keep exact
    r0 = int(math.floor((90.0 - lat_n) * PPD)); r1 = int(math.ceil((90.0 - lat_s) * PPD))
    rows = list(range(r0, r1, STRIDE))
    width = int(math.floor(2 * half * PPD / STRIDE)) * STRIDE
    lon0_m = lon0 % 360.0

    def fetch(r):
        a = src.row(r, lon0_m, lon0_m + width / PPD)
        return a[:width].astype(np.float32).reshape(-1, STRIDE).mean(axis=1) * 0.5   # DN * 0.5 m, 4-column mean
    with ThreadPoolExecutor(16) as ex:
        data = list(ex.map(fetch, rows))
    h = np.stack(data)
    lats = 90.0 - (np.array(rows) + STRIDE / 2.0) / PPD
    lons_rel = -half + (np.arange(h.shape[1]) * STRIDE + STRIDE / 2.0) / PPD
    return h, lats, lons_rel


def hillshade(h, lats):
    dy = STRIDE / PPD * M_PER_DEG * -1.0                       # rows go south: metres per row (negative = southwards)
    dx = (STRIDE / PPD) * M_PER_DEG * np.cos(np.radians(lats))[:, None]
    z = h * EXAG
    gy = np.gradient(z, axis=0) / dy                           # d z / d north
    gx = np.gradient(z, axis=1) / np.maximum(dx, 1.0)          # d z / d east
    slope = np.arctan(np.hypot(gx, gy))
    aspect = np.arctan2(-gx, gy)                               # downslope direction, clockwise from north
    zen, az = math.radians(90.0 - LIGHT_ALT), math.radians(LIGHT_AZ)
    hs = math.cos(zen) * np.cos(slope) + math.sin(zen) * np.sin(slope) * np.cos(az - aspect)
    return hs, math.cos(zen)


def main():
    if len(sys.argv) != 4:
        sys.exit(__doc__)
    src, sites_path, out = Source(sys.argv[1]), sys.argv[2], sys.argv[3]
    sites = json.load(open(sites_path))
    L = np.full((H, W), 128, np.float32)
    A = np.zeros((H, W), np.float32)
    ys, xs = np.mgrid[0:H, 0:W]
    glat = 90.0 - (ys + 0.5) / H * 180.0
    glon = (xs + 0.5) / W * 360.0 - 180.0
    for zid, ids in ZONES.items():
        lat, lon, rad = zone_disc(sites, ids)
        print(f'{zid}: centre {lat:.1f}, {lon:.1f}  radius {rad:.1f} deg', flush=True)
        h, lats, lons_rel = read_patch(src, lat, lon, rad)
        print(f'  patch {h.shape[1]} x {h.shape[0]} px, heights {h.min():.0f} to {h.max():.0f} m', flush=True)
        hs, flat = hillshade(h, lats)
        # angular distance of every output pixel to the disc centre
        u = np.stack([np.cos(np.radians(glat)) * np.cos(np.radians(glon)), np.cos(np.radians(glat)) * np.sin(np.radians(glon)), np.sin(np.radians(glat))], -1)
        ang = np.degrees(np.arccos(np.clip(u @ unit(lat, lon), -1, 1)))
        mask = np.clip((rad - ang) / (0.14 * rad), 0, 1)
        sel = mask > 0
        lon_rel = ((glon[sel] - lon + 180.0) % 360.0) - 180.0
        fi = (lats[0] - glat[sel]) / (lats[0] - lats[1])                       # fractional row
        fj = (lon_rel - lons_rel[0]) / (lons_rel[1] - lons_rel[0])             # fractional column
        v = map_coordinates(hs, [fi, fj], order=1, mode='nearest')
        shade = np.clip(128.0 + (v - flat) * 230.0, 0, 255)
        m = mask[sel]
        a_old = A[sel]
        L[sel] = np.where(m >= a_old, shade, L[sel])
        A[sel] = np.maximum(a_old, m)
    img = np.dstack([L.astype(np.uint8), (A * 255).astype(np.uint8)])
    Image.fromarray(img, 'LA').save(out, optimize=True)
    print('wrote', out, f'{(len(open(out, "rb").read()) / 1024):.0f} KB')


if __name__ == '__main__':
    main()
