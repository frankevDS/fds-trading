import React, { useState, useEffect } from "react";
import { C, INSTRUMENTS, MKTABS } from "../lib/constants";
import { getInd, calcSig, fmtP, pfx } from "../lib/indicators";
import { initSim, tickSim, getSimState } from "../lib/simEngine";
import { getFeedState } from "../lib/binanceFeed";
import { Badge } from "./shared";

function snapshotAll() {
  const rows = [];
  MKTABS.forEach((market) => {
    INSTRUMENTS[market].forEach((sym) => {
      let price, history;
      if (market === "CRYPTO") {
        const f = getFeedState(sym.id);
        if (!f || !f.ready) return;
        price = f.price;
        history = f.history;
      } else {
        initSim(sym.id, sym.base, sym.vol);
        tickSim(sym.id);
        const s = getSimState(sym.id);
        if (!s) return;
        price = s.price;
        history = s.history;
      }
      if (!history || history.length < 2) return;
      const ind = getInd(history, price);
      const sig = calcSig(ind);
      rows.push({ sym, market, price, ind, sig });
    });
  });
  return rows;
}

const SIG_RANK = { STRONG_BUY: 0, BUY: 1, HOLD: 2, SELL: 3, STRONG_SELL: 4 };

export default function Scanner({ onAnalyse, onTrade, hasBalance }) {
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState("ALL");
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" && window.innerWidth < 700
  );

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 700);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    setRows(snapshotAll());
    const iv = setInterval(() => setRows(snapshotAll()), 2500);
    return () => clearInterval(iv);
  }, []);

  const filtered = rows
    .filter((r) => {
      if (filter === "ALL") return true;
      if (filter === "BUY") return r.sig === "STRONG_BUY" || r.sig === "BUY";
      if (filter === "SELL") return r.sig === "STRONG_SELL" || r.sig === "SELL";
      return r.market === filter;
    })
    .sort((a, b) => SIG_RANK[a.sig] - SIG_RANK[b.sig]);

  return (
    <div style={{ padding: "14px 14px" }}>
      <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
        {["ALL", "BUY", "SELL", ...MKTABS].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              background: filter === f ? C.blue : "#fff",
              color: filter === f ? "#fff" : C.text2,
              border: `1px solid ${filter === f ? C.blue : C.border}`,
              padding: "7px 12px",
              borderRadius: 8,
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 50, textAlign: "center" }}>
          <span style={{ fontSize: 12, color: C.text3 }}>Connecting to live data...</span>
        </div>
      ) : isMobile ? (
        // Mobile: card layout
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((r) => (
            <div
              key={r.sym.id}
              style={{
                background: C.card,
                border: `1px solid ${C.border}`,
                borderRadius: 12,
                padding: "12px 14px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div>
                  <span style={{ fontSize: 14, fontWeight: 800, color: C.text }}>{r.sym.label}</span>
                  <span style={{ fontSize: 9, color: C.text3, background: "#f8fafc", border: `1px solid ${C.border}`, borderRadius: 4, padding: "1px 6px", marginLeft: 6 }}>{r.market}</span>
                </div>
                <Badge sig={r.sig} sm={true} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 16, fontWeight: 800, color: C.text, fontFamily: "monospace" }}>
                  {pfx(r.market, r.sym.id)}{fmtP(r.price, r.sym.id)}
                </span>
                <span style={{ fontSize: 11, color: C.text2 }}>RSI {r.ind.rsi.toFixed(0)}</span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => onAnalyse(r.sym, r.market, { price: r.price, ...r.ind })}
                  style={{ flex: 1, background: C.blueL, color: C.blue, border: `1px solid ${C.blueB}`, padding: "8px 0", borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                >
                  ANALYSE
                </button>
                {hasBalance && (
                  <button
                    onClick={() => onTrade(r.sym, r.market, r.sig, r.price, r.ind)}
                    style={{ flex: 1, background: C.green, color: "#fff", border: "none", padding: "8px 0", borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                  >
                    TRADE
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Desktop: table layout
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden" }}>
          {filtered.map((r, i) => (
            <div
              key={r.sym.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 18px",
                borderBottom: i < filtered.length - 1 ? `1px solid ${C.border}` : "none",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: C.text, width: 90 }}>{r.sym.label}</span>
                <span style={{ fontSize: 9, color: C.text3, background: "#f8fafc", border: `1px solid ${C.border}`, borderRadius: 4, padding: "1px 6px" }}>{r.market}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: C.text, fontFamily: "monospace" }}>
                  {pfx(r.market, r.sym.id)}{fmtP(r.price, r.sym.id)}
                </span>
                <span style={{ fontSize: 10, color: C.text2 }}>RSI {r.ind.rsi.toFixed(0)}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Badge sig={r.sig} sm={true} />
                <button
                  onClick={() => onAnalyse(r.sym, r.market, { price: r.price, ...r.ind })}
                  style={{ background: C.blueL, color: C.blue, border: `1px solid ${C.blueB}`, padding: "6px 10px", borderRadius: 7, fontSize: 10, fontWeight: 700, cursor: "pointer" }}
                >
                  ANALYSE
                </button>
                {hasBalance && (
                  <button
                    onClick={() => onTrade(r.sym, r.market, r.sig, r.price, r.ind)}
                    style={{ background: C.green, color: "#fff", border: "none", padding: "6px 10px", borderRadius: 7, fontSize: 10, fontWeight: 700, cursor: "pointer" }}
                  >
                    TRADE
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
