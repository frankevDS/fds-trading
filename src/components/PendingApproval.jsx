import React from "react";
import { C } from "../lib/constants";
import { supabase } from "../lib/supabase";

export default function PendingApproval({ user }) {
  return (
    <div style={{ minHeight: "100vh", background: C.nav, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 420, textAlign: "center" }}>
        <div style={{ width: 64, height: 64, borderRadius: 18, background: "linear-gradient(135deg,#3b82f6,#1d4ed8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, fontWeight: 900, color: "#fff", margin: "0 auto 20px" }}>
          F
        </div>
        <div style={{ fontSize: 22, fontWeight: 900, color: "#fff", marginBottom: 6 }}>
          FDS <span style={{ color: "#60a5fa" }}>TRADING</span>
        </div>
        <div style={{ background: "#fff", borderRadius: 18, padding: 28, marginTop: 24, boxShadow: "0 24px 64px rgba(0,0,0,0.3)" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>⏳</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: C.text, marginBottom: 8 }}>Awaiting Admin Approval</div>
          <div style={{ fontSize: 12, color: C.text2, lineHeight: 1.7, marginBottom: 20 }}>
            Your account (<b>{user?.email}</b>) has been created successfully. The admin needs to approve your access before you can start trading. You will receive an email once your account is activated.
          </div>
          <div style={{ background: C.blueL, border: `1px solid ${C.blueB}`, borderRadius: 9, padding: "10px 14px", fontSize: 11, color: C.blue, marginBottom: 20, lineHeight: 1.6 }}>
            If you've been waiting more than 24 hours, contact the admin directly at frankevgloballtd@gmail.com
          </div>
          <button
            onClick={() => supabase.auth.signOut()}
            style={{ background: "#fff", color: C.text2, border: `1px solid ${C.border}`, padding: "10px 22px", borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: "pointer" }}
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
