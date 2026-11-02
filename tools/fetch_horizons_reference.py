#!/usr/bin/env python3
"""
Build the JPL Horizons reference used by tests/horizons.test.js.

For a set of sites and times, asks the JPL Horizons API for the apparent azimuth
and elevation of the Sun (10) and the Earth (399) seen from the lunar surface
(CENTER='coord@301', airless), and saves them to tests/horizons_reference.json.

    python tools/fetch_horizons_reference.py
"""
import json, os, ssl, sys, time, urllib.parse, urllib.request

ROOT = os.path.join(os.path.dirname(__file__), '..')
API = 'https://ssd.jpl.nasa.gov/api/horizons.api'
SITES = ['ptB', 'pns', 'dg2', 'nobile2', 'm1', 'im1', 'im2', 'a11', 'a15', 'a17', 'ce4', 'ce6', 'slim']

def ctx():
    ca = os.environ.get('SSL_CERT_FILE') or ('/root/.ccr/ca-bundle.crt' if os.path.exists('/root/.ccr/ca-bundle.crt') else None)
    return ssl.create_default_context(cafile=ca) if ca else ssl.create_default_context()

def query(body, lon, lat, alt_km, start=None, stop=None, step=None, tlist=None):
    p = {'format': 'json', 'COMMAND': f"'{body}'", 'EPHEM_TYPE': 'OBSERVER', 'CENTER': "'coord@301'",
         'COORD_TYPE': 'GEODETIC', 'SITE_COORD': f"'{lon:.6f},{lat:.6f},{alt_km:.4f}'", 'QUANTITIES': "'4'",
         'ANG_FORMAT': 'DEG', 'APPARENT': 'AIRLESS', 'CSV_FORMAT': 'YES', 'TIME_DIGITS': 'MINUTES'}
    if tlist:
        p.update({'TLIST': ' '.join(f"'{t}'" for t in tlist), 'TLIST_TYPE': 'JD'})
    else:
        p.update({'START_TIME': f"'{start}'", 'STOP_TIME': f"'{stop}'", 'STEP_SIZE': f"'{step}'"})
    url = API + '?' + urllib.parse.urlencode(p)
    for attempt in range(3):
        try:
            res = json.loads(urllib.request.urlopen(url, context=ctx(), timeout=90).read().decode())['result']
            break
        except Exception as e:
            if attempt == 2: raise
            time.sleep(3)
    a, b = res.find('$$SOE'), res.find('$$EOE')
    if a < 0: raise RuntimeError(res[:800])
    rows = []
    for line in res[a + 5:b].strip().splitlines():
        c = [x.strip() for x in line.split(',')]
        rows.append({'t': c[0], 'az': float(c[3]), 'el': float(c[4])})
    return rows

MON = {m: i + 1 for i, m in enumerate(['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'])}
def iso(t):  # '2027-Jan-01 00:00' -> ISO
    d, hm = t.split()
    y, m, dd = d.split('-')
    hms = (hm.split('.')[0] + ':00:00')[:8] if hm.count(':') < 2 else hm.split('.')[0]
    return f'{y}-{MON[m]:02d}-{dd}T{hms}Z'

def jd(isoz):
    from datetime import datetime, timezone
    dt = datetime.strptime(isoz, '%Y-%m-%dT%H:%M:%SZ').replace(tzinfo=timezone.utc)
    return dt.timestamp() / 86400 + 2440587.5

def main():
    sites = {s['id']: s for s in json.load(open(os.path.join(ROOT, 'data/sites.json')))}
    hz = json.load(open(os.path.join(ROOT, 'data/horizons.json')))
    out = []
    for sid in SITES:
        s = sites[sid]; h = hz.get(sid, {})
        lat, lon = h.get('snapped', [s['lat'], s['lon']])
        alt = (h.get('elev_m', 0) + h.get('mast_m', 2)) / 1000
        for body in ('10', '399'):
            rows = query(body, lon, lat, alt, '2026-11-14 00:00', '2028-11-14 00:00', '23d')
            if s.get('landed'):
                rows += query(body, lon, lat, alt, tlist=[f"{jd(s['landed'].replace('Z', '').split('.')[0][:19] + 'Z' if len(s['landed']) > 17 else s['landed']):.6f}"])
            for r in rows:
                out.append({'site': sid, 'lat': lat, 'lon': lon, 'alt_km': alt, 'body': 'sun' if body == '10' else 'earth',
                            't': iso(r['t']), 'az': r['az'], 'el': r['el']})
        print(sid, 'ok', file=sys.stderr)
    json.dump({'source': 'JPL Horizons API (ssd.jpl.nasa.gov), observer coord@301, airless, apparent az/el',
               'fetched': time.strftime('%Y-%m-%d'), 'rows': out}, open(os.path.join(ROOT, 'tests/horizons_reference.json'), 'w'))
    print(len(out), 'rows', file=sys.stderr)

if __name__ == '__main__':
    main()
