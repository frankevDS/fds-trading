import React, { useState, useEffect } from "react";
import { C } from "../lib/constants";
import {
  loadTelegramSettings,
  saveTelegramSettings,
  clearTelegramSettings,
  sendTestMessage,
} from "../lib/telegramClient";

export default function TelegramSettings({ onSettingsChange }) {
  const [settings, setSettings] = useState(() => loadTelegramSettings());
  const [chatIdInput, setChatIdInput] = useState(settings.chatId || "");
  const [threshold, setThreshold] = useState(settings.threshold || 85);
  const [enabled, setEnabled] = useState(settings.enabled || false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  function save() {
    const next = { chatId: chatIdInput.trim(), threshold, enabled };
    saveTelegramSettings(next);
    setSettings(next);
    onSettingsChange && onSettingsChange(next);
  }

  function disconnect() {
    clearTelegramSettings();
    setChatIdInput("");
    setEnabled(false);
    setSettings({});
    onSettingsChange && onSettingsChange({});
  }

  async function testConnection() {
    if (!chatIdInput.trim()) return;
    setTesting(true);
    setTestResult(null);
    try {
      await sendTestMessage(chatIdInput.trim());
      setTestResult({ ok: true, msg: "Message sent! Check your Telegram." });
      save();
    } catch (e) {
      setTestResult({ ok: false, msg: e?.message || "Failed to send test message" });
    } finally {
      setTesting(false);
    }
  }

  const isConnected = !!settings.chatId;

  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20, marginBottom: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <span style={{ fontSize: 22 }}>✈️</span>
            <span style={{ fontSize: 15, fontWeight: 800, color: C.text }}>Telegram Alerts</span>
            <span style={{ fontSize: 9, fontWeight: 700, color: isConnected && enabled ? C.green : C.text3, background: isConnected && enabled ? C.greenL : "#f1f5f9", border: `1px solid ${isConnected && enabled ? C.greenB : C.border}`, borderRadius: 5, padding: "2px 8px" }}>
              {isConnected && enabled ? "ACTIVE" : isConnected ? "PAUSED" : "NOT CONNECTED"}
            </span>
          </div>
          <div style={{ fontSize: 11, color: C.text3 }}>
            Get signal alerts on your phone via Telegram when confidence is above your threshold.
          </div>
        </div>
      </div>

      {/* Step-by-step setup guide */}
      {!isConnected && (
        <div style={{ background: "#f8fafc", border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px", marginBottom: 16, fontSize: 11, color: C.text2, lineHeight: 1.8 }}>
          <div style={{ fontWeight: 700, marginBottom: 6, color: C.text }}>How to set up (takes 2 minutes):</div>
          <div>1. Open Telegram and search for <b>@BotFather</b></div>
          <div>2. Send <code style={{ background: "#e2e8f0", padding: "1px 5px", borderRadius: 3 }}>/newbot</code> — give it any name (e.g. "FDS Trading Alerts")</div>
          <div>3. BotFather gives you a <b>bot token</b> — add this to Vercel as <code style={{ background: "#e2e8f0", padding: "1px 5px", borderRadius: 3 }}>TELEGRAM_BOT_TOKEN</code> and redeploy</div>
          <div>4. Search for your bot in Telegram and press <b>Start</b></div>
          <div>5. Search for <b>@userinfobot</b> in Telegram and press Start — it replies with your <b>Chat ID</b></div>
          <div>6. Paste your Chat ID below and click Test Connection</div>
        </div>
      )}

      {/* Chat ID input */}
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 10, fontWeight: 600, color: C.text2, display: "block", marginBottom: 5 }}>
          YOUR TELEGRAM CHAT ID
        </label>
        <input
          value={chatIdInput}
          onChange={(e) => setChatIdInput(e.target.value)}
          placeholder="e.g. 123456789"
          style={{ width: "100%", border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 12px", fontSize: 12, fontFamily: "monospace", boxSizing: "border-box" }}
        />
        <div style={{ fontSize: 10, color: C.text3, marginTop: 4 }}>
          Get this by messaging @userinfobot on Telegram. It's a number like 123456789.
        </div>
      </div>

      {/* Confidence threshold */}
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 10, fontWeight: 600, color: C.text2, display: "block", marginBottom: 5 }}>
          MINIMUM CONFIDENCE TO ALERT: <span style={{ color: C.blue }}>{threshold}%</span>
        </label>
        <input
          type="range"
          min={60}
          max={95}
          step={5}
          value={threshold}
          onChange={(e) => setThreshold(Number(e.target.value))}
          style={{ width: "100%", accentColor: C.blue }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: C.text3 }}>
          <span>60% (more alerts)</span>
          <span>95% (only strongest)</span>
        </div>
      </div>

      {/* Enable/disable toggle */}
      {isConnected && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, padding: "10px 14px", background: "#f8fafc", borderRadius: 9 }}>
          <div
            onClick={() => { const next = !enabled; setEnabled(next); const s = { ...settings, enabled: next }; saveTelegramSettings(s); setSettings(s); onSettingsChange && onSettingsChange(s); }}
            style={{ width: 40, height: 22, borderRadius: 11, background: enabled ? C.green : "#cbd5e1", cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0 }}
          >
            <div style={{ position: "absolute", top: 3, left: enabled ? 21 : 3, width: 16, height: 16, borderRadius: 8, background: "#fff", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.15)" }} />
          </div>
          <span style={{ fontSize: 12, color: C.text2, fontWeight: 600 }}>
            {enabled ? "Alerts are ON — scanner will notify you via Telegram" : "Alerts are paused — tap to enable"}
          </span>
        </div>
      )}

      {/* Test result */}
      {testResult && (
        <div style={{ background: testResult.ok ? C.greenL : C.redL, border: `1px solid ${testResult.ok ? C.greenB : C.redB}`, color: testResult.ok ? C.green : C.red, borderRadius: 8, padding: "8px 12px", fontSize: 11, marginBottom: 12 }}>
          {testResult.msg}
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={testConnection}
          disabled={!chatIdInput.trim() || testing}
          style={{ flex: 1, background: C.blue, color: "#fff", border: "none", padding: "10px 0", borderRadius: 9, fontSize: 12, fontWeight: 700, cursor: testing ? "wait" : "pointer", opacity: !chatIdInput.trim() || testing ? 0.6 : 1 }}
        >
          {testing ? "SENDING..." : isConnected ? "SEND TEST MESSAGE" : "TEST CONNECTION"}
        </button>
        {isConnected && (
          <button
            onClick={disconnect}
            style={{ background: "#fff", color: C.red, border: `1px solid ${C.redB}`, padding: "10px 16px", borderRadius: 9, fontSize: 11, fontWeight: 700, cursor: "pointer" }}
          >
            DISCONNECT
          </button>
        )}
      </div>
    </div>
  );
}
