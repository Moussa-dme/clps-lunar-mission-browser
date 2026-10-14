#!/usr/bin/env python3
"""
Terrain horizon masks from a LOLA polar-stereographic DEM.

For each site, casts 360 rays (1 deg apart, azimuth measured from local north
towards east) along great circles and records the highest elevation angle of
the terrain, with the Moon's curvature taken into account. The result is the
"horizon mask" that the browser app compares the Sun and Earth against.

Input DEMs: LOLA GDR polar products (.IMG with its .LBL next to it) from
  https://imbrium.mit.edu/DATA/LOLA_GDR/POLAR/IMG/
Give several, finest first: each terrain sample is read from the finest DEM
that covers it. The reference build uses
  LDEM_80S_40M.IMG  (40 m/px, 80-90 S)  near field and polar sites
  LDEM_60S_240M.IMG (240 m/px, 60-90 S) far field and sites down to 60 S
The script reads projection parameters from each .LBL (south pole products;
the north-pole branch follows the same convention but has not been checked).

Usage
  python tools/horizon_from_dem.py LDEM_80S_40M.IMG LDEM_60S_240M.IMG \
      --sites data/sites.json --out data/horizons.json
  python tools/horizon_from_dem.py LDEM_60S_240M.IMG --lat -89.44 --lon -141.8 --csv mask.csv

A site may carry "snap_m": the site is moved to the highest DEM point within
that radius. Use it for published points whose coordinates are rounded
(0.01 deg of latitude is ~300 m), never for actual landed spacecraft.

Output JSON: {site_id: {"elev_m": h, "mask": [360 floats], "dem": "...", "mast_m": m}}
Output CSV:  "azimuth_deg,elevation_deg" (importable in the app)
"""
import argparse, json, math, os, re, sys
import numpy as np
from scipy.ndimage import map_coordinates

R_MOON = 1737400.0  # m, LOLA reference sphere


def read_label(lbl_path):
    txt = open(lbl_path, encoding="latin-1").read()

    def val(key, cast=float):
        m = re.search(r"^\s*" + key + r"\s*=\s*\"?([-\w.]+)", txt, re.M)
        if not m:
            raise ValueError(f"{key} missing in {lbl_path}")
        return cast(m.group(1))

    p = dict(lines=val("LINES", int), samples=val("LINE_SAMPLES", int),
             scale=val("MAP_SCALE"), l0=val("LINE_PROJECTION_OFFSET"),
             s0=val("SAMPLE_PROJECTION_OFFSET"), center_lat=val("CENTER_LATITUDE"),
             factor=val("SCALING_FACTOR"), bits=val("SAMPLE_BITS", int),
             max_lat=val("MAXIMUM_LATITUDE"), min_lat=val("MINIMUM_LATITUDE"))
    if "POLAR STEREOGRAPHIC" not in txt:
        raise ValueError("Only LOLA polar stereographic products are supported")
    return p


class PolarDEM:
    """LOLA polar stereographic DEM (heights in m above the 1737.4 km sphere)."""

    def __init__(self, img_path):
        lbl = os.path.splitext(img_path)[0] + ".LBL"
        self.p = p = read_label(lbl)
        dtype = "<i2" if p["bits"] == 16 else "<f4"
        self.h = np.memmap(img_path, dtype=dtype, mode="r").reshape(p["lines"], p["samples"])
        self.south = p["center_lat"] < 0
        self.name = os.path.basename(img_path)
        # latitude limit of the product (the edge furthest from the pole)
        self.edge_lat = p["max_lat"] if self.south else p["min_lat"]

    def to_pixel(self, lat, lon):
        p = self.p
        la, lo = np.radians(lat), np.radians(lon)
        if self.south:
            r = 2 * R_MOON * np.tan(np.pi / 4 + la / 2)
            x, y = r * np.sin(lo), r * np.cos(lo)
            return p["l0"] - y / p["scale"], p["s0"] + x / p["scale"]
        r = 2 * R_MOON * np.tan(np.pi / 4 - la / 2)
        x, y = r * np.sin(lo), -r * np.cos(lo)
        return p["l0"] - y / p["scale"], p["s0"] + x / p["scale"]

    def height(self, lat, lon):
        line, samp = self.to_pixel(np.asarray(lat, float), np.asarray(lon, float))
        v = map_coordinates(self.h, [np.atleast_1d(line), np.atleast_1d(samp)], order=1,
                            mode="constant", cval=np.nan) * self.p["factor"]
        # the square raster extends past the product's latitude limit: treat as no data
        lat1 = np.atleast_1d(np.asarray(lat, float))
        outside = (lat1 > self.edge_lat) if self.south else (lat1 < self.edge_lat)
        v[outside] = np.nan
        return v

    def covers(self, lat):
        return lat <= self.edge_lat if self.south else lat >= self.edge_lat


class DEMStack:
    """Several DEMs, finest first; each sample comes from the finest one covering it."""

    def __init__(self, paths):
        self.dems = [PolarDEM(p) for p in paths]
        self.name = "+".join(d.name for d in self.dems)
        self.finest = min(d.p["scale"] for d in self.dems)

    def height(self, lat, lon):
        lat = np.asarray(lat, float); lon = np.asarray(lon, float)
        out = np.full(np.atleast_1d(lat).shape, np.nan)
        for d in self.dems:
            need = ~np.isfinite(out)
            if not need.any():
                break
            out[need] = d.height(np.atleast_1d(lat)[need], np.atleast_1d(lon)[need])
        return out

    def covers(self, lat):
        return any(d.covers(lat) for d in self.dems)

    def snap(self, lat, lon, radius_m):
        """Highest point within radius_m (searched on a polar grid of the finest step)."""
        best = (float(self.height(lat, lon)[0]), lat, lon)
        step = self.finest
        for dist in np.arange(step, radius_m + 1, step):
            th = dist / R_MOON
            az = np.radians(np.arange(0, 360, max(2.0, np.degrees(step / dist))))
            la1 = math.radians(lat)
            s = math.sin(la1) * math.cos(th) + math.cos(la1) * math.sin(th) * np.cos(az)
            la2 = np.arcsin(s)
            lo2 = math.radians(lon) + np.arctan2(np.sin(az) * math.sin(th) * math.cos(la1), math.cos(th) - math.sin(la1) * s)
            h = self.height(np.degrees(la2), np.degrees(lo2))
            i = int(np.nanargmax(h))
            if h[i] > best[0]:
                best = (float(h[i]), float(np.degrees(la2[i])), float(np.degrees(lo2[i])))
        return best


def horizon_mask(dem, lat, lon, mast_m=2.0, max_km=600.0, naz=360):
    """Return (site height m, list of naz horizon elevations in degrees)."""
    h0 = float(dem.height(lat, lon)[0])
    if not np.isfinite(h0):
        raise ValueError("site outside DEM")
    r0 = R_MOON + h0 + mast_m
    # distance samples: one DEM pixel near the site, growing ~0.4 % per step
    px = getattr(dem, "finest", None) or dem.p["scale"]
    d = [px * 0.5]
    while d[-1] < max_km * 1000:
        d.append(d[-1] + max(px * 0.5, d[-1] * 0.004))
    d = np.array(d)
    theta = d / R_MOON                     # central angle
    la1, lo1 = math.radians(lat), math.radians(lon)
    az = np.radians(np.arange(naz) * 360.0 / naz)[:, None]
    sin_la2 = math.sin(la1) * np.cos(theta) + math.cos(la1) * np.sin(theta) * np.cos(az)
    la2 = np.arcsin(np.clip(sin_la2, -1, 1))
    lo2 = lo1 + np.arctan2(np.sin(az) * np.sin(theta) * math.cos(la1),
                           np.cos(theta) - math.sin(la1) * sin_la2)
    hh = dem.height(np.degrees(la2).ravel(), np.degrees(lo2).ravel()).reshape(la2.shape)
    r1 = R_MOON + hh
    elev = np.degrees(np.arctan2(r1 * np.cos(theta) - r0, r1 * np.sin(theta)))
    elev = np.where(np.isfinite(elev), elev, -90.0)   # beyond the DEM edge: ignore
    return h0, np.round(elev.max(axis=1), 3).tolist()


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("dem", nargs="+", help="LOLA polar .IMG files, finest first (.LBL next to each)")
    ap.add_argument("--sites", help="JSON list of {id, lat, lon}")
    ap.add_argument("--out", help="output JSON for --sites")
    ap.add_argument("--lat", type=float)
    ap.add_argument("--lon", type=float)
    ap.add_argument("--csv", help="output CSV for a single --lat/--lon site")
    ap.add_argument("--mast", type=float, default=2.0, help="observer height above ground, m (default 2)")
    ap.add_argument("--max-km", type=float, default=600.0, help="ray length, km (default 600)")
    a = ap.parse_args()
    dem = DEMStack(a.dem)

    if a.sites:
        sites = json.load(open(a.sites))
        out = {}
        for s in sites:
            if not dem.covers(s["lat"]):
                print(f"skip {s['id']}: outside {dem.name}", file=sys.stderr)
                continue
            lat, lon = s["lat"], s["lon"]
            rec = {}
            if s.get("snap_m"):
                _, lat, lon = dem.snap(lat, lon, s["snap_m"])
                rec["snapped"] = [round(lat, 5), round(lon, 5)]
            h0, mask = horizon_mask(dem, lat, lon, a.mast, a.max_km)
            rec.update({"elev_m": round(h0, 1), "mask": mask, "dem": dem.name, "mast_m": a.mast})
            out[s["id"]] = rec
            print(f"{s['id']:10s} h={h0:8.1f} m  horizon max {max(mask):5.2f}  min {min(mask):5.2f} deg"
                  + (f"  snapped to {rec['snapped']}" if "snapped" in rec else ""), file=sys.stderr)
        json.dump(out, open(a.out, "w"), separators=(",", ":"))
    elif a.lat is not None and a.lon is not None:
        h0, mask = horizon_mask(dem, a.lat, a.lon, a.mast, a.max_km)
        lines = ["azimuth_deg,elevation_deg"] + [f"{i},{m}" for i, m in enumerate(mask)]
        text = "\n".join(lines) + "\n"
        if a.csv:
            open(a.csv, "w").write(text)
        else:
            sys.stdout.write(text)
        print(f"site height {h0:.1f} m", file=sys.stderr)
    else:
        ap.error("give --sites/--out or --lat/--lon")


if __name__ == "__main__":
    main()
