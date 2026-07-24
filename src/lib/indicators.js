// FDS Trading - Technical Indicators v3
//
// Major upgrades over v2:
// 1. Full OHLCV support - ATR, VWAP, OBV now calculated from candle data
// 2. ATR (Average True Range) - volatility-based stop loss calculation
// 3. VWAP (Volume Weighted Average Price) - institutional reference level
// 4. OBV (On Balance Volume) - volume trend leading indicator
// 5. Candlestick pattern recognition - pin bars, engulfing, hammer
// 6. Support/Resistance detection - automatic key level identification
// 7. Enhanced signal scoring - volume confirmation required for STRONG signals
// 8. calcSigWithLevels() - returns ATR-based entry, SL, TP alongside signal

import { F4 } from "./constants";

// ─── Core math helpers ────────────────────────────────────────────────────────

function ema(arr, period) {
  const k = 2 / (period + 1);
  let e = arr[0];
  for (let i = 1; i < arr.length; i++) e = arr[i] * k + e * (1 - k);
  return e;
}

function sma(arr, period) {
  const slice = arr.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

// ─── ATR (Average True Range) ─────────────────────────────────────────────────
// The single most important risk management indicator.
// Tells you how much an instrument typically moves in one period.
// Stop loss = entry ± ATR × multiplier (1.5x for tight, 2x for normal)

export function calcATR(candles, period = 14) {
  if (!candles || candles.length < period + 1) return null;
  const trs = [];
  for (let i = 1; i < candles.length; i++) {
    const c = candles[i];
    const prev = candles[i - 1];
    trs.push(Math.max(
      c.h - c.l,
      Math.abs(c.h - prev.c),
      Math.abs(c.l - prev.c)
    ));
  }
  // Smooth ATR using EMA
  return ema(trs.slice(-period * 2), period);
}

// ─── VWAP (Volume Weighted Average Price) ────────────────────────────────────
// Institutional traders use VWAP as the fair value line.
// Price above VWAP = bullish bias. Price below = bearish bias.
// A BUY signal with price above VWAP is higher quality.

export function calcVWAP(candles) {
  if (!candles || candles.length === 0) return null;
  let cumTPV = 0;
  let cumVol = 0;
  for (const c of candles) {
    const tp = (c.h + c.l + c.c) / 3; // typical price
    cumTPV += tp * (c.v || 0);
    cumVol += c.v || 0;
  }
  return cumVol > 0 ? cumTPV / cumVol : null;
}

// ─── OBV (On Balance Volume) ─────────────────────────────────────────────────
// Leading indicator — volume leads price.
// Rising OBV = accumulation (smart money buying quietly)
// Falling OBV = distribution (smart money selling)

export function calcOBV(candles) {
  if (!candles || candles.length < 2) return { obv: 0, trend: "NEUTRAL" };
  let obv = 0;
  const obvArr = [0];
  for (let i = 1; i < candles.length; i++) {
    if (candles[i].c > candles[i - 1].c) obv += candles[i].v;
    else if (candles[i].c < candles[i - 1].c) obv -= candles[i].v;
    obvArr.push(obv);
  }
  const recent = obvArr.slice(-5);
  const trend = recent[recent.length - 1] > recent[0] ? "RISING" : "FALLING";
  return { obv, trend };
}

// ─── Candlestick patterns ────────────────────────────────────────────────────
// Direct price action patterns - more reliable than oscillators
// because they show actual buyer/seller conviction

export function detectPatterns(candles) {
  if (!candles || candles.length < 3) return [];
  const patterns = [];
  const c = candles[candles.length - 1];
  const p = candles[candles.length - 2];
  const pp = candles[candles.length - 3];
  const body = Math.abs(c.c - c.o);
  const range = c.h - c.l;
  const upperWick = c.h - Math.max(c.c, c.o);
  const lowerWick = Math.min(c.c, c.o) - c.l;

  // Hammer (bullish) - small body, long lower wick, at downtrend low
  if (lowerWick > body * 2 && upperWick < body * 0.5 && range > 0) {
    patterns.push({ name: "HAMMER", bias: "BULL", strength: 2 });
  }

  // Shooting Star (bearish) - small body, long upper wick
  if (upperWick > body * 2 && lowerWick < body * 0.5 && range > 0) {
    patterns.push({ name: "SHOOTING_STAR", bias: "BEAR", strength: 2 });
  }

  // Bullish Engulfing - current green candle engulfs previous red
  if (c.c > c.o && p.c < p.o && c.o < p.c && c.c > p.o) {
    patterns.push({ name: "BULLISH_ENGULFING", bias: "BULL", strength: 3 });
  }

  // Bearish Engulfing
  if (c.c < c.o && p.c > p.o && c.o > p.c && c.c < p.o) {
    patterns.push({ name: "BEARISH_ENGULFING", bias: "BEAR", strength: 3 });
  }

  // Doji - indecision (body < 10% of range)
  if (body < range * 0.1 && range > 0) {
    patterns.push({ name: "DOJI", bias: "NEUTRAL", strength: 1 });
  }

  // Morning Star (3-candle bullish reversal)
  if (pp.c < pp.o && Math.abs(p.c - p.o) < (p.h - p.l) * 0.3 && c.c > c.o && c.c > (pp.o + pp.c) / 2) {
    patterns.push({ name: "MORNING_STAR", bias: "BULL", strength: 4 });
  }

  // Evening Star (3-candle bearish reversal)
  if (pp.c > pp.o && Math.abs(p.c - p.o) < (p.h - p.l) * 0.3 && c.c < c.o && c.c < (pp.o + pp.c) / 2) {
    patterns.push({ name: "EVENING_STAR", bias: "BEAR", strength: 4 });
  }

  return patterns;
}

// ─── Support / Resistance auto-detection ─────────────────────────────────────
// Finds the 3 most significant price levels from recent candle data.
// Signals near S/R levels are much higher probability.

export function findSRLevels(candles, count = 3) {
  if (!candles || candles.length < 20) return { support: [], resistance: [] };
  const highs = candles.map((c) => c.h);
  const lows = candles.map((c) => c.l);
  const currentPrice = candles[candles.length - 1].c;

  // Find pivot highs (local maxima)
  const pivotHighs = [];
  for (let i = 2; i < highs.length - 2; i++) {
    if (highs[i] > highs[i - 1] && highs[i] > highs[i - 2] &&
        highs[i] > highs[i + 1] && highs[i] > highs[i + 2]) {
      pivotHighs.push(highs[i]);
    }
  }

  // Find pivot lows (local minima)
  const pivotLows = [];
  for (let i = 2; i < lows.length - 2; i++) {
    if (lows[i] < lows[i - 1] && lows[i] < lows[i - 2] &&
        lows[i] < lows[i + 1] && lows[i] < lows[i + 2]) {
      pivotLows.push(lows[i]);
    }
  }

  const resistance = pivotHighs
    .filter((h) => h > currentPrice)
    .sort((a, b) => a - b)
    .slice(0, count);

  const support = pivotLows
    .filter((l) => l < currentPrice)
    .sort((a, b) => b - a)
    .slice(0, count);

  return { support, resistance };
}

// ─── Core indicator suite (close-price based, for simulated data) ─────────────

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

  // MACD + signal line
  const macdLine = ema(h.slice(-26), 12) - ema(h, 26);
  const macdHistory = [];
  for (let i = Math.max(0, n - 18); i < n; i++) {
    const sl = h.slice(0, i + 1);
    if (sl.length >= 2) macdHistory.push(ema(sl.slice(-26), 12) - ema(sl, 26));
  }
  const macdSignalLine = macdHistory.length >= 9 ? ema(macdHistory, 9) : macdLine;
  const macdAboveSignal = macdLine > macdSignalLine;

  // SMAs
  const sma20 = sma(h, 20);
  const sma50 = sma(h, 50);

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

  // 24h change
  const change24 = ((p - h[Math.max(0, n - 24)]) / h[Math.max(0, n - 24)]) * 100;

  // Trend flags
  const aboveSma50 = p > sma50;
  const aboveSma20 = p > sma20;

  return { rsi, macd: macdLine, macdAboveSignal, sma20, sma50, bbPos, stochK, change24, aboveSma50, aboveSma20, bbLower, bbUpper };
}

// ─── Full OHLCV indicator suite ───────────────────────────────────────────────
// Used when real candle data is available (crypto via Binance)

export function getIndFromCandles(candles) {
  if (!candles || candles.length < 20) return null;
  const closes = candles.map((c) => c.c);
  const highs = candles.map((c) => c.h);
  const lows = candles.map((c) => c.l);
  const currentPrice = closes[closes.length - 1];

  const base = getInd(closes, currentPrice);
  if (!base) return null;

  const atr = calcATR(candles);
  const vwap = calcVWAP(candles);
  const { obv, trend: obvTrend } = calcOBV(candles);
  const patterns = detectPatterns(candles);
  const sr = findSRLevels(candles);

  const aboveVwap = vwap ? currentPrice > vwap : null;

  // Average volume for comparison
  const volumes = candles.map((c) => c.v || 0);
  const avgVol = volumes.slice(0, -5).reduce((a, b) => a + b, 0) / Math.max(volumes.length - 5, 1);
  const recentVol = volumes.slice(-5).reduce((a, b) => a + b, 0) / 5;
  const volumeAboveAverage = recentVol > avgVol * 1.2;

  return {
    ...base,
    atr,
    vwap,
    aboveVwap,
    obv,
    obvTrend,
    volumeAboveAverage,
    avgVol,
    recentVol,
    patterns,
    support: sr.support,
    resistance: sr.resistance,
    currentPrice,
  };
}

// ─── Signal calculation with full scoring ─────────────────────────────────────

export function calcSig(ind) {
  if (!ind) return "HOLD";
  return calcSigWithReason(ind).signal;
}

export function calcSigWithReason(ind) {
  if (!ind) return { signal: "HOLD", bull: 0, bear: 0, reasons: [] };

  let bullScore = 0;
  let bearScore = 0;
  const reasons = [];

  const trendBear = !ind.aboveSma50;

  // RSI
  if (ind.rsi < 25) { bullScore += 2; reasons.push(`RSI oversold (${ind.rsi.toFixed(1)})`); }
  else if (ind.rsi < 40) { bullScore += 1; reasons.push(`RSI low (${ind.rsi.toFixed(1)})`); }
  else if (ind.rsi > 75) { bearScore += 2; reasons.push(`RSI overbought (${ind.rsi.toFixed(1)})`); }
  else if (ind.rsi > 60) { bearScore += 1; reasons.push(`RSI high (${ind.rsi.toFixed(1)})`); }

  // MACD
  if (ind.macdAboveSignal) { bullScore += 1; reasons.push("MACD above signal"); }
  else { bearScore += 1; reasons.push("MACD below signal"); }

  // Bollinger Bands
  if (ind.bbPos < 15) { bullScore += 2; reasons.push(`Near lower BB (${ind.bbPos.toFixed(0)}%)`); }
  else if (ind.bbPos < 30) { bullScore += 1; }
  else if (ind.bbPos > 85) { bearScore += 2; reasons.push(`Near upper BB (${ind.bbPos.toFixed(0)}%)`); }
  else if (ind.bbPos > 70) { bearScore += 1; }

  // Stochastic
  if (ind.stochK < 20) { bullScore += 2; reasons.push(`Stoch oversold (${ind.stochK.toFixed(0)})`); }
  else if (ind.stochK < 35) { bullScore += 1; }
  else if (ind.stochK > 80) { bearScore += 2; reasons.push(`Stoch overbought (${ind.stochK.toFixed(0)})`); }
  else if (ind.stochK > 65) { bearScore += 1; }

  // SMA alignment
  if (ind.sma20 > ind.sma50) { bullScore += 1; reasons.push("SMA20 > SMA50 (uptrend)"); }
  else { bearScore += 1; reasons.push("SMA20 < SMA50 (downtrend)"); }

  // VWAP (if available from OHLCV data)
  if (ind.aboveVwap === true) { bullScore += 1; reasons.push("Price above VWAP"); }
  else if (ind.aboveVwap === false) { bearScore += 1; reasons.push("Price below VWAP"); }

  // OBV volume trend
  if (ind.obvTrend === "RISING") { bullScore += 1; reasons.push("OBV rising (volume buying)"); }
  else if (ind.obvTrend === "FALLING") { bearScore += 1; reasons.push("OBV falling (volume selling)"); }

  // Candlestick patterns
  if (ind.patterns) {
    for (const p of ind.patterns) {
      if (p.bias === "BULL") { bullScore += p.strength; reasons.push(`${p.name.replace("_", " ")} pattern`); }
      else if (p.bias === "BEAR") { bearScore += p.strength; reasons.push(`${p.name.replace("_", " ")} pattern`); }
    }
  }

  // Volume confirmation: STRONG signals require volume above average
  // This prevents false breakouts on thin/illiquid moves
  const hasVolumeConfirmation = ind.volumeAboveAverage !== false;

  // Counter-trend suppression
  if (trendBear && bullScore > bearScore) {
    bullScore = Math.floor(bullScore * 0.5);
    reasons.push("⚠️ Counter-trend (price below SMA50)");
  }
  if (!trendBear && bearScore > bullScore) {
    bearScore = Math.floor(bearScore * 0.5);
  }

  const net = bullScore - bearScore;

  // Stricter thresholds + volume confirmation for STRONG signals
  let signal = "HOLD";
  if (net >= 6 && hasVolumeConfirmation) signal = "STRONG_BUY";
  else if (net >= 3) signal = "BUY";
  else if (net <= -6 && hasVolumeConfirmation) signal = "STRONG_SELL";
  else if (net <= -3) signal = "SELL";

  return { signal, bull: bullScore, bear: bearScore, net, reasons };
}

// ─── ATR-based trade levels ───────────────────────────────────────────────────
// The professional way to set stops and targets.
// Returns entry zone, SL, TP1, TP2, TP3 based on ATR multiples
// and nearest S/R levels.

export function calcTradeLevels(ind, direction, price) {
  const atr = ind?.atr;
  if (!atr || !price) return null;

  const isBuy = direction === "BUY" || direction === "STRONG_BUY";

  // Standard ATR multiples used by professional traders:
  // SL = 1.5x ATR (gives room to breathe through normal noise)
  // TP1 = 1.5x ATR (1:1 R:R - quick scalp target)
  // TP2 = 3x ATR (1:2 R:R - swing target)
  // TP3 = 5x ATR (1:3.3 R:R - runner target)

  const slDistance = atr * 1.5;
  const tp1Distance = atr * 1.5;
  const tp2Distance = atr * 3;
  const tp3Distance = atr * 5;

  let sl, tp1, tp2, tp3, entryLow, entryHigh;

  if (isBuy) {
    entryLow = price;
    entryHigh = price + atr * 0.1;
    sl = price - slDistance;
    tp1 = price + tp1Distance;
    tp2 = price + tp2Distance;
    tp3 = price + tp3Distance;
    // Adjust SL to nearest support if available
    if (ind.support && ind.support.length > 0) {
      const nearestSupport = ind.support[0];
      if (nearestSupport < price && nearestSupport > sl) {
        sl = nearestSupport * 0.998; // just below the support
      }
    }
    // Adjust TP1 to nearest resistance if available
    if (ind.resistance && ind.resistance.length > 0) {
      const nearestRes = ind.resistance[0];
      if (nearestRes > price && nearestRes < tp2) {
        tp1 = nearestRes * 0.999;
      }
    }
  } else {
    entryLow = price - atr * 0.1;
    entryHigh = price;
    sl = price + slDistance;
    tp1 = price - tp1Distance;
    tp2 = price - tp2Distance;
    tp3 = price - tp3Distance;
    if (ind.resistance && ind.resistance.length > 0) {
      const nearestRes = ind.resistance[0];
      if (nearestRes > price && nearestRes < sl) {
        sl = nearestRes * 1.002;
      }
    }
    if (ind.support && ind.support.length > 0) {
      const nearestSupport = ind.support[0];
      if (nearestSupport < price && nearestSupport > tp2) {
        tp1 = nearestSupport * 1.001;
      }
    }
  }

  const risk = Math.abs(price - sl);
  const rr1 = risk > 0 ? Math.abs(tp1 - price) / risk : 0;
  const rr2 = risk > 0 ? Math.abs(tp2 - price) / risk : 0;
  const rr3 = risk > 0 ? Math.abs(tp3 - price) / risk : 0;

  return {
    entryLow,
    entryHigh,
    sl,
    tp1,
    tp2,
    tp3,
    rr1,
    rr2,
    rr3,
    atr,
    riskPct: (risk / price) * 100,
  };
}

// ─── Multi-timeframe signal ───────────────────────────────────────────────────
// Combines signals from 3 timeframes. Only returns STRONG when all agree.
// This is the most important quality filter in the entire system.

export function calcMultiTimeframeSignal(tf1m, tf15m, tf1h) {
  const s1 = tf1m ? calcSigWithReason(tf1m).signal : null;
  const s15 = tf15m ? calcSigWithReason(tf15m).signal : null;
  const s1h = tf1h ? calcSigWithReason(tf1h).signal : null;

  const isBull = (s) => s === "STRONG_BUY" || s === "BUY";
  const isBear = (s) => s === "STRONG_SELL" || s === "SELL";

  const bullCount = [s1, s15, s1h].filter(isBull).length;
  const bearCount = [s1, s15, s1h].filter(isBear).length;
  const available = [s1, s15, s1h].filter(Boolean).length;

  let signal = "HOLD";
  let mtfConfirmed = false;

  if (available >= 2) {
    if (bullCount === available) { signal = "STRONG_BUY"; mtfConfirmed = true; }
    else if (bullCount >= 2) { signal = "BUY"; mtfConfirmed = bullCount === 3; }
    else if (bearCount === available) { signal = "STRONG_SELL"; mtfConfirmed = true; }
    else if (bearCount >= 2) { signal = "SELL"; mtfConfirmed = bearCount === 3; }
  }

  return {
    signal,
    mtfConfirmed,
    tf: { "1m": s1, "15m": s15, "1h": s1h },
    bullCount,
    bearCount,
    available,
  };
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

export function fmtP(price, id) {
  if (!price || isNaN(price)) return "0.00";
  if (F4.includes(id)) return price.toFixed(4);
  if (price > 9999) return price.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  if (price > 10) return price.toFixed(2);
  if (price > 1) return price.toFixed(4);
  return price.toFixed(6);
}

export function pfx(market, id) {
  if (market === "FOREX" && !["XAUUSD", "XAGUSD", "USOIL"].includes(id)) return "";
  return "$";
}
