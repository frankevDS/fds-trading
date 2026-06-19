import React, { useState } from "react";
import { C } from "../lib/constants";
import { StatCard } from "./shared";

export default function JournalView({ entries, onAdd }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ symbol: "", market: "CRYPTO", sl: "", tp: "", result: "WIN", pnlPct: "", notes: "" });

  const wins = entries.filter((e) => e.result === "WIN").length;
  const losses = entries.filter((e) => e.result === "LOSS").length;
  const scored = entries.filter((e) => e.result === "WIN" || e.result === "LOSS" || e.result === "BREAKEVEN").length;
  const winRate = scored ? ((wins / scored) * 100).toFixed(1) : "0.0";
  const avgWin =
    entries.filter((e) => e.result === "WIN").reduce((a, e) => a + (parseFloat(e.pnlPct) || 0), 0) / (wins || 1);
  const avgLoss =
    entries.filter((e) => e.result === "LOSS").reduce((a, e) => a + (parseFloat(e.pnlPct) || 0), 0) / (losses || 1);
  const totalPnl = entries.reduce((a, e) => a + (parseFloat(e.pnlPct) || 0), 0);

  function submit() {
    if (!form.symbol.trim()) return;
    onAdd({ ...form, date: new Date().toISOString(), id: Date.now() });
    setForm({ symbol: "", market: "CRYPTO", sl: "", tp: "", result: "WIN", pnlPct: "", notes: "" });
    setShowForm(false);
  }

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 20 }}>
        <StatCard label="WIN RATE" value={`${winRate}%`} color={C.green} icon="🎯" />
        <StatCard label="AVG WIN" value={`${avgWin.toFixed(2)}%`} color={C.green} icon="📈" />
        <StatCard label="AVG LOSS" value={`${avgLoss.toFixed(2)}%`} color={C.red} icon="📉" />
        <StatCard label="TOTAL P&L" value={`${totalPnl >= 0 ? "+" : ""}${totalPnl.toFixed(2)}%`} color={totalPnl >= 0 ? C.green : C.red} icon="💹" />
      </div>

      <button
        onClick={() => setShowForm((s) => !s)}
        style={{ background: C.blue, color: "#fff", border: "none", padding: "10px 20px", borderRadius: 9, fontSize: 12, fontWeight: 700, cursor: "pointer", marginBottom: 18 }}
      >
        {showForm ? "CANCEL" : "+ LOG TRADE"}
      </button>

      {showForm && (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20, marginBottom: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <input
              value={form.symbol}
              onChange={(e) => setForm({ ...form, symbol: e.target.value.toUpperCase() })}
              placeholder="Symbol (e.g. BTC/USDT)"
              style={{ border: `1px solid ${C.border}`, borderRadius: 7, padding: "8px 10px", fontSize: 12 }}
            />
            <select
              value={form.market}
              onChange={(e) => setForm({ ...form, market: e.target.value })}
              style={{ border: `1px solid ${C.border}`, borderRadius: 7, padding: "8px 10px", fontSize: 12 }}
            >
              <option value="CRYPTO">CRYPTO</option>
              <option value="STOCKS">STOCKS</option>
              <option value="FOREX">FOREX</option>
            </select>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <input
              value={form.sl}
              onChange={(e) => setForm({ ...form, sl: e.target.value })}
              placeholder="Stop loss"
              style={{ border: `1px solid ${C.border}`, borderRadius: 7, padding: "8px 10px", fontSize: 12 }}
            />
            <input
              value={form.tp}
              onChange={(e) => setForm({ ...form, tp: e.target.value })}
              placeholder="Take profit"
              style={{ border: `1px solid ${C.border}`, borderRadius: 7, padding: "8px 10px", fontSize: 12 }}
            />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <select
              value={form.result}
              onChange={(e) => setForm({ ...form, result: e.target.value })}
              style={{ border: `1px solid ${C.border}`, borderRadius: 7, padding: "8px 10px", fontSize: 12 }}
            >
              <option value="WIN">WIN</option>
              <option value="LOSS">LOSS</option>
              <option value="BREAKEVEN">BREAKEVEN</option>
              <option value="PENDING">PENDING</option>
            </select>
            <input
              value={form.pnlPct}
              onChange={(e) => setForm({ ...form, pnlPct: e.target.value })}
              placeholder="P&L %"
              style={{ border: `1px solid ${C.border}`, borderRadius: 7, padding: "8px 10px", fontSize: 12 }}
            />
          </div>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Notes - what worked, what didn't..."
            rows={3}
            style={{ width: "100%", border: `1px solid ${C.border}`, borderRadius: 7, padding: "8px 10px", fontSize: 12, marginBottom: 12, boxSizing: "border-box", resize: "vertical" }}
          />
          <button onClick={submit} style={{ background: C.green, color: "#fff", border: "none", padding: "10px 22px", borderRadius: 9, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
            SAVE ENTRY
          </button>
        </div>
      )}

      {entries.length === 0 ? (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 50, textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>📓</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>No journal entries yet</div>
        </div>
      ) : (
        entries
          .slice()
          .reverse()
          .map((e) => (
            <div key={e.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: C.text }}>{e.symbol}</span>
                  <span style={{ fontSize: 9, color: C.text3, background: "#f8fafc", border: `1px solid ${C.border}`, borderRadius: 4, padding: "1px 6px" }}>{e.market}</span>
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      color: e.result === "WIN" ? C.green : e.result === "LOSS" ? C.red : C.text2,
                      background: e.result === "WIN" ? C.greenL : e.result === "LOSS" ? C.redL : "#f8fafc",
                      border: `1px solid ${e.result === "WIN" ? C.greenB : e.result === "LOSS" ? C.redB : C.border}`,
                      borderRadius: 4,
                      padding: "1px 6px",
                    }}
                  >
                    {e.result}
                  </span>
                </div>
                {e.pnlPct && (
                  <span style={{ fontSize: 13, fontWeight: 800, color: parseFloat(e.pnlPct) >= 0 ? C.green : C.red }}>
                    {parseFloat(e.pnlPct) >= 0 ? "+" : ""}
                    {e.pnlPct}%
                  </span>
                )}
              </div>
              {(e.sl || e.tp) && (
                <div style={{ fontSize: 10, color: C.text3, marginBottom: 6 }}>
                  {e.sl && `SL: ${e.sl}`} {e.tp && `TP: ${e.tp}`}
                </div>
              )}
              {e.notes && <div style={{ fontSize: 12, color: C.text2, lineHeight: 1.5 }}>{e.notes}</div>}
              <div style={{ fontSize: 10, color: C.text3, marginTop: 6 }}>{new Date(e.date).toLocaleString()}</div>
            </div>
          ))
      )}
    </div>
  );
}
