from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import yfinance as yf
import pandas as pd
from datetime import datetime
from functools import lru_cache
import time
import asyncio
from concurrent.futures import ThreadPoolExecutor

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

CORRELATION_ASSETS = {
    "黄金": "GC=F",
    "白银": "SI=F",
    "原油(WTI)": "CL=F",
    "原油(Brent)": "BZ=F",
    "天然气": "NG=F",
    "铜": "HG=F",
    "小麦": "ZW=F",
    "大豆": "ZS=F",
    "VIX恐慌指数": "^VIX",
    "纳斯达克": "^IXIC",
    "道琼斯": "^DJI",
    "日经225": "^N225",
    "恒生指数": "^HSI",
    "DAX(德国)": "^GDAXI",
    "美元指数": "DX-Y.NYB",
    "10年美债收益率": "^TNX",
    "比特币": "BTC-USD",
}

_corr_cache: dict = {"data": None, "ts": 0}

@app.get("/api/v1/correlation")
def get_correlation(period: str = "1y"):
    global _corr_cache
    # Cache for 1 hour
    if _corr_cache["data"] and time.time() - _corr_cache["ts"] < 3600:
        return _corr_cache["data"]

    raw = {}
    spx = yf.download("^GSPC", period=period, progress=False)["Close"].squeeze()
    raw["S&P500"] = spx

    for name, sym in CORRELATION_ASSETS.items():
        try:
            s = yf.download(sym, period=period, progress=False)["Close"].squeeze()
            if len(s) > 50:
                raw[name] = s
        except:
            pass

    df = pd.DataFrame(raw).pct_change().dropna(how="all")
    spx_ret = df["S&P500"].dropna()

    results = []
    for col in df.columns:
        if col == "S&P500":
            continue
        common = df[[col, "S&P500"]].dropna()
        if len(common) > 50:
            corr = round(float(common[col].corr(common["S&P500"])), 3)
            if corr > 0.5:
                strength = "强正相关"
            elif corr > 0.2:
                strength = "中度正相关"
            elif corr > 0:
                strength = "弱正相关"
            elif corr > -0.2:
                strength = "弱负相关"
            elif corr > -0.5:
                strength = "中度负相关"
            else:
                strength = "强负相关"

            results.append({
                "name": col,
                "symbol": CORRELATION_ASSETS.get(col, ""),
                "correlation": corr,
                "strength": strength,
                "insight": _get_insight(col, corr),
            })

    results.sort(key=lambda x: x["correlation"], reverse=True)
    result = {"data": results, "base": "S&P500", "period": period, "updated_at": datetime.utcnow().isoformat()}
    _corr_cache = {"data": result, "ts": time.time()}
    return result

def _get_insight(name: str, corr: float) -> str:
    insights = {
        "VIX恐慌指数": "VIX飙升时美股下跌，可作为市场崩盘预警信号",
        "铜": "铜价上涨通常预示经济扩张，美股随之上涨",
        "纳斯达克": "与美股高度联动，科技股情绪风向标",
        "道琼斯": "与S&P500几乎同步，反映蓝筹股走势",
        "比特币": "风险资产，美股上涨时往往同步，恐慌时双杀",
        "美元指数": "美元走强时外资回流，对美股有复杂影响",
        "10年美债收益率": "收益率上升可能压制估值，影响科技股",
        "黄金": "避险资产，与美股关联弱，危机时往往反向",
        "原油(WTI)": "能源价格影响通胀预期，间接影响美股",
        "日经225": "与美股相关性低，受日元影响更大",
    }
    return insights.get(name, f"相关系数{corr:+.3f}，{'同向波动' if corr > 0 else '反向波动'}")

@app.get("/api/v1/multiline")
def get_multiline(period: str = "1y"):
    assets = {"S&P500": "^GSPC", **CORRELATION_ASSETS}
    result = {}
    for name, sym in assets.items():
        try:
            s = yf.download(sym, period=period, interval="1d", progress=False)["Close"].squeeze()
            s = s.dropna()
            if len(s) > 10:
                base = float(s.iloc[0])
                result[name] = [
                    {"time": int(ts.timestamp()), "value": round((float(v) / base - 1) * 100, 2)}
                    for ts, v in s.items()
                ]
        except:
            pass
    return {"data": result, "period": period}

@app.get("/")
def root():
    return {"status": "ok", "docs": "/docs"}
