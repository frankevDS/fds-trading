import React, { useState } from "react";
import { C } from "../lib/constants";
import { StatCard } from "./shared";
import { storage } from "../lib/storage";

const PRESETS = [1000, 5000, 10000, 25000, 50000, 100000];

export default function WalletView({ wallet, trades, onDeposit, onWithdraw, onReset }) {
  const [tab, setTab] = useState("OVERVIEW");
  const [amt, setAmt] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);

  const inTrades = trades.filter((t) => t.status === "OPEN").reduce((a, t) => a + t.invested, 0);

  function submit(type) {
    const v = parseFloat(amt);
    if (!v || v <= 0) return;
    if (type === "WITHDRAW" && v > wallet.balance) return;
    type === "DEPOSIT" ? onDeposit(v) : onWithdraw(v);
    setAmt("");
  }

  function handleReset() {
    if (!confirmReset) { setConfirmReset(true); return; }
    storage.clearAll();
    onReset && onReset();
    setConfirmReset(false);
  }

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 22 }}>
        <StatCard label="TOTAL BALANCE" value={`$${wallet.balance.toFixed(2)}`} icon="💰" />
        <StatCard label="IN OPEN TRADES" value={`$${inTrades.toFixed(2)}`} icon="📊" />
        <StatCard label="AVAILABLE" value={`$${wallet.balance.toFixed(2)}`} icon="✅" />
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 18 }}>
        {["OVERVIEW", "DEPOSIT", "WITHDRAW", "HISTORY"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              background: tab === t ? C.blue : "#fff",
              color: tab === t ? "#fff" : C.text2,
              border: `1px solid ${tab === t ? C.blue : C.border}`,
              padding: "8px 16px",
              borderRadius: 8,
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "OVERVIEW" && (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 22 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 14 }}>Account Summary</div>
          <div style={{ display: "grid", gap: 10 }}>
            {[
              { l: "Total deposited", v: `$${wallet.totalDeposited.toFixed(2)}` },
              { l: "Current balance", v: `$${wallet.balance.toFixed(2)}` },
              { l: "Capital in open trades", v: `$${inTrades.toFixed(2)}` },
              { l: "Net (deposits vs current + open)", v: `$${(wallet.balance + inTrades - wallet.totalDeposited).toFixed(2)}` },
              { l: "Storage used", v: `${storage.usageKB()} KB` },
            ].map((r) => (
              <div key={r.l} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
                <span style={{ color: C.text2 }}>{r.l}</span>
                <span style={{ fontWeight: 700, color: C.text }}>{r.v}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.text, marginBottom: 4 }}>Reset Account</div>
            <div style={{ fontSize: 11, color: C.text3, marginBottom: 10 }}>
              Clears all trades, wallet history, journal entries, and watchlist from this browser. Use this to start fresh. This cannot be undone.
            </div>
            <button
              onClick={handleReset}
              style={{ background: confirmReset ? C.red : "#fff", color: confirmReset ? "#fff" : C.red, border: `1px solid ${C.redB}`, padding: "8px 18px", borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: "pointer" }}
            >
              {confirmReset ? "TAP AGAIN TO CONFIRM RESET" : "RESET ACCOUNT"}
            </button>
            {confirmReset && (
              <button
                onClick={() => setConfirmReset(false)}
                style={{ marginLeft: 10, background: "#fff", color: C.text2, border: `1px solid ${C.border}`, padding: "8px 14px", borderRadius: 8, fontSize: 11, cursor: "pointer" }}
              >
                CANCEL
              </button>
            )}
          </div>
        </div>
      )}

      {(tab === "DEPOSIT" || tab === "WITHDRAW") && (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 22, maxWidth: 420 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 14 }}>
            {tab === "DEPOSIT" ? "Add virtual funds" : "Withdraw virtual funds"}
          </div>
          {tab === "DEPOSIT" && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
              {PRESETS.map((p) => (
                <button
                  key={p}
                  onClick={() => setAmt(String(p))}
                  style={{ background: amt === String(p) ? C.blue : "#fff", color: amt === String(p) ? "#fff" : C.text2, border: `1px solid ${amt === String(p) ? C.blue : C.border}`, padding: "6px 12px", borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: "pointer" }}
                >
                  ${p.toLocaleString()}
                </button>
              ))}
            </div>
          )}
          <input
            value={amt}
            onChange={(e) => setAmt(e.target.value)}
            placeholder="Custom amount..."
            style={{ width: "100%", border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", fontSize: 13, marginBottom: 14, boxSizing: "border-box" }}
          />
          <button
            onClick={() => submit(tab)}
            style={{ width: "100%", background: tab === "DEPOSIT" ? C.green : C.red, color: "#fff", border: "none", padding: "11px 0", borderRadius: 9, fontSize: 13, fontWeight: 800, cursor: "pointer" }}
          >
            {tab === "DEPOSIT" ? "DEPOSIT" : "WITHDRAW"}
          </button>
        </div>
      )}

      {tab === "HISTORY" && (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 18 }}>
          {wallet.history.length === 0 ? (
            <div style={{ textAlign: "center", color: C.text3, fontSize: 12, padding: 30 }}>No activity yet.</div>
          ) : (
            wallet.history
              .slice()
              .reverse()
              .map((h, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: i < wallet.history.length - 1 ? `1px solid ${C.border}` : "none" }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{h.type}</div>
                    <div style={{ fontSize: 10, color: C.text3 }}>{h.note || new Date(h.date).toLocaleString()}</div>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: h.type === "DEPOSIT" ? C.green : h.type === "WITHDRAW" ? C.red : C.text }}>
                    {h.type === "WITHDRAW" ? "-" : "+"}${Math.abs(h.amount).toFixed(2)}
                  </div>
                </div>
              ))
          )}
        </div>
      )}
    </div>
  );
}
