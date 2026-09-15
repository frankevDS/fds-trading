import { scanAllCrypto } from "./candleSignal";
import { INSTRUMENTS } from "./constants";
import { loadTelegramSettings, formatSignalMessage, sendTelegramMessage } from "./telegramClient";

const SCAN_MS     = 15 * 60 * 1000;
const COOLDOWN_MS = 15 * 60 * 1000;
const lastAlerted = {};
let upcomingNews  = [];

async function refreshCalendar() {
  try {
    const r = await fetch("/api/calendar");
    if (!r.ok) return;
    const d = await r.json();
    upcomingNews = d.events || [];
  } catch { upcomingNews = []; }
}

function getNewsWarnings() {
  const now = Date.now(), w = 30*60*1000;
  return upcomingNews.filter((n) => Math.abs(new Date(n.date).getTime() - now) < w);
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
        newsWarning: getNewsWarnings(), atr: r.ind?.atr,
      });
      await sendTelegramMessage(tgSettings.chatId, msg);
      await new Promise((res) => setTimeout(res, 500));
    } catch (e) { console.warn("signalMonitor:", r.sym.label, e?.message); }
  }
}

let monitorInterval = null, calendarInterval = null;

export function startSignalMonitor() {
  if (monitorInterval) return () => {};
  refreshCalendar();
  calendarInterval = setInterval(refreshCalendar, 30*60*1000);
  const init = setTimeout(runScan, 20000);
  monitorInterval = setInterval(runScan, SCAN_MS);
  return () => {
    clearTimeout(init);
    clearInterval(monitorInterval);
    clearInterval(calendarInterval);
    monitorInterval = null; calendarInterval = null;
  };
}

export function stopSignalMonitor() {
  clearInterval(monitorInterval); clearInterval(calendarInterval);
  monitorInterval = null; calendarInterval = null;
}
