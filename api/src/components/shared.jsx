import React from "react";
import { C, SIG } from "../lib/constants";

export function Spark({ points, pos, w = 88, h = 32 }) {
  if (!points || points.length < 2) return null;
  const mn = Math.min(...points),
    mx = Math.max(...points),
    r = mx - mn || 1;
  const coords = points.map((p, i) => `${(i / (points.length - 1)) * w},${h - ((p - mn) / r) * (h - 2) - 1}`);
  const c = pos ? "#16a34a" : "#dc2626";
  const uid = "sk" + (Math.abs((points[0] * 997) | 0) % 9999);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: w, height: h }}>
      <defs>
        <linearGradient id={uid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c} stopOpacity="0.15" />
          <stop offset="100%" stopColor={c} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`M 0,${h} L ${coords.join(" L ")} L ${w},${h} Z`} fill={`url(#${uid})`} />
      <path
        d={`M ${coords.join(" L ")}`}
        fill="none"
        stroke={c}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Badge({ sig, sm }) {
  const c = SIG[sig] || SIG.HOLD;
  return (
    <span
      style={{
        background: c.bg,
        color: c.color,
        border: `1px solid ${c.border}`,
        borderRadius: 5,
        padding: sm ? "2px 7px" : "3px 10px",
        fontSize: sm ? 10 : 11,
        fontWeight: 700,
        whiteSpace: "nowrap",
      }}
    >
      {c.label}
    </span>
  );
}

export function StatCard({ label, value, sub, color, icon }) {
  return (
    <div
      style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        padding: "16px 18px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <span style={{ fontSize: 11, color: C.text2, fontWeight: 600 }}>{label}</span>
        {icon && <span style={{ fontSize: 18 }}>{icon}</span>}
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: color || C.text, marginBottom: 2 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: C.text3 }}>{sub}</div>}
    </div>
  );
}

export function PBar({ val, color }) {
  const pct = Math.min(100, Math.max(0, val || 0));
  return (
    <div style={{ height: 5, borderRadius: 3, background: "#f1f5f9", overflow: "hidden" }}>
      <div
        style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 3, transition: "width 0.5s" }}
      />
    </div>
  );
}
