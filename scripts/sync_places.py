#!/usr/bin/env python3
"""Rebuild places.json from poojithmalla8/travel-database.

- Source of truth: <src>/travel-db.json (array of places).
- Place id on the site = slug of `name` (localStorage + Supabase travel_status.place_id),
  so names are kept exactly as given; existing coordinates are reused for known names.
- Places without lat/lng are geocoded with Nominatim (1 req/s, custom User-Agent);
  results are cached in scripts/geocode_cache.json. Ungeocodable places are skipped and logged.
- Output is written only if content changed.
"""
import json, os, re, sys, time, urllib.parse, urllib.request
src = sys.argv[1] if len(sys.argv) > 1 else '/tmp/source'
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'places.json'); CACHE = os.path.join(ROOT, 'scripts', 'geocode_cache.json')
UA = 'travel-map-sync/1.0 (https://github.com/mad08011999-cloud/travel-map)'
slug = lambda n: re.sub(r'^-|-$', '', re.sub(r'[^a-z0-9]+', '-', n.lower()))
def load(p, d):
    try: return json.load(open(p))
    except Exception: return d
data = json.load(open(os.path.join(src, 'travel-db.json')))
old = {slug(p['name']): p for p in load(OUT, [])}
cache = load(CACHE, {})
last = 0.0
def geocode(p):
    global last
    q = ', '.join(x for x in [p.get('name'), p.get('city'), p.get('region'), p.get('country')] if x)
    if q in cache: return cache[q]
    wait = 1.1 - (time.time() - last)
    if wait > 0: time.sleep(wait)
    url = 'https://nominatim.openstreetmap.org/search?' + urllib.parse.urlencode({'q': q, 'format': 'json', 'limit': 1})
    try:
        r = json.load(urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA}), timeout=30))
        res = [float(r[0]['lat']), float(r[0]['lon'])] if r else None
    except Exception as e:
        print('geocode error', q, e); res = None
    last = time.time(); cache[q] = res; return res
out, skipped, seen = [], [], set()
for p in data:
    if not p.get('name'): continue
    sid = slug(p['name'])
    if sid in seen: print('duplicate name skipped:', p['name']); continue
    seen.add(sid); p = dict(p)
    p.setdefault('category', 'california'); p.setdefault('urls', []); p.setdefault('mentions', 1)
    if p.get('lat') is None or p.get('lng') is None:
        o = old.get(sid)
        ll = [o['lat'], o['lng']] if o and o.get('lat') is not None else geocode(p)
        if not ll: skipped.append(p['name']); continue
        p['lat'], p['lng'] = round(ll[0], 5), round(ll[1], 5)
    out.append(p)
out.sort(key=lambda p: (-p['mentions'], p['name']))
removed = sorted(set(old) - seen)
print(f'{len(out)} places ({len(set(seen)-set(old))} new, {len(removed)} removed, {len(skipped)} not geocoded)')
if removed: print('removed:', ', '.join(old[r]['name'] for r in removed))
if skipped: print('not geocoded:', ', '.join(skipped))
txt = json.dumps(out, ensure_ascii=False, separators=(',', ':'))
if not os.path.exists(OUT) or open(OUT).read() != txt:
    open(OUT, 'w').write(txt); print('places.json updated')
else: print('no change')
if cache: json.dump(cache, open(CACHE, 'w'), ensure_ascii=False, indent=0, sort_keys=True)
