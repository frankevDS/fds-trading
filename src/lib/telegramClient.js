// FDS Trading - Telegram client helper
//
// Stores the user's Telegram chat ID in localStorage (the bot token lives
// server-side only). Formats signals into rich HTML messages and sends them
// via /api/telegram.

const STORAGE_KEY = "fds_telegram_settings";

export function loadTelegramSettings() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

export function saveTelegramSettings(settings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function clearTelegramSettings() {
  localStorage.removeItem(STORAGE_KEY);
}

// Formats a signal alert as a rich Telegram HTML message
export function formatSignalMessage(signal) {
  const {
    label,
    market,
    direction,
    price,
    sig,
    confidence,
    rsi,
    macd,
    bbPos,
    stochK,
    sma20,
    sma50,
    aboveSma50,
    entryZone,
    sl,
    tp1,
    tp2,
    bull,
    bear,
    reasons,
  } = signal;

  const sigEmoji = {
    STRONG_BUY: "🟢🟢",
    BUY: "🟢",
    STRONG_SELL: "🔴🔴",
    SELL: "🔴",
    HOLD: "🟡",
  }[sig] || "⚪";

  const dirArrow = direction === "BUY" ? "📈" : "📉";
  const trendStr = aboveSma50 ? "📊 Uptrend (above SMA50)" : "📊 Downtrend (below SMA50)";
  const time = new Date().toLocaleString("en-GB", { timeZone: "Africa/Accra", hour12: false });

  const reasonsStr = (reasons || []).slice(0, 4).map((r) => `  • ${r}`).join("\n");

  let msg = `${sigEmoji} <b>FDS TRADING SIGNAL</b> ${sigEmoji}\n`;
  msg += `━━━━━━━━━━━━━━━━━━━\n`;
  msg += `<b>${label}</b> · ${market} · ${dirArrow} <b>${sig.replace("_", " ")}</b>\n`;
  msg += `💰 Price: <code>${price}</code>\n`;
  msg += `${confidence ? `🎯 Confidence: <b>${confidence}%</b>\n` : ""}`;
  msg += `${trendStr}\n`;
  msg += `━━━━━━━━━━━━━━━━━━━\n`;
  msg += `<b>📐 Indicators</b>\n`;
  msg += `  RSI: <code>${rsi?.toFixed(1) || "N/A"}</code>`;
  msg += `  BB%: <code>${bbPos?.toFixed(1) || "N/A"}</code>\n`;
  msg += `  Stoch: <code>${stochK?.toFixed(1) || "N/A"}</code>`;
  msg += `  MACD: ${macd ? (macd > 0 ? "▲ Bullish" : "▼ Bearish") : "N/A"}\n`;
  msg += `  SMA20: <code>${sma20 ? Number(sma20).toFixed(4) : "N/A"}</code>`;
  msg += `  SMA50: <code>${sma50 ? Number(sma50).toFixed(4) : "N/A"}</code>\n`;
  if (bull !== undefined) {
    msg += `  Bull score: ${bull} | Bear score: ${bear}\n`;
  }
  if (reasonsStr) {
    msg += `\n<b>📋 Signal reasons</b>\n${reasonsStr}\n`;
  }
  if (entryZone || sl || tp1) {
    msg += `━━━━━━━━━━━━━━━━━━━\n`;
    msg += `<b>🎯 Trade levels</b>\n`;
    if (entryZone) msg += `  Entry: <code>${entryZone}</code>\n`;
    if (sl) msg += `  Stop Loss: <code>${sl}</code> 🛑\n`;
    if (tp1) msg += `  Take Profit 1: <code>${tp1}</code> ✅\n`;
    if (tp2) msg += `  Take Profit 2: <code>${tp2}</code> ✅\n`;
  }
  msg += `━━━━━━━━━━━━━━━━━━━\n`;
  msg += `⏰ ${time}\n`;
  msg += `⚠️ <i>For educational purposes only. Not financial advice.</i>\n`;
  msg += `📱 <i>FDS Trading by Frankev Digital Services</i>`;

  return msg;
}

// Sends a message via the /api/telegram proxy
export async function sendTelegramMessage(chatId, message) {
  const r = await fetch("/api/telegram", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chatId, message }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data?.error || "Telegram send failed");
  return data;
}

// Sends a test ping to confirm the connection works
export async function sendTestMessage(chatId) {
  const msg =
    `✅ <b>FDS Trading — Telegram Connected!</b>\n\n` +
    `Your signal alerts are now active. You will receive notifications here whenever the scanner finds a signal above your confidence threshold.\n\n` +
    `📱 <i>FDS Trading by Frankev Digital Services</i>`;
  return sendTelegramMessage(chatId, msg);
}
