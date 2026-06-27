import React, { useState, useEffect } from "react";
import { C } from "../lib/constants";
import { fmtP, pfx, getInd } from "../lib/indicators";
import { Badge, Spark, PBar } from "./shared";
import { subscribeFeed } from "../lib/binanceFeed";
import { initSim, tickSim } from "../lib/simEngine";
import { marketSellByQuantity } from "../lib/binanceTrade";

function useLiveData(trade) {
  const [state, setState] = useState({ price: trade.entryPrice, history: [trade.entryPrice] });

  useEffect(() => {
    if (trade.market === "CRYPTO") {
      const unsub = subscribeFeed(trade.id, (snap) => {
        if (snap && snap.ready) setState({ price: snap.price, history: snap.history });
      });
      return unsub;
    }
    const s = initSim(trade.id, trade.entryPrice, 0.012);
    setState({ price: s.price, history: [...s.history] });
    const iv = setInterval(() => {
      const ns = tickSim(trade.id);
      if (ns) setState({ price: ns.price, history: ns.history });
    }, 2200);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trade.id, trade.market]);

  return state;
}

function TradeRow({ trade, onClosed, onChart }) {
  const live = useLiveData(trade);
  const [closing, setClosing] = useState(false);
  const [err, setErr] = useState("");
  const [expanded, setExpanded] = useState(false);

  const isOpen = trade.status === "OPEN";
  const refPrice = isOpen ? live.price : trade.closePrice;
  const dirMult = trade.direction === "SELL" ? -1 : 1;
  const pnl = isOpen ? (refPrice - trade.entryPrice) * trade.units * dirMult : trade.pnl;
  const pnlPct = trade.invested ? (pnl / trade.invested) * 100 : 0;
  const isTestnet = trade.broker === "BINANCE_TESTNET";

  const sl = parseFloat(trade.sl);
  const tp = parseFloat(trade.tp);
  const hasSl = !isNaN(sl) && sl > 0;
  const hasTp = !isNaN(tp) && tp > 0;
  const slPnl = hasSl ? (sl - trade.entryPrice) * trade.units * dirMult : null;
  const tpPnl = hasTp ? (tp - trade.entryPrice) * trade.units * dirMult : null;

  const ind = expanded && live.history && live.history.length >= 2 ? getInd(live.history, refPrice) : null;
  const heldMs = (trade.closeDate ? new Date(trade.closeDate) : new Date()) - new Date(trade.openDate);
  const heldHrs = heldMs / 3600000;
  const heldLabel = heldHrs < 1 ? `${Math.round(heldMs / 60000)}m` : heldHrs < 48 ? `${heldHrs.toFixed(1)}h` : `${(heldHrs / 24).toFixed(1)}d`;

  async function handleClose(e) {
    e.stopPropagation();
    if (closing) return;
    if (isTestnet) {
      setClosing(true);
      setErr("");
      try {
        const result = await marketSellByQuantity(trade.binanceSymbol, trade.units);
        const realizedPnl = result.quoteReceived - trade.invested;
        onClosed(trade.tradeId, {
          closePrice: result.avgPrice,
          pnl: realizedPnl,
          closeDate: new Date().toISOString(),
        });
      } catch (e2) {
        setErr(e2?.message || "Close order failed");
        setClosing(false);
      }
      return;
    }
    onClosed(trade.tradeId, { closePrice: live.price, pnl, closeDate: new Date().toISOString() });
  }

  return (
    <div
      onClick={() => setExpanded((x) => !x)}
      style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, marginBottom: 10, cursor: "pointer" }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: C.text }}>{trade.label}</span>
            <span style={{ fontSize: 9, fontWeight: 700, color: trade.direction === "BUY" ? C.green : C.red, background: trade.direction === "BUY" ? C.greenL : C.redL, border: `1px solid ${trade.direction === "BUY" ? C.greenB : C.redB}`, borderRadius: 4, padding: "1px 6px" }}>
              {trade.direction}
            </span>
            {trade.signal && <Badge sig={trade.signal} sm={true} />}
            {isTestnet && (
              <span style={{ fontSize: 9, fontWeight: 700, color: C.blue, background: C.blueL, border: `1px solid ${C.blueB}`, borderRadius: 4, padding: "1px 6px" }}>
                TESTNET
              </span>
            )}
          </div>
          <div style={{ fontSize: 10, color: C.text3 }}>
            {trade.market} - opened {new Date(trade.openDate).toLocaleString()} - held {heldLabel}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              color: isOpen ? C.blue : C.text2,
              background: isOpen ? C.blueL : "#f1f5f9",
              border: `1px solid ${isOpen ? C.blueB : C.border}`,
              borderRadius: 5,
              padding: "2px 8px",
            }}
          >
            {trade.status}
          </span>
          <span style={{ fontSize: 11, color: C.text3 }}>{expanded ? "▲" : "▼"}</span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: isOpen || expanded ? 12 : 0 }}>
        {[
          { l: "Entry", v: `${pfx(trade.market, trade.id)}${fmtP(trade.entryPrice, trade.id)}` },
          { l: isOpen ? "Live Price" : "Close Price", v: `${pfx(trade.market, trade.id)}${fmtP(refPrice || 0, trade.id)}` },
          { l: "Invested", v: `$${trade.invested.toFixed(2)}` },
          { l: "P&L", v: `${pnl >= 0 ? "+" : ""}$${pnl.toFixed(2)} (${pnlPct.toFixed(2)}%)`, c: pnl >= 0 ? C.green : C.red },
        ].map((f) => (
          <div key={f.l}>
            <div style={{ fontSize: 9, color: C.text3, marginBottom: 2 }}>{f.l}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: f.c || C.text, fontFamily: "monospace" }}>{f.v}</div>
          </div>
        ))}
      </div>

      {expanded && (
        <div onClick={(e) => e.stopPropagation()} style={{ borderTop: `1px solid ${C.border}`, paddingTop: 14, marginTop: 4, animation: "fadeIn 0.2s ease" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.text2 }}>PRICE SINCE OPEN</div>
            <button
              onClick={() => onChart && onChart(trade)}
              style={{ background: C.nav, color: "#fff", border: "none", padding: "6px 14px", borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: "pointer" }}
            >
              📊 Full Chart
            </button>
          </div>
          {live.history && live.history.length > 1 && <Spark points={live.history.slice(-40)} pos={pnl >= 0} w={160} h={40} />}

          {(hasSl || hasTp) && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
              {hasSl && (
                <div style={{ background: C.redL, border: `1px solid ${C.redB}`, borderRadius: 9, padding: "10px 12px" }}>
                  <div style={{ fontSize: 9, color: C.text3, marginBottom: 2 }}>STOP LOSS</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text, fontFamily: "monospace" }}>{pfx(trade.market, trade.id)}{fmtP(sl, trade.id)}</div>
                  <div style={{ fontSize: 10, color: C.red, marginTop: 2 }}>If hit: {slPnl >= 0 ? "+" : ""}${slPnl.toFixed(2)}</div>
                </div>
              )}
              {hasTp && (
                <div style={{ background: C.greenL, border: `1px solid ${C.greenB}`, borderRadius: 9, padding: "10px 12px" }}>
                  <div style={{ fontSize: 9, color: C.text3, marginBottom: 2 }}>TAKE PROFIT</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text, fontFamily: "monospace" }}>{pfx(trade.market, trade.id)}{fmtP(tp, trade.id)}</div>
                  <div style={{ fontSize: 10, color: C.green, marginTop: 2 }}>If hit: {tpPnl >= 0 ? "+" : ""}${tpPnl.toFixed(2)}</div>
                </div>
              )}
            </div>
          )}

          {ind && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "5px 12px", marginBottom: 6 }}>
              {[
                { l: "RSI", v: ind.rsi, c: ind.rsi < 30 ? C.green : ind.rsi > 70 ? C.red : C.yellow },
                { l: "BB%", v: ind.bbPos, c: C.blue },
                { l: "STOCH", v: ind.stochK, c: ind.stochK < 20 ? C.green : ind.stochK > 80 ? C.red : C.text2 },
                { l: "MACD", v: ind.macd > 0 ? 60 : 40, c: ind.macd > 0 ? C.green : C.red },
              ].map((f) => (
                <div key={f.l}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: C.text2, marginBottom: 2 }}>
                    <span style={{ fontWeight: 600 }}>{f.l}</span>
                    <span style={{ color: f.c, fontWeight: 700 }}>{f.l === "MACD" ? (ind.macd > 0 ? "▲" : "▼") : f.v.toFixed(1)}</span>
                  </div>
                  <PBar val={f.v} color={f.c} />
                </div>
              ))}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 11, color: C.text2, marginTop: 12 }}>
            <div>Units: <span style={{ fontWeight: 700, color: C.text }}>{trade.units?.toFixed(6)}</span></div>
            <div>Market: <span style={{ fontWeight: 700, color: C.text }}>{trade.market}</span></div>
            {trade.closeDate && <div>Closed: <span style={{ fontWeight: 700, color: C.text }}>{new Date(trade.closeDate).toLocaleString()}</span></div>}
          </div>
        </div>
      )}

      {err && (
        <div style={{ background: C.redL, border: `1px solid ${C.redB}`, color: C.red, borderRadius: 8, padding: "6px 10px", fontSize: 11, marginTop: 10 }}>
          {err}
        </div>
      )}

      {isOpen && (
        <button
          onClick={handleClose}
          disabled={closing}
          style={{ marginTop: 10, width: "100%", background: closing ? "#f1f5f9" : "#fff", color: closing ? C.text3 : C.red, border: `1px solid ${closing ? C.border : C.redB}`, padding: "8px 0", borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: closing ? "wait" : "pointer" }}
        >
          {closing ? "CLOSING ON BINANCE TESTNET..." : isTestnet ? "CLOSE POSITION (SELL ON TESTNET)" : "CLOSE POSITION"}
        </button>
      )}
    </div>
  );
}

export default function TradesView({ trades, onCloseTrade, onChart }) {
  const open = trades.filter((t) => t.status === "OPEN");
  const closed = trades.filter((t) => t.status === "CLOSED");

  if (trades.length === 0) {
    return (
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 50, textAlign: "center" }}>
        <div style={{ fontSize: 32, marginBottom: 10 }}>💹</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 4 }}>No trades yet</div>
        <div style={{ fontSize: 12, color: C.text3 }}>Open a trade from Markets or an AI Analyse panel to see it here.</div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ fontSize: 10, color: C.text3, marginBottom: 14 }}>Tap any trade to see its chart, stop loss / take profit, and live indicators.</div>
      {open.length > 0 && (
        <>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.text2, marginBottom: 10 }}>OPEN POSITIONS ({open.length})</div>
          {open.map((t) => (
            <TradeRow key={t.tradeId} trade={t} onClosed={onCloseTrade} onChart={onChart} />
          ))}
        </>
      )}
      {closed.length > 0 && (
        <>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.text2, margin: "18px 0 10px" }}>CLOSED TRADES ({closed.length})</div>
          {closed.slice().reverse().map((t) => (
            <TradeRow key={t.tradeId} trade={t} onClosed={onCloseTrade} onChart={onChart} />
          ))}
        </>
      )}
    </div>
  );
}
