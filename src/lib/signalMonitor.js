// FDS Trading - Signal Monitor v3
// Now uses candleSignal.js (stable 15m closed candles) instead of tick feed.
// Scans every 15 minutes to match the candle period.

import { scanAllCrypto } from "./candleSignal";
import { INSTRUMENTS } from "./constants";
import { loadTelegramSettings, formatSignalMessage, sendTelegramMessage } from "./telegramClient";

const SCAN_MS     = 15 * 60 * 1000; // every 15 minutes (matches candle period)
const COOLDOWN_MS = 15 * 60 * 1000; // one alert per instrument per candle
const lastAlerted = {};

let upcomingNews = [];

async function refreshCalendar() {
  try {
    const r = await fetch("/api/calendar");
    if (!r.ok) return;
    const d = await r.json();
    upcomingNews = d.events || [];
  } catch { upcomingNews = []; }
}

function getNewsWarnings() {
  const now = Date.now();
  const window = 30 * 60 * 1000;
  return upcomingNews.filter((n) => Math.abs(new Date(n.date).getTime() - now) < window);
}

async function runScan() {
  const tgSettings = loadTelegramSettings();
  if (!tgSettings.chatId || !tgSettings.enabled) return;

  const threshold = tgSettings.threshold || 80;
  const now = Date.now();

  const results = await scanAllCrypto(INSTRUMENTS.CRYPTO);

  for (const r of results) {
    if (r.signal !== "STRONG_BUY" && r.signal !== "STRONG_SELL") continue;
    if (r.confidence < threshold) continue;
    if (r.trendBlocked) continue;

    const key = `${r.sym.id}-${r.signal}`;
    if (now - (lastAlerted[key] || 0) < COOLDOWN_MS) continue;
    lastAlerted[key] = now;

    const newsWarning = getNewsWarnings();

    try {
      const msg = formatSignalMessage({
        label: r.sym.label, market: "CRYPTO",
        direction: r.signal.includes("BUY") ? "BUY" : "SELL",
        price: String(r.price?.toFixed ? r.price.toFixed(r.price > 100 ? 2 : 6) : r.price),
        sig: r.signal, confidence: r.confidence,
        rsi: r.ind?.rsi, macdAboveSignal: r.ind?.macdAboveSignal,
        bbPos: r.ind?.bbPos, stochK: r.ind?.stochK,
        sma20: r.ind?.sma20, sma50: r.ind?.sma50,
        aboveSma50: r.ind?.aboveSma50, aboveVwap: r.ind?.aboveVwap,
        obvTrend: r.ind?.obvTrend, volumeAboveAverage: r.ind?.volumeAboveAverage,
        bull: r.bull, bear: r.bear, reasons: r.reasons,
        patterns: r.ind?.patterns, levels: r.levels, mtf: r.mtf,
        newsWarning, atr: r.ind?.atr,
      });

      await sendTelegramMessage(tgSettings.chatId, msg);
      await new Promise((res) => setTimeout(res, 500));
    } catch (e) {
      console.warn("signalMonitor Telegram failed:", r.sym.label, e?.message);
    }
  }
}

let monitorInterval   = null;
let calendarInterval  = null;

export function startSignalMonitor() {
  if (monitorInterval) return () => {};
  refreshCalendar();
  calendarInterval = setInterval(refreshCalendar, 30 * 60 * 1000);
  const init = setTimeout(runScan, 20000); // first scan after 20s
  monitorInterval = setInterval(runScan, SCAN_MS);
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
