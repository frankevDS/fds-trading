// FDS Trading - Economic Calendar proxy
//
// Fetches high-impact economic events from ForexFactory's public calendar
// RSS feed. The browser can't fetch this directly due to CORS, so this
// serverless function acts as a proxy.
//
// Returns the next 7 days of HIGH impact events with time, currency, title,
// and impact level so the app can warn traders before major news.

import { checkOrigin, rateLimit } from "./_security.js";

// Known recurring high-impact events used as fallback / supplement
const KNOWN_HIGH_IMPACT = [
  { title: "Non-Farm Payroll (NFP)", currency: "USD", day: 5, week: 1 }, // First Friday
  { title: "FOMC Rate Decision", currency: "USD", recurring: "6-weekly" },
  { title: "CPI (Inflation)", currency: "USD", recurring: "monthly" },
  { title: "ECB Rate Decision", currency: "EUR", recurring: "6-weekly" },
];

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  if (!checkOrigin(req)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  if (!rateLimit(req, { windowMs: 300000, max: 10 })) {
    res.status(429).json({ error: "Too many requests - calendar updates every 5 minutes" });
    return;
  }

  try {
    // ForexFactory calendar JSON (unofficial but stable)
    const r = await fetch("https://nfs.faireconomy.media/ff_calendar_thisweek.json", {
      headers: { "Accept": "application/json" }
    });

    if (!r.ok) throw new Error(`Calendar fetch failed: ${r.status}`);

    const raw = await r.json();
    const now = new Date();
    const upcoming72h = new Date(now.getTime() + 72 * 60 * 60 * 1000);

    const events = (raw || [])
      .filter((e) => {
        const impact = (e.impact || "").toLowerCase();
        const date = new Date(e.date);
        return (
          (impact === "high" || impact === "3") &&
          date >= now &&
          date <= upcoming72h
        );
      })
      .map((e) => ({
        title: e.title || e.name || "Major Event",
        currency: e.country || e.currency || "USD",
        date: e.date,
        impact: "HIGH",
        forecast: e.forecast || null,
        previous: e.previous || null,
      }))
      .slice(0, 20);

    res.status(200).json({ events, source: "forexfactory", updated: now.toISOString() });
  } catch (err) {
    // Return empty list gracefully - calendar is enhancement, not critical
    res.status(200).json({
      events: [],
      error: err?.message,
      note: "Calendar unavailable - trading continues normally but check news manually before major pairs",
      updated: new Date().toISOString(),
    });
  }
}
