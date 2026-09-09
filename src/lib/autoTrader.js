import { scanAllCrypto } from "./candleSignal";
import { INSTRUMENTS } from "./constants";
import { formatSignalMessage, sendTelegramMessage, loadTelegramSettings } from "./telegramClient";

const STORAGE_KEY = "fds_autotrader_settings";
const STATE_KEY   = "fds_autotrader_state";
const SCAN_MS     = 5 * 60 * 1000;
const COOLDOWN_MS = 4 * 60 * 60 * 1000;

export function loadAutoSettings() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; }
}
export function saveAutoSettings(s) { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); }

function loadState() { try { return JSON.parse(localStorage.getItem(STATE_KEY) || "{}"); } catch { return {}; } }
function saveState(s) { localStorage.setItem(STATE_KEY, JSON.stringify(s)); }

function isOnCooldown(id) { const s = loadState(); return Date.now() - (s[id] || 0) < COOLDOWN_MS; }
function markTraded(id) { const s = loadState(); s[id] = Date.now(); saveState(s); }

function calcPositionSize(balance, entryPrice, atr, riskPct = 0.02) {
  const riskAmount = balance * riskPct;
  const stopDist   = atr * 1.5;
  const stopPct    = stopDist / entryPrice;
  return Math.max(10, Math.min(Math.round((riskAmount / stopPct) * 100) / 100, balance * 0.10));
}

let autoInterval = null;
let _placeTrade  = null;
let _getState    = null;

export function initAutoTrader(placeTradeFn, getStateFn) {
  _placeTrade = placeTradeFn;
  _getState   = getStateFn;
}

async function runAutoScan() {
  const settings = loadAutoSettings();
  if (!settings.enabled) return;
  const { balance, trades } = _getState ? _getState() : {};
  if (!balance || balance <= 0) return;

  const openAuto = (trades || []).filter((t) => t.status === "OPEN" && t.broker === "AUTO");
  if (openAuto.length >= (settings.maxTrades || 3)) return;

  const todayAuto = (trades || []).filter((t) => {
    const d = new Date(t.openDate);
    return d.toDateString() === new Date().toDateString() && t.broker === "AUTO";
  });
  const dailyPnl = todayAuto.reduce((a, t) => a + (t.pnl || 0), 0);
  if (balance > 0 && Math.abs(Math.min(0, dailyPnl)) / balance > 0.10) {
    console.log("AutoTrader: daily drawdown >10%, pausing");
    return;
  }

  const results = await scanAllCrypto(INSTRUMENTS.CRYPTO);
  const openIds  = new Set((trades || []).filter((t) => t.status === "OPEN").map((t) => t.id));
  const tgSet    = loadTelegramSettings();

  for (const r of results) {
    if (openAuto.length >= (settings.maxTrades || 3)) break;
    if (r.signal !== "STRONG_BUY" && r.signal !== "STRONG_SELL") continue;
    if (r.confidence < (settings.minConfidence || 75)) continue;
    if (r.trendBlocked || !r.mtf?.mtfConfirmed) continue;
    if (openIds.has(r.sym.id) || isOnCooldown(r.sym.id)) continue;
    const atr = r.ind?.atr;
    if (!atr) continue;
    const isBuy   = r.signal === "STRONG_BUY";
    const invested = calcPositionSize(balance, r.price, atr, (settings.riskPct || 2) / 100);
    if (invested > balance) continue;

    const trade = {
      id: r.sym.id, label: r.sym.label, market: "CRYPTO", signal: r.signal,
      direction: isBuy ? "BUY" : "SELL", invested, entryPrice: r.price,
      units: invested / r.price, leverage: 1,
      sl: r.levels?.sl ? String(r.levels.sl.toFixed(6)) : "",
      tp: r.levels?.tp2 ? String(r.levels.tp2.toFixed(6)) : "",
      status: "OPEN", openDate: new Date().toISOString(),
      tradeId: Date.now(), pnl: 0, broker: "AUTO",
      binanceSymbol: r.sym.binanceSymbol,
      autoConfidence: r.confidence,
    };

    _placeTrade && _placeTrade(trade);
    markTraded(r.sym.id);
    openAuto.push(trade);

    if (tgSet.chatId && tgSet.enabled) {
      try {
        const msg = formatSignalMessage({
          label: r.sym.label, market: "CRYPTO",
          direction: isBuy ? "BUY" : "SELL",
          price: String(r.price.toFixed(2)), sig: r.signal,
          confidence: r.confidence, rsi: r.ind.rsi,
          macdAboveSignal: r.ind.macdAboveSignal, bbPos: r.ind.bbPos,
          stochK: r.ind.stochK, sma20: r.ind.sma20, sma50: r.ind.sma50,
          aboveSma50: r.ind.aboveSma50, aboveVwap: r.ind.aboveVwap,
          obvTrend: r.ind.obvTrend, volumeAboveAverage: r.ind.volumeAboveAverage,
          bull: r.bull, bear: r.bear, reasons: r.reasons,
          patterns: r.ind.patterns, levels: r.levels, mtf: r.mtf, atr: r.ind.atr,
        });
        await sendTelegramMessage(tgSet.chatId,
          `🤖 <b>AUTO TRADE — $${invested.toFixed(2)} invested</b>\n\n` + msg);
      } catch (e) { console.warn("AutoTrader Telegram:", e?.message); }
    }
    await new Promise((res) => setTimeout(res, 1000));
  }
}

export function startAutoTrader() {
  if (autoInterval) return () => {};
  const init = setTimeout(runAutoScan, 30000);
  autoInterval = setInterval(runAutoScan, SCAN_MS);
  return () => { clearTimeout(init); clearInterval(autoInterval); autoInterval = null; };
}

export function stopAutoTrader() {
  if (autoInterval) { clearInterval(autoInterval); autoInterval = null; }
}

export function triggerAutoScan() { runAutoScan(); }
