import React from "react";
import { C, MKTABS } from "../lib/constants";
import { StatCard } from "./shared";

export default function PortfolioView({ trades }) {
  const closed = trades.filter((t) => t.status === "OPEN" ? false : true);
  const totalPnl = closed.reduce((a, t) => a + (t.pnl || 0), 0);
  const wins = closed.filter((t) => (t.pnl || 0) > 0).length;
  const winRate = closed.length ? ((wins / closed.length) * 100).toFixed(1) : "0.0";

  const byMarket = MKTABS.map((m) => {
    const mt = closed.filter((t) => t.market === m);
    const pnl = mt.reduce((a, t) => a + (t.pnl || 0), 0);
    return { market: m, count: mt.length, pnl };
  });

  const sigCounts = {};
  trades.forEach((t) => {
    if (t.signal) sigCounts[t.signal] = (sigCounts[t.signal] || 0) + 1;
  });
  const sigTotal = Object.values(sigCounts).reduce((a, b) => a + b, 0) || 1;

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 22 }}>
        <StatCard label="REALIZED P&L" value={`${totalPnl >= 0 ? "+" : ""}$${totalPnl.toFixed(2)}`} color={totalPnl >= 0 ? C.green : C.red} icon="💹" />
        <StatCard label="WIN RATE" value={`${winRate}%`} icon="🎯" />
        <StatCard label="CLOSED TRADES" value={closed.length} icon="📋" />
      </div>

      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20, marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 14 }}>Performance by Market</div>
        {byMarket.map((m) => (
          <div key={m.market} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{m.market}</div>
              <div style={{ fontSize: 10, color: C.text3 }}>{m.count} closed trades</div>
            </div>
            <div style={{ fontSize: 14, fontWeight: 800, color: m.pnl >= 0 ? C.green : C.red }}>
              {m.pnl >= 0 ? "+" : ""}${m.pnl.toFixed(2)}
            </div>
          </div>
        ))}
      </div>

      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20, marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 14 }}>Signal Distribution</div>
        {Object.keys(sigCounts).length === 0 ? (
          <div style={{ fontSize: 12, color: C.text3 }}>No signals recorded yet.</div>
        ) : (
          Object.entries(sigCounts).map(([sig, count]) => (
            <div key={sig} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
                <span style={{ color: C.text2, fontWeight: 600 }}>{sig.replace("_", " ")}</span>
                <span style={{ color: C.text3 }}>{count}</span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: "#f1f5f9", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${(count / sigTotal) * 100}%`, background: C.blue, borderRadius: 3 }} />
              </div>
            </div>
          ))
        )}
      </div>

      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 14 }}>Closed Trade History</div>
        {closed.length === 0 ? (
          <div style={{ fontSize: 12, color: C.text3 }}>No closed trades yet.</div>
        ) : (
          closed
            .slice()
            .reverse()
            .map((t) => (
              <div key={t.tradeId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: `1px solid ${C.border}` }}>
                <div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{t.label}</span>
                  <span style={{ fontSize: 10, color: C.text3, marginLeft: 8 }}>
                    {t.direction} - {new Date(t.closeDate || t.openDate).toLocaleDateString()}
                  </span>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: (t.pnl || 0) >= 0 ? C.green : C.red }}>
                  {(t.pnl || 0) >= 0 ? "+" : ""}${(t.pnl || 0).toFixed(2)}
                </span>
              </div>
            ))
        )}
      </div>
    </div>
  );
}
