import React, { useState } from "react";
import { C, INSTRUMENTS } from "../lib/constants";
import { loadAutoSettings, saveAutoSettings } from "../lib/autoTrader";
import { scanAllCrypto } from "../lib/candleSignal";

export default function AutoTrader({ wallet, trades, isRunning, onToggle }) {
  const [settings, setSettings] = useState(() => loadAutoSettings());
  const [preview, setPreview] = useState([]);
  const [scanning, setScanning] = useState(false);

  const openAuto   = trades.filter((t) => t.status === "OPEN"   && t.broker === "AUTO");
  const closedAuto = trades.filter((t) => t.status === "CLOSED" && t.broker === "AUTO");
  const autoPnl    = closedAuto.reduce((a, t) => a + (t.pnl || 0), 0);
  const autoWins   = closedAuto.filter((t) => (t.pnl || 0) > 0).length;
  const winRate    = closedAuto.length ? ((autoWins / closedAuto.length) * 100).toFixed(1) : "0.0";
  const riskAmt    = wallet.balance * ((settings.riskPct || 2) / 100);

  function upd(k, v) { const n = { ...settings, [k]: v }; setSettings(n); saveAutoSettings(n); }

  async function runPreview() {
    setScanning(true);
    try {
      const r = await scanAllCrypto(INSTRUMENTS.CRYPTO);
      setPreview(r.filter((x) =>
        (x.signal === "STRONG_BUY" || x.signal === "STRONG_SELL") &&
        x.confidence >= (settings.minConfidence || 75) &&
        !x.trendBlocked && x.mtf?.mtfConfirmed
      ).slice(0, 5));
    } catch (e) { console.warn(e); }
    finally { setScanning(false); }
  }

  return (
    <div style={{ padding: "14px 14px" }}>
      {/* Header + toggle */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16, flexWrap:"wrap", gap:10 }}>
        <div>
          <div style={{ fontSize:16, fontWeight:800, color:C.text }}>🤖 AutoTrader EA</div>
          <div style={{ fontSize:11, color:C.text3, marginTop:2 }}>
            Automatically places virtual trades on strong multi-timeframe signals. Scans every 5 minutes.
          </div>
        </div>
        <div onClick={() => onToggle && onToggle(!isRunning)}
          style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer",
            background: isRunning ? C.greenL : "#f8fafc",
            border: `2px solid ${isRunning ? C.green : C.border}`,
            borderRadius:12, padding:"10px 16px" }}>
          <div style={{ width:44, height:24, borderRadius:12, background: isRunning ? C.green : "#cbd5e1",
            position:"relative", transition:"background 0.2s", flexShrink:0 }}>
            <div style={{ position:"absolute", top:3, left: isRunning ? 23 : 3, width:18, height:18,
              borderRadius:9, background:"#fff", transition:"left 0.2s", boxShadow:"0 1px 3px rgba(0,0,0,0.2)" }}/>
          </div>
          <div>
            <div style={{ fontSize:13, fontWeight:800, color: isRunning ? C.green : C.text2 }}>
              {isRunning ? "AUTO ON" : "AUTO OFF"}
            </div>
            <div style={{ fontSize:10, color:C.text3 }}>
              {isRunning ? "EA running — scanning every 5 min" : "Tap to enable"}
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(120px,1fr))", gap:10, marginBottom:18 }}>
        {[
          { l:"Open Auto", v:openAuto.length, c:C.blue },
          { l:"Closed Auto", v:closedAuto.length, c:C.text },
          { l:"Auto Win Rate", v:`${winRate}%`, c:parseFloat(winRate)>=50?C.green:C.red },
          { l:"Auto P&L", v:`${autoPnl>=0?"+":""}$${autoPnl.toFixed(2)}`, c:autoPnl>=0?C.green:C.red },
        ].map((s) => (
          <div key={s.l} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:"10px 12px" }}>
            <div style={{ fontSize:9, color:C.text3, marginBottom:2 }}>{s.l}</div>
            <div style={{ fontSize:16, fontWeight:800, color:s.c }}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* Settings */}
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:18, marginBottom:18 }}>
        <div style={{ fontSize:13, fontWeight:700, color:C.text, marginBottom:14 }}>Risk Settings</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>
          {[
            { label:`Risk per trade: ${settings.riskPct||2}% = $${riskAmt.toFixed(2)}`, key:"riskPct", min:0.5, max:5, step:0.5, val:settings.riskPct||2, left:"0.5% safe", right:"5% risky" },
            { label:`Min confidence: ${settings.minConfidence||75}%`, key:"minConfidence", min:60, max:95, step:5, val:settings.minConfidence||75, left:"60% more trades", right:"95% fewer" },
            { label:`Max open trades: ${settings.maxTrades||3}`, key:"maxTrades", min:1, max:10, step:1, val:settings.maxTrades||3, left:"1", right:"10" },
          ].map((f) => (
            <div key={f.key}>
              <label style={{ fontSize:11, fontWeight:600, color:C.text2, display:"block", marginBottom:4 }}>{f.label}</label>
              <input type="range" min={f.min} max={f.max} step={f.step} value={f.val}
                onChange={(e) => upd(f.key, Number(e.target.value))}
                style={{ width:"100%", accentColor:C.blue }}/>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:9, color:C.text3 }}>
                <span>{f.left}</span><span>{f.right}</span>
              </div>
            </div>
          ))}
        </div>

        <div style={{ background:"#f8fafc", border:`1px solid ${C.border}`, borderRadius:9, padding:"10px 14px", fontSize:11, color:C.text2, lineHeight:1.8 }}>
          <div style={{ fontWeight:700, marginBottom:4 }}>Rules always enforced automatically:</div>
          <div>✅ STRONG_BUY or STRONG_SELL only — BUY/SELL/HOLD are ignored</div>
          <div>✅ All 3 timeframes must agree (15m + 1h + 4h confirmed)</div>
          <div>✅ 4h trend filter — no buys in downtrend, no sells in uptrend</div>
          <div>✅ Position size = {settings.riskPct||2}% of balance ÷ ATR-based stop</div>
          <div>✅ Stop loss = 1.5× ATR · Take profit = 3× ATR (1:2 R:R)</div>
          <div>✅ 4-hour cooldown per instrument after any trade</div>
          <div>✅ Pauses automatically if daily drawdown exceeds 10%</div>
          <div>✅ Never opens same instrument twice simultaneously</div>
        </div>
      </div>

      {/* Preview */}
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:18, marginBottom:18 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
          <div style={{ fontSize:13, fontWeight:700, color:C.text }}>Preview Current Signals</div>
          <button onClick={runPreview} disabled={scanning}
            style={{ background:C.blue, color:"#fff", border:"none", padding:"6px 14px", borderRadius:8, fontSize:11, fontWeight:700, cursor:scanning?"wait":"pointer", opacity:scanning?0.7:1 }}>
            {scanning ? "Scanning..." : "Scan Now"}
          </button>
        </div>
        {preview.length === 0 ? (
          <div style={{ fontSize:12, color:C.text3, textAlign:"center", padding:20 }}>
            {scanning ? "Fetching 15m candles..." : "Tap Scan Now to see what AutoTrader would act on right now."}
          </div>
        ) : preview.map((r) => (
          <div key={r.sym.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom:`1px solid ${C.border}` }}>
            <div>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ fontSize:13, fontWeight:800, color:C.text }}>{r.sym.label}</span>
                <span style={{ fontSize:9, fontWeight:700, color:r.signal.includes("BUY")?C.green:C.red,
                  background:r.signal.includes("BUY")?C.greenL:C.redL,
                  border:`1px solid ${r.signal.includes("BUY")?C.greenB:C.redB}`,
                  borderRadius:4, padding:"1px 6px" }}>
                  {r.signal.replace("_"," ")}
                </span>
                <span style={{ fontSize:10, color:C.blue, fontWeight:700 }}>{r.confidence}%</span>
              </div>
              <div style={{ fontSize:10, color:C.text3, marginTop:2 }}>
                15m: {r.r15m} · 1h: {r.r1h||"—"} · 4h: {r.r4h||"—"} · ATR: ${r.ind?.atr?.toFixed(2)}
              </div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:12, fontWeight:700, fontFamily:"monospace" }}>${r.price.toFixed(2)}</div>
              <div style={{ fontSize:10, color:C.text3 }}>~${riskAmt.toFixed(2)} invested</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ padding:"10px 14px", background:C.yellowL, border:`1px solid ${C.yellowB}`, borderRadius:10, fontSize:11, color:C.yellow, lineHeight:1.6 }}>
        ⚠️ <strong>AutoTrader uses your virtual wallet only.</strong> It does not place real orders on Binance unless you separately enable Binance Testnet. Always backtest a strategy before enabling AutoTrader, even on paper money.
      </div>
    </div>
  );
}
