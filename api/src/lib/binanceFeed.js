// FDS Trading - live crypto market data
//
// Public market data needs no API key, so this talks to Binance directly
// from the browser:
//   - REST klines seed each symbol's recent price history on load
//   - a single shared WebSocket (24hr ticker stream) keeps prices, 24h
//     change, high/low and volume live after that
//
// This is read-only market data and is unrelated to lib/binanceTrade.js,
// which talks to Binance Testnet to place paper orders.
//
// Note: if Binance's public API is unreachable from your network/region,
// swap REST_BASE/WS_BASE below for Binance.US (api.binance.us /
// stream.binance.us) - the response shapes are the same.

const REST_BASE = "https://api.binance.com";
const WS_BASE = "wss://stream.binance.com:9443/stream";
const HISTORY_LEN = 60;
const RECONNECT_DELAY_MS = 3000;

const store = {}; // id -> { price, history, change24, high24, low24, volQuote, ready, error }
const subscribers = {}; // id -> Set<callback>
const symbolToId = {}; // "BTCUSDT" -> "bitcoin"

let ws = null;
let wsReady = false;
let reconnectTimer = null;
let registeredInstruments = [];

function emptyState() {
  return { price: 0, history: [], change24: 0, high24: 0, low24: 0, volQuote: 0, ready: false, error: null };
}

function notify(id) {
  const subs = subscribers[id];
  if (!subs || !store[id]) return;
  subs.forEach((cb) => cb(store[id]));
}

async function seedHistory(id, binanceSymbol) {
  try {
    const r = await fetch(
      `${REST_BASE}/api/v3/klines?symbol=${binanceSymbol}&interval=1m&limit=${HISTORY_LEN}`
    );
    if (!r.ok) throw new Error(`Binance klines error ${r.status}`);
    const rows = await r.json();
    const closes = rows.map((row) => parseFloat(row[4]));
    const last = closes[closes.length - 1];
    const prev = store[id] || emptyState();
    store[id] = { ...prev, price: last, history: closes, ready: true, error: null };
  } catch (err) {
    const prev = store[id] || emptyState();
    store[id] = { ...prev, error: err?.message || "Failed to load price history" };
  }
  notify(id);
}

function connectSocket() {
  if (ws || typeof WebSocket === "undefined") return;
  const streams = registeredInstruments
    .map((s) => `${s.binanceSymbol.toLowerCase()}@ticker`)
    .join("/");
  if (!streams) return;

  ws = new WebSocket(`${WS_BASE}?streams=${streams}`);

  ws.onopen = () => {
    wsReady = true;
  };

  ws.onmessage = (evt) => {
    try {
      const msg = JSON.parse(evt.data);
      const payload = msg && msg.data;
      if (!payload || !payload.s) return;
      const id = symbolToId[payload.s];
      if (!id) return;
      const price = parseFloat(payload.c);
      if (!isFinite(price)) return;
      const prev = store[id] || emptyState();
      const history = [...prev.history, price].slice(-HISTORY_LEN);
      store[id] = {
        ...prev,
        price,
        history,
        change24: parseFloat(payload.P),
        high24: parseFloat(payload.h),
        low24: parseFloat(payload.l),
        volQuote: parseFloat(payload.q),
        ready: true,
        error: null,
      };
      notify(id);
    } catch {
      // ignore malformed frames
    }
  };

  ws.onclose = () => {
    wsReady = false;
    ws = null;
    scheduleReconnect();
  };

  ws.onerror = () => {
    try {
      ws && ws.close();
    } catch {
      // no-op
    }
  };
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connectSocket();
  }, RECONNECT_DELAY_MS);
}

/** Call once at app startup with the CRYPTO instrument list. */
export function initBinanceFeed(instruments) {
  registeredInstruments = instruments;
  instruments.forEach((s) => {
    symbolToId[s.binanceSymbol] = s.id;
    if (!store[s.id]) store[s.id] = emptyState();
  });
  instruments.forEach((s) => seedHistory(s.id, s.binanceSymbol));
  connectSocket();
}

export function getFeedState(id) {
  return store[id] || null;
}

export function isFeedSocketConnected() {
  return wsReady;
}

/** Components subscribe in a useEffect; callback fires with the latest snapshot. */
export function subscribeFeed(id, callback) {
  if (!subscribers[id]) subscribers[id] = new Set();
  subscribers[id].add(callback);
  if (store[id]) callback(store[id]);
  return () => {
    subscribers[id] && subscribers[id].delete(callback);
  };
}
