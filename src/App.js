import React, { useState, useEffect, useCallback } from "react";

const INSTRUMENTS = {
  CRYPTO: [
    { id:"bitcoin",   label:"BTC/USD",   name:"Bitcoin",    base:67800,  vol:0.025, icon:"B" },
    { id:"ethereum",  label:"ETH/USD",   name:"Ethereum",   base:3450,   vol:0.022, icon:"E" },
    { id:"solana",    label:"SOL/USD",   name:"Solana",     base:172,    vol:0.035, icon:"S" },
    { id:"bnb",       label:"BNB/USD",   name:"BNB",        base:598,    vol:0.020, icon:"B" },
    { id:"xrp",       label:"XRP/USD",   name:"Ripple",     base:0.621,  vol:0.030, icon:"X" },
    { id:"cardano",   label:"ADA/USD",   name:"Cardano",    base:0.485,  vol:0.032, icon:"A" },
    { id:"avalanche", label:"AVAX/USD",  name:"Avalanche",  base:38.2,   vol:0.038, icon:"A" },
    { id:"dogecoin",  label:"DOGE/USD",  name:"Dogecoin",   base:0.162,  vol:0.040, icon:"D" },
    { id:"polkadot",  label:"DOT/USD",   name:"Polkadot",   base:8.90,   vol:0.033, icon:"P" },
    { id:"chainlink", label:"LINK/USD",  name:"Chainlink",  base:14.8,   vol:0.036, icon:"L" },
    { id:"matic",     label:"MATIC/USD", name:"Polygon",    base:0.882,  vol:0.034, icon:"M" },
    { id:"uniswap",   label:"UNI/USD",   name:"Uniswap",    base:10.45,  vol:0.031, icon:"U" },
  ],
  STOCKS: [
    { id:"AAPL",  label:"AAPL",  name:"Apple",       base:213,  vol:0.012, icon:"A" },
    { id:"TSLA",  label:"TSLA",  name:"Tesla",        base:178,  vol:0.028, icon:"T" },
    { id:"NVDA",  label:"NVDA",  name:"NVIDIA",       base:875,  vol:0.020, icon:"N" },
    { id:"MSFT",  label:"MSFT",  name:"Microsoft",    base:420,  vol:0.010, icon:"M" },
    { id:"AMZN",  label:"AMZN",  name:"Amazon",       base:185,  vol:0.014, icon:"A" },
    { id:"GOOGL", label:"GOOGL", name:"Alphabet",     base:175,  vol:0.011, icon:"G" },
    { id:"META",  label:"META",  name:"Meta",         base:520,  vol:0.018, icon:"F" },
    { id:"NFLX",  label:"NFLX",  name:"Netflix",      base:630,  vol:0.022, icon:"N" },
    { id:"AMD",   label:"AMD",   name:"AMD",          base:158,  vol:0.024, icon:"A" },
    { id:"COIN",  label:"COIN",  name:"Coinbase",     base:228,  vol:0.030, icon:"C" },
    { id:"SPY",   label:"SPY",   name:"S&P 500 ETF",  base:535,  vol:0.008, icon:"S" },
    { id:"QQQ",   label:"QQQ",   name:"NASDAQ ETF",   base:460,  vol:0.010, icon:"Q" },
  ],
  FOREX: [
    { id:"EURUSD", label:"EUR/USD", name:"Euro/Dollar",    base:1.0832, vol:0.0025, icon:"E" },
    { id:"GBPUSD", label:"GBP/USD", name:"Pound/Dollar",   base:1.2741, vol:0.0030, icon:"G" },
    { id:"USDJPY", label:"USD/JPY", name:"Dollar/Yen",     base:154.23, vol:0.0020, icon:"Y" },
    { id:"AUDUSD", label:"AUD/USD", name:"Aussie/Dollar",  base:0.6521, vol:0.0028, icon:"A" },
    { id:"USDCAD", label:"USD/CAD", name:"Dollar/CAD",     base:1.3640, vol:0.0022, icon:"C" },
    { id:"NZDUSD", label:"NZD/USD", name:"Kiwi/Dollar",    base:0.5970, vol:0.0030, icon:"N" },
    { id:"USDCHF", label:"USD/CHF", name:"Dollar/Franc",   base:0.9020, vol:0.0018, icon:"F" },
    { id:"EURGBP", label:"EUR/GBP", name:"Euro/Pound",     base:0.8500, vol:0.0020, icon:"E" },
    { id:"GBPJPY", label:"GBP/JPY", name:"Pound/Yen",      base:196.50, vol:0.0035, icon:"P" },
    { id:"XAUUSD", label:"XAU/USD", name:"Gold/Dollar",    base:2320.0, vol:0.0015, icon:"G" },
    { id:"XAGUSD", label:"XAG/USD", name:"Silver/Dollar",  base:27.50,  vol:0.0022, icon:"S" },
    { id:"USOIL",  label:"WTI/USD", name:"WTI Crude Oil",  base:79.80,  vol:0.0030, icon:"O" },
  ],
};

const NAV_ITEMS = ["DASHBOARD","MARKETS","SCANNER","CHARTS","WALLET","TRADES","JOURNAL","PORTFOLIO","RISK","BROKER"];
const NAV_ICONS = {DASHBOARD:"🏠",MARKETS:"📊",SCANNER:"🔍",CHARTS:"📈",WALLET:"💰",TRADES:"💹",JOURNAL:"📓",PORTFOLIO:"📋",RISK:"⚖️",BROKER:"🔗"};

const SIG = {
  STRONG_BUY:  {label:"STRONG BUY",  color:"#15803d", bg:"#dcfce7", border:"#86efac"},
  BUY:         {label:"BUY",         color:"#16a34a", bg:"#f0fdf4", border:"#bbf7d0"},
  HOLD:        {label:"HOLD",        color:"#b45309", bg:"#fffbeb", border:"#fde68a"},
  SELL:        {label:"SELL",        color:"#dc2626", bg:"#fef2f2", border:"#fecaca"},
  STRONG_SELL: {label:"STRONG SELL", color:"#991b1b", bg:"#fff1f2", border:"#fecdd3"},
};

const C = {
  bg:"#f1f5f9", card:"#ffffff", border:"#e2e8f0",
  text:"#0f172a", text2:"#475569", text3:"#94a3b8",
  blue:"#2563eb", blueL:"#eff6ff", blueB:"#bfdbfe",
  green:"#16a34a", greenL:"#f0fdf4", greenB:"#bbf7d0",
  red:"#dc2626", redL:"#fef2f2", redB:"#fecaca",
  yellow:"#d97706", yellowL:"#fffbeb", yellowB:"#fde68a",
  purple:"#7c3aed", purpleL:"#f5f3ff", purpleB:"#ddd6fe",
  nav:"#0f172a",
};

const PS = {};
function initP(id, base, vol) {
  if (!PS[id]) {
    let p = base * (0.97 + Math.random() * 0.03);
    const h = [], candles = [];
    for (let i = 0; i < 80; i++) {
      p = p * (1 + (Math.random() - 0.49) * vol * 0.4);
      h.push(p);
      const o = p*(1+(Math.random()-0.5)*vol*0.15);
      const c2 = p*(1+(Math.random()-0.5)*vol*0.15);
      candles.push({o,h:Math.max(o,c2)*(1+Math.random()*vol*0.2),l:Math.min(o,c2)*(1-Math.random()*vol*0.2),c:c2});
    }
    PS[id] = {price:p,history:h,candles,base,vol};
  }
  return PS[id];
}
function tickP(id) {
  const s = PS[id]; if (!s) return null;
  s.price = s.price*(1+(s.base-s.price)/s.base*0.003+(Math.random()-0.49)*s.vol*0.22);
  s.history.push(s.price); if(s.history.length>80) s.history.shift();
  const last = s.candles[s.candles.length-1];
  last.c=s.price; last.h=Math.max(last.h,s.price); last.l=Math.min(last.l,s.price);
  return {price:s.price,history:[...s.history],candles:[...s.candles]};
}
function getInd(h, p) {
  const n=h.length, rp=Math.min(14,n-1);
  let g=0,l=0;
  for(let i=n-rp;i<n;i++){const d=h[i]-h[i-1];d>0?g+=d:l-=d;}
  const rsi=l===0?100:100-100/(1+g/l);
  const ema=(arr,pd)=>{const k=2/(pd+1);let e=arr[0];for(let i=1;i<arr.length;i++)e=arr[i]*k+e*(1-k);return e;};
  const macd=ema(h.slice(-26),12)-ema(h,26);
  const sma20=h.slice(-20).reduce((a,b)=>a+b,0)/Math.min(20,n);
  const sma50=h.slice(-50).reduce((a,b)=>a+b,0)/Math.min(50,n);
  const sq=h.slice(-20).map(v=>(v-sma20)**2);
  const sd=Math.sqrt(sq.reduce((a,b)=>a+b,0)/sq.length);
  const bbUpper=sma20+2*sd,bbLower=sma20-2*sd;
  const bbPos=(p-bbLower)/(bbUpper-bbLower)*100;
  const hi14=Math.max(...h.slice(-14)),lo14=Math.min(...h.slice(-14));
  const stochK=(p-lo14)/(hi14-lo14)*100;
  const change24=(p-h[Math.max(0,n-24)])/h[Math.max(0,n-24)]*100;
  const volIdx=h.slice(-12).reduce((a,v,i,arr)=>i===0?a:a+Math.abs(v-arr[i-1])/arr[i-1],0)*100;
  return {rsi,macd,sma20,sma50,bbUpper,bbLower,bbPos,stochK,change24,volIdx,atr:sd};
}
function calcSig(ind) {
  let s=0;
  if(ind.rsi<30)s+=2;else if(ind.rsi<45)s+=1;else if(ind.rsi>70)s-=2;else if(ind.rsi>55)s-=1;
  if(ind.macd>0)s+=1;else s-=1;
  if(ind.bbPos<20)s+=1;else if(ind.bbPos>80)s-=1;
  if(ind.stochK<20)s+=1;else if(ind.stochK>80)s-=1;
  if(s>=4)return"STRONG_BUY";if(s>=2)return"BUY";
  if(s<=-4)return"STRONG_SELL";if(s<=-2)return"SELL";
  return"HOLD";
}
const F4=["EURUSD","GBPUSD","AUDUSD","NZDUSD","USDCHF","EURGBP"];
function fmtP(price,id){
  if(!price||isNaN(price))return"0.00";
  if(F4.includes(id))return price.toFixed(4);
  if(price>9999)return price.toLocaleString("en-US",{minimumFractionDigits:0,maximumFractionDigits:0});
  if(price>10)return price.toFixed(2);
  if(price>1)return price.toFixed(4);
  return price.toFixed(6);
}
function pfx(market,id){
  if(market==="FOREX"&&!["XAUUSD","XAGUSD","USOIL"].includes(id))return"";
  return"$";
}
function Spark({points,pos,w=88,h=34}){
  if(!points||points.length<2)return null;
  const mn=Math.min(...points),mx=Math.max(...points),r=mx-mn||1;
  const coords=points.map((p,i)=>`${(i/(points.length-1))*w},${h-((p-mn)/r)*(h-2)-1}`);
  const c=pos?"#16a34a":"#dc2626";
  const uid="sk"+(Math.abs(points[0]*997|0)%9999);
  return(<svg viewBox={`0 0 ${w} ${h}`} style={{width:w,height:h}}>
    <defs><linearGradient id={uid} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={c} stopOpacity="0.15"/><stop offset="100%" stopColor={c} stopOpacity="0"/></linearGradient></defs>
    <path d={`M 0,${h} L ${coords.join(" L ")} L ${w},${h} Z`} fill={`url(#${uid})`}/>
    <path d={`M ${coords.join(" L ")}`} fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>);
}
function CandleChart({candles,w=580,h=140}){
  if(!candles||candles.length<5)return null;
  const last=candles.slice(-28);
  const allP=last.flatMap(c=>[c.h,c.l]);
  const mn=Math.min(...allP),mx=Math.max(...allP),r=mx-mn||1;
  const cw=Math.max(2,Math.floor(w/last.length)-1);
  const py=p=>h-((p-mn)/r)*(h-4)-2;
  return(<svg viewBox={`0 0 ${w} ${h}`} style={{width:"100%",height:h}}>
    {last.map((c,i)=>{
      const x=i*(w/last.length)+1,bull=c.c>=c.o,col=bull?"#16a34a":"#dc2626";
      const bTop=py(Math.max(c.o,c.c)),bBot=py(Math.min(c.o,c.c));
      return(<g key={i}><line x1={x+cw/2} y1={py(c.h)} x2={x+cw/2} y2={py(c.l)} stroke={col} strokeWidth="1"/><rect x={x} y={bTop} width={cw} height={Math.max(1,bBot-bTop)} fill={col} rx="0.5"/></g>);
    })}
  </svg>);
}
function Badge({sig,sm}){
  const c=SIG[sig]||SIG.HOLD;
  return <span style={{background:c.bg,color:c.color,border:`1px solid ${c.border}`,borderRadius:5,padding:sm?"2px 7px":"3px 10px",fontSize:sm?10:11,fontWeight:700,whiteSpace:"nowrap"}}>{c.label}</span>;
}
function StatCard({label,value,sub,color,icon}){
  return(<div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"16px 18px",boxShadow:"0 1px 3px rgba(0,0,0,0.05)"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
      <span style={{fontSize:11,color:C.text2,fontWeight:600}}>{label}</span>
      {icon&&<span style={{fontSize:18}}>{icon}</span>}
    </div>
    <div style={{fontSize:22,fontWeight:800,color:color||C.text,marginBottom:2}}>{value}</div>
    {sub&&<div style={{fontSize:11,color:C.text3}}>{sub}</div>}
  </div>);
}
function PBar({val,color}){
  return(<div style={{height:5,borderRadius:3,background:"#f1f5f9",overflow:"hidden"}}>
    <div style={{height:"100%",width:`${Math.min(100,Math.max(0,val||0))}%`,background:color,borderRadius:3,transition:"width 0.5s"}}/>
  </div>);
}
function MarketCard({sym,market,onAnalyse,onWatch,watched,onTrade,hasBalance,onAlert}){
  const [st,setSt]=useState(null);
  const [flash,setFlash]=useState(null);
  useEffect(()=>{
    const s=initP(sym.id,sym.base,sym.vol);
    setSt({price:s.price,history:[...s.history],candles:[...s.candles]});
    const iv=setInterval(()=>{
      const ns=tickP(sym.id);if(!ns)return;
      setSt(prev=>{if(prev){setFlash(ns.price>prev.price?"up":"dn");setTimeout(()=>setFlash(null),300);}return ns;});
    },1800+Math.random()*700);
    return()=>clearInterval(iv);
  },[sym.id]);
  if(!st)return<div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,height:230,display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontSize:12,color:C.text3}}>Loading...</span></div>;
  const ind=getInd(st.history,st.price);
  const sig=calcSig(ind);
  const pos=ind.change24>=0;
  const flashBg=flash==="up"?"#f0fdf4":flash==="dn"?"#fff5f5":C.card;
  const flashBorder=flash==="up"?"#86efac":flash==="dn"?"#fecaca":C.border;
  return(<div style={{background:flashBg,border:`1px solid ${flashBorder}`,borderRadius:14,padding:18,transition:"all 0.2s",boxShadow:"0 1px 4px rgba(0,0,0,0.05)"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <div style={{width:38,height:38,borderRadius:10,background:C.blueL,border:`1px solid ${C.blueB}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:800,color:C.blue}}>{sym.icon}</div>
        <div><div style={{fontSize:13,fontWeight:800,color:C.text}}>{sym.label}</div><div style={{fontSize:10,color:C.text3}}>{sym.name}</div></div>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:5}}>
        <Badge sig={sig} sm={true}/>
        <button onClick={()=>onWatch(sym)} style={{background:"none",border:"none",color:watched?"#f59e0b":C.text3,cursor:"pointer",fontSize:16,padding:2}}>{watched?"★":"☆"}</button>
      </div>
    </div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
      <div>
        <div style={{fontSize:22,fontWeight:900,color:C.text,fontFamily:"monospace"}}>{pfx(market,sym.id)}{fmtP(st.price,sym.id)}</div>
        <div style={{fontSize:12,fontWeight:700,color:pos?C.green:C.red}}>{pos?"▲":"▼"} {Math.abs(ind.change24).toFixed(2)}%</div>
      </div>
      <Spark points={st.history.slice(-28)} pos={pos}/>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"6px 14px",marginBottom:10}}>
      {[{l:"RSI",v:ind.rsi,c:ind.rsi<30?C.green:ind.rsi>70?C.red:C.yellow},{l:"BB%",v:ind.bbPos,c:C.blue},{l:"STOCH",v:ind.stochK,c:ind.stochK<20?C.green:ind.stochK>80?C.red:C.text2},{l:"VOLTY",v:Math.min(100,ind.volIdx*8),c:C.purple}].map(f=>(
        <div key={f.l}>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:C.text2,marginBottom:2}}><span style={{fontWeight:600}}>{f.l}</span><span style={{color:f.c,fontWeight:700}}>{f.v.toFixed(1)}</span></div>
          <PBar val={f.v} color={f.c}/>
        </div>
      ))}
    </div>
    <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:C.text2,marginBottom:12,padding:"6px 10px",background:"#f8fafc",borderRadius:7}}>
      <span>MACD <span style={{color:ind.macd>0?C.green:C.red,fontWeight:700}}>{ind.macd>0?"+":""}{ind.macd.toFixed(4)}</span></span>
      <span>SMA20 <span style={{color:C.blue,fontWeight:600}}>{pfx(market,sym.id)}{fmtP(ind.sma20,sym.id)}</span></span>
      <span>SMA50 <span style={{color:C.purple,fontWeight:600}}>{pfx(market,sym.id)}{fmtP(ind.sma50,sym.id)}</span></span>
    </div>
    <div style={{display:"flex",gap:6}}>
      <button onClick={()=>onAnalyse(sym,market,{price:st.price,history:[...st.history],candles:[...st.candles],...ind})} style={{flex:1,background:C.blue,color:"#fff",border:"none",padding:"8px 0",borderRadius:8,fontSize:11,fontWeight:700,cursor:"pointer"}}>⚡ AI ANALYSE</button>
      {hasBalance&&<button onClick={()=>onTrade(sym,market,sig,st.price,ind)} style={{background:C.green,color:"#fff",border:"none",padding:"8px 12px",borderRadius:8,fontSize:11,fontWeight:700,cursor:"pointer"}}>TRADE</button>}
      <button onClick={()=>onAlert(sym,st.price)} style={{background:C.yellowL,color:C.yellow,border:`1px solid ${C.yellowB}`,padding:"8px 10px",borderRadius:8,fontSize:13,cursor:"pointer"}}>🔔</button>
    </div>
  </div>);
}
function Dashboard({wallet,trades,journal,alerts,onNav}){
  const openTrades=trades.filter(t=>t.status==="OPEN");
  const totalPnl=trades.reduce((a,t)=>a+(t.pnl||0),0);
  const wins=trades.filter(t=>(t.pnl||0)>0).length;
  const wr=trades.length?((wins/trades.length)*100).toFixed(0):"0";
  const [topSigs,setTopSigs]=useState([]);
  useEffect(()=>{
    const all=Object.entries(INSTRUMENTS).flatMap(([mkt,syms])=>syms.map(s=>{
      const ps=PS[s.id]||initP(s.id,s.base,s.vol);
      const ind=getInd(ps.history,ps.price);
      return{...s,market:mkt,sig:calcSig(ind),price:ps.price,change:ind.change24,rsi:ind.rsi};
    })).filter(s=>s.sig!=="HOLD").sort((a,b)=>{
      const r={STRONG_BUY:5,BUY:4,HOLD:3,SELL:2,STRONG_SELL:1};
      return Math.abs(r[b.sig]-3)-Math.abs(r[a.sig]-3);
    }).slice(0,6);
    setTopSigs(all);
  },[]);
  const news=[
    {title:"Federal Reserve signals potential rate cuts in Q3 2026",time:"2h ago",sentiment:"BULLISH",market:"STOCKS"},
    {title:"Bitcoin ETF inflows reach record $2.1B in single week",time:"4h ago",sentiment:"BULLISH",market:"CRYPTO"},
    {title:"Dollar weakens as China GDP beats expectations",time:"6h ago",sentiment:"BEARISH",market:"FOREX"},
    {title:"NVIDIA announces next-gen AI chip ahead of schedule",time:"8h ago",sentiment:"BULLISH",market:"STOCKS"},
    {title:"Oil prices dip on rising US inventory data",time:"10h ago",sentiment:"BEARISH",market:"FOREX"},
  ];
  return(<div style={{padding:24}}>
    <div style={{marginBottom:22}}><h1 style={{fontSize:22,fontWeight:800,color:C.text,marginBottom:4}}>Good day, Trader 👋</h1><p style={{fontSize:13,color:C.text2}}>Your FDS Trading dashboard — everything at a glance.</p></div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:22}}>
      <StatCard label="WALLET BALANCE" value={`$${wallet.balance.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`} sub="Virtual account" color={C.blue} icon="💰"/>
      <StatCard label="OPEN TRADES" value={openTrades.length} sub={`${trades.length} total`} color={C.yellow} icon="📊"/>
      <StatCard label="WIN RATE" value={`${wr}%`} sub={`${wins} wins of ${trades.length}`} color={parseInt(wr)>50?C.green:C.red} icon="🎯"/>
      <StatCard label="TOTAL P&L" value={`${totalPnl>=0?"+":""}$${Math.abs(totalPnl).toFixed(2)}`} sub="All time" color={totalPnl>=0?C.green:C.red} icon="📈"/>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:20,boxShadow:"0 1px 3px rgba(0,0,0,0.05)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <h3 style={{fontSize:14,fontWeight:700,color:C.text}}>🔥 Top Signals Now</h3>
          <button onClick={()=>onNav("SCANNER")} style={{background:C.blueL,color:C.blue,border:`1px solid ${C.blueB}`,padding:"5px 12px",borderRadius:6,fontSize:11,cursor:"pointer",fontWeight:600}}>View All →</button>
        </div>
        {topSigs.length===0?<p style={{color:C.text3,fontSize:12,textAlign:"center",padding:"20px 0"}}>Initialising signals...</p>:
        topSigs.map((s,i)=>(
          <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 0",borderBottom:i<topSigs.length-1?`1px solid ${C.border}`:"none"}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{width:30,height:30,borderRadius:8,background:C.blueL,border:`1px solid ${C.blueB}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:C.blue}}>{s.icon}</div>
              <div><div style={{fontSize:12,fontWeight:700,color:C.text}}>{s.label}</div><div style={{fontSize:10,color:C.text3}}>RSI {s.rsi.toFixed(0)} · {s.market}</div></div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:11,color:s.change>=0?C.green:C.red,fontWeight:600}}>{s.change>=0?"+":""}{s.change.toFixed(2)}%</span>
              <Badge sig={s.sig} sm={true}/>
            </div>
          </div>
        ))}
      </div>
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:20,boxShadow:"0 1px 3px rgba(0,0,0,0.05)"}}>
        <h3 style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:14}}>📰 Market News</h3>
        {news.map((n,i)=>(
          <div key={i} style={{padding:"9px 0",borderBottom:i<news.length-1?`1px solid ${C.border}`:"none"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,marginBottom:3}}>
              <span style={{fontSize:11,fontWeight:600,color:C.text,flex:1,lineHeight:1.4}}>{n.title}</span>
              <span style={{fontSize:9,padding:"2px 7px",borderRadius:4,fontWeight:700,background:n.sentiment==="BULLISH"?C.greenL:C.redL,color:n.sentiment==="BULLISH"?C.green:C.red,border:`1px solid ${n.sentiment==="BULLISH"?C.greenB:C.redB}`,whiteSpace:"nowrap"}}>{n.sentiment}</span>
            </div>
            <div style={{fontSize:10,color:C.text3}}>{n.time} · {n.market}</div>
          </div>
        ))}
      </div>
    </div>
    {alerts.length>0&&(<div style={{background:"#fffbeb",border:`1px solid ${C.yellowB}`,borderRadius:14,padding:18,marginBottom:16}}>
      <h3 style={{fontSize:13,fontWeight:700,color:C.yellow,marginBottom:10}}>🔔 Active Price Alerts ({alerts.length})</h3>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        {alerts.map((a,i)=>(<div key={i} style={{background:"#fff",border:`1px solid ${C.yellowB}`,borderRadius:8,padding:"7px 14px",fontSize:11,display:"flex",gap:8,alignItems:"center"}}>
          <span style={{fontWeight:700,color:C.text}}>{a.label}</span><span style={{color:C.text3}}>→</span><span style={{color:C.yellow,fontWeight:700}}>{a.type} ${a.target}</span>
        </div>))}
      </div>
    </div>)}
    <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:20}}>
      <h3 style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:12}}>⚡ Quick Actions</h3>
      <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
        {[{l:"🔍 Scan Markets",n:"SCANNER"},{l:"📈 View Charts",n:"CHARTS"},{l:"💰 Add Funds",n:"WALLET"},{l:"📓 Log Trade",n:"JOURNAL"},{l:"⚖️ Risk Calc",n:"RISK"},{l:"🔗 Connect Broker",n:"BROKER"}].map(a=>(
          <button key={a.n} onClick={()=>onNav(a.n)} style={{background:C.blueL,color:C.blue,border:`1px solid ${C.blueB}`,padding:"10px 18px",borderRadius:8,fontSize:12,fontWeight:600,cursor:"pointer"}}>{a.l}</button>
        ))}
      </div>
    </div>
  </div>);
}
function Scanner({onAnalyse,onTrade,wallet}){
  const [results,setResults]=useState([]);
  const [scanning,setScanning]=useState(false);
  const [sigF,setSigF]=useState("ALL");
  const [mktF,setMktF]=useState("ALL");
  const [lastScan,setLastScan]=useState(null);
  const runScan=useCallback(()=>{
    setScanning(true);
    setTimeout(()=>{
      const all=Object.entries(INSTRUMENTS).flatMap(([mkt,syms])=>syms.map(s=>{
        const ps=PS[s.id]||initP(s.id,s.base,s.vol);
        const ind=getInd(ps.history,ps.price);
        const sig=calcSig(ind);
        const conf=Math.min(99,Math.max(51,50+Math.abs(ind.rsi-50)*0.8+Math.abs(ind.bbPos-50)*0.4));
        return{...s,market:mkt,sig,price:ps.price,ind,conf:conf.toFixed(0)};
      })).sort((a,b)=>{const r={STRONG_BUY:5,BUY:4,HOLD:3,SELL:2,STRONG_SELL:1};return r[b.sig]-r[a.sig];});
      setResults(all);setScanning(false);setLastScan(new Date());
    },1500);
  },[]);
  useEffect(()=>{runScan();},[]);
  const filtered=results.filter(r=>(sigF==="ALL"||r.sig===sigF)&&(mktF==="ALL"||r.market===mktF));
  return(<div style={{padding:24}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
      <div><h2 style={{fontSize:18,fontWeight:800,color:C.text,marginBottom:3}}>🔍 AI Market Scanner</h2>
        <p style={{fontSize:12,color:C.text2}}>All 36 instruments{lastScan?` · Last: ${lastScan.toLocaleTimeString()}`:""}</p></div>
      <button onClick={runScan} disabled={scanning} style={{background:C.blue,color:"#fff",border:"none",padding:"10px 20px",borderRadius:8,fontSize:12,fontWeight:700,cursor:"pointer",opacity:scanning?0.7:1}}>{scanning?"⟳ Scanning...":"⟳ Scan Now"}</button>
    </div>
    <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
      {["ALL","STRONG_BUY","BUY","HOLD","SELL","STRONG_SELL"].map(f=>{const sc=SIG[f];const active=sigF===f;
        return<button key={f} onClick={()=>setSigF(f)} style={{background:active?(sc?sc.bg:C.blueL):"#fff",color:active?(sc?sc.color:C.blue):C.text2,border:`1px solid ${active?(sc?sc.border:C.blueB):C.border}`,padding:"5px 12px",borderRadius:6,fontSize:10,fontWeight:700,cursor:"pointer"}}>{f.replace("_"," ")}</button>;
      })}
      <span style={{margin:"0 4px",borderLeft:`1px solid ${C.border}`}}/>
      {["ALL","CRYPTO","STOCKS","FOREX"].map(f=>(
        <button key={f} onClick={()=>setMktF(f)} style={{background:mktF===f?C.blueL:"#fff",color:mktF===f?C.blue:C.text2,border:`1px solid ${mktF===f?C.blueB:C.border}`,padding:"5px 12px",borderRadius:6,fontSize:10,fontWeight:600,cursor:"pointer"}}>{f}</button>
      ))}
    </div>
    {scanning?(<div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:60,textAlign:"center"}}>
      <div style={{fontSize:40,marginBottom:12}}>🔍</div>
      <div style={{fontSize:15,fontWeight:700,color:C.text,marginBottom:6}}>Scanning all 36 instruments...</div>
      <div style={{fontSize:12,color:C.text2}}>RSI · MACD · Bollinger Bands · Stochastic</div>
    </div>):(
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,overflow:"hidden",boxShadow:"0 1px 3px rgba(0,0,0,0.05)"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr style={{background:"#f8fafc"}}>
            {["INSTRUMENT","MARKET","PRICE","24H %","SIGNAL","CONF","RSI","MACD","ACTIONS"].map(h=>(
              <th key={h} style={{padding:"10px 12px",textAlign:"left",fontSize:10,fontWeight:700,color:C.text2,borderBottom:`1px solid ${C.border}`}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>{filtered.map((r,i)=>(
            <tr key={r.id} style={{background:i%2===0?"#fff":"#fafafa",borderBottom:`1px solid ${C.border}`}}>
              <td style={{padding:"10px 12px"}}><div style={{display:"flex",alignItems:"center",gap:8}}>
                <div style={{width:28,height:28,borderRadius:7,background:C.blueL,border:`1px solid ${C.blueB}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:C.blue}}>{r.icon}</div>
                <div><div style={{fontSize:12,fontWeight:700,color:C.text}}>{r.label}</div><div style={{fontSize:9,color:C.text3}}>{r.name}</div></div>
              </div></td>
              <td style={{padding:"10px 12px"}}><span style={{fontSize:10,background:C.blueL,color:C.blue,border:`1px solid ${C.blueB}`,padding:"2px 7px",borderRadius:4,fontWeight:600}}>{r.market}</span></td>
              <td style={{padding:"10px 12px",fontSize:12,fontWeight:700,color:C.text,fontFamily:"monospace"}}>{pfx(r.market,r.id)}{fmtP(r.price,r.id)}</td>
              <td style={{padding:"10px 12px",fontSize:12,fontWeight:600,color:r.ind.change24>=0?C.green:C.red}}>{r.ind.change24>=0?"+":""}{r.ind.change24.toFixed(2)}%</td>
              <td style={{padding:"10px 12px"}}><Badge sig={r.sig} sm={true}/></td>
              <td style={{padding:"10px 12px"}}><div style={{display:"flex",alignItems:"center",gap:5}}>
                <div style={{flex:1,height:5,borderRadius:3,background:C.border}}><div style={{height:"100%",width:`${r.conf}%`,background:r.sig.includes("BUY")?C.green:r.sig.includes("SELL")?C.red:C.yellow,borderRadius:3}}/></div>
                <span style={{fontSize:10,fontWeight:700,color:C.text2,minWidth:26}}>{r.conf}%</span>
              </div></td>
              <td style={{padding:"10px 12px",fontSize:11,fontWeight:600,color:r.ind.rsi<30?C.green:r.ind.rsi>70?C.red:C.text2}}>{r.ind.rsi.toFixed(1)}</td>
              <td style={{padding:"10px 12px",fontSize:11,fontWeight:600,color:r.ind.macd>0?C.green:C.red}}>{r.ind.macd>0?"+":""}{r.ind.macd.toFixed(4)}</td>
              <td style={{padding:"10px 12px"}}><div style={{display:"flex",gap:5}}>
                <button onClick={()=>onAnalyse(r,r.market,{price:r.price,history:PS[r.id]?.history||[],...r.ind})} style={{background:C.blue,color:"#fff",border:"none",padding:"5px 10px",borderRadius:6,fontSize:10,fontWeight:700,cursor:"pointer"}}>AI</button>
                {wallet.balance>0&&<button onClick={()=>onTrade(r,r.market,r.sig,r.price,r.ind)} style={{background:C.green,color:"#fff",border:"none",padding:"5px 10px",borderRadius:6,fontSize:10,fontWeight:700,cursor:"pointer"}}>TRADE</button>}
              </div></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    )}
  </div>);
}
function ChartsView(){
  const [mkt,setMkt]=useState("CRYPTO");
  const [selId,setSelId]=useState("bitcoin");
  const [st,setSt]=useState(null);
  const sym=INSTRUMENTS[mkt].find(s=>s.id===selId)||INSTRUMENTS[mkt][0];
  useEffect(()=>{
    const s=initP(sym.id,sym.base,sym.vol);
    setSt({price:s.price,history:[...s.history],candles:[...s.candles]});
    const iv=setInterval(()=>{const ns=tickP(sym.id);if(ns)setSt(ns);},2000);
    return()=>clearInterval(iv);
  },[sym.id]);
  const ind=st?getInd(st.history,st.price):null;
  const sig=ind?calcSig(ind):"HOLD";
  const pos=ind?ind.change24>=0:true;
  return(<div style={{padding:24}}>
    <h2 style={{fontSize:18,fontWeight:800,color:C.text,marginBottom:16}}>📈 Live Charts</h2>
    <div style={{display:"flex",gap:8,marginBottom:16}}>
      {["CRYPTO","STOCKS","FOREX"].map(t=>(
        <button key={t} onClick={()=>{setMkt(t);setSelId(INSTRUMENTS[t][0].id);}} style={{background:mkt===t?C.blue:"#fff",color:mkt===t?"#fff":C.text2,border:`1px solid ${mkt===t?C.blue:C.border}`,padding:"7px 16px",borderRadius:7,fontSize:11,fontWeight:700,cursor:"pointer"}}>{t}</button>
      ))}
    </div>
    <div style={{display:"grid",gridTemplateColumns:"200px 1fr",gap:16}}>
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,overflow:"hidden"}}>
        {INSTRUMENTS[mkt].map(s=>{
          const ps=PS[s.id];const p=ps?.price||s.base;
          const h=ps?.history||[];const n=h.length;
          const chg=n>1?(p-h[Math.max(0,n-24)])/h[Math.max(0,n-24)]*100:0;
          return(<div key={s.id} onClick={()=>setSelId(s.id)} style={{padding:"9px 12px",cursor:"pointer",background:selId===s.id?C.blueL:"transparent",borderLeft:selId===s.id?`3px solid ${C.blue}`:"3px solid transparent",borderBottom:`1px solid ${C.border}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <div style={{width:22,height:22,borderRadius:5,background:C.blueL,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:C.blue}}>{s.icon}</div>
                <div><div style={{fontSize:11,fontWeight:700,color:C.text}}>{s.label}</div><div style={{fontSize:9,color:C.text3}}>{s.name}</div></div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:10,fontWeight:700,color:C.text,fontFamily:"monospace"}}>{pfx(mkt,s.id)}{fmtP(p,s.id)}</div>
                <div style={{fontSize:9,color:chg>=0?C.green:C.red,fontWeight:600}}>{chg>=0?"+":""}{chg.toFixed(2)}%</div>
              </div>
            </div>
          </div>);
        })}
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        {st&&ind&&(<>
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:22,boxShadow:"0 1px 3px rgba(0,0,0,0.05)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
              <div>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
                  <div style={{width:32,height:32,borderRadius:8,background:C.blueL,border:`1px solid ${C.blueB}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:800,color:C.blue}}>{sym.icon}</div>
                  <span style={{fontSize:18,fontWeight:800,color:C.text}}>{sym.label}</span><Badge sig={sig}/>
                </div>
                <div style={{fontSize:30,fontWeight:900,color:C.text,fontFamily:"monospace"}}>{pfx(mkt,sym.id)}{fmtP(st.price,sym.id)}</div>
                <div style={{fontSize:14,color:pos?C.green:C.red,fontWeight:700,marginTop:2}}>{pos?"▲":"▼"} {Math.abs(ind.change24).toFixed(2)}% (24h)</div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                {[{l:"RSI",v:ind.rsi.toFixed(1),c:ind.rsi<30?C.green:ind.rsi>70?C.red:C.yellow},{l:"MACD",v:(ind.macd>0?"+":"")+ind.macd.toFixed(4),c:ind.macd>0?C.green:C.red},{l:"BB%",v:ind.bbPos.toFixed(1)+"%",c:C.blue},{l:"STOCH",v:ind.stochK.toFixed(1),c:ind.stochK<20?C.green:ind.stochK>80?C.red:C.text2}].map(f=>(
                  <div key={f.l} style={{background:"#f8fafc",borderRadius:8,padding:"8px 12px",minWidth:90}}>
                    <div style={{fontSize:9,color:C.text3,fontWeight:600,marginBottom:2}}>{f.l}</div>
                    <div style={{fontSize:13,fontWeight:800,color:f.c}}>{f.v}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{background:"#f8fafc",borderRadius:10,padding:14,marginBottom:12}}>
              <div style={{fontSize:10,color:C.text2,fontWeight:700,marginBottom:8}}>CANDLESTICK CHART — Last 28 bars</div>
              <CandleChart candles={st.candles} w={580} h={140}/>
            </div>
            <div style={{background:"#f8fafc",borderRadius:10,padding:14}}>
              <div style={{fontSize:10,color:C.text2,fontWeight:700,marginBottom:8}}>PRICE LINE — Last 80 ticks</div>
              <Spark points={st.history} pos={pos} w={580} h={55}/>
            </div>
          </div>
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:20}}>
            <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:12}}>Key Levels &amp; Moving Averages</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
              {[{l:"SMA 20",v:`${pfx(mkt,sym.id)}${fmtP(ind.sma20,sym.id)}`,s:st.price>ind.sma20?"ABOVE":"BELOW",c:st.price>ind.sma20?C.green:C.red},
               {l:"SMA 50",v:`${pfx(mkt,sym.id)}${fmtP(ind.sma50,sym.id)}`,s:st.price>ind.sma50?"ABOVE":"BELOW",c:st.price>ind.sma50?C.green:C.red},
               {l:"BB Upper",v:`${pfx(mkt,sym.id)}${fmtP(ind.bbUpper,sym.id)}`,s:"RESISTANCE",c:C.red},
               {l:"BB Lower",v:`${pfx(mkt,sym.id)}${fmtP(ind.bbLower,sym.id)}`,s:"SUPPORT",c:C.green}].map(f=>(
                <div key={f.l} style={{background:"#f8fafc",borderRadius:8,padding:"12px 14px"}}>
                  <div style={{fontSize:10,color:C.text3,fontWeight:600,marginBottom:4}}>{f.l}</div>
                  <div style={{fontSize:13,fontWeight:800,color:C.text,fontFamily:"monospace",marginBottom:4}}>{f.v}</div>
                  <span style={{fontSize:9,fontWeight:700,color:f.c,background:f.c===C.green?C.greenL:C.redL,padding:"2px 7px",borderRadius:3}}>{f.s}</span>
                </div>
              ))}
            </div>
          </div>
        </>)}
      </div>
    </div>
  </div>);
}
function RiskView({wallet}){
  const [acc,setAcc]=useState(wallet.balance.toFixed(2));
  const [rPct,setRPct]=useState("2");
  const [entry,setEntry]=useState("");
  const [sl,setSl]=useState("");
  const [tp,setTp]=useState("");
  const [lev,setLev]=useState("1");
  const a=parseFloat(acc)||0,r=parseFloat(rPct)||0,e=parseFloat(entry)||0;
  const s=parseFloat(sl)||0,t=parseFloat(tp)||0,lv=parseFloat(lev)||1;
  const maxRisk=a*(r/100);
  const slDist=e&&s?Math.abs(e-s):0;
  const tpDist=e&&t?Math.abs(t-e):0;
  const posSize=slDist>0?maxRisk/slDist:0;
  const posVal=posSize*(e||1);
  const margin=posVal/lv;
  const rr=slDist>0&&tpDist>0?(tpDist/slDist).toFixed(2):"-";
  const profit=posSize*tpDist;
  return(<div style={{padding:24}}>
    <h2 style={{fontSize:18,fontWeight:800,color:C.text,marginBottom:4}}>⚖️ Risk &amp; Position Calculator</h2>
    <p style={{fontSize:12,color:C.text2,marginBottom:20}}>Calculate the exact position size to risk the right amount on every trade.</p>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:18}}>
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:24,boxShadow:"0 1px 3px rgba(0,0,0,0.05)"}}>
        <h3 style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:18}}>Trade Parameters</h3>
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          {[{l:"Account Size ($)",v:acc,s:setAcc,ph:"e.g. 10000"},{l:"Risk Per Trade (%)",v:rPct,s:setRPct,ph:"e.g. 2"},{l:"Entry Price",v:entry,s:setEntry,ph:"e.g. 67800"},{l:"Stop Loss Price",v:sl,s:setSl,ph:"e.g. 66500"},{l:"Take Profit Price",v:tp,s:setTp,ph:"e.g. 70000"}].map(f=>(
            <div key={f.l}><label style={{fontSize:11,fontWeight:600,color:C.text2,display:"block",marginBottom:5}}>{f.l}</label>
              <input value={f.v} onChange={ev=>f.s(ev.target.value)} placeholder={f.ph} style={{width:"100%",border:`1px solid ${C.border}`,borderRadius:8,padding:"9px 12px",fontSize:13,color:C.text,background:"#fff",boxSizing:"border-box"}}/></div>
          ))}
          <div><label style={{fontSize:11,fontWeight:600,color:C.text2,display:"block",marginBottom:6}}>Leverage</label>
            <div style={{display:"flex",gap:6}}>
              {["1","2","5","10","20"].map(lv2=>(
                <button key={lv2} onClick={()=>setLev(lv2)} style={{flex:1,background:lev===lv2?C.blue:"#fff",color:lev===lv2?"#fff":C.text2,border:`1px solid ${lev===lv2?C.blue:C.border}`,padding:"8px 0",borderRadius:6,fontSize:11,fontWeight:700,cursor:"pointer"}}>{lv2}x</button>
              ))}
            </div></div>
        </div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:24,boxShadow:"0 1px 3px rgba(0,0,0,0.05)"}}>
          <h3 style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:16}}>Calculated Results</h3>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {[{l:"Max Risk Amount",v:`$${maxRisk.toFixed(2)}`,c:C.red,big:true},{l:"Position Size",v:posSize>0?posSize.toFixed(6):"—",c:C.blue,big:true},{l:"Position Value",v:posVal>0?`$${posVal.toFixed(2)}`:"—",c:C.text},{l:"Required Margin",v:margin>0?`$${margin.toFixed(2)}`:"—",c:C.purple},{l:"Risk : Reward",v:`1 : ${rr}`,c:parseFloat(rr)>=2?C.green:C.yellow,big:true},{l:"Potential Profit",v:profit>0?`$${profit.toFixed(2)}`:"—",c:C.green,big:true}].map(f=>(
              <div key={f.l} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",background:"#f8fafc",borderRadius:8}}>
                <span style={{fontSize:12,color:C.text2,fontWeight:600}}>{f.l}</span>
                <span style={{fontSize:f.big?16:13,fontWeight:800,color:f.c}}>{f.v}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{background:"#fffbeb",border:`1px solid ${C.yellowB}`,borderRadius:14,padding:20}}>
          <h3 style={{fontSize:13,fontWeight:700,color:C.yellow,marginBottom:12}}>💡 Pro Risk Rules</h3>
          {["Never risk more than 2% per trade","Always aim for minimum 1:2 Risk:Reward","Never move your stop loss further away","Stop trading after 3 consecutive losses","Never risk money you cannot afford to lose"].map((rule,i)=>(
            <div key={i} style={{display:"flex",gap:8,alignItems:"flex-start",marginBottom:7}}>
              <span style={{color:C.green,fontWeight:700,fontSize:12}}>✓</span>
              <span style={{fontSize:11,color:C.text2,lineHeight:1.5}}>{rule}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>);
}
function AIPanel({target,onClose,onJournal,onTrade}){
  const {sym,market,data}=target;
  const [text,setText]=useState("");
  const [sig,setSig]=useState(null);
  const [loading,setLoading]=useState(true);
  const [saved,setSaved]=useState(false);
  const [tab,setTab]=useState("SIGNAL");
  const [coachText,setCoachText]=useState("");
  const [coachLoad,setCoachLoad]=useState(false);
  const [dots,setDots]=useState("");
  useEffect(()=>{const iv=setInterval(()=>setDots(d=>d.length>=3?"":d+"."),400);return()=>clearInterval(iv);},[]);
  useEffect(()=>{
    fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,messages:[{role:"user",content:`You are a senior quantitative trader at FDS Trading. Generate a precise signal report.\nINSTRUMENT: ${sym.label} (${sym.name}) — ${market}\nPRICE: ${fmtP(data.price,sym.id)}\nRSI: ${(data.rsi||0).toFixed(1)} | MACD: ${(data.macd||0).toFixed(5)} | SMA20: ${fmtP(data.sma20||0,sym.id)} | SMA50: ${fmtP(data.sma50||0,sym.id)}\nBB%: ${(data.bbPos||0).toFixed(1)}% | Stochastic: ${(data.stochK||0).toFixed(1)} | 24h: ${(data.change24||0).toFixed(3)}%\n\nSIGNAL: [STRONG_BUY/BUY/HOLD/SELL/STRONG_SELL]\nCONFIDENCE: [1-100]%\nTIMEFRAME: [INTRADAY/SWING/POSITION]\n\n📊 TECHNICAL PICTURE\n2-3 sentences on what indicators say.\n\n🎯 TRADE SETUP\nEntry Zone: [price]\nStop Loss: [price] ([%])\nTake Profit 1: [price] (R:R [ratio])\nTake Profit 2: [price] (R:R [ratio])\n\n📈 MARKET STRUCTURE\n2 sentences on price vs MAs and Bollinger Bands.\n\n⚠️ INVALIDATION\n- [Condition 1]\n- [Condition 2]\n\n💡 EDGE\nOne non-obvious insight.\n\n🕐 TIMING\nWhen to watch and any catalysts.`}]})}).then(r=>r.json()).then(d=>{
      const t=d.content?.map(b=>b.text||"").join("")||"Analysis unavailable.";
      const m=t.match(/SIGNAL:\s*(STRONG_BUY|BUY|HOLD|SELL|STRONG_SELL)/);
      if(m)setSig(m[1]);setText(t);setLoading(false);
    }).catch(()=>{setText("Connection error. Please try again.");setLoading(false);});
  },[]);
  const runCoach=()=>{
    setCoachLoad(true);
    fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:600,messages:[{role:"user",content:`You are a professional trading coach at FDS Trading. Based on ${market} instrument ${sym.label} with signal ${sig||"HOLD"}, RSI ${(data.rsi||0).toFixed(1)}, 24h change ${(data.change24||0).toFixed(2)}%, give a coaching lesson:\n\n🧠 LESSON\nWhat this market condition teaches a trader.\n\n✅ WHAT TO DO\n3 specific actions for this setup.\n\n❌ COMMON MISTAKES\n2 mistakes traders make in this situation.\n\n📚 KEY PRINCIPLE\nOne core trading principle that applies here.`}]})}).then(r=>r.json()).then(d=>{
      setCoachText(d.content?.map(b=>b.text||"").join("")||"");setCoachLoad(false);
    }).catch(()=>setCoachLoad(false));
  };
  const pos=(data.change24||0)>=0;
  return(<div style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.65)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(5px)",padding:16}}>
    <div style={{background:"#fff",borderRadius:20,width:"100%",maxWidth:720,maxHeight:"92vh",overflow:"hidden",display:"flex",flexDirection:"column",boxShadow:"0 24px 64px rgba(0,0,0,0.18)"}}>
      <div style={{padding:"16px 22px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",background:"#f8fafc"}}>
        <div>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
            <span style={{fontSize:16,fontWeight:800,color:C.text}}>{sym.label}</span>
            <span style={{fontSize:10,background:C.blueL,color:C.blue,border:`1px solid ${C.blueB}`,padding:"2px 8px",borderRadius:4,fontWeight:600}}>{market}</span>
            {sig&&<Badge sig={sig}/>}
          </div>
          <span style={{fontSize:20,fontWeight:900,color:C.text,fontFamily:"monospace"}}>{pfx(market,sym.id)}{fmtP(data.price,sym.id)}<span style={{fontSize:12,marginLeft:8,color:pos?C.green:C.red,fontWeight:700}}>{pos?"▲":"▼"}{Math.abs(data.change24||0).toFixed(2)}%</span></span>
        </div>
        <div style={{display:"flex",gap:8}}>
          {!loading&&sig&&<button onClick={()=>{onTrade&&onTrade(sym,market,sig,data.price,data);onClose();}} style={{background:C.green,color:"#fff",border:"none",padding:"8px 16px",borderRadius:8,cursor:"pointer",fontSize:11,fontWeight:700}}>💰 TRADE NOW</button>}
          {!loading&&sig&&<button onClick={()=>{onJournal(sym,market,sig,data.price,text);setSaved(true);}} style={{background:saved?C.greenL:"#fff",color:saved?C.green:C.blue,border:`1px solid ${saved?C.greenB:C.blueB}`,padding:"8px 16px",borderRadius:8,cursor:"pointer",fontSize:11,fontWeight:700}}>{saved?"✓ SAVED":"⊕ JOURNAL"}</button>}
          <button onClick={onClose} style={{background:"#fff",border:`1px solid ${C.border}`,color:C.text2,width:34,height:34,borderRadius:8,cursor:"pointer",fontSize:16}}>✕</button>
        </div>
      </div>
      <div style={{display:"flex",borderBottom:`1px solid ${C.border}`}}>
        {[["SIGNAL","📊 Signal Report"],["COACH","🧠 Trade Coach"]].map(([t,lbl])=>(
          <button key={t} onClick={()=>{setTab(t);if(t==="COACH"&&!coachText&&!loading)runCoach();}} style={{padding:"10px 20px",border:"none",borderBottom:tab===t?`2px solid ${C.blue}`:"2px solid transparent",color:tab===t?C.blue:C.text2,fontSize:12,fontWeight:700,cursor:"pointer",background:"none"}}>{lbl}</button>
        ))}
      </div>
      <div style={{padding:"20px 22px",overflowY:"auto",flex:1}}>
        {tab==="SIGNAL"&&(loading?(<div style={{textAlign:"center",padding:"50px 0"}}>
          <div style={{fontSize:40,marginBottom:14}}>⚡</div>
          <div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:8}}>FDS AI Engine Processing{dots}</div>
          <div style={{display:"flex",justifyContent:"center",flexWrap:"wrap",gap:8,marginTop:12}}>
            {["RSI Scan","MACD Cross","BB Squeeze","S/R Levels","Risk Calc","Signal Gen"].map((tt,i)=>(
              <span key={tt} style={{fontSize:10,color:C.text2,background:"#f8fafc",border:`1px solid ${C.border}`,padding:"5px 12px",borderRadius:20}}>{tt}</span>
            ))}
          </div>
        </div>):(<div>
          <div style={{display:"flex",gap:10,marginBottom:14,flexWrap:"wrap"}}>
            {text.split("\n").filter(ln=>ln.startsWith("SIGNAL:")||ln.startsWith("CONFIDENCE:")||ln.startsWith("TIMEFRAME:")).map((line,i)=>{
              const [k,...v]=line.split(":");
              return<div key={i} style={{background:"#f8fafc",border:`1px solid ${C.border}`,borderRadius:8,padding:"7px 12px"}}>
                <div style={{fontSize:9,color:C.text3,fontWeight:600,marginBottom:2}}>{k}</div>
                <div style={{fontSize:13,fontWeight:800,color:C.text}}>{v.join(":").trim()}</div>
              </div>;
            })}
          </div>
          {text.split("\n").filter(ln=>!ln.startsWith("SIGNAL:")&&!ln.startsWith("CONFIDENCE:")&&!ln.startsWith("TIMEFRAME:")).map((line,i)=>{
            if(!line.trim())return<div key={i} style={{height:6}}/>;
            if(line.match(/^[📊🎯📈⚠️💡🕐]/))return<div key={i} style={{fontSize:13,fontWeight:700,color:C.text,margin:"14px 0 7px",padding:"8px 12px",background:"#f8fafc",borderRadius:8,borderLeft:`3px solid ${C.blue}`}}>{line}</div>;
            if(line.match(/^(Entry|Stop|Take|Risk)\s/))return<div key={i} style={{fontSize:12,color:C.text,padding:"3px 0 3px 12px",borderLeft:`2px solid ${C.green}`,marginLeft:4,marginBottom:2}}>{line}</div>;
            if(line.startsWith("- "))return<div key={i} style={{fontSize:12,color:C.text2,padding:"2px 0 2px 16px",display:"flex",gap:8}}><span style={{color:C.red}}>•</span>{line.slice(2)}</div>;
            return<div key={i} style={{fontSize:12,color:C.text2,lineHeight:1.7}}>{line}</div>;
          })}
        </div>))}
        {tab==="COACH"&&(coachLoad?(<div style={{textAlign:"center",padding:"50px 0"}}>
          <div style={{fontSize:36,marginBottom:12}}>🧠</div>
          <div style={{fontSize:14,fontWeight:700,color:C.text}}>AI Coach preparing lesson{dots}</div>
        </div>):coachText?(<div>
          {coachText.split("\n").map((line,i)=>{
            if(!line.trim())return<div key={i} style={{height:6}}/>;
            if(line.match(/^[🧠✅❌📚]/))return<div key={i} style={{fontSize:13,fontWeight:700,color:C.text,margin:"14px 0 7px",padding:"8px 12px",background:C.purpleL,borderRadius:8,borderLeft:`3px solid ${C.purple}`}}>{line}</div>;
            return<div key={i} style={{fontSize:12,color:C.text2,lineHeight:1.7}}>{line}</div>;
          })}
        </div>):(<div style={{textAlign:"center",padding:"40px 0"}}>
          <div style={{fontSize:40,marginBottom:12}}>🧠</div>
          <div style={{fontSize:15,fontWeight:700,color:C.text,marginBottom:8}}>AI Trade Coach</div>
          <p style={{fontSize:12,color:C.text2,marginBottom:18}}>Get a personalised coaching lesson based on this exact trade setup.</p>
          <button onClick={runCoach} style={{background:C.purple,color:"#fff",border:"none",padding:"11px 24px",borderRadius:8,fontSize:12,fontWeight:700,cursor:"pointer"}}>Get Coaching Lesson</button>
        </div>))}
      </div>
      <div style={{padding:"10px 22px",borderTop:`1px solid ${C.border}`,background:"#f8fafc",fontSize:10,color:C.text3,display:"flex",justifyContent:"space-between"}}>
        <span>⚡ FDS Trading · AI Signal Engine</span><span>FOR INFORMATIONAL PURPOSES ONLY · NOT FINANCIAL ADVICE</span>
      </div>
    </div>
  </div>);
}
function WalletView({wallet,onDeposit,onWithdraw,trades}){
  const [depAmt,setDepAmt]=useState("");
  const [witAmt,setWitAmt]=useState("");
  const [tab,setTab]=useState("OVERVIEW");
  const openVal=trades.filter(t=>t.status==="OPEN").reduce((a,t)=>a+(t.invested||0),0);
  const tradePnl=trades.reduce((a,t)=>a+(t.pnl||0),0);
  const avail=wallet.balance-openVal;
  return(<div style={{padding:24}}>
    <h2 style={{fontSize:18,fontWeight:800,color:C.text,marginBottom:20}}>💰 Virtual Wallet</h2>
    <div style={{background:`linear-gradient(135deg,${C.blue},#1d4ed8)`,borderRadius:18,padding:28,marginBottom:20,color:"#fff",position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",top:-30,right:-30,width:130,height:130,borderRadius:"50%",background:"rgba(255,255,255,0.07)"}}/>
      <div style={{fontSize:10,opacity:0.75,letterSpacing:"0.12em",marginBottom:8}}>FDS TRADING · VIRTUAL WALLET</div>
      <div style={{fontSize:42,fontWeight:900,marginBottom:6,fontFamily:"monospace"}}>${wallet.balance.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
      <div style={{fontSize:12,opacity:0.8,marginBottom:20}}>{tradePnl>=0?"▲ +":"▼ "}${Math.abs(tradePnl).toFixed(2)} total P&L · {trades.length} trades</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
        {[{l:"DEPOSITED",v:`$${wallet.totalDeposited.toLocaleString()}`},{l:"IN TRADES",v:`$${openVal.toFixed(2)}`},{l:"AVAILABLE",v:`$${avail.toFixed(2)}`}].map(s=>(
          <div key={s.l} style={{background:"rgba(255,255,255,0.12)",borderRadius:10,padding:"10px 14px"}}>
            <div style={{fontSize:9,opacity:0.7,letterSpacing:"0.1em",marginBottom:4}}>{s.l}</div>
            <div style={{fontSize:16,fontWeight:800,fontFamily:"monospace"}}>{s.v}</div>
          </div>
        ))}
      </div>
    </div>
    <div style={{display:"flex",gap:6,marginBottom:16}}>
      {["OVERVIEW","DEPOSIT","WITHDRAW","HISTORY"].map(t=>(
        <button key={t} onClick={()=>setTab(t)} style={{background:tab===t?C.blue:"#fff",color:tab===t?"#fff":C.text2,border:`1px solid ${tab===t?C.blue:C.border}`,padding:"7px 16px",borderRadius:7,fontSize:11,fontWeight:700,cursor:"pointer"}}>{t}</button>
      ))}
    </div>
    {tab==="OVERVIEW"&&<div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:12}}>
      {[{l:"TOTAL TRADES",v:trades.length,c:C.blue,icon:"📊"},{l:"OPEN POSITIONS",v:trades.filter(t=>t.status==="OPEN").length,c:C.yellow,icon:"🔓"},{l:"WINNING TRADES",v:trades.filter(t=>(t.pnl||0)>0).length,c:C.green,icon:"✅"},{l:"LOSING TRADES",v:trades.filter(t=>(t.pnl||0)<0).length,c:C.red,icon:"❌"}].map(s=>(
        <StatCard key={s.l} label={s.l} value={s.v} color={s.c} icon={s.icon}/>
      ))}
    </div>}
    {tab==="DEPOSIT"&&<div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:24}}>
      <h3 style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:16}}>💳 Add Funds</h3>
      <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap"}}>
        {[1000,5000,10000,25000,50000,100000].map(amt=>(
          <button key={amt} onClick={()=>setDepAmt(String(amt))} style={{background:depAmt===String(amt)?C.blue:"#fff",color:depAmt===String(amt)?"#fff":C.text2,border:`1px solid ${depAmt===String(amt)?C.blue:C.border}`,padding:"7px 14px",borderRadius:7,fontSize:11,fontWeight:600,cursor:"pointer"}}>${amt.toLocaleString()}</button>
        ))}
      </div>
      <div style={{display:"flex",gap:8}}>
        <input value={depAmt} onChange={e=>setDepAmt(e.target.value)} placeholder="Or enter custom amount..." style={{flex:1,border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 14px",fontSize:12,color:C.text}}/>
        <button onClick={()=>{const a=parseFloat(depAmt);if(a>0){onDeposit(a);setDepAmt("");}}} style={{background:C.green,color:"#fff",border:"none",padding:"10px 20px",borderRadius:8,fontSize:12,fontWeight:700,cursor:"pointer"}}>DEPOSIT</button>
      </div>
      <p style={{fontSize:10,color:C.text3,marginTop:10}}>Virtual wallet only. No real money involved.</p>
    </div>}
    {tab==="WITHDRAW"&&<div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:24}}>
      <h3 style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:16}}>Withdraw Funds</h3>
      <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap"}}>
        {[500,1000,5000,10000,25000].map(amt=>(
          <button key={amt} onClick={()=>setWitAmt(String(amt))} style={{background:witAmt===String(amt)?C.red:"#fff",color:witAmt===String(amt)?"#fff":C.text2,border:`1px solid ${witAmt===String(amt)?C.red:C.border}`,padding:"7px 14px",borderRadius:7,fontSize:11,fontWeight:600,cursor:"pointer"}}>${amt.toLocaleString()}</button>
        ))}
      </div>
      <div style={{display:"flex",gap:8}}>
        <input value={witAmt} onChange={e=>setWitAmt(e.target.value)} placeholder="Enter amount..." style={{flex:1,border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 14px",fontSize:12,color:C.text}}/>
        <button onClick={()=>{const a=parseFloat(witAmt);if(a>0&&a<=wallet.balance){onWithdraw(a);setWitAmt("");}}} style={{background:C.red,color:"#fff",border:"none",padding:"10px 20px",borderRadius:8,fontSize:12,fontWeight:700,cursor:"pointer"}}>WITHDRAW</button>
      </div>
      <p style={{fontSize:10,color:C.text3,marginTop:10}}>Available: ${wallet.balance.toFixed(2)}</p>
    </div>}
    {tab==="HISTORY"&&<div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,overflow:"hidden"}}>
      {wallet.history.length===0?<p style={{padding:40,textAlign:"center",color:C.text3,fontSize:12}}>No transactions yet.</p>:
      wallet.history.slice().reverse().map((tx,i)=>(
        <div key={i} style={{padding:"12px 18px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",background:i%2===0?"#fff":C.bg}}>
          <div>
            <div style={{fontSize:12,fontWeight:700,color:tx.type==="DEPOSIT"?C.green:tx.type==="WITHDRAW"?C.red:tx.amount>0?C.green:C.red}}>{tx.type.replace(/_/g," ")}</div>
            <div style={{fontSize:10,color:C.text3,marginTop:2}}>{tx.note} · {new Date(tx.date).toLocaleString()}</div>
          </div>
          <div style={{fontSize:14,fontWeight:800,color:tx.amount>=0?C.green:C.red}}>{tx.amount>=0?"+$":"-$"}{Math.abs(tx.amount).toFixed(2)}</div>
        </div>
      ))}
    </div>}
  </div>);
}
function TradeModal({pre,wallet,onPlace,onClose}){
  const [dir,setDir]=useState(pre?.signal?.includes("BUY")?"BUY":"SELL");
  const [amt,setAmt]=useState("");
  const [sl,setSl]=useState("");
  const [tp,setTp]=useState("");
  const [lev,setLev]=useState("1");
  const avail=wallet.balance;
  const invested=parseFloat(amt)||0;
  const leverage=parseFloat(lev)||1;
  const price=pre?.price||1;
  const units=invested*leverage/price;
  const potP=tp?Math.abs(parseFloat(tp)-price)*units:0;
  const potL=sl?Math.abs(price-parseFloat(sl))*units:0;
  const rr=potL>0?(potP/potL).toFixed(2):"-";
  return(<div style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.65)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(5px)",padding:16}}>
    <div style={{background:"#fff",borderRadius:18,width:"100%",maxWidth:480,padding:26,boxShadow:"0 24px 64px rgba(0,0,0,0.18)"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div><div style={{fontSize:16,fontWeight:800,color:C.text}}>💰 Place Trade</div><div style={{fontSize:11,color:C.text3}}>FDS Trading · Virtual Account</div></div>
        <button onClick={onClose} style={{background:"#fff",border:`1px solid ${C.border}`,color:C.text2,width:32,height:32,borderRadius:8,cursor:"pointer",fontSize:16}}>✕</button>
      </div>
      <div style={{background:"#f8fafc",border:`1px solid ${C.border}`,borderRadius:10,padding:"12px 16px",marginBottom:18,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:2}}><span style={{fontSize:14,fontWeight:800,color:C.text}}>{pre?.label}</span>{pre?.signal&&<Badge sig={pre.signal} sm={true}/>}</div>
          <div style={{fontSize:10,color:C.text3}}>{pre?.market}</div>
        </div>
        <div style={{fontSize:16,fontWeight:800,color:C.text,fontFamily:"monospace"}}>{pfx(pre?.market||"",pre?.id||"")}{fmtP(price,pre?.id||"")}</div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16}}>
        {["BUY","SELL"].map(d=>(
          <button key={d} onClick={()=>setDir(d)} style={{padding:"12px 0",borderRadius:10,fontSize:13,fontWeight:800,cursor:"pointer",background:dir===d?(d==="BUY"?C.green:C.red):"#fff",color:dir===d?"#fff":C.text2,border:`2px solid ${dir===d?(d==="BUY"?C.green:C.red):C.border}`}}>{d==="BUY"?"▲ BUY / LONG":"▼ SELL / SHORT"}</button>
        ))}
      </div>
      <div style={{marginBottom:12}}>
        <label style={{fontSize:11,fontWeight:600,color:C.text2,display:"block",marginBottom:5}}>Amount (USD) · Available: ${avail.toFixed(2)}</label>
        <div style={{display:"flex",gap:5,marginBottom:7,flexWrap:"wrap"}}>
          {[100,500,1000,5000].filter(a=>a<=avail).map(a=>(
            <button key={a} onClick={()=>setAmt(String(a))} style={{background:amt===String(a)?C.blue:"#fff",color:amt===String(a)?"#fff":C.text2,border:`1px solid ${amt===String(a)?C.blue:C.border}`,padding:"5px 10px",borderRadius:6,fontSize:10,fontWeight:600,cursor:"pointer"}}>${a}</button>
          ))}
          <button onClick={()=>setAmt((avail*0.5).toFixed(2))} style={{background:"#fff",color:C.text2,border:`1px solid ${C.border}`,padding:"5px 10px",borderRadius:6,fontSize:10,cursor:"pointer"}}>50%</button>
          <button onClick={()=>setAmt(avail.toFixed(2))} style={{background:"#fff",color:C.text2,border:`1px solid ${C.border}`,padding:"5px 10px",borderRadius:6,fontSize:10,cursor:"pointer"}}>MAX</button>
        </div>
        <input value={amt} onChange={e=>setAmt(e.target.value)} placeholder="Enter USD amount..." style={{width:"100%",border:`1px solid ${C.border}`,borderRadius:8,padding:"9px 12px",fontSize:12,color:C.text,boxSizing:"border-box"}}/>
      </div>
      <div style={{marginBottom:12}}>
        <label style={{fontSize:11,fontWeight:600,color:C.text2,display:"block",marginBottom:5}}>Leverage</label>
        <div style={{display:"flex",gap:5}}>
          {["1","2","5","10","20"].map(lv=>(
            <button key={lv} onClick={()=>setLev(lv)} style={{flex:1,background:lev===lv?C.blue:"#fff",color:lev===lv?"#fff":C.text2,border:`1px solid ${lev===lv?C.blue:C.border}`,padding:"7px 0",borderRadius:6,fontSize:11,fontWeight:700,cursor:"pointer"}}>{lv}x</button>
          ))}
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
        {[{l:"Stop Loss",v:sl,s:setSl},{l:"Take Profit",v:tp,s:setTp}].map(f=>(
          <div key={f.l}><label style={{fontSize:11,fontWeight:600,color:C.text2,display:"block",marginBottom:4}}>{f.l}</label>
            <input value={f.v} onChange={e=>f.s(e.target.value)} placeholder="Price" style={{width:"100%",border:`1px solid ${C.border}`,borderRadius:7,padding:"8px 10px",fontSize:11,color:C.text,boxSizing:"border-box"}}/></div>
        ))}
      </div>
      {invested>0&&(<div style={{background:"#f8fafc",border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 14px",marginBottom:14,display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
        {[{l:"Position",v:`$${(invested*leverage).toFixed(2)}`},{l:"Units",v:units.toFixed(4)},{l:"R:R",v:`1:${rr}`}].map(f=>(
          <div key={f.l}><div style={{fontSize:9,color:C.text3,marginBottom:2}}>{f.l}</div><div style={{fontSize:12,fontWeight:800,color:C.text}}>{f.v}</div></div>
        ))}
      </div>)}
      <div style={{display:"flex",gap:8}}>
        <button onClick={()=>{if(!invested||invested>avail)return;onPlace({id:pre?.id,label:pre?.label,market:pre?.market,signal:pre?.signal,direction:dir,invested,leverage,entryPrice:price,sl,tp,units,status:"OPEN",openDate:new Date().toISOString(),tradeId:Date.now(),pnl:0});onClose();}} style={{flex:1,background:dir==="BUY"?C.green:C.red,color:"#fff",border:"none",padding:"12px 0",borderRadius:9,fontSize:13,fontWeight:800,cursor:"pointer"}}>{dir==="BUY"?"▲ PLACE BUY ORDER":"▼ PLACE SELL ORDER"}</button>
        <button onClick={onClose} style={{background:"#fff",border:`1px solid ${C.border}`,color:C.text2,padding:"12px 18px",borderRadius:9,fontSize:11,cursor:"pointer"}}>CANCEL</button>
      </div>
      <p style={{textAlign:"center",fontSize:9,color:C.text3,marginTop:8}}>VIRTUAL TRADING ONLY · NO REAL MONEY</p>
    </div>
  </div>);
}
function TradesView({trades,onCloseTrade}){
  const [tab,setTab]=useState("OPEN");
  const open=trades.filter(t=>t.status==="OPEN");
  const closed=trades.filter(t=>t.status==="CLOSED");
  const list=tab==="OPEN"?open:closed;
  return(<div style={{padding:24}}>
    <h2 style={{fontSize:18,fontWeight:800,color:C.text,marginBottom:16}}>💹 My Trades</h2>
    <div style={{display:"flex",gap:8,marginBottom:16}}>
      {[["OPEN",open.length],["CLOSED",closed.length]].map(([t,c])=>(
        <button key={t} onClick={()=>setTab(t)} style={{background:tab===t?C.blue:"#fff",color:tab===t?"#fff":C.text2,border:`1px solid ${tab===t?C.blue:C.border}`,padding:"8px 18px",borderRadius:8,fontSize:11,fontWeight:700,cursor:"pointer"}}>{t} ({c})</button>
      ))}
    </div>
    {list.length===0?(<div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:60,textAlign:"center"}}>
      <div style={{fontSize:40,marginBottom:12}}>💹</div>
      <div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:6}}>No {tab.toLowerCase()} trades</div>
      <div style={{fontSize:12,color:C.text2}}>Click TRADE on any market card to open a position.</div>
    </div>):(
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {list.slice().reverse().map(t=>{
          const curP=PS[t.id]?.price||t.entryPrice;
          const livePnl=t.status==="OPEN"?(t.direction==="BUY"?1:-1)*(curP-t.entryPrice)*t.units*t.leverage:t.pnl||0;
          const livePct=t.invested>0?(livePnl/t.invested)*100:0;
          return(<div key={t.tradeId} style={{background:C.card,border:`1px solid ${livePnl>=0?C.greenB:C.redB}`,borderRadius:14,padding:18,boxShadow:"0 1px 3px rgba(0,0,0,0.05)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
              <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                <span style={{fontSize:14,fontWeight:800,color:C.text}}>{t.label}</span>
                <span style={{fontSize:10,fontWeight:700,background:t.direction==="BUY"?C.greenL:C.redL,color:t.direction==="BUY"?C.green:C.red,border:`1px solid ${t.direction==="BUY"?C.greenB:C.redB}`,padding:"2px 8px",borderRadius:4}}>{t.direction==="BUY"?"▲ LONG":"▼ SHORT"}</span>
                <Badge sig={t.signal} sm={true}/>
                <span style={{fontSize:10,background:t.status==="OPEN"?C.yellowL:C.bg,color:t.status==="OPEN"?C.yellow:C.text2,border:`1px solid ${t.status==="OPEN"?C.yellowB:C.border}`,padding:"2px 7px",borderRadius:4,fontWeight:600}}>{t.status}</span>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:20,fontWeight:900,color:livePnl>=0?C.green:C.red}}>{livePnl>=0?"+":""}{livePct.toFixed(2)}%</div>
                <div style={{fontSize:12,color:livePnl>=0?C.green:C.red,fontWeight:600}}>{livePnl>=0?"+$":"-$"}{Math.abs(livePnl).toFixed(2)}</div>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8,marginBottom:t.status==="OPEN"?12:0}}>
              {[{l:"ENTRY",v:`${pfx(t.market,t.id||"")}${fmtP(t.entryPrice,t.id||"")}`},{l:"CURRENT",v:`${pfx(t.market,t.id||"")}${fmtP(curP,t.id||"")}`},{l:"INVESTED",v:`$${t.invested.toFixed(0)}`},{l:"LEVERAGE",v:`${t.leverage}x`},{l:"UNITS",v:parseFloat(t.units).toFixed(4)}].map(f=>(
                <div key={f.l} style={{background:"#f8fafc",borderRadius:6,padding:"6px 10px"}}>
                  <div style={{fontSize:9,color:C.text3,fontWeight:600,marginBottom:2}}>{f.l}</div>
                  <div style={{fontSize:11,fontWeight:700,color:C.text,fontFamily:"monospace"}}>{f.v}</div>
                </div>
              ))}
            </div>
            {t.status==="OPEN"&&<button onClick={()=>onCloseTrade(t.tradeId,livePnl)} style={{width:"100%",background:C.redL,color:C.red,border:`1px solid ${C.redB}`,padding:"8px 0",borderRadius:7,fontSize:11,fontWeight:700,cursor:"pointer"}}>CLOSE POSITION</button>}
          </div>);
        })}
      </div>
    )}
  </div>);
}
function JournalView({entries,onDelete,onUpdate}){
  const [filter,setFilter]=useState("ALL");
  const [editId,setEditId]=useState(null);
  const [en,setEn]=useState({note:"",result:"",pnl:""});
  const filtered=filter==="ALL"?entries:entries.filter(e=>e.signal===filter||e.status===filter||e.market===filter);
  const wins=entries.filter(e=>parseFloat(e.pnl)>0).length;
  const losses=entries.filter(e=>parseFloat(e.pnl)<0).length;
  const totalPnl=entries.reduce((a,e)=>a+(parseFloat(e.pnl)||0),0);
  const wr=entries.length?((wins/Math.max(1,wins+losses))*100).toFixed(0):"0";
  const avgW=wins?entries.filter(e=>parseFloat(e.pnl)>0).reduce((a,e)=>a+parseFloat(e.pnl),0)/wins:0;
  const avgL=losses?entries.filter(e=>parseFloat(e.pnl)<0).reduce((a,e)=>a+parseFloat(e.pnl),0)/losses:0;
  return(<div style={{padding:24}}>
    <h2 style={{fontSize:18,fontWeight:800,color:C.text,marginBottom:16}}>📓 Trade Journal</h2>
    <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:12,marginBottom:20}}>
      {[{l:"TRADES",v:entries.length,c:C.blue,icon:"📊"},{l:"WIN RATE",v:`${wr}%`,c:parseInt(wr)>50?C.green:C.red,icon:"🎯"},{l:"TOTAL P&L",v:`${totalPnl>=0?"+":""}${totalPnl.toFixed(2)}%`,c:totalPnl>=0?C.green:C.red,icon:"📈"},{l:"AVG WIN",v:wins?`+${avgW.toFixed(2)}%`:"—",c:C.green,icon:"✅"},{l:"AVG LOSS",v:losses?`${avgL.toFixed(2)}%`:"—",c:C.red,icon:"❌"}].map(s=>(
        <StatCard key={s.l} label={s.l} value={s.v} color={s.c} icon={s.icon}/>
      ))}
    </div>
    <div style={{display:"flex",gap:5,marginBottom:14,flexWrap:"wrap"}}>
      {["ALL","OPEN","CLOSED","CRYPTO","STOCKS","FOREX","STRONG_BUY","BUY","SELL","STRONG_SELL"].map(f=>{const sc=SIG[f];const active=filter===f;
        return<button key={f} onClick={()=>setFilter(f)} style={{background:active?(sc?sc.bg:C.blueL):"#fff",color:active?(sc?sc.color:C.blue):C.text2,border:`1px solid ${active?(sc?sc.border:C.blueB):C.border}`,padding:"4px 12px",borderRadius:20,fontSize:10,fontWeight:700,cursor:"pointer"}}>{f.replace("_"," ")}</button>;
      })}
    </div>
    {filtered.length===0?(<div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:60,textAlign:"center"}}>
      <div style={{fontSize:40,marginBottom:12}}>📓</div>
      <div style={{fontSize:14,fontWeight:700,color:C.text}}>No entries yet</div>
      <div style={{fontSize:12,color:C.text2,marginTop:4}}>Use ⊕ JOURNAL from AI analysis or the 🔔 alert button on cards.</div>
    </div>):(
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {filtered.slice().reverse().map(e=>{
          const pnl=parseFloat(e.pnl)||0;const isE=editId===e.id;
          return(<div key={e.id} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:16,boxShadow:"0 1px 3px rgba(0,0,0,0.04)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
              <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                <span style={{fontSize:13,fontWeight:800,color:C.text}}>{e.label}</span>
                <Badge sig={e.signal} sm={true}/>
                <span style={{fontSize:10,background:C.blueL,color:C.blue,border:`1px solid ${C.blueB}`,padding:"2px 7px",borderRadius:4,fontWeight:600}}>{e.market}</span>
                <span style={{fontSize:10,background:e.status==="OPEN"?C.yellowL:C.bg,color:e.status==="OPEN"?C.yellow:C.text2,border:`1px solid ${e.status==="OPEN"?C.yellowB:C.border}`,padding:"2px 7px",borderRadius:4,fontWeight:600}}>{e.status}</span>
                {e.result&&<span style={{fontSize:10,fontWeight:700,color:e.result==="WIN"?C.green:e.result==="LOSS"?C.red:C.text2}}>{e.result==="WIN"?"✅":e.result==="LOSS"?"❌":"↔"} {e.result}</span>}
              </div>
              <div style={{display:"flex",gap:5}}>
                <button onClick={()=>{setEditId(isE?null:e.id);setEn({note:e.note||"",result:e.result||"",pnl:e.pnl||""}); }} style={{background:"#fff",border:`1px solid ${C.border}`,color:C.text2,padding:"4px 10px",borderRadius:6,cursor:"pointer",fontSize:10,fontWeight:600}}>{isE?"CANCEL":"EDIT"}</button>
                <button onClick={()=>onDelete(e.id)} style={{background:C.redL,border:`1px solid ${C.redB}`,color:C.red,padding:"4px 10px",borderRadius:6,cursor:"pointer",fontSize:10,fontWeight:600}}>DEL</button>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:isE?12:0}}>
              {[{l:"ENTRY",v:`${pfx(e.market||"",e.id||"")}${fmtP(e.price||0,e.id||"")}`},{l:"SL",v:e.sl||"—"},{l:"TP",v:e.tp||"—"},{l:"P&L",v:e.pnl?`${pnl>=0?"+":""}${e.pnl}%`:"Pending"}].map(f=>(
                <div key={f.l} style={{background:"#f8fafc",borderRadius:6,padding:"6px 10px"}}>
                  <div style={{fontSize:9,color:C.text3,fontWeight:600,marginBottom:2}}>{f.l}</div>
                  <div style={{fontSize:11,fontWeight:700,color:f.l==="P&L"?(pnl>=0?C.green:C.red):C.text}}>{f.v}</div>
                </div>
              ))}
            </div>
            {e.note&&!isE&&<div style={{fontSize:11,color:C.text2,borderTop:`1px solid ${C.border}`,paddingTop:8,marginTop:8,fontStyle:"italic"}}>{e.note.slice(0,200)}</div>}
            {isE&&(<div style={{borderTop:`1px solid ${C.border}`,paddingTop:12,marginTop:8,display:"flex",flexDirection:"column",gap:8}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 80px",gap:8}}>
                <div><label style={{fontSize:10,fontWeight:600,color:C.text2,display:"block",marginBottom:3}}>RESULT</label>
                  <select value={en.result} onChange={e2=>setEn(p=>({...p,result:e2.target.value}))} style={{width:"100%",border:`1px solid ${C.border}`,borderRadius:6,padding:"7px 8px",fontSize:11,color:C.text}}>
                    <option value="">Pending</option><option value="WIN">WIN</option><option value="LOSS">LOSS</option><option value="BREAKEVEN">BREAKEVEN</option>
                  </select></div>
                <div><label style={{fontSize:10,fontWeight:600,color:C.text2,display:"block",marginBottom:3}}>P&L (%)</label>
                  <input value={en.pnl} onChange={e2=>setEn(p=>({...p,pnl:e2.target.value}))} placeholder="+3.5 or -1.2" style={{width:"100%",border:`1px solid ${C.border}`,borderRadius:6,padding:"7px 8px",fontSize:11,color:C.text}}/></div>
                <div style={{display:"flex",alignItems:"flex-end"}}>
                  <button onClick={()=>{onUpdate(e.id,{note:en.note,result:en.result,pnl:en.pnl,status:en.result?"CLOSED":"OPEN"});setEditId(null);}} style={{width:"100%",background:C.blue,color:"#fff",border:"none",padding:"7px 0",borderRadius:6,cursor:"pointer",fontSize:10,fontWeight:700}}>SAVE</button>
                </div>
              </div>
              <textarea value={en.note} onChange={e2=>setEn(p=>({...p,note:e2.target.value}))} placeholder="Notes and lessons..." rows={2} style={{width:"100%",border:`1px solid ${C.border}`,borderRadius:6,padding:"8px 10px",fontSize:11,color:C.text,resize:"vertical"}}/>
            </div>)}
          </div>);
        })}
      </div>
    )}
  </div>);
}
function PortfolioView({journal,trades}){
  const byMkt={CRYPTO:[],STOCKS:[],FOREX:[]};
  journal.forEach(e=>{if(byMkt[e.market])byMkt[e.market].push(e);});
  const mktStats=Object.entries(byMkt).map(([m,ts])=>{
    const pnl=ts.reduce((a,e)=>a+(parseFloat(e.pnl)||0),0);
    const wins=ts.filter(e=>parseFloat(e.pnl)>0).length;
    return{m,total:ts.length,pnl,wr:ts.length?(wins/ts.length*100).toFixed(0):"0"};
  });
  const sigDist={STRONG_BUY:0,BUY:0,HOLD:0,SELL:0,STRONG_SELL:0};
  journal.forEach(e=>{if(sigDist[e.signal]!==undefined)sigDist[e.signal]++;});
  const closed=journal.filter(e=>e.result&&e.pnl);
  const tradePnl=trades.reduce((a,t)=>a+(t.pnl||0),0);
  return(<div style={{padding:24}}>
    <h2 style={{fontSize:18,fontWeight:800,color:C.text,marginBottom:20}}>📋 Portfolio Performance</h2>
    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14,marginBottom:20}}>
      {mktStats.map(s=>(
        <div key={s.m} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:20,boxShadow:"0 1px 3px rgba(0,0,0,0.05)"}}>
          <div style={{fontSize:11,color:C.text2,fontWeight:600,marginBottom:8}}>{s.m}</div>
          <div style={{fontSize:26,fontWeight:800,color:s.pnl>=0?C.green:C.red,marginBottom:4}}>{s.pnl>=0?"+":""}{s.pnl.toFixed(2)}%</div>
          <div style={{fontSize:11,color:C.text3}}>{s.total} trades · {s.wr}% WR</div>
        </div>
      ))}
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14,marginBottom:20}}>
      <StatCard label="VIRTUAL TRADES" value={trades.length} color={C.blue} icon="💹"/>
      <StatCard label="TRADE WINS" value={trades.filter(t=>(t.pnl||0)>0).length} color={C.green} icon="🏆"/>
      <StatCard label="VIRTUAL P&L" value={`${tradePnl>=0?"+":""}$${Math.abs(tradePnl).toFixed(2)}`} color={tradePnl>=0?C.green:C.red} icon="💰"/>
    </div>
    <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:20,marginBottom:16}}>
      <h3 style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:14}}>Signal Distribution</h3>
      <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
        {Object.entries(sigDist).map(([sig,count])=>count>0&&(
          <div key={sig} style={{background:SIG[sig].bg,border:`1px solid ${SIG[sig].border}`,borderRadius:10,padding:"10px 16px",display:"flex",gap:12,alignItems:"center"}}>
            <span style={{fontSize:11,color:SIG[sig].color,fontWeight:700}}>{SIG[sig].label}</span>
            <span style={{fontSize:20,fontWeight:900,color:SIG[sig].color}}>{count}</span>
          </div>
        ))}
      </div>
    </div>
    <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,overflow:"hidden"}}>
      <div style={{padding:"14px 18px",borderBottom:`1px solid ${C.border}`,fontSize:13,fontWeight:700,color:C.text}}>Closed Trade History</div>
      {closed.length===0?<p style={{padding:30,textAlign:"center",color:C.text3,fontSize:12}}>Close trades in your journal to see performance.</p>:(
        closed.slice().reverse().map(e=>{const pnl=parseFloat(e.pnl);return(
          <div key={e.id} style={{padding:"12px 18px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:12,fontWeight:700,color:C.text}}>{e.label}</span>
              <Badge sig={e.signal} sm={true}/>
              <span style={{fontSize:10,color:C.text3}}>{new Date(e.date).toLocaleDateString()}</span>
            </div>
            <span style={{fontSize:14,fontWeight:800,color:pnl>=0?C.green:C.red}}>{pnl>=0?"+":""}{pnl.toFixed(2)}%</span>
          </div>
        );})
      )}
    </div>
  </div>);
}
function SentimentView(){
  const [data,setData]=useState(null);
  const [loading,setLoading]=useState(true);
  const [dots,setDots]=useState("");
  useEffect(()=>{const iv=setInterval(()=>setDots(d=>d.length>=3?"":d+"."),450);return()=>clearInterval(iv);},[]);
  useEffect(()=>{
    fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:900,messages:[{role:"user",content:'You are chief market strategist at FDS Trading. Return ONLY raw valid JSON:\n{"overall":"RISK_ON or RISK_OFF or NEUTRAL","score":50,"crypto":{"bias":"BULLISH or BEARISH or NEUTRAL","note":"1 sentence"},"stocks":{"bias":"BULLISH or BEARISH or NEUTRAL","note":"1 sentence"},"forex":{"bias":"USD_STRONG or USD_WEAK or NEUTRAL","note":"1 sentence"},"commodities":{"bias":"BULLISH or BEARISH or NEUTRAL","note":"1 sentence"},"topThemes":["theme1","theme2","theme3","theme4"],"watchOut":"1 key risk","briefing":"2-3 sentence overview","recommendation":"1 actionable sentence"}'}]})}).then(r=>r.json()).then(d=>{
      const t=d.content?.map(b=>b.text||"").join("")||"{}";
      try{setData(JSON.parse(t.replace(/```json|```/g,"").trim()));}catch{setData(null);}
      setLoading(false);
    }).catch(()=>setLoading(false));
  },[]);
  if(loading)return<div style={{padding:40,textAlign:"center",color:C.text2,fontSize:14}}>Loading market intelligence{dots}</div>;
  if(!data)return<div style={{padding:40,textAlign:"center",color:C.text2,fontSize:14}}>Unable to load. Try refreshing.</div>;
  const sc=data.score||50;
  const fc=sc>70?C.green:sc>50?"#65a30d":sc>40?C.yellow:sc>25?"#ea580c":C.red;
  const fl=sc>75?"EXTREME GREED":sc>60?"GREED":sc>45?"NEUTRAL":sc>25?"FEAR":"EXTREME FEAR";
  return(<div style={{padding:24}}>
    <h2 style={{fontSize:18,fontWeight:800,color:C.text,marginBottom:20}}>🌍 Market Sentiment</h2>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:24,textAlign:"center"}}>
        <div style={{fontSize:11,color:C.text2,fontWeight:600,letterSpacing:"0.1em",marginBottom:16}}>FEAR &amp; GREED INDEX</div>
        <div style={{fontSize:64,fontWeight:900,color:fc,lineHeight:1}}>{sc}</div>
        <div style={{fontSize:13,color:fc,fontWeight:700,marginTop:6}}>{fl}</div>
        <div style={{height:8,borderRadius:4,background:`linear-gradient(90deg,${C.red},${C.yellow},${C.green})`,marginTop:16,position:"relative"}}>
          <div style={{position:"absolute",top:-4,left:`${sc}%`,width:16,height:16,borderRadius:"50%",background:"#fff",border:`2px solid ${fc}`,transform:"translateX(-50%)",boxShadow:"0 2px 6px rgba(0,0,0,0.15)"}}/>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:C.text3,marginTop:6}}><span>FEAR</span><span>GREED</span></div>
      </div>
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:24}}>
        <div style={{fontSize:11,color:C.text2,fontWeight:600,letterSpacing:"0.1em",marginBottom:10}}>MARKET MODE</div>
        <div style={{fontSize:22,fontWeight:800,color:data.overall==="RISK_ON"?C.green:data.overall==="RISK_OFF"?C.red:C.yellow,marginBottom:10}}>{(data.overall||"").replace("_"," ")}</div>
        <div style={{fontSize:12,color:C.text2,lineHeight:1.7,marginBottom:12}}>{data.briefing}</div>
        <div style={{background:C.blueL,border:`1px solid ${C.blueB}`,borderRadius:8,padding:"10px 12px",fontSize:11,color:C.blue,fontWeight:600}}>{data.recommendation}</div>
      </div>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:16}}>
      {[{l:"CRYPTO",d:data.crypto},{l:"STOCKS",d:data.stocks},{l:"FOREX",d:data.forex},{l:"COMMODITIES",d:data.commodities}].map(({l,d})=>{
        const bull=d?.bias?.includes("BULL")||d?.bias?.includes("STRONG");
        const bear=d?.bias?.includes("BEAR")||d?.bias?.includes("WEAK");
        const bc=bull?{bg:C.greenL,border:C.greenB,color:C.green}:bear?{bg:C.redL,border:C.redB,color:C.red}:{bg:C.yellowL,border:C.yellowB,color:C.yellow};
        return(<div key={l} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:16}}>
          <div style={{fontSize:10,color:C.text2,fontWeight:600,marginBottom:6}}>{l}</div>
          <span style={{fontSize:10,fontWeight:700,background:bc.bg,color:bc.color,border:`1px solid ${bc.border}`,padding:"2px 8px",borderRadius:4,display:"inline-block",marginBottom:6}}>{(d?.bias||"—").replace("_"," ")}</span>
          <div style={{fontSize:10,color:C.text2,lineHeight:1.5}}>{d?.note}</div>
        </div>);
      })}
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:20}}>
        <h3 style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:12}}>📌 Key Market Themes</h3>
        <div style={{display:"flex",flexWrap:"wrap",gap:7}}>{(data.topThemes||[]).map((t,i)=><span key={i} style={{fontSize:11,color:C.blue,background:C.blueL,border:`1px solid ${C.blueB}`,padding:"5px 12px",borderRadius:20,fontWeight:600}}>{t}</span>)}</div>
      </div>
      <div style={{background:"#fff7ed",border:"1px solid #fed7aa",borderRadius:14,padding:20}}>
        <h3 style={{fontSize:13,fontWeight:700,color:"#c2410c",marginBottom:10}}>⚠️ Key Risk</h3>
        <p style={{fontSize:12,color:"#9a3412",lineHeight:1.6}}>{data.watchOut}</p>
      </div>
    </div>
  </div>);
}
function BrokerView(){
  const [connected,setConnected]=useState({});
  const [inputs,setInputs]=useState({});
  const brokers=[
    {id:"binance",name:"Binance",market:"Crypto",color:"#f59e0b",desc:"World's largest crypto exchange. 300+ pairs. Free API. Best for crypto auto-trading.",fields:["API Key","Secret Key"],features:["Real balance sync","Place/cancel orders","Auto-trading","Price alerts","Trade history"]},
    {id:"coinbase",name:"Coinbase Advanced",market:"Crypto",color:"#2563eb",desc:"US-regulated crypto exchange. Excellent API. Best for BTC, ETH, SOL.",fields:["API Key","Secret Key","Passphrase"],features:["Real balance","Market orders","Limit orders","Portfolio sync","USD deposits"]},
    {id:"alpaca",name:"Alpaca Markets",market:"Stocks",color:"#d97706",desc:"Commission-free US stocks and ETFs. Free paper trading account included.",fields:["API Key","Secret Key"],features:["Stocks & ETFs","Extended hours","Fractional shares","Paper trading","Webhooks"]},
    {id:"oanda",name:"OANDA",market:"Forex",color:"#dc2626",desc:"Regulated forex and CFD broker. 70+ currency pairs. Professional REST API.",fields:["Account ID","API Token"],features:["70+ Forex pairs","Gold & Oil","Low spreads","Economic calendar","MT4 compatible"]},
    {id:"icmarkets",name:"IC Markets",market:"Forex",color:"#1d4ed8",desc:"ECN broker with ultra-low spreads. Professional execution. Low latency.",fields:["Account ID","API Key"],features:["Raw ECN spreads","Forex + CFDs","Crypto CFDs","cTrader API","VPS hosting"]},
    {id:"interactivebrokers",name:"Interactive Brokers",market:"All Markets",color:"#7c3aed",desc:"Professional multi-asset broker. Stocks, forex, crypto, futures, options worldwide.",fields:["Account ID","API Key"],features:["All asset classes","Global markets","Options & futures","Low margin rates","TWS API"]},
  ];
  const mC={Crypto:"#f59e0b",Stocks:C.green,Forex:C.blue,"All Markets":C.purple};
  return(<div style={{padding:24}}>
    <h2 style={{fontSize:18,fontWeight:800,color:C.text,marginBottom:6}}>🔗 Broker Connection</h2>
    <p style={{fontSize:12,color:C.text2,marginBottom:20}}>Connect your real broker to see live balance, sync positions, and execute trades from AI signals.</p>
    <div style={{background:C.blueL,border:`1px solid ${C.blueB}`,borderRadius:14,padding:20,marginBottom:22}}>
      <div style={{fontSize:13,fontWeight:700,color:C.blue,marginBottom:10}}>🚀 3-Phase Connection System</div>
      <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
        {[{t:"✅ Phase 1: Virtual Wallet",d:"Practice with $10,000 virtual funds",done:true},{t:"✅ Phase 2: Broker Connect",d:"Enter API keys to sync real account",done:true},{t:"⏳ Phase 3: Auto-Trading",d:"AI signals execute automatically",done:false}].map((p,i)=>(
          <div key={i} style={{background:"#fff",border:`1px solid ${p.done?C.blueB:C.border}`,borderRadius:10,padding:"10px 14px",flex:1,minWidth:150}}>
            <div style={{fontSize:11,fontWeight:700,color:p.done?C.blue:C.text2,marginBottom:3}}>{p.t}</div>
            <div style={{fontSize:10,color:C.text3}}>{p.d}</div>
          </div>
        ))}
      </div>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))",gap:16}}>
      {brokers.map(b=>{
        const isConn=connected[b.id];
        return(<div key={b.id} style={{background:C.card,border:`2px solid ${isConn?C.greenB:C.border}`,borderRadius:16,padding:22,boxShadow:"0 1px 4px rgba(0,0,0,0.05)",position:"relative"}}>
          {isConn&&<div style={{position:"absolute",top:14,right:14,background:C.greenL,border:`1px solid ${C.greenB}`,borderRadius:20,padding:"3px 10px",fontSize:10,color:C.green,fontWeight:700}}>✓ CONNECTED</div>}
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
            <div style={{width:44,height:44,borderRadius:12,background:`${b.color}18`,border:`1px solid ${b.color}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,fontWeight:800,color:b.color}}>{b.name[0]}</div>
            <div>
              <div style={{fontSize:14,fontWeight:800,color:C.text}}>{b.name}</div>
              <span style={{fontSize:10,color:mC[b.market]||C.text2,background:`${mC[b.market]||C.text2}18`,border:`1px solid ${mC[b.market]||C.text2}33`,padding:"1px 8px",borderRadius:4,fontWeight:600}}>{b.market}</span>
            </div>
          </div>
          <p style={{fontSize:11,color:C.text2,lineHeight:1.6,marginBottom:12}}>{b.desc}</p>
          <div style={{marginBottom:14}}>
            <div style={{fontSize:10,color:C.text3,fontWeight:600,marginBottom:6}}>FEATURES UNLOCKED:</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
              {b.features.map(f=><span key={f} style={{fontSize:9,color:C.green,background:C.greenL,border:`1px solid ${C.greenB}`,padding:"2px 7px",borderRadius:3,fontWeight:600}}>✓ {f}</span>)}
            </div>
          </div>
          {!isConn?(<div style={{display:"flex",flexDirection:"column",gap:8}}>
            {b.fields.map(f=>(
              <div key={f}><label style={{fontSize:10,fontWeight:600,color:C.text2,display:"block",marginBottom:4}}>{f.toUpperCase()}</label>
                <input type="password" placeholder={`Enter your ${f}...`} value={inputs[`${b.id}_${f}`]||""} onChange={e=>setInputs(p=>({...p,[`${b.id}_${f}`]:e.target.value}))} style={{width:"100%",border:`1px solid ${C.border}`,borderRadius:7,padding:"8px 10px",fontSize:11,color:C.text,background:"#fff",boxSizing:"border-box"}}/></div>
            ))}
            <button onClick={()=>{const ok=b.fields.every(f=>inputs[`${b.id}_${f}`]?.trim());if(ok)setConnected(p=>({...p,[b.id]:true}));}} style={{background:b.color,color:"#fff",border:"none",padding:"10px 0",borderRadius:8,fontSize:11,fontWeight:700,cursor:"pointer",marginTop:4}}>CONNECT {b.name.toUpperCase()}</button>
          </div>):(<div style={{display:"flex",flexDirection:"column",gap:8}}>
            <div style={{background:C.greenL,border:`1px solid ${C.greenB}`,borderRadius:8,padding:"10px 14px",fontSize:11,color:C.green,fontWeight:600}}>✓ Connected. Live data sync requires broker network access in production.</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              {[{l:"REAL BALANCE",v:"Sync needed"},{l:"OPEN ORDERS",v:"Sync needed"}].map(f=>(
                <div key={f.l} style={{background:"#f8fafc",border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 12px"}}>
                  <div style={{fontSize:9,color:C.text3,fontWeight:600,marginBottom:2}}>{f.l}</div>
                  <div style={{fontSize:11,fontWeight:700,color:C.text2}}>{f.v}</div>
                </div>
              ))}
            </div>
            <button onClick={()=>setConnected(p=>({...p,[b.id]:false}))} style={{background:"#fff",border:`1px solid ${C.redB}`,color:C.red,padding:"7px 0",borderRadius:7,fontSize:10,fontWeight:600,cursor:"pointer"}}>DISCONNECT</button>
          </div>)}
        </div>);
      })}
    </div>
    <div style={{marginTop:20,background:"#fff7ed",border:"1px solid #fed7aa",borderRadius:12,padding:16}}>
      <div style={{fontSize:11,fontWeight:700,color:"#c2410c",marginBottom:6}}>🔐 Security Note</div>
      <div style={{fontSize:11,color:"#9a3412",lineHeight:1.6}}>In this demo, API keys are stored in browser memory only and never transmitted. In production FDS Trading, all keys are AES-256 encrypted server-side. Always use trading-only API keys — never enable withdrawal permissions. Never share your keys with anyone.</div>
    </div>
  </div>);
}
function AlertModal({sym,currentPrice,onSave,onClose}){
  const [target,setTarget]=useState("");
  const [type,setType]=useState("ABOVE");
  return(<div style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.65)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(5px)",padding:16}}>
    <div style={{background:"#fff",borderRadius:16,width:"100%",maxWidth:380,padding:24,boxShadow:"0 24px 64px rgba(0,0,0,0.18)"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
        <div style={{fontSize:15,fontWeight:800,color:C.text}}>🔔 Set Price Alert</div>
        <button onClick={onClose} style={{background:"#fff",border:`1px solid ${C.border}`,color:C.text2,width:30,height:30,borderRadius:7,cursor:"pointer",fontSize:14}}>✕</button>
      </div>
      <div style={{background:"#f8fafc",borderRadius:10,padding:"12px 16px",marginBottom:16,display:"flex",justifyContent:"space-between"}}>
        <span style={{fontWeight:700,color:C.text,fontSize:13}}>{sym?.label}</span>
        <span style={{fontFamily:"monospace",fontWeight:700,color:C.text,fontSize:13}}>{fmtP(currentPrice||0,sym?.id||"")}</span>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
        {["ABOVE","BELOW"].map(t=>(
          <button key={t} onClick={()=>setType(t)} style={{padding:"9px 0",borderRadius:8,fontSize:12,fontWeight:700,cursor:"pointer",background:type===t?C.yellow:"#fff",color:type===t?"#fff":C.text2,border:`1px solid ${type===t?C.yellow:C.border}`}}>{t} TARGET</button>
        ))}
      </div>
      <div style={{marginBottom:16}}>
        <label style={{fontSize:11,fontWeight:600,color:C.text2,display:"block",marginBottom:5}}>Alert Price</label>
        <input value={target} onChange={e=>setTarget(e.target.value)} placeholder="Enter target price..." style={{width:"100%",border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 12px",fontSize:13,color:C.text,boxSizing:"border-box"}}/>
      </div>
      <div style={{display:"flex",gap:8}}>
        <button onClick={()=>{if(target){onSave({id:sym?.id,label:sym?.label,target,type,createdAt:new Date().toISOString()});onClose();}}} style={{flex:1,background:C.yellow,color:"#fff",border:"none",padding:"10px 0",borderRadius:8,fontSize:12,fontWeight:700,cursor:"pointer"}}>SET ALERT 🔔</button>
        <button onClick={onClose} style={{background:"#fff",border:`1px solid ${C.border}`,color:C.text2,padding:"10px 16px",borderRadius:8,fontSize:11,cursor:"pointer"}}>CANCEL</button>
      </div>
    </div>
  </div>);
}
function JournalModal({pre,onSave,onClose}){
  const [note,setNote]=useState(pre?.note||"");
  const [sl,setSl]=useState("");
  const [tp,setTp]=useState("");
  return(<div style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.65)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(5px)",padding:16}}>
    <div style={{background:"#fff",borderRadius:16,width:"100%",maxWidth:440,padding:24,boxShadow:"0 24px 64px rgba(0,0,0,0.18)"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
        <div style={{fontSize:15,fontWeight:800,color:C.text}}>📓 Log Trade</div>
        <button onClick={onClose} style={{background:"#fff",border:`1px solid ${C.border}`,color:C.text2,width:30,height:30,borderRadius:7,cursor:"pointer",fontSize:14}}>✕</button>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16,padding:"10px 14px",background:"#f8fafc",borderRadius:10,border:`1px solid ${C.border}`}}>
        <span style={{fontSize:14,fontWeight:800,color:C.text}}>{pre?.label}</span>
        <Badge sig={pre?.signal} sm={true}/>
        <span style={{fontFamily:"monospace",fontSize:13,color:C.text2,marginLeft:"auto"}}>{pfx(pre?.market||"",pre?.id||"")}{fmtP(pre?.price||0,pre?.id||"")}</span>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
        {[{l:"Stop Loss",v:sl,s:setSl},{l:"Take Profit",v:tp,s:setTp}].map(f=>(
          <div key={f.l}><label style={{fontSize:11,fontWeight:600,color:C.text2,display:"block",marginBottom:4}}>{f.l}</label>
            <input value={f.v} onChange={e=>f.s(e.target.value)} placeholder="Price level" style={{width:"100%",border:`1px solid ${C.border}`,borderRadius:7,padding:"8px 10px",fontSize:11,color:C.text,boxSizing:"border-box"}}/></div>
        ))}
      </div>
      <div style={{marginBottom:16}}>
        <label style={{fontSize:11,fontWeight:600,color:C.text2,display:"block",marginBottom:4}}>Trade Thesis &amp; Notes</label>
        <textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Why this trade? What is your edge? What levels are you watching?" rows={3} style={{width:"100%",border:`1px solid ${C.border}`,borderRadius:7,padding:"8px 10px",fontSize:11,color:C.text,resize:"vertical",boxSizing:"border-box"}}/>
      </div>
      <div style={{display:"flex",gap:8}}>
        <button onClick={()=>onSave({...pre,note,sl,tp,status:"OPEN",date:new Date().toISOString(),id:Date.now()})} style={{flex:1,background:C.blue,color:"#fff",border:"none",padding:"10px 0",borderRadius:8,fontSize:12,fontWeight:700,cursor:"pointer"}}>LOG TRADE</button>
        <button onClick={onClose} style={{background:"#fff",border:`1px solid ${C.border}`,color:C.text2,padding:"10px 16px",borderRadius:8,fontSize:11,cursor:"pointer"}}>CANCEL</button>
      </div>
    </div>
  </div>);
}
const INIT_WALLET={
  balance:10000,totalDeposited:10000,
  history:[{type:"DEPOSIT",amount:10000,note:"FDS Trading welcome virtual funds",date:new Date().toISOString()}]
};
export default function App(){
  const [nav,setNav]=useState("DASHBOARD");
  const [mkt,setMkt]=useState("CRYPTO");
  const [rk,setRk]=useState(0);
  const [aiTarget,setAiTarget]=useState(null);
  const [journal,setJournal]=useState([]);
  const [trades,setTrades]=useState([]);
  const [watchlist,setWatchlist]=useState([]);
  const [jModal,setJModal]=useState(null);
  const [tradeModal,setTradeModal]=useState(null);
  const [alertModal,setAlertModal]=useState(null);
  const [alerts,setAlerts]=useState([]);
  const [wallet,setWallet]=useState(INIT_WALLET);
  const [clock,setClock]=useState(new Date());
  useEffect(()=>{
    Object.values(INSTRUMENTS).flat().forEach(s=>initP(s.id,s.base,s.vol));
    const iv=setInterval(()=>setClock(new Date()),1000);
    return()=>clearInterval(iv);
  },[]);
  const deposit=amt=>setWallet(w=>({...w,balance:w.balance+amt,totalDeposited:w.totalDeposited+amt,history:[...w.history,{type:"DEPOSIT",amount:amt,note:"Manual deposit",date:new Date().toISOString()}]}));
  const withdraw=amt=>setWallet(w=>({...w,balance:w.balance-amt,history:[...w.history,{type:"WITHDRAW",amount:-amt,note:"Manual withdrawal",date:new Date().toISOString()}]}));
  const placeTrade=trade=>{
    if(trade.invested>wallet.balance)return;
    setWallet(w=>({...w,balance:w.balance-trade.invested,history:[...w.history,{type:"TRADE_OPEN",amount:-trade.invested,note:`${trade.direction} ${trade.label}`,date:new Date().toISOString()}]}));
    setTrades(ts=>[...ts,trade]);
  };
  const closeTrade=(tradeId,livePnl)=>{
    const t=trades.find(x=>x.tradeId===tradeId);if(!t)return;
    const returned=t.invested+(livePnl||0);
    setWallet(w=>({...w,balance:w.balance+returned,history:[...w.history,{type:"TRADE_CLOSE",amount:returned,note:`Closed ${t.label} P&L: ${livePnl>=0?"+":""}$${(livePnl||0).toFixed(2)}`,date:new Date().toISOString()}]}));
    setTrades(ts=>ts.map(x=>x.tradeId===tradeId?{...x,status:"CLOSED",pnl:livePnl||0,closeDate:new Date().toISOString()}:x));
  };
  const handleAnalyse=(sym,market,data)=>setAiTarget({sym,market,data});
  const handleWatch=sym=>setWatchlist(w=>w.includes(sym.id)?w.filter(x=>x!==sym.id):[...w,sym.id]);
  const handleLog=(sym,market,signal,price)=>setJModal({id:sym.id,label:sym.label,market,signal,price,note:""});
  const handleSaveJournal=entry=>{setJournal(j=>[...j,entry]);setJModal(null);};
  const handleJournalUpdate=(id,patch)=>setJournal(j=>j.map(e=>e.id===id?{...e,...patch}:e));
  const handleJournalDelete=id=>setJournal(j=>j.filter(e=>e.id!==id));
  const handleSaveFromAI=(sym,market,sig,price,text)=>{setJModal({id:sym.id,label:sym.label,market,signal:sig,price,note:text.slice(0,300)});setAiTarget(null);};
  const handleTrade=(sym,market,sig,price,ind)=>setTradeModal({id:sym.id,label:sym.label,market,signal:sig,price,ind});
  const handleAlert=(sym,price)=>setAlertModal({sym,price});
  const handleSaveAlert=alert=>{setAlerts(a=>[...a,alert]);setAlertModal(null);};
  const syms=INSTRUMENTS[mkt]||[];
  const openTrades=trades.filter(t=>t.status==="OPEN").length;
  const avail=wallet.balance-trades.filter(t=>t.status==="OPEN").reduce((a,t)=>a+(t.invested||0),0);
  return(<div style={{minHeight:"100vh",background:C.bg,color:C.text,fontFamily:"'DM Sans',-apple-system,BlinkMacSystemFont,sans-serif",display:"flex"}}>
    <style>{"@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap');*{box-sizing:border-box;margin:0;padding:0}::-webkit-scrollbar{width:5px;height:5px}::-webkit-scrollbar-track{background:#f1f5f9}::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:4px}@keyframes pulse{0%,100%{opacity:.5}50%{opacity:1}}@keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}@keyframes slideIn{from{opacity:0;transform:translateX(8px)}to{opacity:1;transform:translateX(0)}}button,input,textarea,select{font-family:inherit;outline:none}select option{background:#fff}input:focus,textarea:focus,select:focus{border-color:#2563eb!important;box-shadow:0 0 0 3px rgba(37,99,235,0.1)}"}</style>
    <div style={{width:220,minHeight:"100vh",background:C.nav,display:"flex",flexDirection:"column",flexShrink:0,boxShadow:"2px 0 12px rgba(0,0,0,0.12)"}}>
      <div style={{padding:"22px 18px",borderBottom:"1px solid rgba(255,255,255,0.07)"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:38,height:38,borderRadius:10,background:"linear-gradient(135deg,#3b82f6,#1d4ed8)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,fontWeight:900,color:"#fff",boxShadow:"0 0 14px rgba(59,130,246,0.4)"}}>F</div>
          <div>
            <div style={{fontSize:14,fontWeight:900,color:"#fff",letterSpacing:"0.04em"}}>FDS <span style={{color:"#60a5fa"}}>TRADING</span></div>
            <div style={{fontSize:8,color:"rgba(255,255,255,0.35)",letterSpacing:"0.12em"}}>AI PLATFORM v3</div>
          </div>
        </div>
      </div>
      <div style={{padding:"12px 14px",borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
        <div style={{background:"rgba(255,255,255,0.07)",borderRadius:10,padding:"10px 14px"}}>
          <div style={{fontSize:9,color:"rgba(255,255,255,0.45)",letterSpacing:"0.1em",marginBottom:4}}>VIRTUAL BALANCE</div>
          <div style={{fontSize:17,fontWeight:800,color:"#fff",fontFamily:"monospace"}}>${wallet.balance.toLocaleString("en-US",{minimumFractionDigits:0,maximumFractionDigits:0})}</div>
          <div style={{fontSize:9,color:"#86efac",marginTop:2}}>Available: ${avail.toFixed(0)}</div>
        </div>
      </div>
      <nav style={{flex:1,padding:"8px 10px",overflowY:"auto"}}>
        {NAV_ITEMS.map(item=>(
          <button key={item} onClick={()=>setNav(item)} style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"9px 12px",borderRadius:8,border:"none",background:nav===item?"rgba(59,130,246,0.18)":"transparent",color:nav===item?"#93c5fd":"rgba(255,255,255,0.55)",cursor:"pointer",fontSize:12,fontWeight:nav===item?700:500,marginBottom:2,textAlign:"left",transition:"all 0.15s",position:"relative"}}>
            <span style={{fontSize:15}}>{NAV_ICONS[item]}</span>{item}
            {item==="TRADES"&&openTrades>0&&<span style={{position:"absolute",right:10,background:"#f59e0b",color:"#000",borderRadius:"50%",width:18,height:18,fontSize:9,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800}}>{openTrades}</span>}
            {item==="JOURNAL"&&journal.length>0&&<span style={{position:"absolute",right:10,background:"#3b82f6",color:"#fff",borderRadius:"50%",width:18,height:18,fontSize:9,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800}}>{journal.length}</span>}
            {item==="SCANNER"&&alerts.length>0&&<span style={{position:"absolute",right:10,background:"#f59e0b",color:"#000",borderRadius:"50%",width:18,height:18,fontSize:9,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800}}>{alerts.length}</span>}
          </button>
        ))}
      </nav>
      <div style={{padding:"14px 16px",borderTop:"1px solid rgba(255,255,255,0.06)"}}>
        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:5}}>
          <div style={{width:7,height:7,borderRadius:"50%",background:"#22c55e",animation:"pulse 2s ease infinite"}}/>
          <span style={{fontSize:10,color:"rgba(255,255,255,0.45)"}}>{clock.toLocaleTimeString()}</span>
        </div>
        <div style={{fontSize:8,color:"rgba(255,255,255,0.2)",lineHeight:1.4}}>NOT FINANCIAL ADVICE</div>
      </div>
    </div>
    <div style={{flex:1,display:"flex",flexDirection:"column",minHeight:"100vh",overflow:"auto"}}>
      <div style={{background:"#fff",borderBottom:`1px solid ${C.border}`,padding:"12px 22px",display:"flex",justifyContent:"space-between",alignItems:"center",boxShadow:"0 1px 3px rgba(0,0,0,0.04)",flexShrink:0}}>
        <div>
          <div style={{fontSize:16,fontWeight:800,color:C.text}}>{NAV_ICONS[nav]} {nav}</div>
          <div style={{fontSize:11,color:C.text3}}>FDS Trading · AI-Powered Platform v3</div>
        </div>
        {nav==="MARKETS"&&(<div style={{display:"flex",alignItems:"center",gap:8}}>
          {["CRYPTO","STOCKS","FOREX"].map(t=>(
            <button key={t} onClick={()=>setMkt(t)} style={{background:mkt===t?C.blue:"#fff",color:mkt===t?"#fff":C.text2,border:`1px solid ${mkt===t?C.blue:C.border}`,padding:"6px 14px",borderRadius:7,fontSize:11,fontWeight:700,cursor:"pointer"}}>{t} ({INSTRUMENTS[t].length})</button>
          ))}
          <button onClick={()=>setRk(k=>k+1)} style={{background:"#fff",border:`1px solid ${C.border}`,color:C.text2,padding:"6px 12px",borderRadius:7,fontSize:11,cursor:"pointer"}}>⟳ Refresh</button>
        </div>)}
      </div>
      <div style={{flex:1,animation:"fadeIn 0.25s ease"}}>
        {nav==="DASHBOARD"&&<Dashboard wallet={wallet} trades={trades} journal={journal} alerts={alerts} onNav={setNav}/>}
        {nav==="MARKETS"&&(<div key={`${mkt}-${rk}`} style={{padding:18,display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(278px,1fr))",gap:14}}>
          {syms.map((sym,i)=>(<div key={`${sym.id}-${rk}`} style={{animation:`slideIn 0.3s ${i*0.03}s ease both`}}>
            <MarketCard sym={sym} market={mkt} onAnalyse={handleAnalyse} onWatch={handleWatch} watched={watchlist.includes(sym.id)} onTrade={handleTrade} hasBalance={wallet.balance>0} onAlert={handleAlert}/>
          </div>))}
        </div>)}
        {nav==="SCANNER"&&<Scanner onAnalyse={handleAnalyse} onTrade={handleTrade} wallet={wallet}/>}
        {nav==="CHARTS"&&<ChartsView/>}
        {nav==="WALLET"&&<WalletView wallet={wallet} onDeposit={deposit} onWithdraw={withdraw} trades={trades}/>}
        {nav==="TRADES"&&<TradesView trades={trades} onCloseTrade={closeTrade}/>}
        {nav==="JOURNAL"&&<JournalView entries={journal} onDelete={handleJournalDelete} onUpdate={handleJournalUpdate}/>}
        {nav==="PORTFOLIO"&&<PortfolioView journal={journal} trades={trades}/>}
        {nav==="RISK"&&<RiskView wallet={wallet}/>}
        {nav==="SENTIMENT"&&<SentimentView key="sent"/>}
        {nav==="BROKER"&&<BrokerView/>}
      </div>
      <div style={{padding:"10px 22px",borderTop:`1px solid ${C.border}`,background:"#fff",fontSize:9,color:C.text3,textAlign:"center"}}>FDS TRADING · AI-POWERED PLATFORM · VIRTUAL TRADING ONLY · NOT FINANCIAL ADVICE</div>
    </div>
    {aiTarget&&<AIPanel target={aiTarget} onClose={()=>setAiTarget(null)} onJournal={handleSaveFromAI} onTrade={handleTrade}/>}
    {jModal&&<JournalModal pre={jModal} onSave={handleSaveJournal} onClose={()=>setJModal(null)}/>}
    {tradeModal&&<TradeModal pre={tradeModal} wallet={wallet} onPlace={placeTrade} onClose={()=>setTradeModal(null)}/>}
    {alertModal&&<AlertModal sym={alertModal.sym} currentPrice={alertModal.price} onSave={handleSaveAlert} onClose={()=>setAlertModal(null)}/>}
  </div>);
}
