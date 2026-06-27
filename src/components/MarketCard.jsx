import React, { useState, useEffect } from "react";
import { C } from "../lib/constants";
import { getInd, calcSig, calcSigWithReason, fmtP, pfx } from "../lib/indicators";
import { initSim, tickSim } from "../lib/simEngine";
import { subscribeFeed } from "../lib/binanceFeed";
import { Spark, Badge, PBar } from "./shared";

export default function MarketCard({ sym, market, onAnalyse, onWatch, watched, onTrade, hasBalance, brokerConnected }) {
  const isCrypto = market === "CRYPTO";
  const [st, setSt] = useState(null);
  const [flash, setFlash] = useState(null);
  const [live, setLive] = useState(null); // crypto only: real 24h change/high/low/volume + feed error

  useEffect(() => {
    setSt(null);
    setLive(null);

    if (isCrypto) {
      const unsub = subscribeFeed(sym.id, (snap) => {
        if (!snap || !snap.ready) {
          if (snap && snap.error) setLive((p) => ({ ...(p || {}), error: snap.error }));
          return;
        }
        setSt((prev) => {
          if (prev && prev.price && snap.price !== prev.price) {
            setFlash(snap.price > prev.price ? "up" : "dn");
            setTimeout(() => setFlash(null), 300);
          }
          return { price: snap.price, history: snap.history };
        });
        setLive({
          change24: snap.change24,
          high24: snap.high24,
          low24: snap.low24,
          volQuote: snap.volQuote,
          error: null,
        });
      });
      return unsub;
    }

    const s = initSim(sym.id, sym.base, sym.vol);
    setSt({ price: s.price, history: [...s.history] });
    const iv = setInterval(() => {
      const ns = tickSim(sym.id);
      if (!ns) return;
      setSt((prev) => {
        if (prev) {
          setFlash(ns.price > prev.price ? "up" : "dn");
          setTimeout(() => setFlash(null), 300);
        }
        return ns;
      });
    }, 2000 + Math.random() * 800);
    return () => clearInterval(iv);
  }, [sym.id, market, sym.base, sym.vol]);

  if (!st || !st.history || st.history.length < 2) {
    return (
      <div
        style={{
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 14,
          height: 220,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span style={{ fontSize: 12, color: C.text3 }}>{isCrypto ? "Connecting to Binance..." : "Loading..."}</span>
      </div>
    );
  }

  const indRaw = getInd(st.history, st.price);
  if (!indRaw) return null;
  const ind = isCrypto && live && !live.error ? { ...indRaw, change24: live.change24 } : indRaw;
  const { signal: sig, reasons: sigReasons, bull: sigBull, bear: sigBear } = calcSigWithReason(ind);
  const pos = ind.change24 >= 0;
  const flashBg = flash === "up" ? "#f0fdf4" : flash === "dn" ? "#fff5f5" : C.card;
  const flashBorder = flash === "up" ? "#86efac" : flash === "dn" ? "#fecaca" : C.border;

  return (
    <div
      style={{
        background: flashBg,
        border: `1px solid ${flashBorder}`,
        borderRadius: 14,
        padding: 18,
        transition: "all 0.2s",
        boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: C.blueL,
              border: `1px solid ${C.blueB}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
              fontWeight: 800,
              color: C.blue,
            }}
          >
            {sym.label.slice(0, 3)}
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: C.text }}>{sym.label}</span>
              {isCrypto ? (
                <span
                  title="Real-time price from Binance"
                  style={{
                    fontSize: 8,
                    fontWeight: 800,
                    color: C.green,
                    background: C.greenL,
                    border: `1px solid ${C.greenB}`,
                    borderRadius: 4,
                    padding: "1px 5px",
                    letterSpacing: "0.04em",
                  }}
                >
                  LIVE
                </span>
              ) : (
                <span
                  title="Simulated price - not a real feed"
                  style={{
                    fontSize: 8,
                    fontWeight: 700,
                    color: C.text3,
                    background: "#f8fafc",
                    border: `1px solid ${C.border}`,
                    borderRadius: 4,
                    padding: "1px 5px",
                    letterSpacing: "0.04em",
                  }}
                >
                  SIM
                </span>
              )}
            </div>
            <div style={{ fontSize: 10, color: C.text3 }}>{sym.name}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <Badge sig={sig} sm={true} />
          <button
            onClick={() => onWatch(sym)}
            style={{ background: "none", border: "none", color: watched ? "#f59e0b" : C.text3, cursor: "pointer", fontSize: 16, padding: 2 }}
          >
            {watched ? "★" : "☆"}
          </button>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 900, color: C.text, fontFamily: "monospace" }}>
            {pfx(market, sym.id)}
            {fmtP(st.price, sym.id)}
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: pos ? C.green : C.red }}>
            {pos ? "▲" : "▼"} {Math.abs(ind.change24).toFixed(2)}%
          </div>
        </div>
        <Spark points={st.history.slice(-28)} pos={pos} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5px 12px", marginBottom: 10 }}>
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
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 10,
          color: C.text2,
          marginBottom: 8,
          padding: "6px 10px",
          background: "#f8fafc",
          borderRadius: 7,
        }}
      >
        <span>
          SMA20 <span style={{ color: C.blue, fontWeight: 600 }}>{pfx(market, sym.id)}{fmtP(ind.sma20, sym.id)}</span>
        </span>
        <span>
          SMA50 <span style={{ color: C.purple, fontWeight: 600 }}>{pfx(market, sym.id)}{fmtP(ind.sma50, sym.id)}</span>
        </span>
      </div>

      {/* Signal strength meter */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: C.text3, marginBottom: 3 }}>
          <span>BULL {sigBull}</span>
          <span style={{ fontWeight: 600, color: C.text2 }}>Signal strength</span>
          <span>BEAR {sigBear}</span>
        </div>
        <div style={{ height: 4, borderRadius: 3, background: "#f1f5f9", overflow: "hidden", display: "flex" }}>
          <div style={{ width: `${(sigBull / (sigBull + sigBear + 0.01)) * 100}%`, background: C.green, borderRadius: 3 }} />
          <div style={{ width: `${(sigBear / (sigBull + sigBear + 0.01)) * 100}%`, background: C.red }} />
        </div>
      </div>

      {/* Counter-trend warning */}
      {sigReasons && sigReasons.some(r => r.includes("Counter-trend")) && (
        <div style={{ background: "#fffbeb", border: `1px solid ${C.yellowB}`, borderRadius: 7, padding: "5px 8px", marginBottom: 8, fontSize: 10, color: C.yellow }}>
          ⚠️ Counter-trend — price below SMA50. Higher risk trade.
        </div>
      )}
      <div style={{ display: "flex", gap: 6 }}>
        <button
          onClick={() => onAnalyse(sym, market, { price: st.price, history: [...st.history], ...ind })}
          style={{ flex: 1, background: C.blue, color: "#fff", border: "none", padding: "8px 0", borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: "pointer" }}
        >
          AI ANALYSE
        </button>
        {hasBalance && (
          <button
            onClick={() => onTrade(sym, market, sig, st.price, ind)}
            style={{ background: C.green, color: "#fff", border: "none", padding: "8px 14px", borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: "pointer" }}
          >
            TRADE{isCrypto && brokerConnected ? " ⚡" : ""}
          </button>
        )}
      </div>
    </div>
  );
}
