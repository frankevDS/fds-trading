import React, { useState, useEffect, useCallback } from "react";
import { C, INSTRUMENTS, NAV_ITEMS, NAV_ICONS, MKTABS, INIT_WALLET } from "./lib/constants";
import { initBinanceFeed } from "./lib/binanceFeed";
import { hasStoredBinanceKeys } from "./components/BrokerView";
import { storage } from "./lib/storage";
import { supabase, isSupabaseReady } from "./lib/supabase";
import {
  loadTrades, saveTrade, updateTrade,
  loadWallet, saveWallet, addWalletHistory,
  loadJournal, saveJournalEntry,
  loadWatchlist, saveWatchlist,
  loadProfile,
} from "./lib/cloudSync";
import { StatCard } from "./components/shared";
import MarketCard from "./components/MarketCard";
import AIPanel from "./components/AIPanel";
import Scanner from "./components/Scanner";
import WalletView from "./components/WalletView";
import TradesView from "./components/TradesView";
import JournalView from "./components/JournalView";
import PortfolioView from "./components/PortfolioView";
import BrokerView from "./components/BrokerView";
import TradeModal from "./components/TradeModal";
import DashboardCharts from "./components/DashboardCharts";
import PriceAlerts from "./components/PriceAlerts";
import ChartPanel from "./components/ChartPanel";
import TelegramSettings from "./components/TelegramSettings";
import AuthScreen from "./components/AuthScreen";
import PendingApproval from "./components/PendingApproval";
import AdminPanel from "./components/AdminPanel";
import { startSignalMonitor } from "./lib/signalMonitor";

export default function App() {
  // ── Auth state ────────────────────────────────────────────────────────────
  const [authUser, setAuthUser] = useState(null);      // Supabase user object
  const [profile, setProfile] = useState(null);        // our profiles table row
  const [authLoading, setAuthLoading] = useState(true); // checking session
  const [showAdmin, setShowAdmin] = useState(false);

  // ── Trading state ─────────────────────────────────────────────────────────
  const [nav, setNav] = useState("DASHBOARD");
  const [mkt, setMkt] = useState("CRYPTO");
  const [rk, setRk] = useState(0);
  const [aiTarget, setAiTarget] = useState(null);
  const [journal, setJournal] = useState([]);
  const [trades, setTrades] = useState([]);
  const [watchlist, setWatchlist] = useState([]);
  const [tradeModal, setTradeModal] = useState(null);
  const [chartTrade, setChartTrade] = useState(null);
  const [wallet, setWallet] = useState(INIT_WALLET);
  const [clock, setClock] = useState(new Date());
  const [brokerConnected, setBrokerConnected] = useState(false);
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" && window.innerWidth < 860);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 860);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // ── Auth session listener ─────────────────────────────────────────────────
  useEffect(() => {
    if (!supabase) {
      // No Supabase configured - fall back to localStorage-only mode
      setTrades(storage.loadTrades([]));
      setWallet(storage.loadWallet(INIT_WALLET));
      setJournal(storage.loadJournal([]));
      setWatchlist(storage.loadWatchlist([]));
      setNav(storage.loadNav("DASHBOARD"));
      setMkt(storage.loadMktab("CRYPTO"));
      setAuthLoading(false);
      return;
    }

    // Check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        handleSessionUser(session.user);
      } else {
        setAuthLoading(false);
      }
    });

    // Listen for future auth changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        handleSessionUser(session.user);
      } else {
        // Logged out - clear state
        setAuthUser(null);
        setProfile(null);
        setTrades([]);
        setWallet(INIT_WALLET);
        setJournal([]);
        setWatchlist([]);
        setAuthLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleSessionUser(user) {
    setAuthUser(user);
    const prof = await loadProfile(user.id);
    setProfile(prof);

    // Load all user data from Supabase
    const [t, w, j, wl] = await Promise.all([
      loadTrades(user.id),
      loadWallet(user.id),
      loadJournal(user.id),
      loadWatchlist(user.id),
    ]);
    setTrades(t);
    setWallet(w);
    setJournal(j);
    setWatchlist(wl);
    setAuthLoading(false);
  }

  // ── App init (market data, monitor) ──────────────────────────────────────
  useEffect(() => {
    initBinanceFeed(INSTRUMENTS.CRYPTO);
    setBrokerConnected(hasStoredBinanceKeys());
    const iv = setInterval(() => setClock(new Date()), 1000);
    const stopMonitor = startSignalMonitor();
    return () => {
      clearInterval(iv);
      stopMonitor && stopMonitor();
    };
  }, []);

  // ── Persist to localStorage as offline backup ─────────────────────────────
  useEffect(() => { storage.saveTrades(trades); }, [trades]);
  useEffect(() => { storage.saveWallet(wallet); }, [wallet]);
  useEffect(() => { storage.saveJournal(journal); }, [journal]);
  useEffect(() => { storage.saveWatchlist(watchlist); }, [watchlist]);
  useEffect(() => { storage.saveNav(nav); }, [nav]);
  useEffect(() => { storage.saveMktab(mkt); }, [mkt]);

  const deposit = (amt) => {
    const entry = { type: "DEPOSIT", amount: amt, note: "Manual deposit", date: new Date().toISOString() };
    setWallet((w) => {
      const next = { ...w, balance: w.balance + amt, totalDeposited: w.totalDeposited + amt, history: [...w.history, entry] };
      if (authUser) { saveWallet(authUser.id, next); addWalletHistory(authUser.id, entry); }
      return next;
    });
  };

  const withdraw = (amt) => {
    const entry = { type: "WITHDRAW", amount: -amt, note: "Manual withdrawal", date: new Date().toISOString() };
    setWallet((w) => {
      const next = { ...w, balance: w.balance - amt, history: [...w.history, entry] };
      if (authUser) { saveWallet(authUser.id, next); addWalletHistory(authUser.id, entry); }
      return next;
    });
  };

  const placeTrade = (trade) => {
    if (trade.broker === "BINANCE_TESTNET") {
      setTrades((ts) => { const next = [...ts, trade]; if (authUser) saveTrade(authUser.id, trade); return next; });
      return;
    }
    if (trade.invested > wallet.balance) return;
    const entry = { type: "TRADE_OPEN", amount: -trade.invested, note: `${trade.direction} ${trade.label}`, date: new Date().toISOString() };
    setWallet((w) => {
      const next = { ...w, balance: w.balance - trade.invested, history: [...w.history, entry] };
      if (authUser) { saveWallet(authUser.id, next); addWalletHistory(authUser.id, entry); }
      return next;
    });
    setTrades((ts) => { const next = [...ts, trade]; if (authUser) saveTrade(authUser.id, trade); return next; });
  };

  const closeTrade = (tradeId, closeInfo) => {
    const t = trades.find((x) => x.tradeId === tradeId);
    if (!t) return;
    const pnl = closeInfo?.pnl || 0;
    if (t.broker !== "BINANCE_TESTNET") {
      const returned = t.invested + pnl;
      const entry = { type: "TRADE_CLOSE", amount: returned, note: `Closed ${t.label} PnL $${pnl.toFixed(2)}`, date: new Date().toISOString() };
      setWallet((w) => {
        const next = { ...w, balance: w.balance + returned, history: [...w.history, entry] };
        if (authUser) { saveWallet(authUser.id, next); addWalletHistory(authUser.id, entry); }
        return next;
      });
    }
    const updates = { status: "CLOSED", pnl, closePrice: closeInfo?.closePrice, closeDate: closeInfo?.closeDate };
    if (authUser) updateTrade(authUser.id, tradeId, updates);
    setTrades((ts) => ts.map((x) => x.tradeId === tradeId ? { ...x, ...updates } : x));
  };

  const handleReset = () => {
    setTrades([]);
    setJournal([]);
    setWatchlist([]);
    setWallet(INIT_WALLET);
    setNav("DASHBOARD");
    setMkt("CRYPTO");
    storage.clearAll();
    // Cloud wallet will be reset on next wallet save
    if (authUser) saveWallet(authUser.id, INIT_WALLET);
  };

  const handleAnalyse = (sym, market, data) => setAiTarget({ sym, market, data });
  const handleWatch = (sym) => {
    setWatchlist((w) => {
      const next = w.includes(sym.id) ? w.filter((x) => x !== sym.id) : [...w, sym.id];
      if (authUser) saveWatchlist(authUser.id, next);
      return next;
    });
  };
  const handleSaveFromAI = (sym, market, sig, price, text) => {
    const entry = { id: Date.now(), symbol: sym.label, market, signal: sig, sl: "", tp: "", result: "PENDING", pnlPct: "", notes: text.slice(0, 400), date: new Date().toISOString() };
    setJournal((j) => { const next = [...j, entry]; if (authUser) saveJournalEntry(authUser.id, entry); return next; });
  };
  const handleAddJournal = (entry) => {
    setJournal((j) => { const next = [...j, entry]; if (authUser) saveJournalEntry(authUser.id, entry); return next; });
  };
  const handleTrade = (sym, market, sig, price, ind) =>
    setTradeModal({ id: sym.id, label: sym.label, market, signal: sig, price, ind, binanceSymbol: sym.binanceSymbol });

  const syms = INSTRUMENTS[mkt] || [];
  const openTrades = trades.filter((t) => t.status === "OPEN").length;
  const investedOpen = trades.filter((t) => t.status === "OPEN" && t.broker !== "BINANCE_TESTNET").reduce((a, t) => a + (t.invested || 0), 0);
  const avail = wallet.balance - investedOpen;

  const wins = trades.filter((t) => (t.pnl || 0) > 0).length;
  const wr = trades.length ? ((wins / trades.length) * 100).toFixed(0) : "0";
  const totalPnl = trades.reduce((a, t) => a + (t.pnl || 0), 0);
  const hasBalance = wallet.balance > 0 || brokerConnected;
  const isAdmin = profile?.role === "admin";

  // ── Auth gates ─────────────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div style={{ minHeight: "100vh", background: C.nav, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
        <div style={{ width: 48, height: 48, borderRadius: 14, background: "linear-gradient(135deg,#3b82f6,#1d4ed8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 900, color: "#fff" }}>F</div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>Loading FDS Trading...</div>
      </div>
    );
  }

  if (isSupabaseReady() && !authUser) {
    return <AuthScreen onAuth={(user) => handleSessionUser(user)} />;
  }

  if (isSupabaseReady() && authUser && profile && !profile.approved) {
    return <PendingApproval user={authUser} />;
  }

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "Arial,sans-serif", display: "flex" }}>
      <style>{`*{box-sizing:border-box;margin:0;padding:0}::-webkit-scrollbar{width:5px;height:5px}::-webkit-scrollbar-track{background:#f1f5f9}::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:4px}@keyframes pulse{0%,100%{opacity:.5}50%{opacity:1}}@keyframes fadeIn{from{opacity:0}to{opacity:1}}button,input,textarea,select{font-family:inherit;outline:none}select option{background:#fff}`}</style>

      <div
        style={
          isMobile
            ? {
                position: "fixed",
                top: 0,
                left: 0,
                bottom: 0,
                width: 230,
                background: C.nav,
                display: "flex",
                flexDirection: "column",
                zIndex: 200,
                transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)",
                transition: "transform 0.22s ease",
                boxShadow: sidebarOpen ? "4px 0 24px rgba(0,0,0,0.3)" : "none",
              }
            : { width: 210, minHeight: "100vh", background: C.nav, display: "flex", flexDirection: "column", flexShrink: 0 }
        }
      >
        <div style={{ padding: "20px 16px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, background: "linear-gradient(135deg,#3b82f6,#1d4ed8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 900, color: "#fff" }}>
                F
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 900, color: "#fff" }}>
                  FDS <span style={{ color: "#60a5fa" }}>TRADING</span>
                </div>
                <div style={{ fontSize: 8, color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em" }}>AI PLATFORM</div>
              </div>
            </div>
            {isMobile && (
              <button
                onClick={() => setSidebarOpen(false)}
                style={{ background: "rgba(255,255,255,0.08)", border: "none", color: "#fff", width: 30, height: 30, borderRadius: 8, fontSize: 16, cursor: "pointer" }}
              >
                x
              </button>
            )}
          </div>
        </div>
        <div style={{ padding: "12px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ background: "rgba(255,255,255,0.07)", borderRadius: 10, padding: "10px 12px" }}>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.45)", letterSpacing: "0.1em", marginBottom: 4 }}>VIRTUAL BALANCE</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", fontFamily: "monospace" }}>
              ${wallet.balance.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
            <div style={{ fontSize: 9, color: "#86efac", marginTop: 2 }}>Available: ${avail.toFixed(0)}</div>
            {brokerConnected && <div style={{ fontSize: 9, color: "#93c5fd", marginTop: 2 }}>Binance Testnet connected</div>}
          </div>
        </div>
        <nav style={{ flex: 1, padding: "8px 10px", overflowY: "auto" }}>
          {NAV_ITEMS.map((item) => (
            <button
              key={item}
              onClick={() => {
                setNav(item);
                if (isMobile) setSidebarOpen(false);
              }}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "9px 12px",
                borderRadius: 8,
                border: "none",
                background: nav === item ? "rgba(59,130,246,0.18)" : "transparent",
                color: nav === item ? "#93c5fd" : "rgba(255,255,255,0.55)",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: nav === item ? 700 : 500,
                marginBottom: 2,
                textAlign: "left",
                position: "relative",
              }}
            >
              <span style={{ fontSize: 14 }}>{NAV_ICONS[item]}</span>
              {item}
              {item === "TRADES" && openTrades > 0 && (
                <span style={{ position: "absolute", right: 10, background: "#f59e0b", color: "#000", borderRadius: "50%", width: 16, height: 16, fontSize: 8, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800 }}>
                  {openTrades}
                </span>
              )}
              {item === "JOURNAL" && journal.length > 0 && (
                <span style={{ position: "absolute", right: 10, background: "#3b82f6", color: "#fff", borderRadius: "50%", width: 16, height: 16, fontSize: 8, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800 }}>
                  {journal.length}
                </span>
              )}
              {item === "BROKER" && brokerConnected && (
                <span style={{ position: "absolute", right: 10, width: 8, height: 8, borderRadius: "50%", background: "#22c55e" }} />
              )}
            </button>
          ))}
        </nav>
        <div style={{ padding: "12px 14px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", animation: "pulse 2s ease infinite" }} />
            <span style={{ fontSize: 9, color: "rgba(255,255,255,0.45)" }}>{clock.toLocaleTimeString()}</span>
          </div>
          {authUser && (
            <div style={{ marginBottom: 6 }}>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.5)", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {profile?.display_name || authUser.email}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {isAdmin && (
                  <button
                    onClick={() => setShowAdmin(true)}
                    style={{ flex: 1, background: "rgba(124,58,237,0.25)", border: "1px solid rgba(124,58,237,0.4)", color: "#c4b5fd", padding: "4px 0", borderRadius: 6, fontSize: 9, fontWeight: 700, cursor: "pointer" }}
                  >
                    👑 ADMIN
                  </button>
                )}
                <button
                  onClick={() => supabase && supabase.auth.signOut()}
                  style={{ flex: 1, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.5)", padding: "4px 0", borderRadius: 6, fontSize: 9, cursor: "pointer" }}
                >
                  Sign Out
                </button>
              </div>
            </div>
          )}
          <div style={{ fontSize: 8, color: "rgba(255,255,255,0.2)" }}>NOT FINANCIAL ADVICE</div>
        </div>
      </div>

      {isMobile && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 190 }}
        />
      )}

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: "100vh", overflow: "auto", width: "100%", minWidth: 0 }}>
        <div style={{ background: "#fff", borderBottom: `1px solid ${C.border}`, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", flexShrink: 0, flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {isMobile && (
              <button
                onClick={() => setSidebarOpen(true)}
                style={{ background: "#f1f5f9", border: `1px solid ${C.border}`, color: C.text, width: 36, height: 36, borderRadius: 8, fontSize: 16, cursor: "pointer", flexShrink: 0 }}
              >
                ☰
              </button>
            )}
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: C.text }}>
                {NAV_ICONS[nav]} {nav}
              </div>
              <div style={{ fontSize: 11, color: C.text3 }}>FDS Trading - AI-Powered Platform</div>
            </div>
          </div>
          {nav === "MARKETS" && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {MKTABS.map((t) => (
                <button
                  key={t}
                  onClick={() => setMkt(t)}
                  style={{ background: mkt === t ? C.blue : "#fff", color: mkt === t ? "#fff" : C.text2, border: `1px solid ${mkt === t ? C.blue : C.border}`, padding: "6px 14px", borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                >
                  {t}
                </button>
              ))}
              <button onClick={() => setRk((k) => k + 1)} style={{ background: "#fff", border: `1px solid ${C.border}`, color: C.text2, padding: "6px 12px", borderRadius: 7, fontSize: 11, cursor: "pointer" }}>
                Refresh
              </button>
            </div>
          )}
        </div>

        <div style={{ flex: 1, animation: "fadeIn 0.25s ease", padding: nav === "MARKETS" || nav === "SCANNER" ? 0 : "0 0 24px 0" }}>
          {nav === "DASHBOARD" && (
            <div style={{ padding: 24 }}>
              <div style={{ marginBottom: 22 }}>
                <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text, marginBottom: 4 }}>Good day, Trader 👋</h1>
                <p style={{ fontSize: 13, color: C.text2 }}>Your FDS Trading dashboard.</p>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 14, marginBottom: 22 }}>
                <StatCard label="WALLET BALANCE" value={`$${wallet.balance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} sub="Virtual account" color={C.blue} icon="💰" />
                <StatCard label="OPEN TRADES" value={openTrades} sub={`${trades.length} total`} color={C.yellow} icon="📊" />
                <StatCard label="WIN RATE" value={`${wr}%`} sub={`${wins} wins of ${trades.length}`} color={parseInt(wr) > 50 ? C.green : C.red} icon="🎯" />
                <StatCard label="TOTAL P&L" value={`${totalPnl >= 0 ? "+" : ""}$${Math.abs(totalPnl).toFixed(2)}`} sub="All time" color={totalPnl >= 0 ? C.green : C.red} icon="📈" />
              </div>
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 12 }}>Quick Actions</h3>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {[
                    { l: "📊 Markets", n: "MARKETS" },
                    { l: "🔍 Scanner", n: "SCANNER" },
                    { l: "💰 Wallet", n: "WALLET" },
                    { l: "📓 Journal", n: "JOURNAL" },
                    { l: "🔗 Broker", n: "BROKER" },
                  ].map((a) => (
                    <button key={a.n} onClick={() => setNav(a.n)} style={{ background: C.blueL, color: C.blue, border: `1px solid ${C.blueB}`, padding: "10px 18px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                      {a.l}
                    </button>
                  ))}
                </div>
              </div>
              <DashboardCharts trades={trades} wallet={wallet} />
            </div>
          )}
          {nav === "MARKETS" && (
            <div key={`${mkt}-${rk}`} style={{ padding: 12, display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 12, animation: "fadeIn 0.25s ease" }}>
              {syms.map((sym) => (
                <MarketCard
                  key={`${sym.id}-${rk}`}
                  sym={sym}
                  market={mkt}
                  onAnalyse={handleAnalyse}
                  onWatch={handleWatch}
                  watched={watchlist.includes(sym.id)}
                  onTrade={handleTrade}
                  hasBalance={hasBalance}
                  brokerConnected={brokerConnected}
                />
              ))}
            </div>
          )}
          {nav === "SCANNER" && <Scanner onAnalyse={handleAnalyse} onTrade={handleTrade} hasBalance={hasBalance} />}
          {nav === "ALERTS" && (
            <div style={{ padding: "14px 14px" }}>
              <TelegramSettings onSettingsChange={() => {}} />
              <PriceAlerts instruments={INSTRUMENTS.CRYPTO} />
            </div>
          )}
          {nav === "WALLET" && <div style={{ padding: "14px 14px" }}><WalletView wallet={wallet} onDeposit={deposit} onWithdraw={withdraw} trades={trades} onReset={handleReset} /></div>}
          {nav === "TRADES" && <div style={{ padding: "14px 14px" }}><TradesView trades={trades} onCloseTrade={closeTrade} onChart={setChartTrade} /></div>}
          {nav === "JOURNAL" && <div style={{ padding: "14px 14px" }}><JournalView entries={journal} onAdd={handleAddJournal} /></div>}
          {nav === "PORTFOLIO" && <div style={{ padding: "14px 14px" }}><PortfolioView trades={trades} /></div>}
          {nav === "BROKER" && <div style={{ padding: "14px 14px" }}><BrokerView connected={brokerConnected} onConnected={() => setBrokerConnected(true)} onDisconnected={() => setBrokerConnected(false)} userId={authUser?.id} /></div>}
        </div>

        <div style={{ padding: "10px 22px", borderTop: `1px solid ${C.border}`, background: "#fff", fontSize: 9, color: C.text3, textAlign: "center" }}>
          FDS TRADING - AI-POWERED PLATFORM - CRYPTO PRICES ARE LIVE, STOCKS/FOREX ARE SIMULATED - NOT FINANCIAL ADVICE
        </div>
      </div>

      {aiTarget && <AIPanel target={aiTarget} onClose={() => setAiTarget(null)} onJournal={handleSaveFromAI} onTrade={handleTrade} />}
      {tradeModal && (
        <TradeModal pre={tradeModal} wallet={wallet} brokerConnected={brokerConnected} onPlace={placeTrade} onClose={() => setTradeModal(null)} />
      )}
      {chartTrade && <ChartPanel trade={chartTrade} onClose={() => setChartTrade(null)} />}
      {showAdmin && isAdmin && <AdminPanel currentUser={authUser} onClose={() => setShowAdmin(false)} />}
    </div>
  );
}
