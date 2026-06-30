// FDS Trading - cloud sync layer
//
// All read/write operations go through this module. It talks to Supabase
// when the user is logged in and falls back to localStorage when offline or
// logged out. The app never needs to know which storage backend is active.

import { supabase } from "./supabase";
import { storage } from "./storage";
import { INIT_WALLET } from "./constants";

// ─── Trades ──────────────────────────────────────────────────────────────────

export async function loadTrades(userId) {
  if (!supabase || !userId) return storage.loadTrades([]);
  try {
    const { data, error } = await supabase
      .from("trades")
      .select("*")
      .eq("user_id", userId)
      .order("open_date", { ascending: false });
    if (error) throw error;
    return (data || []).map(dbToTrade);
  } catch (e) {
    console.warn("cloudSync loadTrades fallback:", e?.message);
    return storage.loadTrades([]);
  }
}

export async function saveTrade(userId, trade) {
  storage.saveTrades([]); // local no longer primary; keep for offline backup
  if (!supabase || !userId) return;
  try {
    const row = tradeToDb(userId, trade);
    await supabase.from("trades").upsert(row, { onConflict: "user_id,trade_id" });
  } catch (e) {
    console.warn("cloudSync saveTrade:", e?.message);
  }
}

export async function updateTrade(userId, tradeId, updates) {
  if (!supabase || !userId) return;
  try {
    const dbUpdates = {};
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.pnl !== undefined) dbUpdates.pnl = updates.pnl;
    if (updates.closePrice !== undefined) dbUpdates.close_price = updates.closePrice;
    if (updates.closeDate !== undefined) dbUpdates.close_date = updates.closeDate;
    await supabase
      .from("trades")
      .update(dbUpdates)
      .eq("user_id", userId)
      .eq("trade_id", tradeId);
  } catch (e) {
    console.warn("cloudSync updateTrade:", e?.message);
  }
}

// ─── Wallet ───────────────────────────────────────────────────────────────────

export async function loadWallet(userId) {
  if (!supabase || !userId) return storage.loadWallet(INIT_WALLET);
  try {
    const [walletRes, histRes] = await Promise.all([
      supabase.from("wallets").select("*").eq("user_id", userId).single(),
      supabase
        .from("wallet_history")
        .select("*")
        .eq("user_id", userId)
        .order("date", { ascending: true }),
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
  try {
    await supabase.from("wallets").upsert(
      { user_id: userId, balance: wallet.balance, total_deposited: wallet.totalDeposited, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );
  } catch (e) {
    console.warn("cloudSync saveWallet:", e?.message);
  }
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

// ─── Profile ──────────────────────────────────────────────────────────────────

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
