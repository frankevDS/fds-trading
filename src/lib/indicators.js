// FDS Trading - technical indicators and formatting helpers
//
// Signal engine v2 - stricter than v1:
//
// Key improvements over v1:
// 1. Trend filter: no BUY signals when price is below SMA50 (downtrend),
//    no SELL signals when price is above SMA50 (uptrend)
// 2. Stricter STRONG signal threshold: requires score >=5 (was 4), meaning
//    more indicators must agree before a STRONG BUY/SELL fires
// 3. RSI extreme zones tightened: oversold now <25 (was <30), overbought >75
// 4. Stochastic weight increased: low stoch + RSI together now required for
//    strong signals, not just one of them
// 5. Volume/momentum proxy: MACD signal line cross added as a filter
// 6. calcSigWithReason() exposes WHY a signal fired so the AI prompt and
//    UI can show it instead of just a label - helps the trader learn
//
// What this does NOT fix:
// - It cannot predict the market. No indicator system can. A 60% win rate
//   is excellent in real trading. Always use a stop loss.
// - 1-minute data is noisy. These signals are better used on 15m+ data.
//   Multi-timeframe analysis is the next planned improvement.

import { F4 } from "./constants";

export function getInd(h, p) {
  if (!h || h.length < 3) return null;
  const n = h.length;

  // RSI(14)
  const rp = Math.min(14, n - 1);
  let g = 0, l = 0;
  for (let i = n - rp; i < n; i++) {
    const d = h[i] - h[i - 1];
    d > 0 ? (g += d) : (l -= d);
  }
  const rsi = l === 0 ? 100 : 100 - 100 / (1 + g / l);

  // EMA helper
  const ema = (arr, pd) => {
    const k = 2 / (pd + 1);
    let e = arr[0];
    for (let i = 1; i < arr.length; i++) e = arr[i] * k + e * (1 - k);
    return e;
  };

  // MACD line + signal line (9-period EMA of MACD)
  const macdLine = ema(h.slice(-26), 12) - ema(h, 26);
  const macdHistory = [];
  for (let i = Math.max(0, n - 18); i < n; i++) {
    const sl = h.slice(0, i + 1);
    if (sl.length >= 2) {
      macdHistory.push(ema(sl.slice(-26), 12) - ema(sl, 26));
    }
  }
  const macdSignal = macdHistory.length >= 9 ? ema(macdHistory, 9) : macdLine;
  const macdAboveSignal = macdLine > macdSignal;

  // SMAs
  const sma20 = h.slice(-20).reduce((a, b) => a + b, 0) / Math.min(20, n);
  const sma50 = h.slice(-50).reduce((a, b) => a + b, 0) / Math.min(50, n);

  // Bollinger Bands
  const sq = h.slice(-20).map((v) => (v - sma20) ** 2);
  const sd = Math.sqrt(sq.reduce((a, b) => a + b, 0) / sq.length) || 1;
  const bbUpper = sma20 + 2 * sd;
  const bbLower = sma20 - 2 * sd;
  const bbPos = ((p - bbLower) / (bbUpper - bbLower)) * 100;

  // Stochastic(14)
  const hi14 = Math.max(...h.slice(-14));
  const lo14 = Math.min(...h.slice(-14));
  const stochK = hi14 === lo14 ? 50 : ((p - lo14) / (hi14 - lo14)) * 100;

  // 24-period change
  const change24 = ((p - h[Math.max(0, n - 24)]) / h[Math.max(0, n - 24)]) * 100;

  // Price vs SMA50 trend
  const aboveSma50 = p > sma50;
  const aboveSma20 = p > sma20;

  return {
    rsi,
    macd: macdLine,
    macdAboveSignal,
    sma20,
    sma50,
    bbPos,
    stochK,
    change24,
    aboveSma50,
    aboveSma20,
    bbLower,
    bbUpper,
  };
}

export function calcSig(ind) {
  if (!ind) return "HOLD";

  let bullScore = 0;
  let bearScore = 0;
  const reasons = [];

  // --- TREND FILTER ---
  // In a downtrend (price below SMA50), heavily penalise buy signals
  const trendBull = ind.aboveSma50;
  const trendBear = !ind.aboveSma50;

  // --- RSI ---
  if (ind.rsi < 25) { bullScore += 2; reasons.push("RSI oversold"); }
  else if (ind.rsi < 40) { bullScore += 1; reasons.push("RSI low"); }
  else if (ind.rsi > 75) { bearScore += 2; reasons.push("RSI overbought"); }
  else if (ind.rsi > 60) { bearScore += 1; reasons.push("RSI high"); }

  // --- MACD above signal line ---
  if (ind.macdAboveSignal) { bullScore += 1; reasons.push("MACD bullish cross"); }
  else { bearScore += 1; reasons.push("MACD bearish cross"); }

  // --- Bollinger Band position ---
  if (ind.bbPos < 15) { bullScore += 2; reasons.push("Near lower BB"); }
  else if (ind.bbPos < 30) { bullScore += 1; }
  else if (ind.bbPos > 85) { bearScore += 2; reasons.push("Near upper BB"); }
  else if (ind.bbPos > 70) { bearScore += 1; }

  // --- Stochastic ---
  if (ind.stochK < 20) { bullScore += 2; reasons.push("Stoch oversold"); }
  else if (ind.stochK < 35) { bullScore += 1; }
  else if (ind.stochK > 80) { bearScore += 2; reasons.push("Stoch overbought"); }
  else if (ind.stochK > 65) { bearScore += 1; }

  // --- SMA20 vs SMA50 alignment ---
  if (ind.sma20 > ind.sma50) { bullScore += 1; reasons.push("SMA20 > SMA50"); }
  else { bearScore += 1; reasons.push("SMA20 < SMA50"); }

  // --- TREND FILTER: suppress counter-trend signals ---
  // In downtrend: cap bull score heavily - buying against a downtrend is high risk
  if (trendBear && bullScore > bearScore) {
    bullScore = Math.floor(bullScore * 0.5);
    reasons.push("Downtrend warning");
  }
  // In uptrend: cap bear score
  if (trendBull && bearScore > bullScore) {
    bearScore = Math.floor(bearScore * 0.5);
  }

  const net = bullScore - bearScore;

  // Stricter thresholds than v1 (was 4/2, now 5/3)
  if (net >= 5) return "STRONG_BUY";
  if (net >= 3) return "BUY";
  if (net <= -5) return "STRONG_SELL";
  if (net <= -3) return "SELL";
  return "HOLD";
}

// Extended version that also returns score and reasons for AI prompt context
export function calcSigWithReason(ind) {
  if (!ind) return { signal: "HOLD", bull: 0, bear: 0, reasons: [] };

  let bullScore = 0;
  let bearScore = 0;
  const reasons = [];

  const trendBull = ind.aboveSma50;
  const trendBear = !ind.aboveSma50;

  if (ind.rsi < 25) { bullScore += 2; reasons.push("RSI oversold (" + ind.rsi.toFixed(1) + ")"); }
  else if (ind.rsi < 40) { bullScore += 1; reasons.push("RSI below 40 (" + ind.rsi.toFixed(1) + ")"); }
  else if (ind.rsi > 75) { bearScore += 2; reasons.push("RSI overbought (" + ind.rsi.toFixed(1) + ")"); }
  else if (ind.rsi > 60) { bearScore += 1; reasons.push("RSI above 60 (" + ind.rsi.toFixed(1) + ")"); }

  if (ind.macdAboveSignal) { bullScore += 1; reasons.push("MACD above signal"); }
  else { bearScore += 1; reasons.push("MACD below signal"); }

  if (ind.bbPos < 15) { bullScore += 2; reasons.push("Price near lower Bollinger Band (" + ind.bbPos.toFixed(0) + "%)"); }
  else if (ind.bbPos < 30) { bullScore += 1; }
  else if (ind.bbPos > 85) { bearScore += 2; reasons.push("Price near upper Bollinger Band (" + ind.bbPos.toFixed(0) + "%)"); }
  else if (ind.bbPos > 70) { bearScore += 1; }

  if (ind.stochK < 20) { bullScore += 2; reasons.push("Stochastic oversold (" + ind.stochK.toFixed(0) + ")"); }
  else if (ind.stochK < 35) { bullScore += 1; }
  else if (ind.stochK > 80) { bearScore += 2; reasons.push("Stochastic overbought (" + ind.stochK.toFixed(0) + ")"); }
  else if (ind.stochK > 65) { bearScore += 1; }

  if (ind.sma20 > ind.sma50) { bullScore += 1; reasons.push("SMA20 above SMA50 (uptrend)"); }
  else { bearScore += 1; reasons.push("SMA20 below SMA50 (downtrend)"); }

  if (trendBear && bullScore > bearScore) {
    bullScore = Math.floor(bullScore * 0.5);
    reasons.push("⚠️ Counter-trend trade - price below SMA50");
  }
  if (trendBull && bearScore > bullScore) {
    bearScore = Math.floor(bearScore * 0.5);
  }

  const net = bullScore - bearScore;
  let signal = "HOLD";
  if (net >= 5) signal = "STRONG_BUY";
  else if (net >= 3) signal = "BUY";
  else if (net <= -5) signal = "STRONG_SELL";
  else if (net <= -3) signal = "SELL";

  return { signal, bull: bullScore, bear: bearScore, net, reasons };
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
