// FDS Trading - Automatic SL/TP Execution Monitor
//
// Runs every 10 seconds. For every open virtual trade that has a stop loss
// or take profit set, checks the current live price and auto-closes the trade
// if the price has crossed either level.
//
// How it works:
// - BUY trade: SL is BELOW entry, TP is ABOVE entry
//   → Auto-close as loss if current price <= SL
//   → Auto-close as win  if current price >= TP
// - SELL trade: SL is ABOVE entry, TP is BELOW entry
//   → Auto-close as loss if current price >= SL
//   → Auto-close as win  if current price <= TP
//
// Sends a Telegram notification on every auto-close.
// Only runs on virtual wallet trades (not Binance Testnet orders).

import { getFeedState } from "./binanceFeed";
import { getSimState, initSim, tickSim } from "./simEngine";
import { INSTRUMENTS } from "./constants";
import { loadTelegramSettings, sendTelegramMessage } from "./telegramClient";

const CHECK_INTERVAL_MS = 10000; // check every 10 seconds

// Live refs — set by App.jsx
const refs = { getTrades: null, closeTrade: null };

export function initSlTpMonitor(getTradesFn, closeTradeFn) {
  refs.getTrades  = getTradesFn;
  refs.closeTrade = closeTradeFn;
}

function getLivePrice(trade) {
  if (trade.market === "CRYPTO" && trade.binanceSymbol) {
    const f = getFeedState(trade.id);
    return f?.price || null;
  }
  if (trade.market === "STOCKS" || trade.market === "FOREX") {
    initSim(trade.id, trade.entryPrice, 0.01);
    tickSim(trade.id);
    const s = getSimState(trade.id);
    return s?.price || null;
  }
  return null;
}

async function checkSlTp() {
  const trades = refs.getTrades ? refs.getTrades() : [];
  const openVirtual = trades.filter(
    (t) => t.status === "OPEN" && t.broker !== "BINANCE_TESTNET" && (t.sl || t.tp)
  );

  if (openVirtual.length === 0) return;

  const tgSet = loadTelegramSettings();

  for (const trade of openVirtual) {
    const price = getLivePrice(trade);
    if (!price || isNaN(price)) continue;

    const sl = trade.sl ? parseFloat(trade.sl) : null;
    const tp = trade.tp ? parseFloat(trade.tp) : null;
    const isBuy = trade.direction === "BUY";

    let hitType = null;

    if (isBuy) {
      if (sl && price <= sl) hitType = "SL";
      else if (tp && price >= tp) hitType = "TP";
    } else {
      if (sl && price >= sl) hitType = "SL";
      else if (tp && price <= tp) hitType = "TP";
    }

    if (!hitType) continue;

    // Calculate P&L
    const priceDiff = isBuy ? price - trade.entryPrice : trade.entryPrice - price;
    const pnl = priceDiff * trade.units * (trade.leverage || 1);
    const pnlPct = (pnl / trade.invested) * 100;

    console.log(`SL/TP Monitor: ${hitType} hit on ${trade.label} @ ${price}, PnL: ${pnl.toFixed(2)}`);

    // Auto-close the trade
    refs.closeTrade && refs.closeTrade(trade.tradeId, {
      pnl,
      closePrice: price,
      closeDate: new Date().toISOString(),
    });

    // Send Telegram notification
    if (tgSet.chatId && tgSet.enabled) {
      try {
        const emoji = hitType === "TP" ? "✅" : "🛑";
        const result = hitType === "TP" ? "TAKE PROFIT HIT" : "STOP LOSS HIT";
        const msg =
          `${emoji} <b>FDS Trading — ${result}</b>\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `📍 <b>${trade.label}</b> | ${trade.market} | ${trade.direction}\n` +
          `💰 Entry: <code>${trade.entryPrice}</code>\n` +
          `💰 Close: <code>${price.toFixed(6)}</code>\n` +
          `${hitType === "SL" ? `🛑 Stop Loss: <code>${sl}</code>` : `✅ Take Profit: <code>${tp}</code>`}\n` +
          `\n` +
          `${pnl >= 0 ? "💚" : "❤️"} P&L: <b>${pnl >= 0 ? "+" : ""}$${pnl.toFixed(2)} (${pnlPct >= 0 ? "+" : ""}${pnlPct.toFixed(2)}%)</b>\n` +
          `💵 Invested: $${trade.invested?.toFixed(2)}\n` +
          `\n` +
          `⏰ ${new Date().toLocaleString("en-GB", { timeZone: "Africa/Accra", hour12: false })}\n` +
          `📱 <i>FDS Trading — Frankev Digital Services</i>`;

        await sendTelegramMessage(tgSet.chatId, msg);
      } catch (e) {
        console.warn("SL/TP Monitor Telegram notification failed:", e?.message);
      }
    }

    // Small delay between closures to avoid race conditions
    await new Promise((r) => setTimeout(r, 200));
  }
}

let monitorInterval = null;

export function startSlTpMonitor() {
  if (monitorInterval) return () => {};
  console.log("SL/TP Monitor: started");
  monitorInterval = setInterval(checkSlTp, CHECK_INTERVAL_MS);
  return () => { clearInterval(monitorInterval); monitorInterval = null; };
}

export function stopSlTpMonitor() {
  if (monitorInterval) { clearInterval(monitorInterval); monitorInterval = null; }
}
