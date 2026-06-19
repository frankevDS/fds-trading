// FDS Trading - simulated price engine
//
// Used only for STOCKS and FOREX in this phase. CRYPTO now runs on real
// Binance market data (see binanceFeed.js) instead of this random walk.
// Kept as a self-contained module so a real stocks/forex feed (Alpaca,
// OANDA, etc.) can replace it later without touching the rest of the app.

const SIM = {};

export function initSim(id, base, vol) {
  if (!SIM[id]) {
    let p = base * (0.97 + Math.random() * 0.03);
    const h = [];
    for (let i = 0; i < 60; i++) {
      p = p * (1 + (Math.random() - 0.49) * vol * 0.4);
      h.push(p);
    }
    SIM[id] = { price: p, history: h, base, vol };
  }
  return SIM[id];
}

export function tickSim(id) {
  const s = SIM[id];
  if (!s) return null;
  s.price =
    s.price * (1 + ((s.base - s.price) / s.base) * 0.003 + (Math.random() - 0.49) * s.vol * 0.22);
  s.history.push(s.price);
  if (s.history.length > 60) s.history.shift();
  return { price: s.price, history: [...s.history] };
}

export function getSimState(id) {
  return SIM[id] || null;
}
