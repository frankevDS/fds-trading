import React, { useState } from "react";
import { C } from "../lib/constants";
import { fmtP, pfx } from "../lib/indicators";
import { Badge } from "./shared";

export default function TradeHistory({ trades }) {
  const [filter, setFilter] = useState("ALL");
  const [sort, setSort] = useState("DATE_DESC");
  const [search, setSearch] = useState("");

  const closed = trades.filter((t) => t.status === "CLOSED");

  const filtered = closed
    .filter((t) => {
      if (filter === "WINS") return (t.pnl || 0) > 0;
      if (filter === "LOSSES") return (t.pnl || 0) <= 0;
      if (filter === "CRYPTO") return t.market === "CRYPTO";
      if (filter === "FOREX") return t.market === "FOREX";
      if (filter === "STOCKS") return t.market === "STOCKS";
      return true;
    })
    .filter((t) => !search || t.label?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sort === "DATE_DESC") return new Date(b.closeDate || b.openDate) - new Date(a.closeDate || a.openDate);
      if (sort === "DATE_ASC") return new Date(a.closeDate || a.openDate) - new Date(b.closeDate || b.openDate);
      if (sort === "PNL_DESC") return (b.pnl || 0) - (a.pnl || 0);
      if (sort === "PNL_ASC") return (a.pnl || 0) - (b.pnl || 0);
      return 0;
    });

  const totalPnl = filtered.reduce((a, t) => a + (t.pnl || 0), 0);
  const wins = filtered.filter((t) => (t.pnl || 0) > 0).length;
  const losses = filtered.filter((t) => (t.pnl || 0) <= 0).length;
  const winRate = filtered.length ? ((wins / filtered.length) * 100).toFixed(1) : "0.0";
  const avgWin = wins ? filtered.filter((t) => (t.pnl || 0) > 0).reduce((a, t) => a + t.pnl, 0) / wins : 0;
  const avgLoss = losses ? Math.abs(filtered.filter((t) => (t.pnl || 0) <= 0).reduce((a, t) => a + t.pnl, 0) / losses) : 0;

  if (closed.length === 0) {
    return (
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 50, textAlign: "center" }}>
        <div style={{ fontSize: 32, marginBottom: 10 }}>📜</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 4 }}>No trade history yet</div>
        <div style={{ fontSize: 12, color: C.text3 }}>Open and close trades from Markets or AI Analyse to build your history.</div>
      </div>
    );
  }

  return (
    <div>
      {/* Summary stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 10, marginBottom: 18 }}>
        {[
          { l: "Total Trades", v: filtered.length, c: C.blue },
          { l: "Win Rate", v: `${winRate}%`, c: parseFloat(winRate) >= 55 ? C.green : C.red },
          { l: "Total P&L", v: `${totalPnl >= 0 ? "+" : ""}$${totalPnl.toFixed(2)}`, c: totalPnl >= 0 ? C.green : C.red },
          { l: "Avg Win", v: `+$${avgWin.toFixed(2)}`, c: C.green },
          { l: "Avg Loss", v: `-$${avgLoss.toFixed(2)}`, c: C.red },
          { l: "Wins / Losses", v: `${wins} / ${losses}`, c: C.text },
        ].map((s) => (
          <div key={s.l} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px" }}>
            <div style={{ fontSize: 9, color: C.text3, marginBottom: 2 }}>{s.l}</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: s.c }}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* Filters and search */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search symbol..."
          style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: "7px 12px", fontSize: 11, width: 140 }}
        />
        {["ALL", "WINS", "LOSSES", "CRYPTO", "FOREX", "STOCKS"].map((f) => (
          <button key={f} onClick={() => setFilter(f)} style={{ background: filter === f ? C.blue : "#fff", color: filter === f ? "#fff" : C.text2, border: `1px solid ${filter === f ? C.blue : C.border}`, padding: "7px 12px", borderRadius: 8, fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
            {f}
          </button>
        ))}
        <select value={sort} onChange={(e) => setSort(e.target.value)} style={{ marginLeft: "auto", border: `1px solid ${C.border}`, borderRadius: 8, padding: "7px 10px", fontSize: 10, background: "#fff" }}>
          <option value="DATE_DESC">Newest first</option>
          <option value="DATE_ASC">Oldest first</option>
          <option value="PNL_DESC">Best P&L first</option>
          <option value="PNL_ASC">Worst P&L first</option>
        </select>
      </div>

      {/* Trade list */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden" }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 30, textAlign: "center", fontSize: 12, color: C.text3 }}>No trades match this filter.</div>
        ) : (
          filtered.map((t, i) => {
            const pnl = t.pnl || 0;
            const pnlPct = t.invested ? (pnl / t.invested) * 100 : 0;
            const held = t.closeDate && t.openDate
              ? (() => { const ms = new Date(t.closeDate) - new Date(t.openDate); const h = ms / 3600000; return h < 1 ? `${Math.round(ms / 60000)}m` : h < 48 ? `${h.toFixed(1)}h` : `${(h / 24).toFixed(1)}d`; })()
              : "-";

            return (
              <div key={t.tradeId} style={{ display: "grid", gridTemplateColumns: "90px 80px 90px 80px 80px 100px 80px", gap: 8, alignItems: "center", padding: "12px 16px", borderBottom: i < filtered.length - 1 ? `1px solid ${C.border}` : "none", fontSize: 11 }}>
                <div>
                  <div style={{ fontWeight: 800, color: C.text }}>{t.label}</div>
                  <div style={{ fontSize: 9, color: C.text3 }}>{t.market}</div>
                </div>
                <div>
                  <span style={{ fontSize: 9, fontWeight: 700, color: t.direction === "BUY" ? C.green : C.red, background: t.direction === "BUY" ? C.greenL : C.redL, border: `1px solid ${t.direction === "BUY" ? C.greenB : C.redB}`, borderRadius: 4, padding: "1px 6px" }}>
                    {t.direction}
                  </span>
                </div>
                <div style={{ fontFamily: "monospace", color: C.text }}>
                  <div>${t.entryPrice?.toFixed ? t.entryPrice.toFixed(t.entryPrice > 100 ? 2 : 5) : t.entryPrice}</div>
                  <div style={{ fontSize: 9, color: C.text3 }}>→ ${t.closePrice?.toFixed ? t.closePrice.toFixed(t.entryPrice > 100 ? 2 : 5) : "-"}</div>
                </div>
                <div style={{ color: C.text2 }}>
                  <div>${t.invested?.toFixed(2)}</div>
                  <div style={{ fontSize: 9, color: C.text3 }}>invested</div>
                </div>
                <div>
                  <div style={{ fontWeight: 800, color: pnl >= 0 ? C.green : C.red }}>
                    {pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}
                  </div>
                  <div style={{ fontSize: 9, color: pnl >= 0 ? C.green : C.red }}>
                    {pnlPct >= 0 ? "+" : ""}{pnlPct.toFixed(2)}%
                  </div>
                </div>
                <div style={{ fontSize: 9, color: C.text3 }}>
                  <div>{t.closeDate ? new Date(t.closeDate).toLocaleDateString("en-GB") : "-"}</div>
                  <div>held {held}</div>
                </div>
                <div>
                  {t.signal && <Badge sig={t.signal} sm={true} />}
                </div>
              </div>
            );
          })
        )}
      </div>

      {filtered.length > 0 && (
        <div style={{ fontSize: 10, color: C.text3, marginTop: 8, textAlign: "center" }}>
          Showing {filtered.length} of {closed.length} closed trades
        </div>
      )}
    </div>
  );
}
