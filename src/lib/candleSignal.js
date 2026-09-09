import { getIndFromCandles, calcSigWithReason, calcTradeLevels, calcMultiTimeframeSignal } from "./indicators";

const REST = "https://api.binance.com";
const MIN_CANDLES = 50;
const CACHE = {};
const TTL = { "15m": 15*60*1000, "1h": 60*60*1000, "4h": 4*60*60*1000 };

async function fetchCandles(symbol, interval, limit = 100) {
  const key = `${symbol}-${interval}`;
  const now = Date.now();
  if (CACHE[key] && now < CACHE[key].expiresAt) return CACHE[key].candles;
  try {
    const r = await fetch(`${REST}/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const raw = await r.json();
    const candles = raw.slice(0, -1).map((k) => ({
      t: k[0], o: parseFloat(k[1]), h: parseFloat(k[2]),
      l: parseFloat(k[3]), c: parseFloat(k[4]), v: parseFloat(k[5]),
    }));
    const ttl = TTL[interval] || TTL["15m"];
    CACHE[key] = { candles, expiresAt: Math.ceil(now / ttl) * ttl + 5000 };
    return candles;
  } catch (e) {
    console.warn(`candleSignal ${symbol} ${interval}:`, e?.message);
    return CACHE[key]?.candles || null;
  }
}

export async function analyzeSymbol(sym) {
  if (!sym.binanceSymbol) return null;
  try {
    const [c15m, c1h, c4h] = await Promise.all([
      fetchCandles(sym.binanceSymbol, "15m", 100),
      fetchCandles(sym.binanceSymbol, "1h", 100),
      fetchCandles(sym.binanceSymbol, "4h", 100),
    ]);
    if (!c15m || c15m.length < MIN_CANDLES) return null;
    const ind15m = getIndFromCandles(c15m);
    const ind1h = c1h && c1h.length >= 20 ? getIndFromCandles(c1h) : null;
    const ind4h = c4h && c4h.length >= 20 ? getIndFromCandles(c4h) : null;
    if (!ind15m) return null;
    const trend4h = ind4h ? (ind4h.aboveSma50 ? "UP" : "DOWN") : "UNKNOWN";
    const r15m = calcSigWithReason(ind15m);
    const r1h = ind1h ? calcSigWithReason(ind1h) : null;
    const r4h = ind4h ? calcSigWithReason(ind4h) : null;
    const mtf = calcMultiTimeframeSignal(ind15m, ind1h, ind4h);
    let finalSignal = mtf.signal;
    let trendBlocked = false;
    if (trend4h === "DOWN" && (finalSignal === "BUY" || finalSignal === "STRONG_BUY")) { finalSignal = "HOLD"; trendBlocked = true; }
    if (trend4h === "UP" && (finalSignal === "SELL" || finalSignal === "STRONG_SELL")) { finalSignal = "HOLD"; trendBlocked = true; }
    const { bull, bear, reasons } = r15m;
    const total = bull + bear;
    const confidence = total > 0 ? Math.round(((Math.abs(bull-bear)/total)*0.5 + (mtf.bullCount/Math.max(mtf.available,1))*0.5)*100) : 0;
    const isBuy = finalSignal === "BUY" || finalSignal === "STRONG_BUY";
    const isSell = finalSignal === "SELL" || finalSignal === "STRONG_SELL";
    const currentPrice = c15m[c15m.length-1].c;
    const levels = (isBuy || isSell) && ind15m.atr ? calcTradeLevels(ind15m, isBuy ? "BUY" : "SELL", currentPrice) : null;
    const cEntry = CACHE[`${sym.binanceSymbol}-15m`];
    return {
      sym, market: "CRYPTO", signal: finalSignal, confidence, price: currentPrice,
      ind: ind15m, mtf, trend4h, trendBlocked, bull, bear, reasons, levels,
      lastCandleTime: new Date(c15m[c15m.length-1].t).toLocaleTimeString("en-GB", { hour:"2-digit", minute:"2-digit" }),
      nextUpdate: cEntry ? new Date(cEntry.expiresAt).toLocaleTimeString("en-GB", { hour:"2-digit", minute:"2-digit" }) : "~15m",
      r15m: r15m.signal, r1h: r1h?.signal || null, r4h: r4h?.signal || null,
    };
  } catch (e) { console.warn(`analyzeSymbol ${sym.id}:`, e?.message); return null; }
}

export async function scanAllCrypto(instruments) {
  const results = await Promise.allSettled(instruments.map(analyzeSymbol));
  return results
    .filter((r) => r.status === "fulfilled" && r.value)
    .map((r) => r.value)
    .filter(Boolean)
    .sort((a, b) => {
      const rank = { STRONG_BUY: 0, BUY: 1, STRONG_SELL: 2, SELL: 3, HOLD: 4 };
      const ra = rank[a.signal] ?? 4, rb = rank[b.signal] ?? 4;
      return ra !== rb ? ra - rb : b.confidence - a.confidence;
    });
}

export function clearSignalCache() { Object.keys(CACHE).forEach((k) => delete CACHE[k]); }
