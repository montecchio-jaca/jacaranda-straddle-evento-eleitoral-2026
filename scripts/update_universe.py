#!/usr/bin/env python3
"""Universo de ações, units, ETFs e FIIs; falhas da fonte não apagam famílias já publicadas."""
import json
import re
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "universe-b3.json"
BASE = "https://brapi.dev/api/quote/list"
HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; JacarandaUniverse/2.0)", "Accept": "application/json"}

# Não classificamos ativos pelo sufixo 11. O subType oficial diferencia units, ETFs e FIIs.
CATEGORIES = (("stock", "stock"), ("fund", "etf"), ("fund", "fii"))
PINNED = {
    "BOVA11": {"symbol": "BOVA11", "name": "iShares Ibovespa Fundo de Índice", "type": "fund", "subType": "etf",
               "sector": None, "close": None, "change": None, "volume": None, "market_cap": None, "yahoo": "BOVA11.SA"}
}

def http_json(url, timeout=25):
    with urllib.request.urlopen(urllib.request.Request(url, headers=HEADERS), timeout=timeout) as resp:
        return json.load(resp)

def classify(row):
    symbol = (row.get("stock") or "").strip().upper()
    typ = (row.get("type") or "").strip().lower()
    subtype = (row.get("subType") or "").strip().lower()
    if not re.fullmatch(r"[A-Z]{4,6}\d{1,2}", symbol):
        return None
    if typ == "stock":
        if subtype not in ("stock", "unit", ""):
            return None
        if not re.fullmatch(r"[A-Z]{4}(3|4|5|6|7|8|11)", symbol):
            return None
        subtype = subtype or ("unit" if symbol.endswith("11") else "stock")
    elif typ == "fund" and subtype in ("etf", "fii"):
        if not re.fullmatch(r"[A-Z]{4,6}11", symbol):
            return None
    else:
        return None
    return {
        "symbol": symbol, "name": row.get("name") or symbol,
        "sector": row.get("sector"), "type": typ, "subType": subtype,
        "close": row.get("close"), "change": row.get("change"),
        "volume": row.get("volume"), "market_cap": row.get("market_cap") or row.get("market_cap_basic"),
        "yahoo": symbol + ".SA",
    }

def get_pages(typ, subtype):
    result = []
    for page in range(1, 31):
        params = {"type": typ, "page": page, "limit": 100, "sortBy": "name", "sortOrder": "asc"}
        if subtype in ("etf", "fii"):
            params["subType"] = subtype
        data = http_json(BASE + "?" + urllib.parse.urlencode(params))
        for row in data.get("stocks") or []:
            a = classify(row)
            if a and (subtype == "stock" or a["subType"] == subtype):
                result.append(a)
        if not data.get("hasNextPage") and not (isinstance(data.get("totalPages"), int) and page < data["totalPages"]):
            break
    return result

def main():
    previous = {}
    if OUT.exists():
        try:
            previous = json.loads(OUT.read_text(encoding="utf-8"))
        except (ValueError, OSError):
            pass
    old = {a["symbol"]: a for a in previous.get("assets") or [] if a.get("symbol")}
    assets = dict(old)
    failures = []
    for typ, sub in CATEGORIES:
        try:
            discovered = get_pages(typ, sub)
            if not discovered:
                raise RuntimeError("resposta vazia")
            if sub == "stock" and len(discovered) < 100:
                raise RuntimeError("menos de 100 ações")
            for a in discovered:
                assets[a["symbol"]] = a
            print(f"{sub}: {len(discovered)} ativos")
        except Exception as exc:
            failures.append(f"{sub}: {exc}")
            print(f"Preservando universo anterior para {sub}: {exc}")
    for symbol, item in PINNED.items():
        assets.setdefault(symbol, item)
    result = [assets[k] for k in sorted(assets)]
    if len(result) < 100:
        raise RuntimeError("Universo sem massa crítica; publicação bloqueada")
    payload = {
        "generated_at_utc": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "source": "brapi.dev /api/quote/list?type=stock|fund&subType=etf|fii",
        "scope": "Ações/units, ETFs e FIIs da B3; somente cotação spot, sem garantia de séries de opções.",
        "count": len(result),
        "categories": {c: sum(a.get("subType") == c for a in result) for c in ("stock", "unit", "etf", "fii")},
        "assets": result,
    }
    a = dict(payload); b = dict(previous)
    a.pop("generated_at_utc", None); b.pop("generated_at_utc", None)
    if a == b:
        print("Universo sem mudança material.")
        return 0
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
    print(f"Publicado: {len(result)} ativos; falhas da fonte: {len(failures)}")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
