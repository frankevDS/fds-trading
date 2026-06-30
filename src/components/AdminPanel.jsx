import React, { useState, useEffect } from "react";
import { C } from "../lib/constants";
import { loadAllUsers, approveUser, revokeUser, loadUserTrades } from "../lib/cloudSync";

function UserRow({ user, onApprove, onRevoke, isCurrentUser }) {
  const [expanded, setExpanded] = useState(false);
  const [trades, setTrades] = useState([]);
  const [loadingTrades, setLoadingTrades] = useState(false);

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

  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, marginBottom: 10, overflow: "hidden" }}>
      <div
        onClick={toggleExpand}
        style={{ padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 3 }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: C.text }}>
              {user.display_name || user.email}
            </span>
            {user.role === "admin" && (
              <span style={{ fontSize: 9, fontWeight: 700, color: "#7c3aed", background: "#f3e8ff", border: "1px solid #d8b4fe", borderRadius: 4, padding: "1px 7px" }}>
                ADMIN
              </span>
            )}
            {isCurrentUser && (
              <span style={{ fontSize: 9, color: C.text3, background: "#f1f5f9", border: `1px solid ${C.border}`, borderRadius: 4, padding: "1px 7px" }}>
                YOU
              </span>
            )}
            <span style={{
              fontSize: 9, fontWeight: 700,
              color: user.approved ? C.green : C.red,
              background: user.approved ? C.greenL : C.redL,
              border: `1px solid ${user.approved ? C.greenB : C.redB}`,
              borderRadius: 4, padding: "1px 7px"
            }}>
              {user.approved ? "APPROVED" : "PENDING"}
            </span>
          </div>
          <div style={{ fontSize: 10, color: C.text3 }}>
            {user.email} · Joined {new Date(user.created_at).toLocaleDateString()}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {!isCurrentUser && !user.role === "admin" && (
            user.approved ? (
              <button
                onClick={(e) => { e.stopPropagation(); onRevoke(user.id); }}
                style={{ background: C.redL, color: C.red, border: `1px solid ${C.redB}`, padding: "5px 12px", borderRadius: 7, fontSize: 10, fontWeight: 700, cursor: "pointer" }}
              >
                REVOKE
              </button>
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); onApprove(user.id); }}
                style={{ background: C.greenL, color: C.green, border: `1px solid ${C.greenB}`, padding: "5px 12px", borderRadius: 7, fontSize: 10, fontWeight: 700, cursor: "pointer" }}
              >
                APPROVE
              </button>
            )
          )}
          <span style={{ color: C.text3, fontSize: 11 }}>{expanded ? "▲" : "▼"}</span>
        </div>
      </div>

      {expanded && (
        <div style={{ borderTop: `1px solid ${C.border}`, padding: "12px 16px", background: "#f8fafc" }}>
          {loadingTrades ? (
            <div style={{ fontSize: 12, color: C.text3 }}>Loading trades...</div>
          ) : trades.length === 0 ? (
            <div style={{ fontSize: 12, color: C.text3 }}>No trades yet.</div>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 12 }}>
                {[
                  { l: "Total Trades", v: trades.length },
                  { l: "Open Positions", v: openTrades },
                  { l: "Total P&L", v: `${totalPnl >= 0 ? "+" : ""}$${totalPnl.toFixed(2)}`, c: totalPnl >= 0 ? C.green : C.red },
                ].map((s) => (
                  <div key={s.l} style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 10px" }}>
                    <div style={{ fontSize: 9, color: C.text3, marginBottom: 2 }}>{s.l}</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: s.c || C.text }}>{s.v}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.text2, marginBottom: 6 }}>RECENT TRADES</div>
              {trades.slice(0, 5).map((t) => (
                <div key={t.tradeId} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, padding: "5px 0", borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ color: C.text }}>{t.label} · {t.direction}</span>
                  <span style={{ color: (t.pnl || 0) >= 0 ? C.green : C.red, fontWeight: 700 }}>
                    {(t.pnl || 0) >= 0 ? "+" : ""}${(t.pnl || 0).toFixed(2)} · {t.status}
                  </span>
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

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    const list = await loadAllUsers();
    setUsers(list);
    setLoading(false);
  }

  async function handleApprove(userId) {
    await approveUser(userId);
    setUsers((u) => u.map((x) => x.id === userId ? { ...x, approved: true } : x));
  }

  async function handleRevoke(userId) {
    await revokeUser(userId);
    setUsers((u) => u.map((x) => x.id === userId ? { ...x, approved: false } : x));
  }

  const pending = users.filter((u) => !u.approved && u.role !== "admin");
  const approved = users.filter((u) => u.approved || u.role === "admin");
  const filtered = filter === "PENDING" ? pending : filter === "APPROVED" ? approved : users;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.85)", zIndex: 4000, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)", padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 18, width: "100%", maxWidth: 760, maxHeight: "92vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 24px 64px rgba(0,0,0,0.3)" }}>
        <div style={{ padding: "16px 20px", background: C.nav, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 900, color: "#fff" }}>👑 Admin Panel</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>FDS Trading · Frankev Digital Services</div>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {pending.length > 0 && (
              <span style={{ background: C.red, color: "#fff", borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>
                {pending.length} pending approval
              </span>
            )}
            <button onClick={onClose} style={{ background: "rgba(255,255,255,0.12)", border: "none", color: "#fff", width: 32, height: 32, borderRadius: 8, fontSize: 15, cursor: "pointer" }}>
              x
            </button>
          </div>
        </div>

        <div style={{ padding: "14px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", gap: 6 }}>
          {[["ALL", users.length], ["PENDING", pending.length], ["APPROVED", approved.length]].map(([f, count]) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{ background: filter === f ? C.blue : "#fff", color: filter === f ? "#fff" : C.text2, border: `1px solid ${filter === f ? C.blue : C.border}`, padding: "7px 14px", borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: "pointer" }}
            >
              {f} ({count})
            </button>
          ))}
          <button onClick={fetchUsers} style={{ marginLeft: "auto", background: "#fff", border: `1px solid ${C.border}`, color: C.text2, padding: "7px 14px", borderRadius: 8, fontSize: 11, cursor: "pointer" }}>
            🔄 Refresh
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "14px 20px" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: 40, color: C.text3 }}>Loading users...</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: C.text3 }}>No users found.</div>
          ) : (
            filtered.map((u) => (
              <UserRow
                key={u.id}
                user={u}
                onApprove={handleApprove}
                onRevoke={handleRevoke}
                isCurrentUser={u.id === currentUser?.id}
              />
            ))
          )}
        </div>

        <div style={{ padding: "10px 20px", borderTop: `1px solid ${C.border}`, background: "#f8fafc", fontSize: 10, color: C.text3 }}>
          Total users: {users.length} · Approved: {approved.length} · Pending: {pending.length}
        </div>
      </div>
    </div>
  );
}
