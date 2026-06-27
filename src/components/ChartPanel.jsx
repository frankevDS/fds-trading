import React, { useState, useEffect, useRef } from "react";
import { C } from "../lib/constants";
import { fmtP, pfx, getInd } from "../lib/indicators";

const REST_BASE = "https://api.binance.com";
const INTERVALS = ["1m", "5m", "15m", "1h", "4h", "1d"];

async function fetchKlines(binanceSymbol, interval, limit = 120) {
  const url = `${REST_BASE}/api/v3/klines?symbol=${binanceSymbol}&interval=${interval}&limit=${limit}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Binance klines ${r.status}`);
  const raw = await r.json();
  return raw.map((k) => ({
    t: k[0],
    o: parseFloat(k[1]),
    h: parseFloat(k[2]),
    l: parseFloat(k[3]),
    c: parseFloat(k[4]),
    v: parseFloat(k[5]),
  }));
}

function CandlestickSVG({ candles, entryPrice, sl, tp, sma20, sma50, width = 800, height = 320 }) {
  if (!candles || candles.length < 2) return null;

  const PAD = { top: 16, right: 10, bottom: 24, left: 58 };
  const cw = width - PAD.left - PAD.right;
  const ch = height - PAD.top - PAD.bottom;

  const highs = candles.map((c) => c.h);
  const lows = candles.map((c) => c.l);
  const maxP = Math.max(...highs, entryPrice || 0, sl || 0, tp || 0);
  const minP = Math.min(...lows, entryPrice || Infinity, sl || Infinity, tp || Infinity);
  const range = maxP - minP || 1;

  const toY = (p) => PAD.top + ch - ((p - minP) / range) * ch;
  const barW = Math.max(1, Math.floor((cw / candles.length) * 0.7));
  const candleX = (i) => PAD.left + (i / candles.length) * cw + (cw / candles.length) * 0.15;

  // SMA arrays
  const closes = candles.map((c) => c.c);
  const sma = (n) => closes.map((_, i) => {
    if (i < n - 1) return null;
    return closes.slice(i - n + 1, i + 1).reduce((a, b) => a + b, 0) / n;
  });
  const sma20arr = sma(20);
  const sma50arr = sma(50);

  const smaPath = (arr, clr) => {
    const pts = arr
      .map((v, i) => (v ? `${candleX(i) + barW / 2},${toY(v)}` : null))
      .filter(Boolean);
    if (pts.length < 2) return null;
    return <path d={`M ${pts.join(" L ")}`} fill="none" stroke={clr} strokeWidth="1.5" strokeLinejoin="round" />;
  };

  const hline = (price, color, dash, label) => {
    if (!price) return null;
    const y = toY(price);
    return (
      <g key={label}>
        <line x1={PAD.left} y1={y} x2={width - PAD.right} y2={y} stroke={color} strokeWidth="1" strokeDasharray={dash || "0"} />
        <text x={PAD.left - 2} y={y + 4} fontSize="9" fill={color} textAnchor="end" fontFamily="monospace">{fmtP(price, "x")}</text>
        {label && <text x={width - PAD.right + 2} y={y + 4} fontSize="9" fill={color} textAnchor="start">{label}</text>}
      </g>
    );
  };

  // Y axis labels
  const yTicks = 5;
  const yLabels = Array.from({ length: yTicks + 1 }, (_, i) => {
    const price = minP + (range / yTicks) * i;
    return { price, y: toY(price) };
  });

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height, display: "block" }}>
      {/* Grid lines */}
      {yLabels.map((t, i) => (
        <g key={i}>
          <line x1={PAD.left} y1={t.y} x2={width - PAD.right} y2={t.y} stroke="#f1f5f9" strokeWidth="1" />
          <text x={PAD.left - 4} y={t.y + 3} fontSize="8" fill={C.text3} textAnchor="end" fontFamily="monospace">
            {fmtP(t.price, "x")}
          </text>
        </g>
      ))}

      {/* SMA lines */}
      {smaPath(sma20arr, C.blue)}
      {smaPath(sma50arr, C.purple)}

      {/* Candles */}
      {candles.map((c, i) => {
        const x = candleX(i);
        const isGreen = c.c >= c.o;
        const color = isGreen ? C.green : C.red;
        const bodyTop = toY(Math.max(c.o, c.c));
        const bodyBot = toY(Math.min(c.o, c.c));
        const bodyH = Math.max(1, bodyBot - bodyTop);
        const cx = x + barW / 2;
        return (
          <g key={i}>
            <line x1={cx} y1={toY(c.h)} x2={cx} y2={toY(c.l)} stroke={color} strokeWidth="1" />
            <rect x={x} y={bodyTop} width={barW} height={bodyH} fill={color} />
          </g>
        );
      })}

      {/* Entry / SL / TP lines */}
      {hline(entryPrice, C.blue, "4 2", "ENTRY")}
      {hline(sl, C.red, "4 2", "SL")}
      {hline(tp, C.green, "4 2", "TP")}
    </svg>
  );
}

function RSIChart({ candles, width = 800, height = 70 }) {
  if (!candles || candles.length < 16) return null;
  const closes = candles.map((c) => c.c);
  const rsiArr = closes.map((_, i) => {
    if (i < 14) return null;
    const slice = closes.slice(i - 14, i + 1);
    let g = 0, l = 0;
    for (let j = 1; j < slice.length; j++) {
      const d = slice[j] - slice[j - 1];
      d > 0 ? (g += d) : (l -= d);
    }
    return l === 0 ? 100 : 100 - 100 / (1 + g / l);
  }).filter(Boolean);

  if (rsiArr.length < 2) return null;

  const PAD = { top: 6, right: 10, bottom: 14, left: 30 };
  const cw = width - PAD.left - PAD.right;
  const ch = height - PAD.top - PAD.bottom;
  const toY = (v) => PAD.top + ch - ((v - 0) / 100) * ch;
  const n = rsiArr.length;
  const step = cw / (n - 1);

  const coords = rsiArr.map((v, i) => `${PAD.left + i * step},${toY(v)}`).join(" L ");
  const lastRsi = rsiArr[rsiArr.length - 1];
  const c = lastRsi > 70 ? C.red : lastRsi < 30 ? C.green : C.blue;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height, display: "block" }}>
      <line x1={PAD.left} y1={toY(70)} x2={width - PAD.right} y2={toY(70)} stroke={C.red} strokeWidth="0.5" strokeDasharray="3 2" />
      <line x1={PAD.left} y1={toY(50)} x2={width - PAD.right} y2={toY(50)} stroke={C.border} strokeWidth="0.5" />
      <line x1={PAD.left} y1={toY(30)} x2={width - PAD.right} y2={toY(30)} stroke={C.green} strokeWidth="0.5" strokeDasharray="3 2" />
      <path d={`M ${coords}`} fill="none" stroke={c} strokeWidth="1.5" strokeLinejoin="round" />
      <text x={2} y={PAD.top + 6} fontSize="8" fill={C.text3}>RSI</text>
      <text x={width - PAD.right + 2} y={toY(lastRsi) + 3} fontSize="8" fill={c}>{lastRsi.toFixed(0)}</text>
    </svg>
  );
}

function VolumeChart({ candles, width = 800, height = 50 }) {
  if (!candles || candles.length < 2) return null;
  const PAD = { top: 4, right: 10, bottom: 4, left: 30 };
  const cw = width - PAD.left - PAD.right;
  const ch = height - PAD.top - PAD.bottom;
  const maxV = Math.max(...candles.map((c) => c.v)) || 1;
  const barW = Math.max(1, Math.floor((cw / candles.length) * 0.7));
  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height, display: "block" }}>
      <text x={2} y={PAD.top + 9} fontSize="8" fill={C.text3}>VOL</text>
      {candles.map((c, i) => {
        const x = PAD.left + (i / candles.length) * cw + (cw / candles.length) * 0.15;
        const barH = (c.v / maxV) * ch;
        return (
          <rect key={i} x={x} y={PAD.top + ch - barH} width={barW} height={barH} fill={c.c >= c.o ? "#bbf7d0" : "#fecaca"} />
        );
      })}
    </svg>
  );
}

export default function ChartPanel({ trade, onClose }) {
  const [interval, setInterval] = useState("15m");
  const [candles, setCandles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [hovered, setHovered] = useState(null);
  const isCrypto = trade.market === "CRYPTO";
  const binanceSymbol = trade.binanceSymbol;

  useEffect(() => {
    if (!isCrypto || !binanceSymbol) {
      setError("Full candlestick charts are available for crypto only. Stocks/Forex use simulated prices so no real OHLC data exists.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    fetchKlines(binanceSymbol, interval, 120)
      .then((k) => { setCandles(k); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, [binanceSymbol, interval, isCrypto]);

  const sl = parseFloat(trade.sl) || null;
  const tp = parseFloat(trade.tp) || null;
  const dirMult = trade.direction === "SELL" ? -1 : 1;
  const lastClose = candles.length ? candles[candles.length - 1].c : 0;
  const pnl = lastClose && trade.entryPrice ? (lastClose - trade.entryPrice) * trade.units * dirMult : trade.pnl || 0;
  const pnlPct = trade.invested ? (pnl / trade.invested) * 100 : 0;

  const latestCandle = hovered || (candles.length ? candles[candles.length - 1] : null);

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.85)", zIndex: 3000, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)", padding: 12 }}
    >
      <div
        style={{ background: "#fff", borderRadius: 18, width: "100%", maxWidth: 900, maxHeight: "96vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 24px 64px rgba(0,0,0,0.3)" }}
      >
        {/* Header */}
        <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}`, background: C.nav, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <span style={{ fontSize: 16, fontWeight: 900, color: "#fff" }}>{trade.label}</span>
            <span style={{ fontSize: 9, fontWeight: 700, color: trade.direction === "BUY" ? "#86efac" : "#fca5a5", background: "rgba(255,255,255,0.08)", borderRadius: 4, padding: "2px 8px" }}>{trade.direction}</span>
            <span style={{ fontSize: 9, color: "rgba(255,255,255,0.4)" }}>{trade.market}</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: pnl >= 0 ? "#86efac" : "#fca5a5", fontFamily: "monospace" }}>
              {pnl >= 0 ? "+" : ""}${pnl.toFixed(2)} ({pnlPct.toFixed(2)}%)
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {isCrypto && INTERVALS.map((iv) => (
              <button key={iv} onClick={() => setInterval(iv)} style={{ background: interval === iv ? C.blue : "rgba(255,255,255,0.1)", color: "#fff", border: "none", padding: "4px 9px", borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
                {iv}
              </button>
            ))}
            <button onClick={onClose} style={{ background: "rgba(255,255,255,0.12)", border: "none", color: "#fff", width: 30, height: 30, borderRadius: 8, fontSize: 15, cursor: "pointer" }}>x</button>
          </div>
        </div>

        {/* OHLC hover bar */}
        {latestCandle && (
          <div style={{ background: "#f8fafc", borderBottom: `1px solid ${C.border}`, padding: "6px 16px", display: "flex", gap: 16, fontSize: 11, flexWrap: "wrap" }}>
            {[
              { l: "O", v: latestCandle.o, c: C.text },
              { l: "H", v: latestCandle.h, c: C.green },
              { l: "L", v: latestCandle.l, c: C.red },
              { l: "C", v: latestCandle.c, c: latestCandle.c >= latestCandle.o ? C.green : C.red },
            ].map((x) => (
              <span key={x.l}>
                <span style={{ color: C.text3 }}>{x.l}: </span>
                <span style={{ fontWeight: 700, color: x.c, fontFamily: "monospace" }}>{fmtP(x.v, trade.id)}</span>
              </span>
            ))}
            <span style={{ marginLeft: "auto", color: C.text3 }}>
              Entry: <span style={{ color: C.blue, fontWeight: 700, fontFamily: "monospace" }}>{fmtP(trade.entryPrice, trade.id)}</span>
              {sl && <> | SL: <span style={{ color: C.red, fontWeight: 700, fontFamily: "monospace" }}>{fmtP(sl, trade.id)}</span></>}
              {tp && <> | TP: <span style={{ color: C.green, fontWeight: 700, fontFamily: "monospace" }}>{fmtP(tp, trade.id)}</span></>}
            </span>
          </div>
        )}

        {/* Chart area */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0 0 8px 0", background: "#fff" }}>
          {loading && (
            <div style={{ padding: 60, textAlign: "center" }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>📊</div>
              <div style={{ fontSize: 13, color: C.text2 }}>Loading {interval} candles...</div>
            </div>
          )}
          {error && (
            <div style={{ padding: 30, textAlign: "center" }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>⚠️</div>
              <div style={{ fontSize: 12, color: C.text2, maxWidth: 400, margin: "0 auto", lineHeight: 1.6 }}>{error}</div>
            </div>
          )}
          {!loading && !error && candles.length > 0 && (
            <>
              <div style={{ padding: "8px 8px 0" }}>
                <CandlestickSVG candles={candles} entryPrice={trade.entryPrice} sl={sl} tp={tp} />
              </div>
              <div style={{ padding: "0 8px", borderTop: `1px solid #f1f5f9` }}>
                <VolumeChart candles={candles} />
              </div>
              <div style={{ padding: "0 8px", borderTop: `1px solid #f1f5f9` }}>
                <RSIChart candles={candles} />
              </div>
              <div style={{ padding: "6px 16px 2px", display: "flex", gap: 16, fontSize: 10 }}>
                <span><span style={{ color: C.blue }}>━</span> SMA20</span>
                <span><span style={{ color: C.purple }}>━</span> SMA50</span>
                <span><span style={{ color: C.blue }}>╌</span> Entry</span>
                {sl && <span><span style={{ color: C.red }}>╌</span> Stop Loss</span>}
                {tp && <span><span style={{ color: C.green }}>╌</span> Take Profit</span>}
              </div>
            </>
          )}
        </div>

        {/* Footer - trade stats */}
        <div style={{ background: "#f8fafc", borderTop: `1px solid ${C.border}`, padding: "10px 16px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 10 }}>
          {[
            { l: "Direction", v: trade.direction },
            { l: "Entry", v: fmtP(trade.entryPrice, trade.id) },
            { l: "Invested", v: `$${trade.invested?.toFixed(2)}` },
            { l: "Units", v: trade.units?.toFixed(5) },
            { l: "Status", v: trade.status },
            { l: "Held", v: (() => { const ms = (trade.closeDate ? new Date(trade.closeDate) : new Date()) - new Date(trade.openDate); const h = ms / 3600000; return h < 1 ? `${Math.round(ms / 60000)}m` : `${h.toFixed(1)}h`; })() },
          ].map((x) => (
            <div key={x.l}>
              <div style={{ fontSize: 9, color: C.text3, marginBottom: 1 }}>{x.l}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{x.v}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
