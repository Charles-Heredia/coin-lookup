import json, re, urllib.request, datetime, sys
UA = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124 Safari/537.36"}
def get(u):
    return urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=30).read().decode("utf-8", "replace")
def kitco():
    t = get("https://www.kitco.com/charts/silver"); out = {}; ts = None
    for m in re.finditer(r'"GetMetalQuoteV3":\{[^{}\[]*"symbol":"(AG|AU)"[^\[]*\[\{[^}]*?"bid":([0-9.]+)[^}]*?"originalTime":"([^"]+)"', t):
        out.setdefault(m.group(1), float(m.group(2))); ts = ts or m.group(3)
    if "AG" not in out or "AU" not in out: raise Exception("kitco parse failed")
    age = (datetime.datetime.now(datetime.timezone.utc) - datetime.datetime.fromisoformat(ts.replace("Z", "+00:00"))).total_seconds()
    if age > 3600: raise Exception("kitco quote stale (%d min)" % (age // 60))
    return out["AU"], out["AG"], "Kitco bid (kitco.com/charts/silver)", ts
def goldapi():
    a = json.loads(get("https://api.gold-api.com/price/XAG")); u = json.loads(get("https://api.gold-api.com/price/XAU"))
    return float(u["price"]), float(a["price"]), "gold-api.com (fallback; Kitco fetch failed)", a.get("updatedAt")
for f in (kitco, goldapi):
    try:
        g, s, src, ts = f()
        if 500 < g < 20000 and 5 < s < 500: break
    except Exception as e: print(f.__name__, e, file=sys.stderr)
else: sys.exit("no source")
ts = ts or datetime.datetime.now(datetime.timezone.utc).isoformat()
new = {"gold": round(g, 2), "silver": round(s, 3), "source": src, "updatedAt": ts}
try: old = json.load(open("prices.json"))
except Exception: old = None
if old != new: json.dump(new, open("prices.json", "w")); print("updated", new)
else: print("unchanged")
