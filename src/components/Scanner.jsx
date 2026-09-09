import React, { useState, useEffect, useCallback } from "react";
import { C, INSTRUMENTS } from "../lib/constants";
import { fmtP } from "../lib/indicators";
import { scanAllCrypto, clearSignalCache } from "../lib/candleSignal";
import { Badge } from "./shared";

function TfBadge({ sig }) {
  const c = !sig||sig==="HOLD" ? C.text3 : sig.includes("BUY") ? C.green : C.red;
  const bg = !sig||sig==="HOLD" ? "#f8fafc" : sig.includes("BUY") ? C.greenL : C.redL;
  return (
    <div style={{ fontSize: 9, fontWeight: 700, color: c, background: bg,
      border: `1px solid ${!sig||sig==="HOLD" ? C.border : sig.includes("BUY") ? C.greenB : C.redB}`,
      borderRadius: 4, padding: "1px 5px", whiteSpace: "nowrap" }}>
      {sig ? sig.replace("STRONG_","S.") : "—"}
    </div>
  );
}

export default function Scanner({ onAnalyse, onTrade, hasBalance }) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastScan, setLastScan] = useState(null);
  const [filter, setFilter] = useState("ALL");
  const [isMobile, setIsMobile] = useState(typeof window!=="undefined" && window.innerWidth<700);

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 700);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);

  const runScan = useCallback(async (force=false) => {
    setLoading(true);
    if (force) clearSignalCache();
    try {
      const data = await scanAllCrypto(INSTRUMENTS.CRYPTO);
      setResults(data);
      setLastScan(new Date());
    } catch (e) { console.warn("Scanner:", e?.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    runScan();
    const iv = setInterval(() => runScan(), 15*60*1000);
    return () => clearInterval(iv);
  }, [runScan]);

  const filtered = results.filter((r) => {
    if (filter==="BUY") return r.signal==="STRONG_BUY"||r.signal==="BUY";
    if (filter==="SELL") return r.signal==="STRONG_SELL"||r.signal==="SELL";
    if (filter==="STRONG") return r.signal==="STRONG_BUY"||r.signal==="STRONG_SELL";
    return true;
  });

  const counts = {
    ALL: results.length,
    BUY: results.filter(r=>r.signal==="STRONG_BUY"||r.signal==="BUY").length,
    SELL: results.filter(r=>r.signal==="STRONG_SELL"||r.signal==="SELL").length,
    STRONG: results.filter(r=>r.signal==="STRONG_BUY"||r.signal==="STRONG_SELL").length,
  };

  return (
    <div style={{ padding: "14px 14px" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10, flexWrap:"wrap", gap:8 }}>
        <div>
          <div style={{ fontSize:13, fontWeight:700, color:C.text }}>Signal Scanner</div>
          <div style={{ fontSize:10, color:C.text3, marginTop:2 }}>
            <strong>Closed 15m candles</strong> — signals only update when a candle closes. No more flipping every few seconds.
          </div>
          {lastScan && <div style={{ fontSize:10, color:C.text3 }}>Last scan: {lastScan.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"})}</div>}
        </div>
        <button onClick={()=>runScan(true)} disabled={loading}
          style={{ background:C.blue, color:"#fff", border:"none", padding:"7px 14px", borderRadius:8, fontSize:11, fontWeight:700, cursor:loading?"wait":"pointer", opacity:loading?0.7:1 }}>
          {loading ? "Scanning..." : "🔄 Refresh"}
        </button>
      </div>

      <div style={{ background:"#f0fdf4", border:`1px solid ${C.greenB}`, borderRadius:10, padding:"8px 12px", marginBottom:12, fontSize:10, color:"#15803d", lineHeight:1.5 }}>
        ✅ <strong>Signals are now stable.</strong> The scanner reads <strong>closed 15-minute candles</strong> from Binance. A signal will NOT flip between BUY and SELL within seconds — it locks until the next candle closes (~15 minutes). Signals require RSI, MACD, BB, Stochastic, VWAP, OBV, volume confirmation, and 4h trend filter.
      </div>

      <div style={{ display:"flex", gap:6, marginBottom:12, flexWrap:"wrap" }}>
        {["ALL","STRONG","BUY","SELL"].map((f) => (
          <button key={f} onClick={()=>setFilter(f)}
            style={{ background:filter===f?C.blue:"#fff", color:filter===f?"#fff":C.text2, border:`1px solid ${filter===f?C.blue:C.border}`, padding:"7px 12px", borderRadius:8, fontSize:11, fontWeight:700, cursor:"pointer" }}>
            {f} ({counts[f]||0})
          </button>
        ))}
      </div>

      {loading && results.length===0 && (
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:50, textAlign:"center" }}>
          <div style={{ fontSize:28, marginBottom:10 }}>📊</div>
          <div style={{ fontSize:13, fontWeight:700, color:C.text, marginBottom:4 }}>Loading 15m candles from Binance...</div>
          <div style={{ fontSize:11, color:C.text3 }}>Fetching 100 closed candles per instrument. This gives stable, reliable signals — not random noise.</div>
        </div>
      )}

      {!loading && isMobile && (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {filtered.map((r) => (
            <div key={r.sym.id} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:"12px 14px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                <div>
                  <span style={{ fontSize:14, fontWeight:800, color:C.text }}>{r.sym.label}</span>
                  {r.trendBlocked && <span style={{ fontSize:9, color:C.yellow, marginLeft:6 }}>⚠️ 4h blocked</span>}
                </div>
                <Badge sig={r.signal} sm={true} />
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                <span style={{ fontSize:15, fontWeight:800, fontFamily:"monospace" }}>${fmtP(r.price, r.sym.id)}</span>
                <span style={{ fontSize:11, color:C.blue, fontWeight:700 }}>Conf: {r.confidence}%</span>
              </div>
              <div style={{ display:"flex", gap:6, marginBottom:10, flexWrap:"wrap" }}>
                <div style={{ fontSize:9, color:C.text3 }}>15m:</div><TfBadge sig={r.r15m}/>
                <div style={{ fontSize:9, color:C.text3 }}>1h:</div><TfBadge sig={r.r1h}/>
                <div style={{ fontSize:9, color:C.text3 }}>4h:</div><TfBadge sig={r.r4h}/>
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={()=>onAnalyse(r.sym,"CRYPTO",{price:r.price,...r.ind})}
                  style={{ flex:1, background:C.blueL, color:C.blue, border:`1px solid ${C.blueB}`, padding:"8px 0", borderRadius:8, fontSize:11, fontWeight:700, cursor:"pointer" }}>ANALYSE</button>
                {hasBalance && <button onClick={()=>onTrade(r.sym,"CRYPTO",r.signal,r.price,r.ind)}
                  style={{ flex:1, background:C.green, color:"#fff", border:"none", padding:"8px 0", borderRadius:8, fontSize:11, fontWeight:700, cursor:"pointer" }}>TRADE</button>}
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && !isMobile && (
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, overflow:"hidden" }}>
          <div style={{ display:"grid", gridTemplateColumns:"130px 110px 100px 60px 90px 90px 90px 1fr", gap:8, padding:"8px 16px", borderBottom:`1px solid ${C.border}`, background:"#f8fafc" }}>
            {["Symbol","Price","Signal","Conf","15m","1h","4h",""].map((h,i)=>(
              <div key={i} style={{ fontSize:9, fontWeight:700, color:C.text3 }}>{h}</div>
            ))}
          </div>
          {filtered.length===0 ? (
            <div style={{ padding:30, textAlign:"center", fontSize:12, color:C.text3 }}>No signals match this filter on the current 15m candle.</div>
          ) : filtered.map((r,i) => (
            <div key={r.sym.id} style={{ display:"grid", gridTemplateColumns:"130px 110px 100px 60px 90px 90px 90px 1fr", gap:8, alignItems:"center", padding:"10px 16px",
              borderBottom:i<filtered.length-1?`1px solid ${C.border}`:"none",
              background:r.signal==="STRONG_BUY"?"#f0fdf4":r.signal==="STRONG_SELL"?"#fff5f5":"#fff" }}>
              <div>
                <div style={{ fontSize:13, fontWeight:800, color:C.text }}>{r.sym.label}</div>
                {r.trendBlocked && <div style={{ fontSize:9, color:C.yellow }}>⚠️ 4h blocked</div>}
              </div>
              <div style={{ fontSize:12, fontWeight:700, fontFamily:"monospace" }}>${fmtP(r.price,r.sym.id)}</div>
              <Badge sig={r.signal} sm={true}/>
              <div style={{ fontSize:11, fontWeight:700, color:r.confidence>=70?C.green:C.text2 }}>{r.confidence}%</div>
              <TfBadge sig={r.r15m}/>
              <TfBadge sig={r.r1h}/>
              <TfBadge sig={r.r4h}/>
              <div style={{ display:"flex", gap:6 }}>
                <button onClick={()=>onAnalyse(r.sym,"CRYPTO",{price:r.price,...r.ind})}
                  style={{ background:C.blueL, color:C.blue, border:`1px solid ${C.blueB}`, padding:"5px 10px", borderRadius:7, fontSize:10, fontWeight:700, cursor:"pointer" }}>ANALYSE</button>
                {hasBalance && <button onClick={()=>onTrade(r.sym,"CRYPTO",r.signal,r.price,r.ind)}
                  style={{ background:C.green, color:"#fff", border:"none", padding:"5px 10px", borderRadius:7, fontSize:10, fontWeight:700, cursor:"pointer" }}>TRADE</button>}
              </div>
            </div>
          ))}
        </div>
      )}
      {!loading && results.length>0 && (
        <div style={{ fontSize:10, color:C.text3, marginTop:8, textAlign:"center" }}>
          {results.length} instruments · Closed 15m candles · Next auto-refresh at next 15m close · {filtered.filter(r=>r.signal!=="HOLD").length} actionable signals
        </div>
      )}
    </div>
  );
}
