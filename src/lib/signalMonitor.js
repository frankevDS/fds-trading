// FDS Trading - Signal Monitor v2
//
// Upgrades over v1:
// 1. Multi-timeframe analysis (1m + 15m + 1h) using real Binance OHLCV data
// 2. ATR-based trade levels in every Telegram alert
// 3. VWAP, OBV, candlestick patterns included in signal scoring
// 4. Economic calendar news warnings in alerts
// 5. Only fires when confidence >= threshold AND multi-timeframe confirms
// 6. 10-minute cooldown per instrument to prevent spam

import { INSTRUMENTS, MKTABS } from "./constants";
import { getIndFromCandles, calcSigWithReason, calcTradeLevels, calcMultiTimeframeSignal } from "./indicators";
import { getFeedState } from "./binanceFeed";
import { initSim, tickSim, getSimState } from "./simEngine";
import { fetchMTFCandles, clearMTFCache } from "./multiTimeframe";
import { loadTelegramSettings, formatSignalMessage, sendTelegramMessage } from "./telegramClient";

const SCAN_INTERVAL_MS = 30000;    // scan every 30 seconds
const COOLDOWN_MS = 10 * 60 * 1000; // same instrument silent for 10 min
const QUALIFYING = ["STRONG_BUY", "STRONG_SELL"];

const lastAlerted = {};
let upcomingNews = [];

// Fetch economic calendar once on startup and refresh every 30 minutes
async function refreshCalendar() {
  try {
    const r = await fetch("/api/calendar");
    if (!r.ok) return;
    const data = await r.json();
    upcomingNews = data.events || [];
  } catch {
    upcomingNews = [];
  }
}

function getNewsWarnings(market) {
  const now = Date.now();
  const window = 30 * 60 * 1000; // 30 minutes before/after event
  const relevantCurrencies = market === "FOREX" ? ["USD", "EUR", "GBP", "JPY", "AUD", "CAD", "CHF", "NZD"] : ["USD"];
  return upcomingNews.filter((n) => {
    const eventTime = new Date(n.date).getTime();
    return Math.abs(eventTime - now) < window && relevantCurrencies.includes(n.currency);
  });
}

function estimateConfidence(bull, bear) {
  const total = bull + bear;
  if (total === 0) return 0;
  const purity = Math.abs(bull - bear) / total;
  const strength = Math.min(Math.abs(bull - bear) / 10, 1);
  return Math.round((purity * 0.6 + strength * 0.4) * 100);
}

async function analyzeCryptoInstrument(sym) {
  const feedState = getFeedState(sym.id);
  if (!feedState || !feedState.ready) return null;

  // Fetch all three timeframes in parallel
  const { tf1m, tf15m, tf1h } = await fetchMTFCandles(sym.binanceSymbol);

  if (!tf1m || tf1m.length < 20) return null;

  // Calculate full indicator suite from 1m OHLCV data
  const ind1m = getIndFromCandles(tf1m);
  const ind15m = tf15m && tf15m.length >= 20 ? getIndFromCandles(tf15m) : null;
  const ind1h = tf1h && tf1h.length >= 20 ? getIndFromCandles(tf1h) : null;

  if (!ind1m) return null;

  // Multi-timeframe signal
  const mtf = calcMultiTimeframeSignal(ind1m, ind15m, ind1h);

  // Only proceed with strong MTF-confirmed signals
  if (!QUALIFYING.includes(mtf.signal)) return null;

  const { signal, bull, bear, reasons } = calcSigWithReason(ind1m);
  const confidence = estimateConfidence(bull, bear);

  const isBuy = mtf.signal.includes("BUY");
  const levels = calcTradeLevels(ind1m, isBuy ? "BUY" : "SELL", feedState.price);

  return {
    sym,
    market: "CRYPTO",
    price: feedState.price,
    signal: mtf.signal,
    mtf,
    ind: ind1m,
    bull,
    bear,
    reasons,
    confidence,
    levels,
  };
}

function analyzeSimulatedInstrument(sym, market) {
  initSim(sym.id, sym.base, sym.vol);
  tickSim(sym.id);
  const s = getSimState(sym.id);
  if (!s || !s.history || s.history.length < 15) return null;

  // For simulated instruments we only have close prices - use basic indicators
  const { getInd } = require("./indicators"); // dynamic import workaround
  const ind = getInd(s.history, s.price);
  if (!ind) return null;

  const { signal, bull, bear, reasons } = calcSigWithReason(ind);
  if (!QUALIFYING.includes(signal)) return null;

  const confidence = estimateConfidence(bull, bear);
  const levels = calcTradeLevels(ind, signal.includes("BUY") ? "BUY" : "SELL", s.price);

  return { sym, market, price: s.price, signal, mtf: null, ind, bull, bear, reasons, confidence, levels };
}

async function runScan() {
  const tgSettings = loadTelegramSettings();
  if (!tgSettings.chatId || !tgSettings.enabled) return;

  const threshold = tgSettings.threshold || 80;
  const now = Date.now();
  const alerts = [];

  // Scan crypto with full OHLCV multi-timeframe analysis
  for (const sym of INSTRUMENTS.CRYPTO) {
    try {
      const result = await analyzeCryptoInstrument(sym);
      if (!result) continue;
      if (result.confidence < threshold) continue;

      const cooldownKey = `${sym.id}-${result.signal}`;
      if (now - (lastAlerted[cooldownKey] || 0) < COOLDOWN_MS) continue;

      alerts.push(result);
    } catch (e) {
      console.warn("MTF scan error:", sym.id, e?.message);
    }
  }

  // Send alerts
  for (const a of alerts) {
    const cooldownKey = `${a.sym.id}-${a.signal}`;
    lastAlerted[cooldownKey] = now;

    const newsWarning = getNewsWarnings(a.market);

    try {
      const msg = formatSignalMessage({
        label: a.sym.label,
        market: a.market,
        direction: a.signal.includes("BUY") ? "BUY" : "SELL",
        price: a.price,
        sig: a.signal,
        confidence: a.confidence,
        rsi: a.ind.rsi,
        macdAboveSignal: a.ind.macdAboveSignal,
        bbPos: a.ind.bbPos,
        stochK: a.ind.stochK,
        sma20: a.ind.sma20,
        sma50: a.ind.sma50,
        aboveSma50: a.ind.aboveSma50,
        aboveVwap: a.ind.aboveVwap,
        obvTrend: a.ind.obvTrend,
        volumeAboveAverage: a.ind.volumeAboveAverage,
        bull: a.bull,
        bear: a.bear,
        reasons: a.reasons,
        patterns: a.ind.patterns,
        levels: a.levels,
        mtf: a.mtf,
        newsWarning,
        atr: a.ind.atr,
      });

      await sendTelegramMessage(tgSettings.chatId, msg);
      await new Promise((r) => setTimeout(r, 500)); // rate limit
    } catch (e) {
      console.warn("Telegram send failed:", a.sym.label, e?.message);
    }
  }

  clearMTFCache();
}

let monitorInterval = null;
let calendarInterval = null;

export function startSignalMonitor() {
  if (monitorInterval) return;

  // Load calendar on startup
  refreshCalendar();
  calendarInterval = setInterval(refreshCalendar, 30 * 60 * 1000);

  // First scan after 15 seconds (let market data load first)
  const init = setTimeout(() => {
    runScan();
    monitorInterval = setInterval(runScan, SCAN_INTERVAL_MS);
  }, 15000);

  return () => {
    clearTimeout(init);
    clearInterval(monitorInterval);
    clearInterval(calendarInterval);
    monitorInterval = null;
    calendarInterval = null;
  };
}

export function stopSignalMonitor() {
  clearInterval(monitorInterval);
  clearInterval(calendarInterval);
  monitorInterval = null;
  calendarInterval = null;
}

export function triggerImmediateScan() {
  runScan();
}
