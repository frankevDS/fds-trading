import React, { useState, useEffect } from "react";
import { C } from "../lib/constants";
import { loadAllUsers, approveUser, revokeUser, loadUserTrades } from "../lib/cloudSync";
import { supabase } from "../lib/supabase";

async function suspendUser(userId) {
  if (!supabase) return;
  // Set approved=false AND add a suspended flag
  await supabase.from("profiles").update({ approved: false, role: "suspended" }).eq("id", userId);
}

async function unsuspendUser(userId) {
  if (!supabase) return;
  await supabase.from("profiles").update({ approved: true, role: "user" }).eq("id", userId);
}

function StatusBadge({ user }) {
  const isSuspended = user.role === "suspended";
  const isAdmin = user.role === "admin";
  const isApproved = user.approved && !isSuspended;

  if (isAdmin) return <span style={{ fontSize: 9, fontWeight: 700, color: "#7c3aed", background: "#f3e8ff", border: "1px solid #d8b4fe", borderRadius: 4, padding: "1px 7px" }}>ADMIN</span>;
  if (isSuspended) return <span style={{ fontSize: 9, fontWeight: 700, color: "#dc2626", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 4, padding: "1px 7px" }}>SUSPENDED</span>;
  if (isApproved) return <span style={{ fontSize: 9, fontWeight: 700, color: "#16a34a", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 4, padding: "1px 7px" }}>APPROVED</span>;
  return <span style={{ fontSize: 9, fontWeight: 700, color: "#d97706", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 4, padding: "1px 7px" }}>PENDING</span>;
}

function UserRow({ user, onAction, isCurrentUser }) {
  const [expanded, setExpanded] = useState(false);
  const [trades, setTrades] = useState([]);
  const [loadingTrades, setLoadingTrades] = useState(false);
  const [confirming, setConfirming] = useState(null);

  const isSuspended = user.role === "suspended";
  const isAdmin = user.role === "admin";

  async function toggleExpand() {
    if (!expanded && trades.length === 0) {
      setLoadingTrades(true);
      const t = await loadUserTrades(user.id);
      setTrades(t);
      setLoadingTrades(false);
    }
    setExpanded((x) => !x);
  }

  const totalPnl = trades.reduce((a, t) => a + (t.pnl || 0), 0);
  const openTrades = trades.filter((t) => t.status === "OPEN").length;
  const closedTrades = trades.filter((t) => t.status === "CLOSED").length;
  const wins = trades.filter((t) => (t.pnl || 0) > 0).length;
  const winRate = closedTrades ? ((wins / closedTrades) * 100).toFixed(0) : "0";

  return (
    <div style={{ background: C.card, border: `2px solid ${isSuspended ? C.redB : C.border}`, borderRadius: 12, marginBottom: 10, overflow: "hidden" }}>
      <div onClick={toggleExpand} style={{ padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", background: isSuspended ? "#fff5f5" : "#fff" }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: C.text }}>
              {user.display_name || user.email?.split("@")[0]}
            </span>
            <StatusBadge user={user} />
            {isCurrentUser && <span style={{ fontSize: 9, color: C.text3, background: "#f1f5f9", border: `1px solid ${C.border}`, borderRadius: 4, padding: "1px 6px" }}>YOU</span>}
          </div>
          <div style={{ fontSize: 10, color: C.text3 }}>
            {user.email} · Joined {new Date(user.created_at).toLocaleDateString("en-GB")}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          {!isCurrentUser && !isAdmin && (
            <>
              {!user.approved && !isSuspended && (
                <button
                  onClick={(e) => { e.stopPropagation(); onAction("approve", user); }}
                  style={{ background: C.greenL, color: C.green, border: `1px solid ${C.greenB}`, padding: "5px 10px", borderRadius: 7, fontSize: 10, fontWeight: 700, cursor: "pointer" }}
                >
                  ✓ Approve
                </button>
              )}
              {user.approved && !isSuspended && (
                <>
                  {confirming === "revoke" ? (
                    <>
                      <button onClick={(e) => { e.stopPropagation(); onAction("revoke", user); setConfirming(null); }} style={{ background: C.redL, color: C.red, border: `1px solid ${C.redB}`, padding: "5px 10px", borderRadius: 7, fontSize: 10, fontWeight: 700, cursor: "pointer" }}>Confirm Revoke</button>
                      <button onClick={(e) => { e.stopPropagation(); setConfirming(null); }} style={{ background: "#fff", color: C.text2, border: `1px solid ${C.border}`, padding: "5px 8px", borderRadius: 7, fontSize: 10, cursor: "pointer" }}>Cancel</button>
                    </>
                  ) : (
                    <button onClick={(e) => { e.stopPropagation(); setConfirming("revoke"); }} style={{ background: "#fff", color: C.red, border: `1px solid ${C.redB}`, padding: "5px 10px", borderRadius: 7, fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
                      Revoke
                    </button>
                  )}
                </>
              )}
              {isSuspended ? (
                <button onClick={(e) => { e.stopPropagation(); onAction("unsuspend", user); }} style={{ background: C.greenL, color: C.green, border: `1px solid ${C.greenB}`, padding: "5px 10px", borderRadius: 7, fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
                  ✓ Unsuspend
                </button>
              ) : (
                confirming === "suspend" ? (
                  <>
                    <button onClick={(e) => { e.stopPropagation(); onAction("suspend", user); setConfirming(null); }} style={{ background: "#dc2626", color: "#fff", border: "none", padding: "5px 10px", borderRadius: 7, fontSize: 10, fontWeight: 700, cursor: "pointer" }}>Confirm Suspend</button>
                    <button onClick={(e) => { e.stopPropagation(); setConfirming(null); }} style={{ background: "#fff", color: C.text2, border: `1px solid ${C.border}`, padding: "5px 8px", borderRadius: 7, fontSize: 10, cursor: "pointer" }}>Cancel</button>
                  </>
                ) : (
                  <button onClick={(e) => { e.stopPropagation(); setConfirming("suspend"); }} style={{ background: "#fff7ed", color: "#c2410c", border: "1px solid #fed7aa", padding: "5px 10px", borderRadius: 7, fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
                    Suspend
                  </button>
                )
              )}
            </>
          )}
          <span style={{ color: C.text3, fontSize: 12 }}>{expanded ? "▲" : "▼"}</span>
        </div>
      </div>

      {expanded && (
        <div style={{ borderTop: `1px solid ${C.border}`, padding: "12px 16px", background: "#f8fafc" }}>
          {loadingTrades ? (
            <div style={{ fontSize: 12, color: C.text3 }}>Loading trades...</div>
          ) : trades.length === 0 ? (
            <div style={{ fontSize: 12, color: C.text3 }}>No trades placed yet.</div>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: 8, marginBottom: 12 }}>
                {[
                  { l: "Total Trades", v: trades.length },
                  { l: "Open", v: openTrades, c: openTrades > 0 ? C.blue : C.text },
                  { l: "Closed", v: closedTrades },
                  { l: "Win Rate", v: `${winRate}%`, c: parseInt(winRate) >= 50 ? C.green : C.red },
                  { l: "Total P&L", v: `${totalPnl >= 0 ? "+" : ""}$${totalPnl.toFixed(2)}`, c: totalPnl >= 0 ? C.green : C.red },
                ].map((s) => (
                  <div key={s.l} style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 10px" }}>
                    <div style={{ fontSize: 9, color: C.text3, marginBottom: 2 }}>{s.l}</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: s.c || C.text }}>{s.v}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.text2, marginBottom: 6 }}>RECENT ACTIVITY</div>
              {trades.slice(0, 6).map((t) => (
                <div key={t.tradeId} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, padding: "6px 0", borderBottom: `1px solid ${C.border}` }}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <span style={{ fontWeight: 700, color: C.text }}>{t.label}</span>
                    <span style={{ color: t.direction === "BUY" ? C.green : C.red }}>{t.direction}</span>
                    <span style={{ color: C.text3 }}>{t.market}</span>
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <span style={{ color: t.status === "OPEN" ? C.blue : C.text3 }}>{t.status}</span>
                    <span style={{ color: (t.pnl || 0) >= 0 ? C.green : C.red, fontWeight: 700 }}>
                      {(t.pnl || 0) >= 0 ? "+" : ""}${(t.pnl || 0).toFixed(2)}
                    </span>
                    <span style={{ color: C.text3 }}>{new Date(t.openDate).toLocaleDateString("en-GB")}</span>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminPanel({ currentUser, onClose }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  useEffect(() => { fetchUsers(); }, []);

  async function fetchUsers() {
    setLoading(true);
    const list = await loadAllUsers();
    setUsers(list);
    setLoading(false);
  }

  async function handleAction(action, user) {
    if (action === "approve") { await approveUser(user.id); setUsers((u) => u.map((x) => x.id === user.id ? { ...x, approved: true } : x)); }
    if (action === "revoke") { await revokeUser(user.id); setUsers((u) => u.map((x) => x.id === user.id ? { ...x, approved: false } : x)); }
    if (action === "suspend") { await suspendUser(user.id); setUsers((u) => u.map((x) => x.id === user.id ? { ...x, approved: false, role: "suspended" } : x)); }
    if (action === "unsuspend") { await unsuspendUser(user.id); setUsers((u) => u.map((x) => x.id === user.id ? { ...x, approved: true, role: "user" } : x)); }
  }

  const pending = users.filter((u) => !u.approved && u.role !== "admin" && u.role !== "suspended");
  const approved = users.filter((u) => u.approved || u.role === "admin");
  const suspended = users.filter((u) => u.role === "suspended");

  const filtered = users
    .filter((u) => {
      if (filter === "PENDING") return !u.approved && u.role !== "admin" && u.role !== "suspended";
      if (filter === "APPROVED") return u.approved || u.role === "admin";
      if (filter === "SUSPENDED") return u.role === "suspended";
      return true;
    })
    .filter((u) => !search || u.email?.toLowerCase().includes(search.toLowerCase()) || u.display_name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.85)", zIndex: 4000, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)", padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 18, width: "100%", maxWidth: 800, maxHeight: "94vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 24px 64px rgba(0,0,0,0.3)" }}>

        {/* Header */}
        <div style={{ padding: "16px 20px", background: C.nav, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 900, color: "#fff" }}>👑 Admin Control Panel</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>FDS Trading · Frankev Digital Services · {users.length} total users</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {pending.length > 0 && (
              <span style={{ background: "#f59e0b", color: "#000", borderRadius: 20, padding: "3px 12px", fontSize: 11, fontWeight: 800 }}>
                {pending.length} awaiting approval
              </span>
            )}
            <button onClick={onClose} style={{ background: "rgba(255,255,255,0.12)", border: "none", color: "#fff", width: 32, height: 32, borderRadius: 8, fontSize: 15, cursor: "pointer" }}>x</button>
          </div>
        </div>

        {/* Stats bar */}
        <div style={{ padding: "10px 20px", background: "#f8fafc", borderBottom: `1px solid ${C.border}`, display: "flex", gap: 20, fontSize: 11 }}>
          {[
            { l: "Total", v: users.length, c: C.blue },
            { l: "Approved", v: approved.length, c: C.green },
            { l: "Pending", v: pending.length, c: C.yellow },
            { l: "Suspended", v: suspended.length, c: C.red },
          ].map((s) => (
            <div key={s.l} style={{ display: "flex", gap: 5, alignItems: "center" }}>
              <span style={{ color: C.text3 }}>{s.l}:</span>
              <span style={{ fontWeight: 800, color: s.c }}>{s.v}</span>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ padding: "10px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by email or name..." style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: "6px 12px", fontSize: 11, width: 200 }} />
          {["ALL", "PENDING", "APPROVED", "SUSPENDED"].map((f) => (
            <button key={f} onClick={() => setFilter(f)} style={{ background: filter === f ? C.blue : "#fff", color: filter === f ? "#fff" : C.text2, border: `1px solid ${filter === f ? C.blue : C.border}`, padding: "6px 12px", borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
              {f} ({f === "ALL" ? users.length : f === "PENDING" ? pending.length : f === "APPROVED" ? approved.length : suspended.length})
            </button>
          ))}
          <button onClick={fetchUsers} style={{ marginLeft: "auto", background: "#fff", border: `1px solid ${C.border}`, color: C.text2, padding: "6px 12px", borderRadius: 8, fontSize: 11, cursor: "pointer" }}>
            🔄 Refresh
          </button>
        </div>

        {/* User list */}
        <div style={{ flex: 1, overflowY: "auto", padding: "14px 20px" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: 40, color: C.text3 }}>Loading users...</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: C.text3 }}>No users in this category.</div>
          ) : (
            filtered.map((u) => (
              <UserRow key={u.id} user={u} onAction={handleAction} isCurrentUser={u.id === currentUser?.id} />
            ))
          )}
        </div>

        <div style={{ padding: "10px 20px", borderTop: `1px solid ${C.border}`, background: "#f8fafc", fontSize: 10, color: C.text3 }}>
          Approved users have full trading access. Suspended users are immediately blocked from the platform. Pending users see a waiting screen until approved.
        </div>
      </div>
    </div>
  );
}
