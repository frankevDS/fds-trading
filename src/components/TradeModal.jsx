import React, { useState } from "react";
import { C } from "../lib/constants";
import { fmtP, pfx } from "../lib/indicators";
import { Badge } from "./shared";
import { marketBuyByQuote } from "../lib/binanceTrade";

export default function TradeModal({ pre, wallet, brokerConnected, onPlace, onClose }) {
  const canUseTestnet = pre?.market === "CRYPTO" && brokerConnected && !!pre?.binanceSymbol;
  const [useTestnet, setUseTestnet] = useState(canUseTestnet);
  const isCryptoBroker = canUseTestnet && useTestnet;

  const [dir, setDir] = useState(pre?.signal?.includes("BUY") ? "BUY" : "SELL");
  const [amt, setAmt] = useState("");
  const [sl, setSl] = useState("");
  const [tp, setTp] = useState("");
  const [leverage, setLeverage] = useState(1);
  const [placing, setPlacing] = useState(false);
  const [err, setErr] = useState("");

  const avail = wallet.balance;
  const invested = parseFloat(amt) || 0;
  const price = pre?.price || 1;
  const effectiveLeverage = isCryptoBroker ? 1 : leverage;
  const units = (invested / price) * effectiveLeverage;

  async function handleSubmit() {
    if (!invested || invested > avail || placing) return;

    if (isCryptoBroker) {
      setPlacing(true);
      setErr("");
      try {
        const result = await marketBuyByQuote(pre.binanceSymbol, invested);
        onPlace({
          id: pre.id,
          label: pre.label,
          market: pre.market,
          signal: pre.signal,
          direction: "BUY",
          invested: result.quoteSpent,
          entryPrice: result.avgPrice,
          sl,
          tp,
          units: result.executedQty,
          status: "OPEN",
          openDate: new Date().toISOString(),
          tradeId: Date.now(),
          pnl: 0,
          broker: "BINANCE_TESTNET",
          binanceSymbol: pre.binanceSymbol,
        });
        onClose();
      } catch (e) {
        setErr(e?.message || "Order failed");
        setPlacing(false);
      }
      return;
    }

    onPlace({
      id: pre?.id,
      label: pre?.label,
      market: pre?.market,
      signal: pre?.signal,
      direction: dir,
      invested,
      entryPrice: price,
      sl,
      tp,
      units,
      leverage: effectiveLeverage,
      status: "OPEN",
      openDate: new Date().toISOString(),
      tradeId: Date.now(),
      pnl: 0,
    });
    onClose();
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.65)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(5px)", padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 18, width: "100%", maxWidth: 440, padding: 26, boxShadow: "0 24px 64px rgba(0,0,0,0.18)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: canUseTestnet ? 10 : 20 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.text }}>Place Trade</div>
            <div style={{ fontSize: 11, color: C.text3 }}>
              {isCryptoBroker ? "Binance Testnet - real sandbox order" : "FDS Trading - Virtual Account"}
            </div>
          </div>
          <button onClick={onClose} style={{ background: "#fff", border: `1px solid ${C.border}`, color: C.text2, width: 32, height: 32, borderRadius: 8, cursor: "pointer", fontSize: 16 }}>
            x
          </button>
        </div>

        {canUseTestnet && (
          <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
            {[{ label: "🔗 Binance Testnet", val: true }, { label: "💰 Virtual Wallet", val: false }].map((opt) => (
              <button
                key={String(opt.val)}
                onClick={() => { setUseTestnet(opt.val); if (opt.val) setDir("BUY"); }}
                style={{ flex: 1, padding: "7px 0", borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: "pointer", background: useTestnet === opt.val ? C.blue : "#fff", color: useTestnet === opt.val ? "#fff" : C.text2, border: `1px solid ${useTestnet === opt.val ? C.blue : C.border}` }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {isCryptoBroker && (
          <div style={{ background: C.blueL, border: `1px solid ${C.blueB}`, borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 11, color: C.blue, lineHeight: 1.5 }}>
            This places a real market order on your Binance Testnet account (sandbox funds, real order matching). Spot accounts can't open shorts, so this trade opens a long position - use CLOSE POSITION in Trades to sell back.
          </div>
        )}

        <div style={{ background: "#f8fafc", border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 16px", marginBottom: 18, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: C.text }}>{pre?.label}</span>
              {pre?.signal && <Badge sig={pre.signal} sm={true} />}
            </div>
            <div style={{ fontSize: 10, color: C.text3 }}>{pre?.market}</div>
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, color: C.text, fontFamily: "monospace" }}>
            {pfx(pre?.market || "", pre?.id || "")}
            {fmtP(price, pre?.id || "")}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
          {["BUY", "SELL"].map((d) => {
            const disabled = isCryptoBroker && d === "SELL";
            return (
              <button
                key={d}
                disabled={disabled}
                onClick={() => !disabled && setDir(d)}
                title={disabled ? "Spot accounts can't open shorts - use CLOSE POSITION to sell an open trade" : undefined}
                style={{
                  padding: "12px 0",
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: disabled ? "not-allowed" : "pointer",
                  opacity: disabled ? 0.4 : 1,
                  background: dir === d ? (d === "BUY" ? C.green : C.red) : "#fff",
                  color: dir === d ? "#fff" : C.text2,
                  border: `2px solid ${dir === d ? (d === "BUY" ? C.green : C.red) : C.border}`,
                }}
              >
                {d === "BUY" ? "BUY / LONG" : "SELL / SHORT"}
              </button>
            );
          })}
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: C.text2, display: "block", marginBottom: 5 }}>
            Amount (USD{isCryptoBroker ? "T" : ""}) - Available: ${avail.toFixed(2)}
          </label>
          <div style={{ display: "flex", gap: 5, marginBottom: 7, flexWrap: "wrap" }}>
            {[100, 500, 1000, 5000].filter((a) => a <= avail).map((a) => (
              <button
                key={a}
                onClick={() => setAmt(String(a))}
                style={{ background: amt === String(a) ? C.blue : "#fff", color: amt === String(a) ? "#fff" : C.text2, border: `1px solid ${amt === String(a) ? C.blue : C.border}`, padding: "5px 10px", borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: "pointer" }}
              >
                ${a}
              </button>
            ))}
            <button onClick={() => setAmt(avail.toFixed(2))} style={{ background: "#fff", color: C.text2, border: `1px solid ${C.border}`, padding: "5px 10px", borderRadius: 6, fontSize: 10, cursor: "pointer" }}>
              MAX
            </button>
          </div>
          <input
            value={amt}
            onChange={(e) => setAmt(e.target.value)}
            placeholder="Enter amount..."
            style={{ width: "100%", border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 12px", fontSize: 12, color: C.text, boxSizing: "border-box" }}
          />
        </div>

        {!isCryptoBroker && (
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: C.text2, display: "block", marginBottom: 5 }}>
              Lot Size (Leverage) - Virtual account only
            </label>
            <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
              {[1, 2, 5, 10, 20].map((lv) => (
                <button
                  key={lv}
                  onClick={() => setLeverage(lv)}
                  style={{
                    flex: 1,
                    background: leverage === lv ? C.purple : "#fff",
                    color: leverage === lv ? "#fff" : C.text2,
                    border: `1px solid ${leverage === lv ? C.purple : C.border}`,
                    padding: "7px 0",
                    borderRadius: 7,
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {lv}x
                </button>
              ))}
            </div>
            <div style={{ fontSize: 10, color: C.text3 }}>
              {leverage === 1
                ? "Standard size - your position matches your invested amount."
                : `Position size is ${leverage}x your invested amount (units: ${units.toFixed(6)}). Profit AND loss scale by the same ${leverage}x - this only affects your virtual wallet, never a real Binance Testnet order.`}
            </div>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
          {[
            { l: "Stop Loss", v: sl, s: setSl },
            { l: "Take Profit", v: tp, s: setTp },
          ].map((f) => (
            <div key={f.l}>
              <label style={{ fontSize: 11, fontWeight: 600, color: C.text2, display: "block", marginBottom: 4 }}>{f.l}</label>
              <input
                value={f.v}
                onChange={(e) => f.s(e.target.value)}
                placeholder="Price"
                style={{ width: "100%", border: `1px solid ${C.border}`, borderRadius: 7, padding: "8px 10px", fontSize: 11, color: C.text, boxSizing: "border-box" }}
              />
            </div>
          ))}
        </div>

        {isCryptoBroker && (
          <div style={{ fontSize: 10, color: C.text3, marginBottom: 12 }}>
            Stop loss / take profit are recorded for your journal only - Binance Testnet order is a plain market order.
          </div>
        )}

        {err && (
          <div style={{ background: C.redL, border: `1px solid ${C.redB}`, color: C.red, borderRadius: 8, padding: "8px 12px", fontSize: 11, marginBottom: 12 }}>
            {err}
          </div>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={handleSubmit}
            disabled={placing || !invested || invested > avail}
            style={{
              flex: 1,
              background: dir === "BUY" ? C.green : C.red,
              color: "#fff",
              border: "none",
              padding: "12px 0",
              borderRadius: 9,
              fontSize: 13,
              fontWeight: 800,
              cursor: placing ? "wait" : "pointer",
              opacity: placing || !invested || invested > avail ? 0.6 : 1,
            }}
          >
            {placing ? "PLACING ORDER..." : dir === "BUY" ? (isCryptoBroker ? "PLACE TESTNET BUY ORDER" : "PLACE BUY ORDER") : "PLACE SELL ORDER"}
          </button>
          <button onClick={onClose} style={{ background: "#fff", border: `1px solid ${C.border}`, color: C.text2, padding: "12px 18px", borderRadius: 9, fontSize: 11, cursor: "pointer" }}>
            CANCEL
          </button>
        </div>
      </div>
    </div>
  );
}
