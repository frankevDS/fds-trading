import React, { useState, useEffect } from "react";
import { C } from "../lib/constants";
import { fmtP, pfx } from "../lib/indicators";
import { Badge } from "./shared";

function buildPrompt(sym, market, data) {
  return `You are a senior trader at FDS Trading.
INSTRUMENT: ${sym.label} - ${market}
PRICE: ${fmtP(data.price, sym.id)}
RSI: ${(data.rsi || 0).toFixed(1)} | MACD: ${(data.macd || 0).toFixed(5)}
SMA20: ${fmtP(data.sma20 || 0, sym.id)} | SMA50: ${fmtP(data.sma50 || 0, sym.id)}
BB%: ${(data.bbPos || 0).toFixed(1)}% | Stochastic: ${(data.stochK || 0).toFixed(1)}
24h Change: ${(data.change24 || 0).toFixed(3)}%

SIGNAL: [STRONG_BUY/BUY/HOLD/SELL/STRONG_SELL]
CONFIDENCE: [1-100]%
TIMEFRAME: [INTRADAY/SWING/POSITION]

📊 TECHNICAL PICTURE
What indicators say.

🎯 TRADE SETUP
Entry Zone: [price]
Stop Loss: [price]
Take Profit 1: [price]
Take Profit 2: [price]

⚠️ INVALIDATION
- [Condition 1]
- [Condition 2]

💡 EDGE
One insight.

🕐 TIMING
When to watch.`;
}

function parseLevel(text, label) {
  const re = new RegExp(`${label}[^\\n]*?([0-9][0-9,]*\\.?[0-9]*)`, "i");
  const m = text.match(re);
  if (!m) return null;
  const n = parseFloat(m[1].replace(/,/g, ""));
  return isNaN(n) || n <= 0 ? null : n;
}

function parseTradeLevels(text) {
  return {
    entry: parseLevel(text, "Entry Zone"),
    sl: parseLevel(text, "Stop Loss"),
    tp1: parseLevel(text, "Take Profit 1"),
    tp2: parseLevel(text, "Take Profit 2"),
  };
}

function ProfitCalculator({ sym, market, levels, livePrice }) {
  const [amt, setAmt] = useState("100");
  const invested = parseFloat(amt) || 0;
  const entry = levels.entry || livePrice;
  if (!entry) return null;

  const rows = [
    { l: "Stop Loss", price: levels.sl, c: C.red },
    { l: "Take Profit 1", price: levels.tp1, c: C.green },
    { l: "Take Profit 2", price: levels.tp2, c: C.green },
  ].filter((r) => r.price);

  if (rows.length === 0) return null;

  return (
    <div style={{ background: "#f8fafc", border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 16px", marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>Potential Profit Calculator</span>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 10, color: C.text3 }}>If I invest $</span>
          <input
            value={amt}
            onChange={(e) => setAmt(e.target.value)}
            style={{ width: 70, border: `1px solid ${C.border}`, borderRadius: 6, padding: "4px 7px", fontSize: 11, fontFamily: "monospace" }}
          />
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${rows.length}, 1fr)`, gap: 10 }}>
        {rows.map((r) => {
          const units = invested / entry;
          const pnl = (r.price - entry) * units;
          const pct = entry ? ((r.price - entry) / entry) * 100 : 0;
          return (
            <div key={r.l}>
              <div style={{ fontSize: 9, color: C.text3, marginBottom: 2 }}>{r.l}</div>
              <div style={{ fontSize: 10, color: C.text2, fontFamily: "monospace", marginBottom: 2 }}>
                {pfx(market, sym.id)}
                {fmtP(r.price, sym.id)}
              </div>
              <div style={{ fontSize: 13, fontWeight: 800, color: r.c, fontFamily: "monospace" }}>
                {pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}
                <span style={{ fontSize: 10, fontWeight: 600 }}> ({pct >= 0 ? "+" : ""}{pct.toFixed(2)}%)</span>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: 9, color: C.text3, marginTop: 8 }}>Based on the AI's suggested entry/exit zones - actual fills may differ, especially on fast-moving prices.</div>
    </div>
  );
}

export default function AIPanel({ target, onClose, onJournal, onTrade }) {
  const { sym, market, data } = target;
  const [text, setText] = useState("");
  const [sig, setSig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [dots, setDots] = useState("");
  const [errored, setErrored] = useState(false);
  const [provider, setProvider] = useState(null);

  useEffect(() => {
    const iv = setInterval(() => setDots((d) => (d.length >= 3 ? "" : d + ".")), 400);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErrored(false);
    fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: buildPrompt(sym, market, data) }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d.error) {
          setText(d.error);
          setErrored(true);
          setLoading(false);
          return;
        }
        const t = d.text || "Analysis unavailable.";
        const m = t.match(/SIGNAL:\s*(STRONG_BUY|BUY|HOLD|SELL|STRONG_SELL)/);
        if (m) setSig(m[1]);
        setText(t);
        setProvider(d.provider || null);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setText("Connection error. Please try again.");
        setErrored(true);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sym.id, sym.label, market, data]);

  const pos = (data.change24 || 0) >= 0;
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,0.65)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backdropFilter: "blur(5px)",
        padding: 16,
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 20,
          width: "100%",
          maxWidth: 680,
          maxHeight: "90vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 24px 64px rgba(0,0,0,0.18)",
        }}
      >
        <div
          style={{
            padding: "16px 22px",
            borderBottom: `1px solid ${C.border}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "#f8fafc",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: C.text }}>{sym.label}</span>
              <span style={{ fontSize: 10, background: C.blueL, color: C.blue, border: `1px solid ${C.blueB}`, padding: "2px 8px", borderRadius: 4, fontWeight: 600 }}>
                {market}
              </span>
              {sig && <Badge sig={sig} />}
            </div>
            <span style={{ fontSize: 20, fontWeight: 900, color: C.text, fontFamily: "monospace" }}>
              {pfx(market, sym.id)}
              {fmtP(data.price, sym.id)}
              <span style={{ fontSize: 12, marginLeft: 8, color: pos ? C.green : C.red, fontWeight: 700 }}>
                {pos ? "▲" : "▼"}
                {Math.abs(data.change24 || 0).toFixed(2)}%
              </span>
            </span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {!loading && sig && (
              <button
                onClick={() => {
                  onTrade && onTrade(sym, market, sig, data.price, data);
                  onClose();
                }}
                style={{ background: C.green, color: "#fff", border: "none", padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontSize: 11, fontWeight: 700 }}
              >
                TRADE NOW
              </button>
            )}
            {!loading && sig && (
              <button
                onClick={() => {
                  onJournal(sym, market, sig, data.price, text);
                  setSaved(true);
                }}
                style={{
                  background: saved ? C.greenL : "#fff",
                  color: saved ? C.green : C.blue,
                  border: `1px solid ${saved ? C.greenB : C.blueB}`,
                  padding: "8px 16px",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                {saved ? "SAVED" : "JOURNAL"}
              </button>
            )}
            <button onClick={onClose} style={{ background: "#fff", border: `1px solid ${C.border}`, color: C.text2, width: 34, height: 34, borderRadius: 8, cursor: "pointer", fontSize: 16 }}>
              x
            </button>
          </div>
        </div>
        <div style={{ padding: "20px 22px", overflowY: "auto", flex: 1 }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "50px 0" }}>
              <div style={{ fontSize: 40, marginBottom: 14 }}>⚡</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>FDS AI Engine Processing{dots}</div>
            </div>
          ) : errored ? (
            <div style={{ textAlign: "center", padding: "40px 10px" }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>⚠️</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 6 }}>Couldn't get an analysis</div>
              <div style={{ fontSize: 12, color: C.text2, maxWidth: 420, margin: "0 auto" }}>{text}</div>
              {text.includes("AI key configured") && (
                <div style={{ fontSize: 11, color: C.text3, marginTop: 10 }}>
                  This needs ANTHROPIC_API_KEY or GROQ_API_KEY set as an environment variable on your deployment - see README.md.
                </div>
              )}
            </div>
          ) : (
            <div>
              <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
                {text
                  .split("\n")
                  .filter((ln) => ln.startsWith("SIGNAL:") || ln.startsWith("CONFIDENCE:") || ln.startsWith("TIMEFRAME:"))
                  .map((line, i) => {
                    const parts = line.split(":");
                    const k = parts[0];
                    const v = parts.slice(1).join(":").trim();
                    return (
                      <div key={i} style={{ background: "#f8fafc", border: `1px solid ${C.border}`, borderRadius: 8, padding: "7px 12px" }}>
                        <div style={{ fontSize: 9, color: C.text3, fontWeight: 600, marginBottom: 2 }}>{k}</div>
                        <div style={{ fontSize: 13, fontWeight: 800, color: C.text }}>{v}</div>
                      </div>
                    );
                  })}
              </div>
              <ProfitCalculator sym={sym} market={market} levels={parseTradeLevels(text)} livePrice={data.price} />
              {text
                .split("\n")
                .filter((ln) => !ln.startsWith("SIGNAL:") && !ln.startsWith("CONFIDENCE:") && !ln.startsWith("TIMEFRAME:"))
                .map((line, i) => {
                  if (!line.trim()) return <div key={i} style={{ height: 6 }} />;
                  if (/^[📊🎯📈⚠️💡🕐]/.test(line))
                    return (
                      <div key={i} style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: "14px 0 7px", padding: "8px 12px", background: "#f8fafc", borderRadius: 8, borderLeft: `3px solid ${C.blue}` }}>
                        {line}
                      </div>
                    );
                  if (/^(Entry|Stop|Take|Risk)\s/.test(line))
                    return (
                      <div key={i} style={{ fontSize: 12, color: C.text, padding: "3px 0 3px 12px", borderLeft: `2px solid ${C.green}`, marginLeft: 4, marginBottom: 2 }}>
                        {line}
                      </div>
                    );
                  if (line.startsWith("- ")) return <div key={i} style={{ fontSize: 12, color: C.text2, padding: "2px 0 2px 16px" }}>{line.slice(2)}</div>;
                  return (
                    <div key={i} style={{ fontSize: 12, color: C.text2, lineHeight: 1.7 }}>
                      {line}
                    </div>
                  );
                })}
            </div>
          )}
        </div>
        <div style={{ padding: "10px 22px", borderTop: `1px solid ${C.border}`, background: "#f8fafc", fontSize: 10, color: C.text3, textAlign: "center" }}>
          FDS Trading - AI Signal Engine{provider ? ` (${provider === "groq" ? "Groq / Llama" : "Anthropic / Claude"})` : ""} - FOR INFORMATIONAL PURPOSES ONLY - NOT FINANCIAL ADVICE
        </div>
      </div>
    </div>
  );
}
