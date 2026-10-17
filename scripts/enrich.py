#!/usr/bin/env python3
"""Attach Wikipedia/Wikidata/Commons info to places.json (keyless public APIs).

Match rules (never guess): a Wikipedia article is accepted only if
  (a) its title closely matches the place name (normalized similarity >= 0.82, or one contains the other), and
  (b) the article's coordinates are within MAX_KM of the place (40 km; 80 km for parks/regions/cities), or
      the article has no coords but Wikidata coords are within that range.
Candidates: the exact-title summary, then Wikipedia geosearch (10 km) around the place.
Results cached in scripts/enrich_cache.json keyed by place slug; {"none": true} marks a checked miss.
"""
import json, math, os, re, sys, time, unicodedata, urllib.parse, urllib.request
from difflib import SequenceMatcher
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PL = os.path.join(ROOT, 'places.json'); CACHE = os.path.join(ROOT, 'scripts', 'enrich_cache.json')
UA = 'travel-map-enrich/1.0 (https://github.com/mad08011999-cloud/travel-map; static site build)'
slug = lambda n: re.sub(r'^-|-$', '', re.sub(r'[^a-z0-9]+', '-', n.lower()))
def get(url, tries=3):
    for k in range(tries):
        try:
            time.sleep(0.25)
            return json.load(urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA, 'Accept': 'application/json'}), timeout=30))
        except urllib.error.HTTPError as e:
            if e.code == 404: return None
            if e.code == 429: time.sleep(5 * (k + 1)); continue
            time.sleep(2)
        except Exception: time.sleep(2)
    raise RuntimeError('fetch failed ' + url)
def norm(s):
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode().lower().replace('&', ' and ')
    s = re.sub(r'\(.*?\)', ' ', s).split(',')[0]
    s = re.sub(r'\bmt\b\.?', 'mount', s); s = re.sub(r'\bst\b\.?', 'saint', s)
    return ' '.join(w for w in re.sub(r'[^a-z0-9]+', ' ', s).split() if w != 'the')
GENERIC = set('park state national museum historic historical site beach trail falls island preserve area recreation regional county city monument memorial garden gardens center'.split())
import threading
_tl = threading.local()
def sim(a, b):
    CTX = getattr(_tl, 'ctx', set())
    a, b = norm(a), norm(b)
    if not a or not b: return 0
    if a == b: return 1
    ta, tb = set(a.split()), set(b.split())
    small, big = (ta, tb) if len(ta) <= len(tb) else (tb, ta)
    if small <= big and len(small) >= 1 and (big - small) <= (GENERIC | CTX) and len(''.join(small)) >= 4: return 0.9
    return SequenceMatcher(None, a, b).ratio() if not (ta ^ tb) - GENERIC - CTX or SequenceMatcher(None, a, b).ratio() >= 0.9 else 0
def km(a, b, c, d):
    r = math.pi / 180; x = math.sin((c - a) * r / 2) ** 2 + math.cos(a * r) * math.cos(c * r) * math.sin((d - b) * r / 2) ** 2
    return 12742 * math.asin(math.sqrt(x))
WIDE = re.compile(r'park|forest|national|wilderness|island|county|city|town|village|valley|coast|canyon|range|mountains|desert|lake|bay|region|monument|seashore|recreation', re.I)
def summary(title):
    return get('https://en.wikipedia.org/api/rest_v1/page/summary/' + urllib.parse.quote(title.replace(' ', '_'), safe=''))
def wikidata(qid):
    d = get(f'https://www.wikidata.org/wiki/Special:EntityData/{qid}.json')
    e = (d or {}).get('entities', {}).get(qid, {}); cl = e.get('claims', {})
    val = lambda p: [c['mainsnak'].get('datavalue', {}).get('value') for c in cl.get(p, []) if c['mainsnak'].get('datavalue')]
    out = {}
    w = [v for v in val('P856') if isinstance(v, str)]
    if w: out['website'] = w[0]
    co = val('P625')
    if co: out['coord'] = [co[0]['latitude'], co[0]['longitude']]
    return out
def commons_credit(file_url):
    m = re.search(r'/commons/(?:thumb/)?[0-9a-f]/[0-9a-f]{2}/([^/?#]+)', file_url or '')
    if not m: return None
    fn = urllib.parse.unquote(m.group(1))
    d = get('https://commons.wikimedia.org/w/api.php?' + urllib.parse.urlencode({'action': 'query', 'titles': 'File:' + fn, 'prop': 'imageinfo', 'iiprop': 'extmetadata', 'format': 'json'}))
    pages = (d or {}).get('query', {}).get('pages', {})
    for p in pages.values():
        md = (p.get('imageinfo') or [{}])[0].get('extmetadata', {})
        strip = lambda s: re.sub(r'<[^>]+>', '', s or '').strip()
        return {'artist': strip(md.get('Artist', {}).get('value'))[:120] or 'Unknown', 'license': strip(md.get('LicenseShortName', {}).get('value')) or '',
                'file': 'https://commons.wikimedia.org/wiki/' + urllib.parse.quote('File:' + fn.replace(' ', '_'))}
    return None
SETTLEMENT = re.compile(r'census-designated|unincorporated community|neighbou?rhood|^(city|town|village) in|^creek|creek in', re.I)
FEATURE = re.compile(r'\b(park|parks|beach|preserve|trail|lakes|national|monument)\b', re.I)
def type_mismatch(name, title, desc):
    # e.g. "Denali National Park" must not resolve to the "Denali Park" CDP, "Capitola Beach" not to the city of Capitola;
    # but "Cannon Beach" -> "Cannon Beach, Oregon" is the same place.
    base = norm(title)
    return bool(FEATURE.search(name) and SETTLEMENT.search(desc or '') and base != norm(name))
def accept(p, s):
    if not s or s.get('type') == 'disambiguation': return False
    if type_mismatch(p['name'], s.get('title', ''), s.get('description')): return False
    t = s.get('title', '')
    if sim(p['name'], t) < 0.82 and sim(p['name'], s.get('displaytitle', t)) < 0.82: return False
    c = s.get('coordinates')
    lim = 80 if WIDE.search(p['name'] + ' ' + (s.get('description') or '')) else 40
    if c: return km(p['lat'], p['lng'], c['lat'], c['lon']) <= lim
    return None  # undecided: needs wikidata coords
def match(p):
    _tl.ctx = set(norm(' '.join(x for x in [p.get('city'), p.get('region'), p.get('country')] if x)).split())
    cands = [p['name']]
    g = get('https://en.wikipedia.org/w/api.php?' + urllib.parse.urlencode({'action': 'query', 'list': 'geosearch', 'gscoord': f"{p['lat']}|{p['lng']}", 'gsradius': 10000, 'gslimit': 30, 'format': 'json'}))
    geo = sorted(((sim(p['name'], x['title']), x['title']) for x in (g or {}).get('query', {}).get('geosearch', [])), reverse=True)
    cands += [t for sc, t in geo if sc >= 0.82]
    q = get('https://en.wikipedia.org/w/api.php?' + urllib.parse.urlencode({'action': 'query', 'list': 'search', 'srsearch': f"{p['name']} {p.get('city') or ''} {p.get('region') or ''}", 'srlimit': 5, 'format': 'json'}))
    cands += [x['title'] for x in (q or {}).get('query', {}).get('search', []) if sim(p['name'], x['title']) >= 0.82]
    for t in dict.fromkeys(cands):
        s = summary(t)
        ok = accept(p, s)
        wd = wikidata(s['wikibase_item']) if s and ok is not False and s.get('wikibase_item') else {}
        if ok is None:
            co = wd.get('coord'); lim = 80 if WIDE.search(p['name']) else 40
            ok = bool(co) and km(p['lat'], p['lng'], co[0], co[1]) <= lim
        if ok:
            img = (s.get('originalimage') or {}).get('source'); th = (s.get('thumbnail') or {}).get('source')
            r = {'title': s['title'], 'url': s.get('content_urls', {}).get('desktop', {}).get('page'), 'extract': s.get('extract', ''),
                 'description': s.get('description', ''), 'qid': s.get('wikibase_item')}
            if wd.get('website'): r['website'] = wd['website']
            if th or img:
                r['thumb'] = th; r['image'] = img
                cr = commons_credit(img or th)
                if cr: r['credit'] = cr
            return r
    return {'none': True}
def main():
    places = json.load(open(PL))
    cache = json.load(open(CACHE)) if os.path.exists(CACHE) else {}
    todo = [p for p in places if slug(p['name']) not in cache]
    print(f'{len(places)} places, {len(todo)} to enrich', flush=True)
    from concurrent.futures import ThreadPoolExecutor
    def work(p):
        try: return p, match(p)
        except Exception as e: print('skip (will retry next run):', p['name'], e, flush=True); return p, None
    with ThreadPoolExecutor(int(os.environ.get('ENRICH_THREADS', '2'))) as ex:
        for i, (p, r) in enumerate(ex.map(work, todo)):
            if r is None: continue
            cache[slug(p['name'])] = r
            if i % 20 == 0:
                json.dump(cache, open(CACHE, 'w'), ensure_ascii=False, indent=0, sort_keys=True); print(i, p['name'], '->', r.get('title'), flush=True)
    json.dump(cache, open(CACHE, 'w'), ensure_ascii=False, indent=0, sort_keys=True)
    names = {slug(p['name']) for p in places}
    pub = {k: {f: v[f] for f in ('title','url','extract','description','website','thumb','image','credit','none') if f in v} for k, v in cache.items() if k in names}
    txt = json.dumps(pub, ensure_ascii=False, sort_keys=True, separators=(',', ':'))
    out = os.path.join(ROOT, 'wiki.json')
    if not os.path.exists(out) or open(out).read() != txt: open(out, 'w').write(txt)
    n = sum(1 for p in places if cache.get(slug(p['name']), {}).get('title')); im = sum(1 for p in places if cache.get(slug(p['name']), {}).get('thumb'))
    print(f'matched {n}/{len(places)} (with image {im})')
main()
