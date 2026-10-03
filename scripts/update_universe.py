#!/usr/bin/env python3
import json
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "universe-b3.json"
BASE = "https://brapi.dev/api/quote/list"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; JacarandaUniverse/1.0)",
    "Accept": "application/json,text/plain,*/*",
}

def http_json(url, timeout=25):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))

def load_all():
    assets = []
    page = 1
    while True:
        qs = urllib.parse.urlencode({
            "type": "stock",
            "page": page,
            "limit": 100,
            "sortBy": "name",
            "sortOrder": "asc",
        })
        payload = http_json(BASE + "?" + qs)
        rows = payload.get("stocks") or []
        for row in rows:
            symbol = (row.get("stock") or "").strip().upper()
            subtype = (row.get("subType") or "").strip().lower()
            typ = (row.get("type") or "").strip().lower()
            if not symbol or typ != "stock":
                continue
            if subtype not in ("stock", "unit", ""):
                continue
            assets.append({
                "symbol": symbol,
                "name": row.get("name") or symbol,
                "sector": row.get("sector"),
                "type": typ,
                "subType": subtype or "stock",
                "close": row.get("close"),
                "change": row.get("change"),
                "volume": row.get("volume"),
                "market_cap": row.get("market_cap") or row.get("market_cap_basic"),
                "yahoo": symbol + ".SA",
            })
        has_next = bool(payload.get("hasNextPage"))
        total_pages = payload.get("totalPages")
        if not has_next and not (isinstance(total_pages, int) and page < total_pages):
            break
        page += 1
        if page > 20:
            break
    dedup = {}
    for a in assets:
        dedup[a["symbol"]] = a
    return [dedup[k] for k in sorted(dedup)]

def main():
    assets = load_all()
    if len(assets) < 100:
        raise RuntimeError(f"Universo inesperadamente pequeno: {len(assets)} ativos")
    payload = {
        "generated_at_utc": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "source": "brapi.dev /api/quote/list?type=stock",
        "scope": "Ações e units classificadas como stock; fundos e BDRs excluídos.",
        "count": len(assets),
        "assets": assets,
    }
    text = json.dumps(payload, ensure_ascii=False, indent=2) + "\n"
    if OUT.exists():
        try:
            old = json.loads(OUT.read_text(encoding="utf-8"))
            old_cmp = dict(old)
            new_cmp = dict(payload)
            old_cmp.pop("generated_at_utc", None)
            new_cmp.pop("generated_at_utc", None)
            if old_cmp == new_cmp:
                print(f"Universo sem mudança material ({len(assets)} ativos).")
                return 0
        except Exception:
            pass
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(text, encoding="utf-8")
    print(f"Universo atualizado: {len(assets)} ativos.")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
