// FDS Trading - background signal monitor
//
// Runs every 30 seconds, scans all instruments, and fires a Telegram alert
// whenever a signal score exceeds the user's confidence threshold.
//
// De-duplication: the same instrument won't fire again within 10 minutes to
// avoid spamming. A fresh signal always overrides if the direction flips
// (e.g. was BUY, now SELL).
//
// Confidence estimation: derived from the bull/bear score split. A net score
// of 8 with 0 opposing score is higher confidence than a net score of 4 with
// 3 opposing. The formula is: (net / totalPossible) * 100, clamped to [0,100].
// This is the same signal that appears in the app UI.

import { INSTRUMENTS, MKTABS } from "./constants";
import { getInd, calcSigWithReason } from "./indicators";
import { getFeedState } from "./binanceFeed";
import { initSim, tickSim, getSimState } from "./simEngine";
import { loadTelegramSettings, formatSignalMessage, sendTelegramMessage } from "./telegramClient";

const SCAN_INTERVAL_MS = 30000; // 30 seconds
const COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes per instrument
const MAX_TOTAL_POSSIBLE_SCORE = 8; // bull + bear max combined score
const QUALIFYING_SIGNALS = ["STRONG_BUY", "STRONG_SELL", "BUY", "SELL"];

// Track last alert time per instrument+direction to avoid spam
const lastAlerted = {}; // key: `${id}-${signal}` -> timestamp

function estimateConfidence(bull, bear) {
  const total = bull + bear;
  if (total === 0) return 0;
  const net = Math.abs(bull - bear);
  // Scaled: net/total gives directional purity, net/MAX gives absolute strength
  const purity = net / total; // 1.0 = perfect, 0 = equal bull/bear
  const strength = Math.min(net / MAX_TOTAL_POSSIBLE_SCORE, 1);
  return Math.round((purity * 0.6 + strength * 0.4) * 100);
}

function snapshotAllInstruments() {
  const results = [];
  MKTABS.forEach((market) => {
    INSTRUMENTS[market].forEach((sym) => {
      let price, history;
      try {
        if (market === "CRYPTO") {
          const f = getFeedState(sym.id);
          if (!f || !f.ready || !f.history || f.history.length < 15) return;
          price = f.price;
          history = f.history;
        } else {
          initSim(sym.id, sym.base, sym.vol);
          tickSim(sym.id);
          const s = getSimState(sym.id);
          if (!s || !s.history || s.history.length < 15) return;
          price = s.price;
          history = s.history;
        }
        const ind = getInd(history, price);
        if (!ind) return;
        const { signal, bull, bear, net, reasons } = calcSigWithReason(ind);
        if (!QUALIFYING_SIGNALS.includes(signal)) return;
        const confidence = estimateConfidence(bull, bear);
        results.push({
          sym,
          market,
          price,
          ind,
          signal,
          bull,
          bear,
          net,
          confidence,
          reasons,
        });
      } catch {
        // Silently skip any instrument that errors
      }
    });
  });
  return results;
}

async function runScan() {
  const tgSettings = loadTelegramSettings();
  if (!tgSettings.chatId || !tgSettings.enabled) return;

  const threshold = tgSettings.threshold || 85;
  const signals = snapshotAllInstruments();
  const now = Date.now();

  for (const sig of signals) {
    if (sig.confidence < threshold) continue;
    // Only alert on STRONG signals unless threshold is low
    if (threshold >= 80 && !sig.signal.startsWith("STRONG_")) continue;

    const cooldownKey = `${sig.sym.id}-${sig.signal}`;
    const lastTime = lastAlerted[cooldownKey] || 0;
    if (now - lastTime < COOLDOWN_MS) continue;

    // Mark as alerted
    lastAlerted[cooldownKey] = now;

    try {
      const msg = formatSignalMessage({
        label: sig.sym.label,
        market: sig.market,
        direction: sig.signal.includes("BUY") ? "BUY" : "SELL",
        price: String(sig.price?.toFixed ? sig.price.toFixed(sig.price > 100 ? 2 : 6) : sig.price),
        sig: sig.signal,
        confidence: sig.confidence,
        rsi: sig.ind.rsi,
        macd: sig.ind.macd,
        bbPos: sig.ind.bbPos,
        stochK: sig.ind.stochK,
        sma20: sig.ind.sma20,
        sma50: sig.ind.sma50,
        aboveSma50: sig.ind.aboveSma50,
        bull: sig.bull,
        bear: sig.bear,
        reasons: sig.reasons,
      });

      await sendTelegramMessage(tgSettings.chatId, msg);

      // Small delay between messages to respect Telegram rate limits
      await new Promise((r) => setTimeout(r, 400));
    } catch (e) {
      console.warn("FDS: Telegram alert failed for", sig.sym.label, e?.message);
    }
  }
}

let monitorInterval = null;

export function startSignalMonitor() {
  if (monitorInterval) return; // already running
  // Initial scan after 10 seconds (let prices load first)
  const initialTimeout = setTimeout(() => {
    runScan();
    monitorInterval = setInterval(runScan, SCAN_INTERVAL_MS);
  }, 10000);

  // Return cleanup function
  return () => {
    clearTimeout(initialTimeout);
    if (monitorInterval) {
      clearInterval(monitorInterval);
      monitorInterval = null;
    }
  };
}

export function stopSignalMonitor() {
  if (monitorInterval) {
    clearInterval(monitorInterval);
    monitorInterval = null;
  }
}

// Force an immediate scan (used when settings change)
export function triggerImmediateScan() {
  runScan();
}
