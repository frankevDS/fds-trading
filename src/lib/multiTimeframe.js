// FDS Trading - Multi-timeframe data fetcher
//
// Fetches OHLCV candle data from Binance public API for 1m, 15m, and 1h
// timeframes. No API key required for public market data.
//
// Results are cached for 60 seconds per symbol/timeframe pair to avoid
// hammering the API. The 1-minute data updates every 30 seconds via the
// existing WebSocket feed in binanceFeed.js - this module adds the higher
// timeframe context needed for quality signal filtering.

const REST_BASE = "https://api.binance.com";
const CACHE_TTL = 60000; // 60 seconds

const cache = {}; // key: `${symbol}-${interval}` -> { data, ts }

async function fetchCandles(binanceSymbol, interval, limit = 60) {
  const key = `${binanceSymbol}-${interval}`;
  const now = Date.now();

  // Return cached data if fresh
  if (cache[key] && now - cache[key].ts < CACHE_TTL) {
    return cache[key].data;
  }

  try {
    const r = await fetch(
      `${REST_BASE}/api/v3/klines?symbol=${binanceSymbol}&interval=${interval}&limit=${limit}`
    );
    if (!r.ok) throw new Error(`Binance ${interval} klines error ${r.status}`);
    const raw = await r.json();
    const candles = raw.map((k) => ({
      t: k[0],
      o: parseFloat(k[1]),
      h: parseFloat(k[2]),
      l: parseFloat(k[3]),
      c: parseFloat(k[4]),
      v: parseFloat(k[5]),
    }));
    cache[key] = { data: candles, ts: now };
    return candles;
  } catch (e) {
    console.warn(`MTF fetchCandles ${binanceSymbol} ${interval}:`, e?.message);
    return null;
  }
}

// Fetch 1m, 15m, and 1h candles for a symbol in parallel
export async function fetchMTFCandles(binanceSymbol) {
  if (!binanceSymbol) return { tf1m: null, tf15m: null, tf1h: null };
  const [tf1m, tf15m, tf1h] = await Promise.all([
    fetchCandles(binanceSymbol, "1m", 60),
    fetchCandles(binanceSymbol, "15m", 60),
    fetchCandles(binanceSymbol, "1h", 60),
  ]);
  return { tf1m, tf15m, tf1h };
}

// Clear stale cache entries (call periodically to avoid memory growth)
export function clearMTFCache() {
  const now = Date.now();
  Object.keys(cache).forEach((k) => {
    if (now - cache[k].ts > CACHE_TTL * 5) delete cache[k];
  });
}
