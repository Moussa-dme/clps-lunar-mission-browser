#!/usr/bin/env python3
"""
Minimal Python client for the CLPS Lunar Mission Browser API (standard library only).

    npm start                      # or: docker run -p 8080:8080 clps-browser
    python examples/python_client.py
"""
import json, urllib.parse, urllib.request

API = "http://localhost:8080/api"

def get(route, **params):
    url = f"{API}/{route}?{urllib.parse.urlencode(params)}"
    with urllib.request.urlopen(url) as r:
        return json.load(r)

# 1. Rank four candidate sites for the first quarter of 2027
cmp = get("compare", sites="ptB,pns,dg2,nobile2", start="2027-01-01", days=90)
print("Site                      power+link  longest night")
for row in cmp["sites"]:
    s = row["summary"]
    print(f"{row['site']['name']:26s}{s['power_and_link_pct']:8.1f} %  {s['longest_night_h']:8.0f} h")

# 2. Best 10-day landing windows at the winner
best = cmp["sites"][0]["site"]["id"]
ld = get("landing-dates", site=best, start="2027-01-01", days=90, mission_days=10, count=3)
for b in ld["best"]:
    print(f"touchdown {b['touchdown']}  score {b['score_pct']} %")

# 3. Any point on the map: the API ray-casts the LOLA horizon on request
pt = get("summary", lat=-89.45, lon=-138, snap_m=500, start="2027-01-01", days=90)
print(pt["site"]["name"], pt["site"]["heightM"], "m:", pt["summary"]["sunlit_pct"], "% sunlit")
