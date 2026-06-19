// FDS Trading - technical indicators and formatting helpers
// Pulled out of the original single-file build so both the live Binance feed
// and the simulated stocks/forex engine can share the same math.

import { F4 } from "./constants";

export function getInd(h, p) {
  const n = h.length,
    rp = Math.min(14, n - 1);
  let g = 0,
    l = 0;
  for (let i = n - rp; i < n; i++) {
    const d = h[i] - h[i - 1];
    d > 0 ? (g += d) : (l -= d);
  }
  const rsi = l === 0 ? 100 : 100 - 100 / (1 + g / l);
  const ema = (arr, pd) => {
    const k = 2 / (pd + 1);
    let e = arr[0];
    for (let i = 1; i < arr.length; i++) e = arr[i] * k + e * (1 - k);
    return e;
  };
  const macd = ema(h.slice(-26), 12) - ema(h, 26);
  const sma20 = h.slice(-20).reduce((a, b) => a + b, 0) / Math.min(20, n);
  const sma50 = h.slice(-50).reduce((a, b) => a + b, 0) / Math.min(50, n);
  const sq = h.slice(-20).map((v) => (v - sma20) ** 2);
  const sd = Math.sqrt(sq.reduce((a, b) => a + b, 0) / sq.length);
  const bbPos = ((p - (sma20 - 2 * sd)) / (sma20 + 2 * sd - (sma20 - 2 * sd))) * 100;
  const hi14 = Math.max(...h.slice(-14)),
    lo14 = Math.min(...h.slice(-14));
  const stochK = ((p - lo14) / (hi14 - lo14)) * 100;
  const change24 = ((p - h[Math.max(0, n - 24)]) / h[Math.max(0, n - 24)]) * 100;
  return { rsi, macd, sma20, sma50, bbPos, stochK, change24 };
}

export function calcSig(ind) {
  let s = 0;
  if (ind.rsi < 30) s += 2;
  else if (ind.rsi < 45) s += 1;
  else if (ind.rsi > 70) s -= 2;
  else if (ind.rsi > 55) s -= 1;
  if (ind.macd > 0) s += 1;
  else s -= 1;
  if (ind.bbPos < 20) s += 1;
  else if (ind.bbPos > 80) s -= 1;
  if (ind.stochK < 20) s += 1;
  else if (ind.stochK > 80) s -= 1;
  if (s >= 4) return "STRONG_BUY";
  if (s >= 2) return "BUY";
  if (s <= -4) return "STRONG_SELL";
  if (s <= -2) return "SELL";
  return "HOLD";
}

export function fmtP(price, id) {
  if (!price || isNaN(price)) return "0.00";
  if (F4.includes(id)) return price.toFixed(4);
  if (price > 9999)
    return price.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  if (price > 10) return price.toFixed(2);
  if (price > 1) return price.toFixed(4);
  return price.toFixed(6);
}

export function pfx(market, id) {
  if (market === "FOREX" && !["XAUUSD", "XAGUSD", "USOIL"].includes(id)) return "";
  return "$";
}
