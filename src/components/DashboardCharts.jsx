import React, { useMemo } from "react";
import { C } from "../lib/constants";

// Mini SVG line chart
function LineChart({ points, color, h = 60, w = "100%" }) {
  if (!points || points.length < 2) return <div style={{ height: h, background: "#f8fafc", borderRadius: 8 }} />;
  const mn = Math.min(...points);
  const mx = Math.max(...points);
  const r = mx - mn || 1;
  const svgW = 300;
  const coords = points.map(
    (p, i) => `${(i / (points.length - 1)) * svgW},${h - ((p - mn) / r) * (h - 6) - 3}`
  );
  const uid = "lc" + Math.abs((points[0] * 997) | 0);
  const isPos = points[points.length - 1] >= points[0];
  const c = isPos ? C.green : C.red;
  return (
    <svg viewBox={`0 0 ${svgW} ${h}`} style={{ width: w, height: h, display: "block" }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={uid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c} stopOpacity="0.18" />
          <stop offset="100%" stopColor={c} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`M 0,${h} L ${coords.join(" L ")} L ${svgW},${h} Z`} fill={`url(#${uid})`} />
      <path d={`M ${coords.join(" L ")}`} fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Horizontal bar
function HBar({ label, value, max, color, sub }) {
  const pct = max > 0 ? Math.min(100, (Math.abs(value) / max) * 100) : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
        <span style={{ color: C.text2, fontWeight: 600 }}>{label}</span>
        <span style={{ color, fontWeight: 700 }}>{sub}</span>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: "#f1f5f9", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 3, transition: "width 0.5s" }} />
      </div>
    </div>
  );
}

export default function DashboardCharts({ trades, wallet }) {
  const closed = trades.filter((t) => t.status === "CLOSED");

  // Build cumulative P&L curve over time
  const pnlCurve = useMemo(() => {
    if (closed.length === 0) return [];
    const sorted = [...closed].sort((a, b) => new Date(a.closeDate) - new Date(b.closeDate));
    let cum = 0;
    const points = [0];
    sorted.forEach((t) => {
      cum += t.pnl || 0;
      points.push(cum);
    });
    return points;
  }, [closed]);

  // Per-instrument P&L
  const byInstrument = useMemo(() => {
    const map = {};
    closed.forEach((t) => {
      if (!map[t.label]) map[t.label] = { pnl: 0, count: 0 };
      map[t.label].pnl += t.pnl || 0;
      map[t.label].count++;
    });
    return Object.entries(map)
      .map(([label, v]) => ({ label, ...v }))
      .sort((a, b) => b.pnl - a.pnl);
  }, [closed]);

  const best = byInstrument.slice(0, 3);
  const worst = byInstrument.slice(-3).reverse();
  const maxAbs = Math.max(...byInstrument.map((x) => Math.abs(x.pnl)), 0.01);

  // Win / loss streak
  const wins = closed.filter((t) => (t.pnl || 0) > 0).length;
  const losses = closed.filter((t) => (t.pnl || 0) <= 0).length;
  const totalPnl = closed.reduce((a, t) => a + (t.pnl || 0), 0);
  const avgWin = wins > 0
    ? closed.filter((t) => (t.pnl || 0) > 0).reduce((a, t) => a + t.pnl, 0) / wins
    : 0;
  const avgLoss = losses > 0
    ? closed.filter((t) => (t.pnl || 0) <= 0).reduce((a, t) => a + t.pnl, 0) / losses
    : 0;
  const rr = avgLoss !== 0 ? Math.abs(avgWin / avgLoss) : 0;

  if (closed.length === 0) {
    return (
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 30, textAlign: "center", marginTop: 18 }}>
        <div style={{ fontSize: 28, marginBottom: 8 }}>📈</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 4 }}>No closed trades yet</div>
        <div style={{ fontSize: 11, color: C.text3 }}>Open and close trades to see your P&L curve and performance breakdown here.</div>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14, marginTop: 18 }}>

      {/* P&L Curve */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 18, gridColumn: "1 / -1" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Cumulative P&L</div>
          <div style={{ fontSize: 18, fontWeight: 900, color: totalPnl >= 0 ? C.green : C.red, fontFamily: "monospace" }}>
            {totalPnl >= 0 ? "+" : ""}${totalPnl.toFixed(2)}
          </div>
        </div>
        <LineChart points={pnlCurve} h={80} />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: C.text3, marginTop: 6 }}>
          <span>Start</span>
          <span>{closed.length} closed trades</span>
          <span>Now</span>
        </div>
      </div>

      {/* Win / Loss stats */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 18 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 14 }}>Win / Loss Breakdown</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
          {[
            { l: "Wins", v: wins, c: C.green },
            { l: "Losses", v: losses, c: C.red },
            { l: "Avg Win", v: `$${avgWin.toFixed(2)}`, c: C.green },
            { l: "Avg Loss", v: `$${avgLoss.toFixed(2)}`, c: C.red },
          ].map((x) => (
            <div key={x.l} style={{ background: "#f8fafc", borderRadius: 8, padding: "8px 10px" }}>
              <div style={{ fontSize: 9, color: C.text3, marginBottom: 2 }}>{x.l}</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: x.c }}>{x.v}</div>
            </div>
          ))}
        </div>
        <div style={{ background: rr >= 2 ? C.greenL : rr >= 1 ? C.yellowL : C.redL, border: `1px solid ${rr >= 2 ? C.greenB : rr >= 1 ? C.yellowB : C.redB}`, borderRadius: 8, padding: "8px 12px" }}>
          <div style={{ fontSize: 9, color: C.text3, marginBottom: 2 }}>RISK/REWARD RATIO</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: rr >= 2 ? C.green : rr >= 1 ? C.yellow : C.red }}>
            1 : {rr.toFixed(2)}
          </div>
          <div style={{ fontSize: 9, color: C.text3, marginTop: 2 }}>
            {rr >= 2 ? "Excellent — you make 2x what you risk" : rr >= 1 ? "Okay — aim for 1:2 or better" : "Poor — losses are bigger than wins"}
          </div>
        </div>
      </div>

      {/* Best instruments */}
      {best.length > 0 && (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 18 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 14 }}>Best Performers</div>
          {best.map((x) => (
            <HBar
              key={x.label}
              label={x.label}
              value={x.pnl}
              max={maxAbs}
              color={C.green}
              sub={`+$${x.pnl.toFixed(2)} (${x.count} trades)`}
            />
          ))}
        </div>
      )}

      {/* Worst instruments */}
      {worst.length > 0 && worst[0].pnl < 0 && (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 18 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 14 }}>Worst Performers</div>
          {worst.map((x) => (
            <HBar
              key={x.label}
              label={x.label}
              value={x.pnl}
              max={maxAbs}
              color={C.red}
              sub={`$${x.pnl.toFixed(2)} (${x.count} trades)`}
            />
          ))}
        </div>
      )}

    </div>
  );
}
