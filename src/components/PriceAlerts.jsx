import React, { useState, useEffect, useRef } from "react";
import { C } from "../lib/constants";
import { fmtP, pfx } from "../lib/indicators";
import { getFeedState, subscribeFeed } from "../lib/binanceFeed";

// PriceAlerts - stored in localStorage so they survive page refresh
const STORAGE_KEY = "fds_price_alerts";

function loadAlerts() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveAlerts(alerts) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
}

// Trigger a browser notification (must be called after user grants permission)
function notify(title, body) {
  if (typeof Notification === "undefined") return;
  if (Notification.permission === "granted") {
    new Notification(title, { body, icon: "/icon-192.png" });
  }
}

// Hook that monitors all active alerts against live prices
export function useAlertMonitor(alerts, onTriggered) {
  const triggered = useRef(new Set());

  useEffect(() => {
    if (!alerts || alerts.length === 0) return;
    const cryptoAlerts = alerts.filter((a) => a.market === "CRYPTO" && !triggered.current.has(a.id));
    if (cryptoAlerts.length === 0) return;

    const unsubs = cryptoAlerts.map((alert) =>
      subscribeFeed(alert.instrumentId, (snap) => {
        if (!snap || !snap.ready || triggered.current.has(alert.id)) return;
        const price = snap.price;
        const hit =
          (alert.direction === "ABOVE" && price >= alert.targetPrice) ||
          (alert.direction === "BELOW" && price <= alert.targetPrice);
        if (hit) {
          triggered.current.add(alert.id);
          onTriggered(alert, price);
          notify(
            `FDS Trading Alert — ${alert.label}`,
            `Price ${alert.direction === "ABOVE" ? "reached" : "dropped to"} ${fmtP(price, alert.instrumentId)}`
          );
        }
      })
    );

    return () => unsubs.forEach((u) => u && u());
  }, [alerts, onTriggered]);
}

export default function PriceAlerts({ instruments }) {
  const [alerts, setAlerts] = useState(loadAlerts);
  const [form, setForm] = useState({ instrumentId: "", label: "", market: "CRYPTO", targetPrice: "", direction: "ABOVE" });
  const [showForm, setShowForm] = useState(false);
  const [notifPerm, setNotifPerm] = useState(
    typeof Notification !== "undefined" ? Notification.permission : "unsupported"
  );
  const [triggered, setTriggered] = useState([]);

  const onTriggered = React.useCallback((alert, price) => {
    setTriggered((t) => [{ ...alert, triggeredAt: price, triggeredTime: new Date().toISOString() }, ...t]);
    setAlerts((prev) => {
      const next = prev.map((a) => a.id === alert.id ? { ...a, status: "TRIGGERED" } : a);
      saveAlerts(next);
      return next;
    });
  }, []);

  useAlertMonitor(alerts.filter((a) => a.status === "ACTIVE"), onTriggered);

  function requestNotifPermission() {
    if (typeof Notification === "undefined") return;
    Notification.requestPermission().then((p) => setNotifPerm(p));
  }

  function addAlert() {
    const price = parseFloat(form.targetPrice);
    if (!form.instrumentId || !price || isNaN(price)) return;
    const instr = (instruments || []).find((x) => x.id === form.instrumentId);
    const newAlert = {
      id: Date.now(),
      instrumentId: form.instrumentId,
      label: instr ? instr.label : form.instrumentId,
      market: form.market,
      targetPrice: price,
      direction: form.direction,
      status: "ACTIVE",
      createdAt: new Date().toISOString(),
    };
    const next = [newAlert, ...alerts];
    setAlerts(next);
    saveAlerts(next);
    setShowForm(false);
    setForm({ instrumentId: "", label: "", market: "CRYPTO", targetPrice: "", direction: "ABOVE" });
  }

  function deleteAlert(id) {
    const next = alerts.filter((a) => a.id !== id);
    setAlerts(next);
    saveAlerts(next);
  }

  const cryptoInstruments = instruments || [];
  const active = alerts.filter((a) => a.status === "ACTIVE");
  const past = alerts.filter((a) => a.status === "TRIGGERED");

  return (
    <div>
      {/* Notification permission banner */}
      {notifPerm !== "granted" && notifPerm !== "unsupported" && (
        <div style={{ background: C.yellowL, border: `1px solid ${C.yellowB}`, borderRadius: 10, padding: "10px 14px", marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 12, color: C.yellow, fontWeight: 600 }}>
            Enable browser notifications to get alerts even when the app is in the background.
          </span>
          <button
            onClick={requestNotifPermission}
            style={{ background: C.yellow, color: "#fff", border: "none", padding: "6px 14px", borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: "pointer", flexShrink: 0, marginLeft: 10 }}
          >
            Enable
          </button>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Price Alerts</div>
          <div style={{ fontSize: 11, color: C.text3 }}>{active.length} active</div>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          style={{ background: C.blue, color: "#fff", border: "none", padding: "8px 16px", borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: "pointer" }}
        >
          {showForm ? "CANCEL" : "+ NEW ALERT"}
        </button>
      </div>

      {showForm && (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div>
              <label style={{ fontSize: 10, color: C.text3, display: "block", marginBottom: 4 }}>INSTRUMENT</label>
              <select
                value={form.instrumentId}
                onChange={(e) => {
                  const instr = cryptoInstruments.find((x) => x.id === e.target.value);
                  setForm({ ...form, instrumentId: e.target.value, label: instr?.label || "", market: "CRYPTO" });
                }}
                style={{ width: "100%", border: `1px solid ${C.border}`, borderRadius: 7, padding: "8px 10px", fontSize: 12 }}
              >
                <option value="">Select...</option>
                {cryptoInstruments.map((x) => (
                  <option key={x.id} value={x.id}>{x.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 10, color: C.text3, display: "block", marginBottom: 4 }}>DIRECTION</label>
              <select
                value={form.direction}
                onChange={(e) => setForm({ ...form, direction: e.target.value })}
                style={{ width: "100%", border: `1px solid ${C.border}`, borderRadius: 7, padding: "8px 10px", fontSize: 12 }}
              >
                <option value="ABOVE">Price goes ABOVE</option>
                <option value="BELOW">Price drops BELOW</option>
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 10, color: C.text3, display: "block", marginBottom: 4 }}>TARGET PRICE</label>
            <input
              value={form.targetPrice}
              onChange={(e) => setForm({ ...form, targetPrice: e.target.value })}
              placeholder="e.g. 65000"
              style={{ width: "100%", border: `1px solid ${C.border}`, borderRadius: 7, padding: "8px 10px", fontSize: 12 }}
            />
            {form.instrumentId && (
              <div style={{ fontSize: 10, color: C.text3, marginTop: 4 }}>
                Current: {fmtP(getFeedState(form.instrumentId)?.price || 0, form.instrumentId)}
              </div>
            )}
          </div>
          <button
            onClick={addAlert}
            style={{ background: C.green, color: "#fff", border: "none", padding: "9px 20px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}
          >
            SET ALERT
          </button>
        </div>
      )}

      {active.length === 0 && !showForm && (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 40, textAlign: "center" }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>🔔</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 4 }}>No active alerts</div>
          <div style={{ fontSize: 11, color: C.text3 }}>Set a price target on any crypto instrument and get a browser notification when it's hit.</div>
        </div>
      )}

      {active.map((a) => (
        <div key={a.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: C.text }}>{a.label}</span>
              <span style={{ fontSize: 9, fontWeight: 700, color: a.direction === "ABOVE" ? C.green : C.red, background: a.direction === "ABOVE" ? C.greenL : C.redL, border: `1px solid ${a.direction === "ABOVE" ? C.greenB : C.redB}`, borderRadius: 4, padding: "1px 6px" }}>
                {a.direction}
              </span>
            </div>
            <div style={{ fontSize: 12, color: C.text2 }}>
              Alert when price {a.direction === "ABOVE" ? "reaches" : "drops to"}{" "}
              <span style={{ fontWeight: 700, fontFamily: "monospace" }}>{fmtP(a.targetPrice, a.instrumentId)}</span>
            </div>
          </div>
          <button
            onClick={() => deleteAlert(a.id)}
            style={{ background: "#fff", border: `1px solid ${C.border}`, color: C.red, width: 28, height: 28, borderRadius: 6, fontSize: 12, cursor: "pointer" }}
          >
            x
          </button>
        </div>
      ))}

      {past.length > 0 && (
        <>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.text2, margin: "16px 0 8px" }}>TRIGGERED</div>
          {past.map((a) => (
            <div key={a.id} style={{ background: "#f8fafc", border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 14px", marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "center", opacity: 0.7 }}>
              <div>
                <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{a.label}</span>
                <span style={{ fontSize: 10, color: C.text3, marginLeft: 8 }}>{a.direction} {fmtP(a.targetPrice, a.instrumentId)} — triggered</span>
              </div>
              <button onClick={() => deleteAlert(a.id)} style={{ background: "none", border: "none", color: C.text3, cursor: "pointer", fontSize: 12 }}>x</button>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
