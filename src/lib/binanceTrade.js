// FDS Trading - Binance Testnet client helper
//
// Keys are kept in localStorage on this device only and sent to our own
// /api/binance-testnet function on each call, which signs and forwards the
// request to Binance's sandbox (testnet.binance.vision). They are never sent
// anywhere else and this module never talks to the real exchange.

const STORAGE_KEY = "fds_binance_testnet_keys";

export function loadKeys() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveKeys(apiKey, apiSecret) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ apiKey, apiSecret }));
}

export function clearKeys() {
  localStorage.removeItem(STORAGE_KEY);
}

async function call(action, params, keys) {
  const k = keys || loadKeys();
  const r = await fetch("/api/binance-testnet", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      apiKey: k?.apiKey,
      apiSecret: k?.apiSecret,
      action,
      params: params || {},
    }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data?.error || "Binance Testnet request failed");
  return data;
}

/** Verifies a key/secret pair works by fetching the account snapshot. */
export async function testConnection(apiKey, apiSecret) {
  return call("account", {}, { apiKey, apiSecret });
}

/** Fetches current testnet balances (only assets with nonzero balance). */
export async function getAccount() {
  const data = await call("account", {});
  const balances = (data.balances || []).filter(
    (b) => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0
  );
  return { ...data, balances };
}

/**
 * Opens a long position with a real Binance Testnet market BUY order,
 * spending `usdtAmount` of quote currency. Using quoteOrderQty avoids manual
 * lot-size math - Binance fills as much base asset as that amount buys.
 */
export async function marketBuyByQuote(binanceSymbol, usdtAmount) {
  const data = await call("order", {
    symbol: binanceSymbol,
    side: "BUY",
    type: "MARKET",
    quoteOrderQty: usdtAmount,
  });
  const executedQty = parseFloat(data.executedQty);
  const quoteSpent = parseFloat(data.cummulativeQuoteQty);
  const avgPrice = executedQty > 0 ? quoteSpent / executedQty : 0;
  return { raw: data, executedQty, quoteSpent, avgPrice };
}

/**
 * Closes a position with a real Binance Testnet market SELL order for the
 * exact base-asset quantity bought earlier (so it always satisfies the lot
 * size that the original buy fill already conformed to).
 */
export async function marketSellByQuantity(binanceSymbol, quantity) {
  const data = await call("order", {
    symbol: binanceSymbol,
    side: "SELL",
    type: "MARKET",
    quantity,
  });
  const executedQty = parseFloat(data.executedQty);
  const quoteReceived = parseFloat(data.cummulativeQuoteQty);
  const avgPrice = executedQty > 0 ? quoteReceived / executedQty : 0;
  return { raw: data, executedQty, quoteReceived, avgPrice };
}
