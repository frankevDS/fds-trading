// FDS Trading - AI signal analysis proxy
//
// Supports two providers - the browser never sees either key:
//   - Anthropic (Claude) - paid, set ANTHROPIC_API_KEY
//   - Groq (free, no credit card, runs open models like Llama) - set GROQ_API_KEY
//
// Which one is used:
//   - If AI_PROVIDER is set to "anthropic" or "groq", that wins.
//   - Otherwise: ANTHROPIC_API_KEY is used if present, else GROQ_API_KEY.
// Set these in Vercel > Project > Settings > Environment Variables (or in a
// local .env when running `vercel dev`) - see README.md.

import { checkOrigin, rateLimit } from "./_security.js";

const GROQ_MODEL = "llama-3.3-70b-versatile";
const ANTHROPIC_MODEL = "claude-sonnet-4-6";
const MAX_PROMPT_LENGTH = 4000;

function pickProvider() {
  const forced = (process.env.AI_PROVIDER || "").toLowerCase();
  if (forced === "anthropic" || forced === "groq") return forced;
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.GROQ_API_KEY) return "groq";
  return null;
}

async function callAnthropic(prompt) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data?.error?.message || "Anthropic API returned an error");
  return (data.content || []).map((b) => b.text || "").join("");
}

async function callGroq(prompt) {
  const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data?.error?.message || "Groq API returned an error");
  return data?.choices?.[0]?.message?.content || "";
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  if (!checkOrigin(req)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  if (!rateLimit(req, { windowMs: 60000, max: 15 })) {
    res.status(429).json({ error: "Too many requests - please wait a moment and try again." });
    return;
  }

  const provider = pickProvider();
  if (!provider) {
    res.status(500).json({
      error:
        "No AI key configured. Add ANTHROPIC_API_KEY or GROQ_API_KEY (Groq is free) under Vercel > Project > Settings > Environment Variables, then redeploy.",
    });
    return;
  }

  const { prompt } = req.body || {};
  if (!prompt || typeof prompt !== "string") {
    res.status(400).json({ error: "Missing prompt" });
    return;
  }
  if (prompt.length > MAX_PROMPT_LENGTH) {
    res.status(400).json({ error: "Prompt too long" });
    return;
  }

  try {
    const text = provider === "groq" ? await callGroq(prompt) : await callAnthropic(prompt);
    res.status(200).json({ text, provider });
  } catch (err) {
    res.status(500).json({ error: err?.message || "Unknown server error" });
  }
}
