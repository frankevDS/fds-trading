import { getFeedState } from "./binanceFeed";
import { loadTelegramSettings, sendTelegramMessage } from "./telegramClient";

const CHECK_MS = 10000;
const refs = { getTrades: null, closeTrade: null };

export function initSlTpMonitor(getTradesFn, closeTradeFn) {
  refs.getTrades  = getTradesFn;
  refs.closeTrade = closeTradeFn;
}

function getLivePrice(trade) {
  if (trade.market === "CRYPTO") {
    const f = getFeedState(trade.id);
    return f?.price || null;
  }
  return null;
}

async function checkSlTp() {
  const trades = refs.getTrades ? refs.getTrades() : [];
  const open = trades.filter((t) => t.status === "OPEN" && t.broker !== "BINANCE_TESTNET" && (t.sl || t.tp));
  if (open.length === 0) return;
  const tgSet = loadTelegramSettings();

  for (const trade of open) {
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

    const priceDiff = isBuy ? price - trade.entryPrice : trade.entryPrice - price;
    const pnl = priceDiff * trade.units * (trade.leverage || 1);
    const pnlPct = (pnl / trade.invested) * 100;

    refs.closeTrade && refs.closeTrade(trade.tradeId, {
      pnl, closePrice: price, closeDate: new Date().toISOString(),
    });

    if (tgSet.chatId && tgSet.enabled) {
      try {
        const emoji = hitType === "TP" ? "✅" : "🛑";
        const msg =
          `${emoji} <b>${hitType === "TP" ? "TAKE PROFIT" : "STOP LOSS"} HIT</b>\n` +
          `━━━━━━━━━━━━━━━━━━\n` +
          `<b>${trade.label}</b> | ${trade.direction}\n` +
          `Entry: <code>${trade.entryPrice}</code> → Close: <code>${price.toFixed(6)}</code>\n` +
          `${hitType === "SL" ? `🛑 SL: <code>${sl}</code>` : `✅ TP: <code>${tp}</code>`}\n` +
          `${pnl >= 0 ? "💚" : "❤️"} P&L: <b>${pnl >= 0?"+":""}$${pnl.toFixed(2)} (${pnlPct.toFixed(2)}%)</b>\n` +
          `📱 FDS Trading`;
        await sendTelegramMessage(tgSet.chatId, msg);
      } catch (e) { console.warn("SL/TP Telegram:", e?.message); }
    }
    await new Promise((r) => setTimeout(r, 200));
  }
}

let slTpInterval = null;
export function startSlTpMonitor() {
  if (slTpInterval) return () => {};
  slTpInterval = setInterval(checkSlTp, CHECK_MS);
  return () => { clearInterval(slTpInterval); slTpInterval = null; };
}
export function stopSlTpMonitor() {
  if (slTpInterval) { clearInterval(slTpInterval); slTpInterval = null; }
}
