import React, { useState, useEffect } from "react";
import { C, INSTRUMENTS, NAV_ITEMS, NAV_ICONS, MKTABS, INIT_WALLET } from "./lib/constants";
import { initBinanceFeed } from "./lib/binanceFeed";
import { hasStoredBinanceKeys } from "./components/BrokerView";
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

export default function App() {
  const [nav, setNav] = useState("DASHBOARD");
  const [mkt, setMkt] = useState("CRYPTO");
  const [rk, setRk] = useState(0);
  const [aiTarget, setAiTarget] = useState(null);
  const [journal, setJournal] = useState([]);
  const [trades, setTrades] = useState([]);
  const [watchlist, setWatchlist] = useState([]);
  const [tradeModal, setTradeModal] = useState(null);
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

  useEffect(() => {
    initBinanceFeed(INSTRUMENTS.CRYPTO);
    setBrokerConnected(hasStoredBinanceKeys());
    const iv = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(iv);
  }, []);

  const deposit = (amt) =>
    setWallet((w) => ({
      ...w,
      balance: w.balance + amt,
      totalDeposited: w.totalDeposited + amt,
      history: [...w.history, { type: "DEPOSIT", amount: amt, note: "Manual deposit", date: new Date().toISOString() }],
    }));

  const withdraw = (amt) =>
    setWallet((w) => ({
      ...w,
      balance: w.balance - amt,
      history: [...w.history, { type: "WITHDRAW", amount: -amt, note: "Manual withdrawal", date: new Date().toISOString() }],
    }));

  // Binance Testnet trades don't touch the local virtual wallet - that
  // capital lives on the testnet account itself, fetched live in BrokerView.
  const placeTrade = (trade) => {
    if (trade.broker === "BINANCE_TESTNET") {
      setTrades((ts) => [...ts, trade]);
      return;
    }
    if (trade.invested > wallet.balance) return;
    setWallet((w) => ({
      ...w,
      balance: w.balance - trade.invested,
      history: [...w.history, { type: "TRADE_OPEN", amount: -trade.invested, note: `${trade.direction} ${trade.label}`, date: new Date().toISOString() }],
    }));
    setTrades((ts) => [...ts, trade]);
  };

  const closeTrade = (tradeId, closeInfo) => {
    const t = trades.find((x) => x.tradeId === tradeId);
    if (!t) return;
    const pnl = closeInfo?.pnl || 0;
    if (t.broker !== "BINANCE_TESTNET") {
      const returned = t.invested + pnl;
      setWallet((w) => ({
        ...w,
        balance: w.balance + returned,
        history: [...w.history, { type: "TRADE_CLOSE", amount: returned, note: `Closed ${t.label} PnL $${pnl.toFixed(2)}`, date: new Date().toISOString() }],
      }));
    }
    setTrades((ts) =>
      ts.map((x) =>
        x.tradeId === tradeId
          ? { ...x, status: "CLOSED", pnl, closePrice: closeInfo?.closePrice, closeDate: closeInfo?.closeDate }
          : x
      )
    );
  };

  const handleAnalyse = (sym, market, data) => setAiTarget({ sym, market, data });
  const handleWatch = (sym) => setWatchlist((w) => (w.includes(sym.id) ? w.filter((x) => x !== sym.id) : [...w, sym.id]));
  const handleSaveFromAI = (sym, market, sig, price, text) => {
    setJournal((j) => [
      ...j,
      { id: Date.now(), symbol: sym.label, market, signal: sig, sl: "", tp: "", result: "PENDING", pnlPct: "", notes: text.slice(0, 400), date: new Date().toISOString() },
    ]);
  };
  const handleAddJournal = (entry) => setJournal((j) => [...j, entry]);
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

        <div style={{ flex: 1, animation: "fadeIn 0.25s ease" }}>
          {nav === "DASHBOARD" && (
            <div style={{ padding: 24 }}>
              <div style={{ marginBottom: 22 }}>
                <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text, marginBottom: 4 }}>Good day, Trader 👋</h1>
                <p style={{ fontSize: 13, color: C.text2 }}>Your FDS Trading dashboard.</p>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 22 }}>
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
            </div>
          )}
          {nav === "MARKETS" && (
            <div key={`${mkt}-${rk}`} style={{ padding: 18, display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(275px,1fr))", gap: 14, animation: "fadeIn 0.25s ease" }}>
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
          {nav === "WALLET" && <WalletView wallet={wallet} onDeposit={deposit} onWithdraw={withdraw} trades={trades} />}
          {nav === "TRADES" && <TradesView trades={trades} onCloseTrade={closeTrade} />}
          {nav === "JOURNAL" && <JournalView entries={journal} onAdd={handleAddJournal} />}
          {nav === "PORTFOLIO" && <PortfolioView trades={trades} />}
          {nav === "BROKER" && <BrokerView connected={brokerConnected} onConnected={() => setBrokerConnected(true)} onDisconnected={() => setBrokerConnected(false)} />}
        </div>

        <div style={{ padding: "10px 22px", borderTop: `1px solid ${C.border}`, background: "#fff", fontSize: 9, color: C.text3, textAlign: "center" }}>
          FDS TRADING - AI-POWERED PLATFORM - CRYPTO PRICES ARE LIVE, STOCKS/FOREX ARE SIMULATED - NOT FINANCIAL ADVICE
        </div>
      </div>

      {aiTarget && <AIPanel target={aiTarget} onClose={() => setAiTarget(null)} onJournal={handleSaveFromAI} onTrade={handleTrade} />}
      {tradeModal && (
        <TradeModal pre={tradeModal} wallet={wallet} brokerConnected={brokerConnected} onPlace={placeTrade} onClose={() => setTradeModal(null)} />
      )}
    </div>
  );
}
