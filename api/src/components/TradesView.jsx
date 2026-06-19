import React, { useState, useEffect } from "react";
import { C } from "../lib/constants";
import { fmtP, pfx } from "../lib/indicators";
import { Badge } from "./shared";
import { subscribeFeed } from "../lib/binanceFeed";
import { initSim, tickSim } from "../lib/simEngine";
import { marketSellByQuantity } from "../lib/binanceTrade";

function useLivePrice(trade) {
  const [price, setPrice] = useState(trade.entryPrice);

  useEffect(() => {
    if (trade.market === "CRYPTO") {
      const unsub = subscribeFeed(trade.id, (snap) => {
        if (snap && snap.ready) setPrice(snap.price);
      });
      return unsub;
    }
    const s = initSim(trade.id, trade.entryPrice, 0.012);
    setPrice(s.price);
    const iv = setInterval(() => {
      const ns = tickSim(trade.id);
      if (ns) setPrice(ns.price);
    }, 2200);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trade.id, trade.market]);

  return price;
}

function TradeRow({ trade, onClosed }) {
  const livePrice = useLivePrice(trade);
  const [closing, setClosing] = useState(false);
  const [err, setErr] = useState("");

  const isOpen = trade.status === "OPEN";
  const refPrice = isOpen ? livePrice : trade.closePrice;
  const dirMult = trade.direction === "SELL" ? -1 : 1;
  const pnl = isOpen ? (refPrice - trade.entryPrice) * trade.units * dirMult : trade.pnl;
  const pnlPct = trade.invested ? (pnl / trade.invested) * 100 : 0;
  const isTestnet = trade.broker === "BINANCE_TESTNET";

  async function handleClose() {
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
      } catch (e) {
        setErr(e?.message || "Close order failed");
        setClosing(false);
      }
      return;
    }
    onClosed(trade.tradeId, { closePrice: livePrice, pnl, closeDate: new Date().toISOString() });
  }

  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, marginBottom: 10 }}>
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
            {trade.market} - opened {new Date(trade.openDate).toLocaleString()}
          </div>
        </div>
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
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: isOpen ? 12 : 0 }}>
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

export default function TradesView({ trades, onCloseTrade }) {
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
      {open.length > 0 && (
        <>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.text2, marginBottom: 10 }}>OPEN POSITIONS ({open.length})</div>
          {open.map((t) => (
            <TradeRow key={t.tradeId} trade={t} onClosed={onCloseTrade} />
          ))}
        </>
      )}
      {closed.length > 0 && (
        <>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.text2, margin: "18px 0 10px" }}>CLOSED TRADES ({closed.length})</div>
          {closed
            .slice()
            .reverse()
            .map((t) => (
              <TradeRow key={t.tradeId} trade={t} onClosed={onCloseTrade} />
            ))}
        </>
      )}
    </div>
  );
}
