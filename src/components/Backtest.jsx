import React, { useState } from "react";
import { C, INSTRUMENTS } from "../lib/constants";
import { getIndFromCandles, calcSigWithReason, calcTradeLevels } from "../lib/indicators";

const REST_BASE = "https://api.binance.com";
const INTERVALS = ["1h", "4h", "1d"];

async function fetchHistory(binanceSymbol, interval, limit = 500) {
  const r = await fetch(`${REST_BASE}/api/v3/klines?symbol=${binanceSymbol}&interval=${interval}&limit=${limit}`);
  if (!r.ok) throw new Error(`Klines error ${r.status}`);
  const raw = await r.json();
  return raw.map((k) => ({ t: k[0], o: parseFloat(k[1]), h: parseFloat(k[2]), l: parseFloat(k[3]), c: parseFloat(k[4]), v: parseFloat(k[5]) }));
}

function runBacktest(candles, params) {
  const { slMultiplier, tp1Multiplier, tp2Multiplier, minConfidence } = params;
  const trades = [];
  const LOOKBACK = 30;

  for (let i = LOOKBACK; i < candles.length - 5; i++) {
    const slice = candles.slice(0, i + 1);
    const ind = getIndFromCandles(slice);
    if (!ind || !ind.atr) continue;

    const { signal, bull, bear } = calcSigWithReason(ind);
    if (signal === "HOLD") continue;

    // Estimate confidence
    const total = bull + bear;
    const confidence = total > 0 ? Math.round((Math.abs(bull - bear) / total) * 100) : 0;
    if (confidence < minConfidence) continue;

    const isBuy = signal.includes("BUY");
    const entry = candles[i].c;
    const sl = isBuy ? entry - ind.atr * slMultiplier : entry + ind.atr * slMultiplier;
    const tp1 = isBuy ? entry + ind.atr * tp1Multiplier : entry - ind.atr * tp1Multiplier;
    const tp2 = isBuy ? entry + ind.atr * tp2Multiplier : entry - ind.atr * tp2Multiplier;

    // Simulate the next 5 candles to see outcome
    let result = "OPEN";
    let exitPrice = null;
    let exitCandle = null;

    for (let j = i + 1; j < Math.min(i + 6, candles.length); j++) {
      const c = candles[j];
      if (isBuy) {
        if (c.l <= sl) { result = "SL"; exitPrice = sl; exitCandle = j; break; }
        if (c.h >= tp2) { result = "TP2"; exitPrice = tp2; exitCandle = j; break; }
        if (c.h >= tp1) { result = "TP1"; exitPrice = tp1; exitCandle = j; break; }
      } else {
        if (c.h >= sl) { result = "SL"; exitPrice = sl; exitCandle = j; break; }
        if (c.l <= tp2) { result = "TP2"; exitPrice = tp2; exitCandle = j; break; }
        if (c.l <= tp1) { result = "TP1"; exitPrice = tp1; exitCandle = j; break; }
      }
    }

    if (result === "OPEN") continue; // skip inconclusive

    const pnlPct = ((exitPrice - entry) / entry) * (isBuy ? 1 : -1) * 100;
    const rr = result === "SL" ? -(slMultiplier) : result === "TP2" ? tp2Multiplier / slMultiplier : tp1Multiplier / slMultiplier;

    trades.push({
      i,
      signal,
      confidence,
      entry,
      sl,
      tp1,
      tp2,
      exitPrice,
      result,
      pnlPct,
      rr,
      date: new Date(candles[i].t).toLocaleDateString(),
    });
  }

  return trades;
}

function summarize(trades) {
  if (trades.length === 0) return null;
  const wins = trades.filter((t) => t.result !== "SL");
  const losses = trades.filter((t) => t.result === "SL");
  const totalPnl = trades.reduce((a, t) => a + t.pnlPct, 0);
  const winRate = (wins.length / trades.length) * 100;
  const avgWin = wins.length ? wins.reduce((a, t) => a + t.pnlPct, 0) / wins.length : 0;
  const avgLoss = losses.length ? Math.abs(losses.reduce((a, t) => a + t.pnlPct, 0) / losses.length) : 0;
  const rr = avgLoss > 0 ? (avgWin / avgLoss) : 0;

  // Max drawdown
  let peak = 0, balance = 0, maxDD = 0;
  for (const t of trades) {
    balance += t.pnlPct;
    if (balance > peak) peak = balance;
    const dd = peak - balance;
    if (dd > maxDD) maxDD = dd;
  }

  return { total: trades.length, wins: wins.length, losses: losses.length, winRate, avgWin, avgLoss, rr, totalPnl, maxDD };
}

export default function Backtest() {
  const [symbol, setSymbol] = useState("BTCUSDT");
  const [interval, setInterval] = useState("1h");
  const [minConf, setMinConf] = useState(60);
  const [slMult, setSlMult] = useState(1.5);
  const [tp1Mult, setTp1Mult] = useState(1.5);
  const [tp2Mult, setTp2Mult] = useState(3);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [trades, setTrades] = useState([]);
  const [error, setError] = useState("");

  async function runTest() {
    setRunning(true);
    setError("");
    setResult(null);
    setTrades([]);
    try {
      const candles = await fetchHistory(symbol, interval, 500);
      const allTrades = runBacktest(candles, {
        slMultiplier: slMult,
        tp1Multiplier: tp1Mult,
        tp2Multiplier: tp2Mult,
        minConfidence: minConf,
      });
      setTrades(allTrades);
      setResult(summarize(allTrades));
    } catch (e) {
      setError(e?.message || "Backtest failed");
    } finally {
      setRunning(false);
    }
  }

  const getColor = (v, good) => (v >= good ? C.green : v >= good * 0.7 ? C.yellow : C.red);

  return (
    <div style={{ padding: "14px 14px" }}>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: C.text, marginBottom: 4 }}>📊 Strategy Backtester</div>
        <div style={{ fontSize: 11, color: C.text3 }}>
          Tests the signal engine against real Binance historical data. Tells you the actual win rate and R:R before trading with real money.
        </div>
      </div>

      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 18, marginBottom: 18 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12, marginBottom: 14 }}>
          <div>
            <label style={{ fontSize: 10, color: C.text2, fontWeight: 600, display: "block", marginBottom: 4 }}>SYMBOL</label>
            <select value={symbol} onChange={(e) => setSymbol(e.target.value)} style={{ width: "100%", border: `1px solid ${C.border}`, borderRadius: 7, padding: "8px 10px", fontSize: 12 }}>
              {INSTRUMENTS.CRYPTO.map((s) => (
                <option key={s.binanceSymbol} value={s.binanceSymbol}>{s.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 10, color: C.text2, fontWeight: 600, display: "block", marginBottom: 4 }}>TIMEFRAME</label>
            <select value={interval} onChange={(e) => setInterval(e.target.value)} style={{ width: "100%", border: `1px solid ${C.border}`, borderRadius: 7, padding: "8px 10px", fontSize: 12 }}>
              {INTERVALS.map((i) => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 10, color: C.text2, fontWeight: 600, display: "block", marginBottom: 4 }}>MIN CONFIDENCE: {minConf}%</label>
            <input type="range" min={40} max={90} step={5} value={minConf} onChange={(e) => setMinConf(Number(e.target.value))} style={{ width: "100%", accentColor: C.blue }} />
          </div>
          <div>
            <label style={{ fontSize: 10, color: C.text2, fontWeight: 600, display: "block", marginBottom: 4 }}>SL: {slMult}x ATR</label>
            <input type="range" min={1} max={3} step={0.5} value={slMult} onChange={(e) => setSlMult(Number(e.target.value))} style={{ width: "100%", accentColor: C.red }} />
          </div>
          <div>
            <label style={{ fontSize: 10, color: C.text2, fontWeight: 600, display: "block", marginBottom: 4 }}>TP1: {tp1Mult}x ATR</label>
            <input type="range" min={1} max={4} step={0.5} value={tp1Mult} onChange={(e) => setTp1Mult(Number(e.target.value))} style={{ width: "100%", accentColor: C.green }} />
          </div>
          <div>
            <label style={{ fontSize: 10, color: C.text2, fontWeight: 600, display: "block", marginBottom: 4 }}>TP2: {tp2Mult}x ATR</label>
            <input type="range" min={2} max={6} step={0.5} value={tp2Mult} onChange={(e) => setTp2Mult(Number(e.target.value))} style={{ width: "100%", accentColor: C.green }} />
          </div>
        </div>

        <button
          onClick={runTest}
          disabled={running}
          style={{ background: C.blue, color: "#fff", border: "none", padding: "11px 24px", borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: running ? "wait" : "pointer", opacity: running ? 0.7 : 1 }}
        >
          {running ? "⏳ Running backtest on 500 candles..." : "▶ RUN BACKTEST"}
        </button>
      </div>

      {error && (
        <div style={{ background: C.redL, border: `1px solid ${C.redB}`, color: C.red, borderRadius: 10, padding: "10px 14px", marginBottom: 14, fontSize: 12 }}>
          {error}
        </div>
      )}

      {result && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12, marginBottom: 18 }}>
            {[
              { l: "Total Signals", v: result.total, c: C.blue },
              { l: "Win Rate", v: `${result.winRate.toFixed(1)}%`, c: getColor(result.winRate, 55) },
              { l: "R:R Ratio", v: `1:${result.rr.toFixed(2)}`, c: getColor(result.rr, 1.5) },
              { l: "Total P&L", v: `${result.totalPnl >= 0 ? "+" : ""}${result.totalPnl.toFixed(2)}%`, c: result.totalPnl >= 0 ? C.green : C.red },
              { l: "Avg Win", v: `+${result.avgWin.toFixed(2)}%`, c: C.green },
              { l: "Avg Loss", v: `-${result.avgLoss.toFixed(2)}%`, c: C.red },
              { l: "Max Drawdown", v: `-${result.maxDD.toFixed(2)}%`, c: result.maxDD < 10 ? C.green : result.maxDD < 20 ? C.yellow : C.red },
              { l: "Wins / Losses", v: `${result.wins} / ${result.losses}`, c: C.text },
            ].map((s) => (
              <div key={s.l} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px" }}>
                <div style={{ fontSize: 9, color: C.text3, marginBottom: 3 }}>{s.l}</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: s.c }}>{s.v}</div>
              </div>
            ))}
          </div>

          <div style={{ background: C.blueL, border: `1px solid ${C.blueB}`, borderRadius: 10, padding: "12px 16px", marginBottom: 18, fontSize: 12, color: C.blue, lineHeight: 1.7 }}>
            <b>Verdict:</b>{" "}
            {result.winRate >= 55 && result.rr >= 1.5
              ? "✅ Strong setup — win rate and R:R are both positive. This strategy has positive expected value."
              : result.winRate >= 50 && result.rr >= 1.2
              ? "⚠️ Acceptable setup — profitable but borderline. Increase confidence threshold or ATR multipliers."
              : "❌ Unprofitable on this symbol/timeframe combination. Try different parameters or timeframe."}
            {" "}Expected value per trade: <b>{((result.winRate / 100) * result.avgWin - ((100 - result.winRate) / 100) * result.avgLoss).toFixed(2)}%</b>
          </div>

          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden" }}>
            <div style={{ padding: "10px 16px", borderBottom: `1px solid ${C.border}`, fontSize: 12, fontWeight: 700, color: C.text }}>
              Recent Signals ({trades.length} total, showing last 20)
            </div>
            {trades.slice(-20).reverse().map((t, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 16px", borderBottom: `1px solid ${C.border}`, fontSize: 11 }}>
                <span style={{ color: C.text3, width: 80 }}>{t.date}</span>
                <span style={{ color: t.signal.includes("BUY") ? C.green : C.red, fontWeight: 700, width: 100 }}>{t.signal.replace("_", " ")}</span>
                <span style={{ color: C.text2 }}>Conf {t.confidence}%</span>
                <span style={{ color: t.result === "SL" ? C.red : C.green, fontWeight: 700 }}>{t.result}</span>
                <span style={{ color: t.pnlPct >= 0 ? C.green : C.red, fontWeight: 700 }}>
                  {t.pnlPct >= 0 ? "+" : ""}{t.pnlPct.toFixed(2)}%
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
