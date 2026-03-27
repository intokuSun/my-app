from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import yfinance as yf
from datetime import datetime

app = FastAPI(title="Market Dashboard API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

COMMODITIES = {
    "黄金": "GC=F",
    "白银": "SI=F",
    "原油(WTI)": "CL=F",
    "原油(Brent)": "BZ=F",
    "天然气": "NG=F",
    "铜": "HG=F",
    "小麦": "ZW=F",
    "大豆": "ZS=F",
    "玉米": "ZC=F",
}

INDICES = {
    "S&P 500期货": "ES=F",
    "纳斯达克期货": "NQ=F",
    "道琼斯期货": "YM=F",
    "日经225期货": "NK=F",
    "恒生指数": "^HSI",
    "DAX期货": "FDAX=F",
    "富时100期货": "Z=F",
    "沪深300": "000300.SS",
}

def fetch_quote(symbols: dict) -> list:
    results = []
    for name, symbol in symbols.items():
        try:
            ticker = yf.Ticker(symbol)
            info = ticker.fast_info
            price = info.last_price
            prev = info.previous_close
            change = price - prev if price and prev else 0
            change_pct = (change / prev * 100) if prev else 0
            results.append({
                "name": name,
                "symbol": symbol,
                "price": round(price, 2) if price else None,
                "change": round(change, 2),
                "change_pct": round(change_pct, 2),
                "currency": info.currency or "USD",
            })
        except Exception as e:
            results.append({
                "name": name,
                "symbol": symbol,
                "price": None,
                "change": 0,
                "change_pct": 0,
                "currency": "USD",
                "error": str(e),
            })
    return results

@app.get("/api/v1/commodities")
def get_commodities():
    return {
        "data": fetch_quote(COMMODITIES),
        "updated_at": datetime.utcnow().isoformat()
    }

@app.get("/api/v1/indices")
def get_indices():
    return {
        "data": fetch_quote(INDICES),
        "updated_at": datetime.utcnow().isoformat()
    }

@app.get("/api/v1/all")
def get_all():
    return {
        "commodities": fetch_quote(COMMODITIES),
        "indices": fetch_quote(INDICES),
        "updated_at": datetime.utcnow().isoformat()
    }

INTERVAL_MAP = {
    "1d":  ("5d",   "15m"),
    "1w":  ("1mo",  "1h"),
    "1m":  ("3mo",  "1d"),
    "3m":  ("6mo",  "1d"),
    "1y":  ("1y",   "1wk"),
    "5y":  ("5y",   "1mo"),
}

@app.get("/api/v1/kline/{symbol}")
def get_kline(symbol: str, interval: str = "1m"):
    if interval not in INTERVAL_MAP:
        raise HTTPException(400, f"interval must be one of {list(INTERVAL_MAP.keys())}")
    period, yf_interval = INTERVAL_MAP[interval]
    try:
        ticker = yf.Ticker(symbol)
        df = ticker.history(period=period, interval=yf_interval)
        if df.empty:
            raise HTTPException(404, "No data")
        candles = []
        for ts, row in df.iterrows():
            t = int(ts.timestamp())
            candles.append({
                "time": t,
                "open":  round(float(row["Open"]),  4),
                "high":  round(float(row["High"]),  4),
                "low":   round(float(row["Low"]),   4),
                "close": round(float(row["Close"]), 4),
            })
        return {"symbol": symbol, "interval": interval, "data": candles}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))

@app.get("/")
def root():
    return {"status": "ok", "docs": "/docs"}
