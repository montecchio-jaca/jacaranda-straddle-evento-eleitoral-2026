#!/usr/bin/env python3
import json
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "quotes.json"
UNIVERSE = ROOT / "data" / "universe-b3.json"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; JacarandaQuotes/2.0)",
    "Accept": "application/json,text/plain,*/*",
}

FALLBACK = [
    {"symbol":"BBAS3","name":"BBAS3","yahoo":"BBAS3.SA","close":None},
    {"symbol":"B3SA3","name":"B3SA3","yahoo":"B3SA3.SA","close":None},
    {"symbol":"PETR4","name":"PETR4","yahoo":"PETR4.SA","close":51.17},
    {"symbol":"CEAB3","name":"CEAB3","yahoo":"CEAB3.SA","close":10.30},
]

def http_json(url, timeout=12):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))

def load_universe():
    if UNIVERSE.exists():
        try:
            data = json.loads(UNIVERSE.read_text(encoding="utf-8"))
            rows = data.get("assets") or []
            if rows:
                return rows, data.get("generated_at_utc")
        except Exception:
            pass
    return FALLBACK, None

def yahoo_quote(item):
    symbol = item["symbol"]
    yahoo = item.get("yahoo") or symbol + ".SA"
    url = (
        "https://query1.finance.yahoo.com/v8/finance/chart/"
        + urllib.parse.quote(yahoo)
        + "?range=5d&interval=1m&includePrePost=false&events=div%2Csplits"
    )
    payload = http_json(url)
    result = ((payload.get("chart") or {}).get("result") or [None])[0]
    if not result:
        raise RuntimeError("Yahoo sem resultado")
    meta = result.get("meta") or {}
    quote = (((result.get("indicators") or {}).get("quote") or [{}])[0]) or {}
    closes = quote.get("close") or []
    stamps = result.get("timestamp") or []
    price = meta.get("regularMarketPrice")
    stamp = meta.get("regularMarketTime")
    if not isinstance(price, (int, float)) or price <= 0:
        for i in range(len(closes)-1, -1, -1):
            v = closes[i]
            if isinstance(v, (int, float)) and v > 0:
                price = v
                stamp = stamps[i] if i < len(stamps) else stamp
                break
    if not isinstance(price, (int, float)) or price <= 0:
        raise RuntimeError("Yahoo sem preço válido")
    return {
        "symbol": symbol,
        "name": item.get("name") or symbol,
        "provider": "Yahoo Finance",
        "provider_symbol": yahoo,
        "price": round(float(price), 4),
        "currency": meta.get("currency") or "BRL",
        "market_time_utc": datetime.fromtimestamp(int(stamp), timezone.utc).isoformat().replace("+00:00","Z") if stamp else None,
        "previous_close": meta.get("chartPreviousClose") or meta.get("previousClose"),
        "market_state": meta.get("marketState"),
    }

def universe_fallback(item, universe_stamp):
    price = item.get("close")
    if not isinstance(price, (int, float)) or price <= 0:
        return None
    return {
        "symbol": item["symbol"],
        "name": item.get("name") or item["symbol"],
        "provider": "brapi.dev · universo",
        "provider_symbol": item["symbol"],
        "price": round(float(price),4),
        "currency": "BRL",
        "market_time_utc": universe_stamp,
        "previous_close": None,
        "market_state": None,
    }

def load_previous():
    if not OUT.exists():
        return {}
    try:
        return json.loads(OUT.read_text(encoding="utf-8"))
    except Exception:
        return {}

def main():
    items, universe_stamp = load_universe()
    previous = load_previous()
    old_quotes = previous.get("quotes") or {}
    quotes = {}
    errors = {}

    workers = min(20, max(4, len(items)//12))
    with ThreadPoolExecutor(max_workers=workers) as pool:
        future_map = {pool.submit(yahoo_quote, item): item for item in items}
        for future in as_completed(future_map):
            item = future_map[future]
            symbol = item["symbol"]
            try:
                quotes[symbol] = future.result()
            except Exception as exc:
                fb = universe_fallback(item, universe_stamp)
                if fb:
                    quotes[symbol] = fb
                    errors[symbol] = "Yahoo indisponível; usando snapshot do universo: " + str(exc)
                elif symbol in old_quotes:
                    quotes[symbol] = old_quotes[symbol]
                    errors[symbol] = "Yahoo indisponível; mantendo snapshot anterior: " + str(exc)
                else:
                    errors[symbol] = str(exc)

    quotes = {k:quotes[k] for k in sorted(quotes)}
    if quotes == old_quotes and OUT.exists():
        print(f"Sem alteração material nas cotações ({len(quotes)} ativos).")
        return 0

    payload = {
        "generated_at_utc": datetime.now(timezone.utc).isoformat().replace("+00:00","Z"),
        "source_note": "Snapshot indicativo. Yahoo Finance é a fonte primária server-side; o snapshot diário do universo é fallback.",
        "universe_count": len(items),
        "quotes": quotes,
        "errors": errors,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
    print(f"Snapshot atualizado: {len(quotes)}/{len(items)} ativos.")
    print(f"Falhas/fallbacks: {len(errors)}")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
