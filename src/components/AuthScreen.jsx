import React, { useState } from "react";
import { C } from "../lib/constants";
import { supabase } from "../lib/supabase";

export default function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState("login"); // login | register
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");

  async function handleSubmit() {
    if (!email.trim() || !password.trim()) return;
    setLoading(true);
    setErr("");
    setInfo("");

    try {
      if (mode === "login") {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        onAuth(data.user, data.session);
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { display_name: name.trim() || email.split("@")[0] } },
        });
        if (error) throw error;
        if (data?.user?.identities?.length === 0) {
          setErr("An account with this email already exists. Please log in.");
        } else {
          setInfo(
            "Account created! Please check your email to confirm your address, then log in. " +
            "Note: your account needs admin approval before you can trade. " +
            "The admin will be notified."
          );
          setMode("login");
        }
      }
    } catch (e) {
      setErr(e?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    if (!email.trim()) { setErr("Enter your email first, then click Forgot Password."); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
      if (error) throw error;
      setInfo("Password reset email sent. Check your inbox.");
    } catch (e) {
      setErr(e?.message || "Failed to send reset email.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: C.nav, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, background: "linear-gradient(135deg,#3b82f6,#1d4ed8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, fontWeight: 900, color: "#fff", margin: "0 auto 14px" }}>
            F
          </div>
          <div style={{ fontSize: 24, fontWeight: 900, color: "#fff" }}>
            FDS <span style={{ color: "#60a5fa" }}>TRADING</span>
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", letterSpacing: "0.15em", marginTop: 4 }}>
            AI-POWERED TRADING PLATFORM
          </div>
        </div>

        {/* Card */}
        <div style={{ background: "#fff", borderRadius: 18, padding: 28, boxShadow: "0 24px 64px rgba(0,0,0,0.3)" }}>
          {/* Tabs */}
          <div style={{ display: "flex", gap: 6, marginBottom: 24, background: "#f1f5f9", borderRadius: 10, padding: 4 }}>
            {[["login", "Sign In"], ["register", "Create Account"]].map(([m, label]) => (
              <button
                key={m}
                onClick={() => { setMode(m); setErr(""); setInfo(""); }}
                style={{ flex: 1, padding: "9px 0", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", background: mode === m ? "#fff" : "transparent", color: mode === m ? C.text : C.text3, border: "none", boxShadow: mode === m ? "0 1px 3px rgba(0,0,0,0.1)" : "none" }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Fields */}
          {mode === "register" && (
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: C.text2, display: "block", marginBottom: 5 }}>DISPLAY NAME</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                style={{ width: "100%", border: `1px solid ${C.border}`, borderRadius: 9, padding: "11px 14px", fontSize: 13, boxSizing: "border-box" }}
              />
            </div>
          )}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: C.text2, display: "block", marginBottom: 5 }}>EMAIL</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              style={{ width: "100%", border: `1px solid ${C.border}`, borderRadius: 9, padding: "11px 14px", fontSize: 13, boxSizing: "border-box" }}
            />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: C.text2, display: "block", marginBottom: 5 }}>PASSWORD</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 8 characters"
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              style={{ width: "100%", border: `1px solid ${C.border}`, borderRadius: 9, padding: "11px 14px", fontSize: 13, boxSizing: "border-box" }}
            />
          </div>

          {err && (
            <div style={{ background: C.redL, border: `1px solid ${C.redB}`, color: C.red, borderRadius: 9, padding: "10px 14px", fontSize: 12, marginBottom: 14 }}>
              {err}
            </div>
          )}
          {info && (
            <div style={{ background: C.greenL, border: `1px solid ${C.greenB}`, color: C.green, borderRadius: 9, padding: "10px 14px", fontSize: 12, marginBottom: 14, lineHeight: 1.6 }}>
              {info}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading || !email.trim() || !password.trim()}
            style={{ width: "100%", background: C.blue, color: "#fff", border: "none", padding: "13px 0", borderRadius: 10, fontSize: 14, fontWeight: 800, cursor: loading ? "wait" : "pointer", opacity: loading ? 0.7 : 1, marginBottom: 12 }}
          >
            {loading ? "Please wait..." : mode === "login" ? "SIGN IN" : "CREATE ACCOUNT"}
          </button>

          {mode === "login" && (
            <button
              onClick={handleForgotPassword}
              style={{ width: "100%", background: "none", border: "none", color: C.text3, fontSize: 11, cursor: "pointer", padding: 0 }}
            >
              Forgot password?
            </button>
          )}

          {mode === "register" && (
            <div style={{ fontSize: 10, color: C.text3, textAlign: "center", lineHeight: 1.6, marginTop: 8 }}>
              New accounts require admin approval before trading is enabled. You will receive an email once approved.
            </div>
          )}
        </div>

        <div style={{ textAlign: "center", marginTop: 18, fontSize: 10, color: "rgba(255,255,255,0.25)" }}>
          FDS Trading · Frankev Digital Services · NOT FINANCIAL ADVICE
        </div>
      </div>
    </div>
  );
}
