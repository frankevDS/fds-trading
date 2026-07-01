// FDS Trading - cloud sync layer v2
//
// Key fixes over v1:
// 1. Trade saves are awaited and retried - no more lost trades on race conditions
// 2. On session load, local and cloud data are MERGED (not overwritten) so
//    trades placed just before a second device connects are preserved
// 3. Broker keys stored in Supabase profiles table (encrypted base64) so they
//    sync across devices
// 4. localStorage is only used as offline fallback, never as primary on login

import { supabase } from "./supabase";
import { storage } from "./storage";
import { INIT_WALLET } from "./constants";

// ─── Retry helper ─────────────────────────────────────────────────────────────
async function withRetry(fn, retries = 3, label = "") {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (e) {
      if (i === retries - 1) {
        console.warn(`cloudSync ${label} failed after ${retries} attempts:`, e?.message);
        throw e;
      }
      await new Promise((r) => setTimeout(r, 500 * (i + 1)));
    }
  }
}

// ─── Trades ───────────────────────────────────────────────────────────────────

export async function loadTrades(userId) {
  if (!supabase || !userId) return storage.loadTrades([]);
  try {
    const { data, error } = await supabase
      .from("trades")
      .select("*")
      .eq("user_id", userId)
      .order("open_date", { ascending: false });
    if (error) throw error;
    const cloudTrades = (data || []).map(dbToTrade);

    // MERGE: find any local trades that aren't in Supabase yet (offline trades)
    const localTrades = storage.loadTrades([]);
    const cloudIds = new Set(cloudTrades.map((t) => String(t.tradeId)));
    const localOnly = localTrades.filter((t) => !cloudIds.has(String(t.tradeId)));

    if (localOnly.length > 0) {
      // Push local-only trades up to Supabase
      console.log(`cloudSync: syncing ${localOnly.length} local-only trades to Supabase`);
      for (const t of localOnly) {
        try {
          await supabase.from("trades").upsert(tradeToDb(userId, t), { onConflict: "user_id,trade_id" });
        } catch (e) {
          console.warn("cloudSync: failed to push local trade", t.label, e?.message);
        }
      }
      return [...localOnly, ...cloudTrades];
    }

    return cloudTrades;
  } catch (e) {
    console.warn("cloudSync loadTrades fallback:", e?.message);
    return storage.loadTrades([]);
  }
}

export async function saveTrade(userId, trade) {
  if (!supabase || !userId) return;
  // Always save to localStorage first as immediate backup
  const existing = storage.loadTrades([]);
  const next = existing.find((t) => String(t.tradeId) === String(trade.tradeId))
    ? existing.map((t) => (String(t.tradeId) === String(trade.tradeId) ? trade : t))
    : [...existing, trade];
  storage.saveTrades(next);

  // Then push to Supabase with retry
  await withRetry(
    () => supabase.from("trades").upsert(tradeToDb(userId, trade), { onConflict: "user_id,trade_id" }),
    3,
    `saveTrade(${trade.label})`
  );
}

export async function updateTrade(userId, tradeId, updates) {
  // Update localStorage first
  const existing = storage.loadTrades([]);
  storage.saveTrades(existing.map((t) => (String(t.tradeId) === String(tradeId) ? { ...t, ...updates } : t)));

  if (!supabase || !userId) return;
  const dbUpdates = {};
  if (updates.status !== undefined) dbUpdates.status = updates.status;
  if (updates.pnl !== undefined) dbUpdates.pnl = updates.pnl;
  if (updates.closePrice !== undefined) dbUpdates.close_price = updates.closePrice;
  if (updates.closeDate !== undefined) dbUpdates.close_date = updates.closeDate;
  await withRetry(
    () => supabase.from("trades").update(dbUpdates).eq("user_id", userId).eq("trade_id", tradeId),
    3,
    `updateTrade(${tradeId})`
  );
}

// ─── Wallet ───────────────────────────────────────────────────────────────────

export async function loadWallet(userId) {
  if (!supabase || !userId) return storage.loadWallet(INIT_WALLET);
  try {
    const [walletRes, histRes] = await Promise.all([
      supabase.from("wallets").select("*").eq("user_id", userId).single(),
      supabase.from("wallet_history").select("*").eq("user_id", userId).order("date", { ascending: true }),
    ]);
    if (walletRes.error && walletRes.error.code !== "PGRST116") throw walletRes.error;
    const wallet = walletRes.data
      ? {
          balance: parseFloat(walletRes.data.balance),
          totalDeposited: parseFloat(walletRes.data.total_deposited),
          history: (histRes.data || []).map((h) => ({
            type: h.type,
            amount: parseFloat(h.amount),
            note: h.note,
            date: h.date,
          })),
        }
      : INIT_WALLET;
    return wallet;
  } catch (e) {
    console.warn("cloudSync loadWallet fallback:", e?.message);
    return storage.loadWallet(INIT_WALLET);
  }
}

export async function saveWallet(userId, wallet) {
  if (!supabase || !userId) return;
  await withRetry(
    () => supabase.from("wallets").upsert(
      { user_id: userId, balance: wallet.balance, total_deposited: wallet.totalDeposited, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    ),
    3,
    "saveWallet"
  );
}

export async function addWalletHistory(userId, entry) {
  if (!supabase || !userId) return;
  try {
    await supabase.from("wallet_history").insert({
      user_id: userId,
      type: entry.type,
      amount: entry.amount,
      note: entry.note,
      date: entry.date || new Date().toISOString(),
    });
  } catch (e) {
    console.warn("cloudSync addWalletHistory:", e?.message);
  }
}

// ─── Journal ──────────────────────────────────────────────────────────────────

export async function loadJournal(userId) {
  if (!supabase || !userId) return storage.loadJournal([]);
  try {
    const { data, error } = await supabase
      .from("journal_entries")
      .select("*")
      .eq("user_id", userId)
      .order("date", { ascending: false });
    if (error) throw error;
    return (data || []).map((r) => ({
      id: r.entry_id,
      symbol: r.symbol,
      market: r.market,
      signal: r.signal,
      result: r.result,
      pnlPct: r.pnl_pct,
      sl: r.sl,
      tp: r.tp,
      notes: r.notes,
      date: r.date,
    }));
  } catch (e) {
    console.warn("cloudSync loadJournal fallback:", e?.message);
    return storage.loadJournal([]);
  }
}

export async function saveJournalEntry(userId, entry) {
  if (!supabase || !userId) return;
  try {
    await supabase.from("journal_entries").upsert(
      {
        user_id: userId,
        entry_id: entry.id,
        symbol: entry.symbol,
        market: entry.market,
        signal: entry.signal,
        result: entry.result,
        pnl_pct: entry.pnlPct,
        sl: entry.sl,
        tp: entry.tp,
        notes: entry.notes,
        date: entry.date,
      },
      { onConflict: "user_id,entry_id" }
    );
  } catch (e) {
    console.warn("cloudSync saveJournalEntry:", e?.message);
  }
}

// ─── Watchlist ────────────────────────────────────────────────────────────────

export async function loadWatchlist(userId) {
  if (!supabase || !userId) return storage.loadWatchlist([]);
  try {
    const { data, error } = await supabase
      .from("watchlists")
      .select("instrument_ids")
      .eq("user_id", userId)
      .single();
    if (error && error.code !== "PGRST116") throw error;
    return data?.instrument_ids || [];
  } catch (e) {
    console.warn("cloudSync loadWatchlist fallback:", e?.message);
    return storage.loadWatchlist([]);
  }
}

export async function saveWatchlist(userId, ids) {
  if (!supabase || !userId) return;
  try {
    await supabase
      .from("watchlists")
      .upsert({ user_id: userId, instrument_ids: ids }, { onConflict: "user_id" });
  } catch (e) {
    console.warn("cloudSync saveWatchlist:", e?.message);
  }
}

// ─── Broker keys (cross-device sync) ──────────────────────────────────────────
// Keys are base64-encoded before storing so they don't sit as plain text.
// This is obfuscation, not encryption - the real security is Supabase RLS
// which ensures users can only read their own profile row.

function encodeKeys(apiKey, apiSecret) {
  return btoa(JSON.stringify({ apiKey, apiSecret }));
}

function decodeKeys(encoded) {
  try {
    return JSON.parse(atob(encoded));
  } catch {
    return null;
  }
}

export async function saveBrokerKeys(userId, apiKey, apiSecret) {
  if (!supabase || !userId) return;
  try {
    await supabase
      .from("profiles")
      .update({ broker_keys: encodeKeys(apiKey, apiSecret) })
      .eq("id", userId);
  } catch (e) {
    console.warn("cloudSync saveBrokerKeys:", e?.message);
  }
}

export async function loadBrokerKeys(userId) {
  if (!supabase || !userId) return null;
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("broker_keys")
      .eq("id", userId)
      .single();
    if (error) throw error;
    return data?.broker_keys ? decodeKeys(data.broker_keys) : null;
  } catch (e) {
    console.warn("cloudSync loadBrokerKeys:", e?.message);
    return null;
  }
}

export async function clearBrokerKeys(userId) {
  if (!supabase || !userId) return;
  try {
    await supabase.from("profiles").update({ broker_keys: null }).eq("id", userId);
  } catch (e) {
    console.warn("cloudSync clearBrokerKeys:", e?.message);
  }
}

// ─── Admin ────────────────────────────────────────────────────────────────────

export async function loadAllUsers() {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (e) {
    console.warn("cloudSync loadAllUsers:", e?.message);
    return [];
  }
}

export async function approveUser(userId) {
  if (!supabase) return;
  await supabase.from("profiles").update({ approved: true }).eq("id", userId);
}

export async function revokeUser(userId) {
  if (!supabase) return;
  await supabase.from("profiles").update({ approved: false }).eq("id", userId);
}

export async function loadUserTrades(userId) {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from("trades")
      .select("*")
      .eq("user_id", userId)
      .order("open_date", { ascending: false });
    if (error) throw error;
    return (data || []).map(dbToTrade);
  } catch (e) {
    return [];
  }
}

export async function loadProfile(userId) {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    if (error) throw error;
    return data;
  } catch (e) {
    console.warn("cloudSync loadProfile:", e?.message);
    return null;
  }
}

// ─── Converters ───────────────────────────────────────────────────────────────

function tradeToDb(userId, t) {
  return {
    user_id: userId,
    trade_id: t.tradeId,
    label: t.label,
    market: t.market,
    direction: t.direction,
    signal: t.signal || null,
    invested: t.invested,
    entry_price: t.entryPrice,
    close_price: t.closePrice || null,
    units: t.units,
    leverage: t.leverage || 1,
    sl: t.sl || null,
    tp: t.tp || null,
    status: t.status,
    pnl: t.pnl || 0,
    broker: t.broker || null,
    binance_symbol: t.binanceSymbol || null,
    open_date: t.openDate,
    close_date: t.closeDate || null,
    instrument_id: t.id || null,
  };
}

function dbToTrade(r) {
  return {
    tradeId: r.trade_id,
    id: r.instrument_id,
    label: r.label,
    market: r.market,
    direction: r.direction,
    signal: r.signal,
    invested: parseFloat(r.invested),
    entryPrice: parseFloat(r.entry_price),
    closePrice: r.close_price ? parseFloat(r.close_price) : undefined,
    units: parseFloat(r.units),
    leverage: r.leverage || 1,
    sl: r.sl,
    tp: r.tp,
    status: r.status,
    pnl: parseFloat(r.pnl || 0),
    broker: r.broker,
    binanceSymbol: r.binance_symbol,
    openDate: r.open_date,
    closeDate: r.close_date,
  };
}
