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

    const r = await fetch(url, {
      method: def.method,
      headers: apiKey ? { "X-MBX-APIKEY": apiKey } : {},
    });

    const data = await r.json();

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
