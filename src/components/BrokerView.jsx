import React, { useState, useEffect } from "react";
import { C } from "../lib/constants";
import { loadKeys, saveKeys, clearKeys, testConnection, getAccount } from "../lib/binanceTrade";

const OTHER_BROKERS = [
  { name: "Binance (live)", note: "Real-money trading - intentionally not wired up. Testnet above is the safe place to validate signals first." },
  { name: "Coinbase", note: "Not yet connected. Same proxy pattern as Binance Testnet would apply." },
  { name: "Alpaca", note: "Not yet connected. Free paper trading + real-time data for stocks." },
  { name: "OANDA", note: "Not yet connected. Well-documented practice account API for forex." },
  { name: "IC Markets", note: "Not yet connected." },
  { name: "Interactive Brokers", note: "Not yet connected." },
];

export default function BrokerView({ connected, onConnected, onDisconnected }) {
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [account, setAccount] = useState(null);
  const [acctErr, setAcctErr] = useState("");

  useEffect(() => {
    if (!connected) return;
    refreshAccount();
    const iv = setInterval(refreshAccount, 15000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected]);

  async function refreshAccount() {
    try {
      const a = await getAccount();
      setAccount(a);
      setAcctErr("");
    } catch (e) {
      setAcctErr(e?.message || "Couldn't refresh testnet account");
    }
  }

  async function connect() {
    if (!apiKey.trim() || !apiSecret.trim() || busy) return;
    setBusy(true);
    setErr("");
    try {
      await testConnection(apiKey.trim(), apiSecret.trim());
      saveKeys(apiKey.trim(), apiSecret.trim());
      setApiKey("");
      setApiSecret("");
      onConnected();
    } catch (e) {
      setErr(e?.message || "Couldn't connect - check your testnet key and secret");
    } finally {
      setBusy(false);
    }
  }

  function disconnect() {
    clearKeys();
    setAccount(null);
    onDisconnected();
  }

  return (
    <div>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 22, marginBottom: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: C.text }}>Binance Testnet</span>
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  color: connected ? C.green : C.text3,
                  background: connected ? C.greenL : "#f1f5f9",
                  border: `1px solid ${connected ? C.greenB : C.border}`,
                  borderRadius: 5,
                  padding: "2px 8px",
                }}
              >
                {connected ? "CONNECTED" : "NOT CONNECTED"}
              </span>
            </div>
            <div style={{ fontSize: 11, color: C.text3 }}>
              Sandbox crypto trading with real Binance order matching and fake funds - no real money at risk.
            </div>
          </div>
        </div>

        {!connected ? (
          <>
            <div style={{ fontSize: 11, color: C.text2, lineHeight: 1.6, marginBottom: 14, background: "#f8fafc", border: `1px solid ${C.border}`, borderRadius: 9, padding: "10px 14px" }}>
              1. Go to{" "}
              <a href="https://testnet.binance.vision" target="_blank" rel="noreferrer" style={{ color: C.blue, fontWeight: 600 }}>
                testnet.binance.vision
              </a>{" "}
              and log in with GitHub.
              <br />
              2. Generate an HMAC API key + secret - these are sandbox-only and separate from any real Binance.com keys.
              <br />
              3. Paste them below. They're stored only in this browser and sent only to this app's own server when placing or closing trades.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
              <input
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Testnet API key"
                style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 12px", fontSize: 12, fontFamily: "monospace" }}
              />
              <input
                value={apiSecret}
                onChange={(e) => setApiSecret(e.target.value)}
                placeholder="Testnet API secret"
                type="password"
                style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 12px", fontSize: 12, fontFamily: "monospace" }}
              />
            </div>
            {err && (
              <div style={{ background: C.redL, border: `1px solid ${C.redB}`, color: C.red, borderRadius: 8, padding: "8px 12px", fontSize: 11, marginBottom: 12 }}>
                {err}
              </div>
            )}
            <button
              onClick={connect}
              disabled={busy}
              style={{ background: C.blue, color: "#fff", border: "none", padding: "10px 22px", borderRadius: 9, fontSize: 12, fontWeight: 700, cursor: busy ? "wait" : "pointer", opacity: busy ? 0.7 : 1 }}
            >
              {busy ? "CONNECTING..." : "CONNECT"}
            </button>
          </>
        ) : (
          <>
            {acctErr && (
              <div style={{ background: C.redL, border: `1px solid ${C.redB}`, color: C.red, borderRadius: 8, padding: "8px 12px", fontSize: 11, marginBottom: 12 }}>
                {acctErr}
              </div>
            )}
            {account ? (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.text2, marginBottom: 8 }}>TESTNET BALANCES</div>
                {account.balances.length === 0 ? (
                  <div style={{ fontSize: 12, color: C.text3 }}>No balances yet - your testnet account starts empty until you request faucet funds on testnet.binance.vision.</div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 10 }}>
                    {account.balances.map((b) => (
                      <div key={b.asset} style={{ background: "#f8fafc", border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 10px" }}>
                        <div style={{ fontSize: 10, color: C.text3 }}>{b.asset}</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{parseFloat(b.free).toFixed(4)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ fontSize: 12, color: C.text3, marginBottom: 14 }}>Loading testnet account...</div>
            )}
            <button
              onClick={disconnect}
              style={{ background: "#fff", color: C.red, border: `1px solid ${C.redB}`, padding: "9px 18px", borderRadius: 9, fontSize: 12, fontWeight: 700, cursor: "pointer" }}
            >
              DISCONNECT
            </button>
          </>
        )}
      </div>

      <div style={{ fontSize: 12, fontWeight: 700, color: C.text2, marginBottom: 10 }}>OTHER BROKERS</div>
      <div style={{ fontSize: 11, color: C.text3, marginBottom: 10 }}>
        These aren't built yet on purpose - each one needs its own secure server-side connection, the same way Binance Testnet above works. No input fields here yet because there's nothing live to connect to.
      </div>
      {OTHER_BROKERS.map((b) => (
        <div key={b.name} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 18px", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{b.name}</div>
            <div style={{ fontSize: 11, color: C.text3 }}>{b.note}</div>
          </div>
          <span style={{ fontSize: 9, fontWeight: 700, color: C.text3, background: "#f1f5f9", border: `1px solid ${C.border}`, borderRadius: 5, padding: "2px 8px" }}>
            COMING SOON
          </span>
        </div>
      ))}
    </div>
  );
}

export function hasStoredBinanceKeys() {
  return !!loadKeys();
}
