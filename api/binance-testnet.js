// FDS Trading - Binance Spot TESTNET proxy
//
// Binance Testnet keys (from https://testnet.binance.vision) are sandbox-only
// and hold no real funds, but request-signing still needs a secret, and
// secrets don't belong in browser JS. This function receives the key/secret
// from the client per-request, signs the request server-side with HMAC
// SHA256, forwards it to Binance Testnet, and returns the result. Nothing is
// stored or logged here - the keys live only in the browser (see
// src/lib/binanceTrade.js) and pass through this function on each call.
//
// This intentionally only ever talks to testnet.binance.vision, never the
// real exchange, so there is no path from this app to a live trading account.

import crypto from "crypto";
import { checkOrigin, rateLimit } from "./_security.js";

const BASE = "https://testnet.binance.vision";

const ACTIONS = {
  account: { method: "GET", path: "/api/v3/account", signed: true },
  order: { method: "POST", path: "/api/v3/order", signed: true },
  openOrders: { method: "GET", path: "/api/v3/openOrders", signed: true },
  allOrders: { method: "GET", path: "/api/v3/allOrders", signed: true },
  ping: { method: "GET", path: "/api/v3/ping", signed: false },
};

function sign(queryString, secret) {
  return crypto.createHmac("sha256", secret).update(queryString).digest("hex");
}

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
    res.status(429).json({ error: "Too many requests - please wait a moment and try again." });
    return;
  }

  const { apiKey, apiSecret, action, params } = req.body || {};
  const def = ACTIONS[action];

  if (!def) {
    res.status(400).json({ error: `Unknown action: ${action}` });
    return;
  }
  if (def.signed && (!apiKey || !apiSecret)) {
    res.status(400).json({ error: "Missing Binance Testnet API key or secret" });
    return;
  }

  try {
    const qp = new URLSearchParams(params || {});
    if (def.signed) {
      qp.set("timestamp", String(Date.now()));
      qp.set("recvWindow", "10000");
      qp.set("signature", sign(qp.toString(), apiSecret));
    }

    const qs = qp.toString();
    const url = `${BASE}${def.path}${qs ? `?${qs}` : ""}`;

    let r;
    try {
      r = await fetch(url, {
        method: def.method,
        headers: apiKey ? { "X-MBX-APIKEY": apiKey } : {},
        signal: AbortSignal.timeout(15000),
      });
    } catch (fetchErr) {
      const msg = fetchErr?.name === "AbortError"
        ? "Binance Testnet connection timed out. The testnet may be slow — please try again."
        : `Cannot reach Binance Testnet: ${fetchErr?.message}`;
      return res.status(503).json({ error: msg });
    }

    // Read as text first — Binance sometimes returns HTML on geo-block or error
    const rawText = await r.text();
    let data;
    try {
      data = JSON.parse(rawText);
    } catch {
      // Binance returned HTML (geo-block or server error page)
      if (rawText.toLowerCase().includes("eligibility") || rawText.toLowerCase().includes("restricted")) {
        return res.status(403).json({
          error: "Service unavailable from a restricted location according to Binance eligibility rules. Check your Vercel region is set to Frankfurt (fra1) in vercel.json.",
        });
      }
      if (rawText.toLowerCase().includes("cloudflare") || rawText.toLowerCase().includes("503")) {
        return res.status(503).json({ error: "Binance Testnet is temporarily unavailable. Please try again in a few minutes." });
      }
      return res.status(500).json({
        error: "Binance Testnet returned an unexpected response (not JSON). This usually means the server is temporarily unavailable or your region is blocked.",
        hint: "Make sure vercel.json has regions: ['fra1'] and that your Vercel project is deployed to Frankfurt.",
      });
    }

    if (!r.ok) {
      res.status(r.status).json({
        error: data?.msg || "Binance Testnet returned an error",
        code: data?.code,
      });
      return;
    }

    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err?.message || "Unknown server error" });
  }
}
