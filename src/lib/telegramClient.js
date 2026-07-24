// FDS Trading - Telegram client with professional signal format
//
// Produces complete, actionable signal messages with:
// - Entry zone, Stop Loss, Take Profit 1/2/3
// - Risk:Reward ratios for each target
// - Multi-timeframe confirmation status
// - Volume analysis
// - Candlestick patterns detected
// - ATR-based risk amount per $1000 invested
// - Economic calendar warning if major event nearby

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

// ─── Professional signal formatter ───────────────────────────────────────────
export function formatSignalMessage(signal) {
  const {
    label, market, direction, price, sig, confidence,
    rsi, macdAboveSignal, bbPos, stochK, sma20, sma50,
    aboveSma50, aboveVwap, obvTrend, volumeAboveAverage,
    bull, bear, reasons, patterns,
    // ATR-based trade levels
    levels,
    // Multi-timeframe
    mtf,
    // Economic calendar
    newsWarning,
    atr,
  } = signal;

  const isBuy = direction === "BUY" || sig?.includes("BUY");
  const dirEmoji = isBuy ? "📈" : "📉";
  const sigEmoji = {
    STRONG_BUY: "🟢🟢", BUY: "🟢",
    STRONG_SELL: "🔴🔴", SELL: "🔴", HOLD: "🟡",
  }[sig] || "⚪";

  const time = new Date().toLocaleString("en-GB", {
    timeZone: "Africa/Accra", hour12: false,
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  const fmt = (n, decimals = 2) =>
    n != null && !isNaN(n) ? Number(n).toFixed(decimals) : "N/A";

  const fmtPrice = (p) => {
    if (p == null) return "N/A";
    if (p > 1000) return Number(p).toLocaleString("en-US", { maximumFractionDigits: 0 });
    if (p > 1) return Number(p).toFixed(4);
    return Number(p).toFixed(6);
  };

  // Risk per $1000 if SL is hit
  const riskPer1000 = levels?.riskPct ? (levels.riskPct / 100) * 1000 : null;

  let msg = "";

  // ── HEADER ────────────────────────────────────────────────────────────────
  msg += `${sigEmoji} <b>FDS TRADING SIGNAL</b> ${sigEmoji}\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `${dirEmoji} <b>${label}</b>  |  ${market}  |  <b>${(sig || "").replace("_", " ")}</b>\n`;
  if (confidence) msg += `🎯 Confidence: <b>${confidence}%</b>\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

  // ── PRICE & ENTRY ZONE ────────────────────────────────────────────────────
  msg += `💰 <b>PRICE NOW:</b> <code>${fmtPrice(price)}</code>\n`;
  if (levels) {
    msg += `\n🎯 <b>TRADE SETUP</b>\n`;
    msg += `├ Entry Zone: <code>${fmtPrice(levels.entryLow)} – ${fmtPrice(levels.entryHigh)}</code>\n`;
    msg += `├ 🛑 Stop Loss: <code>${fmtPrice(levels.sl)}</code>`;
    if (levels.riskPct) msg += `  <i>(-${fmt(levels.riskPct)}%)</i>`;
    msg += `\n`;
    msg += `├ ✅ TP 1: <code>${fmtPrice(levels.tp1)}</code>`;
    if (levels.rr1) msg += `  <i>R:R 1:${fmt(levels.rr1)}</i>`;
    msg += `\n`;
    msg += `├ ✅ TP 2: <code>${fmtPrice(levels.tp2)}</code>`;
    if (levels.rr2) msg += `  <i>R:R 1:${fmt(levels.rr2)}</i>`;
    msg += `\n`;
    msg += `└ 🏆 TP 3: <code>${fmtPrice(levels.tp3)}</code>`;
    if (levels.rr3) msg += `  <i>R:R 1:${fmt(levels.rr3)}</i>`;
    msg += `\n`;
    if (riskPer1000) {
      msg += `\n⚠️ Risk per $1,000 if SL hit: <b>$${fmt(riskPer1000)}</b>\n`;
      msg += `   (Use 1-2% account risk max — size position accordingly)\n`;
    }
    if (atr) msg += `📏 ATR(14): <code>${fmtPrice(atr)}</code>  <i>current volatility unit</i>\n`;
  }

  // ── MULTI-TIMEFRAME ───────────────────────────────────────────────────────
  if (mtf && mtf.tf) {
    msg += `\n📊 <b>TIMEFRAME ALIGNMENT</b>\n`;
    const tfEmoji = (s) => {
      if (!s || s === "HOLD") return "🟡";
      if (s.includes("BUY")) return "🟢";
      if (s.includes("SELL")) return "🔴";
      return "⚪";
    };
    msg += `├ 1m:  ${tfEmoji(mtf.tf["1m"])} ${mtf.tf["1m"] || "N/A"}\n`;
    msg += `├ 15m: ${tfEmoji(mtf.tf["15m"])} ${mtf.tf["15m"] || "N/A"}\n`;
    msg += `└ 1h:  ${tfEmoji(mtf.tf["1h"])} ${mtf.tf["1h"] || "N/A"}\n`;
    if (mtf.mtfConfirmed) {
      msg += `✅ <b>ALL TIMEFRAMES CONFIRMED</b> — strongest setup\n`;
    } else {
      msg += `⚠️ <i>Partial alignment — trade with reduced size</i>\n`;
    }
  }

  // ── INDICATORS ────────────────────────────────────────────────────────────
  msg += `\n📐 <b>INDICATORS</b>\n`;
  msg += `├ RSI(14):   <code>${fmt(rsi, 1)}</code>`;
  if (rsi < 30) msg += `  🟢 Oversold`;
  else if (rsi > 70) msg += `  🔴 Overbought`;
  msg += `\n`;
  msg += `├ MACD:      ${macdAboveSignal ? "🟢 Above signal (bullish)" : "🔴 Below signal (bearish)"}\n`;
  msg += `├ BB%:       <code>${fmt(bbPos, 1)}%</code>`;
  if (bbPos < 20) msg += `  🟢 Near lower band`;
  else if (bbPos > 80) msg += `  🔴 Near upper band`;
  msg += `\n`;
  msg += `├ Stoch:     <code>${fmt(stochK, 1)}</code>`;
  if (stochK < 20) msg += `  🟢 Oversold`;
  else if (stochK > 80) msg += `  🔴 Overbought`;
  msg += `\n`;
  msg += `├ SMA20:     <code>${fmtPrice(sma20)}</code>\n`;
  msg += `├ SMA50:     <code>${fmtPrice(sma50)}</code>`;
  msg += aboveSma50 ? `  🟢 Uptrend` : `  🔴 Downtrend`;
  msg += `\n`;
  if (aboveVwap != null) {
    msg += `├ VWAP:      ${aboveVwap ? "🟢 Price above VWAP" : "🔴 Price below VWAP"}\n`;
  }
  if (obvTrend) {
    msg += `└ OBV:       ${obvTrend === "RISING" ? "🟢 Rising (buying pressure)" : "🔴 Falling (selling pressure)"}\n`;
  }

  // ── VOLUME ────────────────────────────────────────────────────────────────
  if (volumeAboveAverage != null) {
    msg += `\n📦 <b>VOLUME</b>\n`;
    msg += volumeAboveAverage
      ? `✅ Above average — confirms the move\n`
      : `⚠️ Below average — treat with caution\n`;
  }

  // ── PATTERNS ─────────────────────────────────────────────────────────────
  if (patterns && patterns.length > 0) {
    msg += `\n🕯️ <b>CANDLE PATTERNS</b>\n`;
    patterns.forEach((p) => {
      const e = p.bias === "BULL" ? "🟢" : p.bias === "BEAR" ? "🔴" : "🟡";
      msg += `${e} ${p.name.replace(/_/g, " ")} (strength ${p.strength}/4)\n`;
    });
  }

  // ── SIGNAL REASONS ────────────────────────────────────────────────────────
  if (reasons && reasons.length > 0) {
    msg += `\n📋 <b>SIGNAL REASONS</b>\n`;
    reasons.slice(0, 6).forEach((r) => { msg += `• ${r}\n`; });
    if (bull !== undefined) {
      msg += `\nBull score: <b>${bull}</b>  |  Bear score: <b>${bear}</b>\n`;
    }
  }

  // ── NEWS WARNING ──────────────────────────────────────────────────────────
  if (newsWarning && newsWarning.length > 0) {
    msg += `\n🚨 <b>NEWS WARNING</b>\n`;
    newsWarning.forEach((n) => {
      msg += `⚠️ ${n.title} (${n.currency}) — ${new Date(n.date).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}\n`;
    });
    msg += `<i>Consider waiting until after this event before entering</i>\n`;
  }

  // ── RISK MANAGEMENT REMINDER ──────────────────────────────────────────────
  msg += `\n📌 <b>RISK RULES</b>\n`;
  msg += `• Max 1-2% account risk per trade\n`;
  msg += `• Set Stop Loss before entering\n`;
  msg += `• Take partial profit at TP1\n`;
  msg += `• Move SL to breakeven after TP1 hit\n`;

  // ── FOOTER ────────────────────────────────────────────────────────────────
  msg += `\n━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `⏰ <b>${time}</b>\n`;
  msg += `📱 <i>FDS Trading — Frankev Digital Services</i>\n`;
  msg += `⚠️ <i>For educational purposes only. Not financial advice. Always do your own analysis.</i>`;

  return msg;
}

// ─── Send via API proxy ───────────────────────────────────────────────────────
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

export async function sendTestMessage(chatId) {
  const msg =
    `✅ <b>FDS Trading — Telegram Connected!</b>\n\n` +
    `You will now receive professional trading signals here with:\n` +
    `• Entry zone, Stop Loss, Take Profit 1/2/3\n` +
    `• Risk:Reward ratios for each target\n` +
    `• Multi-timeframe confirmation\n` +
    `• Volume analysis and candle patterns\n` +
    `• News warnings before major events\n\n` +
    `📱 <i>FDS Trading — Frankev Digital Services</i>`;
  return sendTelegramMessage(chatId, msg);
}
