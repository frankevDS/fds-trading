// FDS Trading - Telegram signal alert proxy
//
// Receives a formatted signal from the browser and forwards it to Telegram
// via the Bot API. The bot token lives server-side so it never reaches the
// browser. The chat_id is supplied per-request (stored in the browser's
// localStorage by the settings panel).
//
// Set TELEGRAM_BOT_TOKEN in Vercel > Project > Settings > Environment
// Variables. See README for how to create your bot via BotFather.
//
// Rate: Telegram allows 1 message/second to the same chat. The scanner
// already de-duplicates signals (same instrument won't fire twice within
// 10 minutes) so this is not an issue in practice.

import { checkOrigin, rateLimit } from "./_security.js";

const TG_BASE = "https://api.telegram.org";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  if (!checkOrigin(req)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  if (!rateLimit(req, { windowMs: 60000, max: 30 })) {
    res.status(429).json({ error: "Too many requests" });
    return;
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    res.status(500).json({
      error:
        "TELEGRAM_BOT_TOKEN is not set. Add it under Vercel > Project > Settings > Environment Variables, then redeploy.",
    });
    return;
  }

  const { chatId, message } = req.body || {};
  if (!chatId || !message) {
    res.status(400).json({ error: "Missing chatId or message" });
    return;
  }

  if (typeof message !== "string" || message.length > 4000) {
    res.status(400).json({ error: "Message too long or invalid" });
    return;
  }

  try {
    const r = await fetch(`${TG_BASE}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });

    const data = await r.json();

    if (!r.ok || !data.ok) {
      res.status(r.status || 400).json({
        error: data?.description || "Telegram API returned an error",
        telegram_error_code: data?.error_code,
      });
      return;
    }

    res.status(200).json({ ok: true, message_id: data.result?.message_id });
  } catch (err) {
    res.status(500).json({ error: err?.message || "Unknown server error" });
  }
}
