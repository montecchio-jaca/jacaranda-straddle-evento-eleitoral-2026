#!/usr/bin/env python3
import json
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "quotes.json"
TICKERS = {
    "BBAS3": "BBAS3.SA",
    "B3SA3": "B3SA3.SA",
    "PETR4": "PETR4.SA",
    "CEAB3": "CEAB3.SA",
}

HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; JacarandaQuotes/1.0)",
    "Accept": "application/json,text/plain,*/*",
}

def http_json(url, timeout=15):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))

def yahoo_quote(symbol, yahoo):
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
        for i in range(len(closes) - 1, -1, -1):
            v = closes[i]
            if isinstance(v, (int, float)) and v > 0:
                price = v
                stamp = stamps[i] if i < len(stamps) else stamp
                break
    if not isinstance(price, (int, float)) or price <= 0:
        raise RuntimeError("Yahoo sem preço válido")

    return {
        "symbol": symbol,
        "provider": "Yahoo Finance",
        "provider_symbol": yahoo,
        "price": round(float(price), 4),
        "currency": meta.get("currency") or "BRL",
        "market_time_utc": datetime.fromtimestamp(int(stamp), timezone.utc).isoformat().replace("+00:00", "Z") if stamp else None,
        "previous_close": meta.get("chartPreviousClose") or meta.get("previousClose"),
        "market_state": meta.get("marketState"),
    }

def brapi_petr4():
    payload = http_json("https://brapi.dev/api/v2/stocks/quote?symbols=PETR4")
    item = ((payload.get("results") or [None])[0]) or {}
    data = item.get("data") or {}
    price = data.get("regularMarketPrice")
    if not isinstance(price, (int, float)) or price <= 0:
        raise RuntimeError("brapi sem preço válido")
    return {
        "symbol": "PETR4",
        "provider": "brapi.dev",
        "provider_symbol": "PETR4",
        "price": round(float(price), 4),
        "currency": data.get("currency") or "BRL",
        "market_time_utc": data.get("regularMarketTime"),
        "previous_close": data.get("regularMarketPreviousClose"),
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
    previous = load_previous()
    old_quotes = previous.get("quotes") or {}
    quotes = {}
    errors = {}

    for symbol, yahoo in TICKERS.items():
        try:
            quotes[symbol] = yahoo_quote(symbol, yahoo)
        except Exception as exc:
            if symbol == "PETR4":
                try:
                    quotes[symbol] = brapi_petr4()
                    continue
                except Exception as exc2:
                    errors[symbol] = f"Yahoo: {exc}; brapi: {exc2}"
            else:
                errors[symbol] = str(exc)

            if symbol in old_quotes:
                quotes[symbol] = old_quotes[symbol]

    # Não gera commit apenas por horário de coleta: só escreve se a cotação material mudou.
    if quotes == old_quotes and OUT.exists():
        print("Sem alteração material nas cotações.")
        return 0

    OUT.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "generated_at_utc": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "source_note": "Snapshot indicativo. Yahoo Finance consultado server-side pelo GitHub Actions; PETR4 pode usar brapi.dev como fallback.",
        "quotes": quotes,
        "errors": errors,
    }
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Atualizado: {', '.join(sorted(quotes))}")
    if errors:
        print("Falhas:", json.dumps(errors, ensure_ascii=False))
    return 0

if __name__ == "__main__":
    sys.exit(main())
