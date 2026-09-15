import { checkOrigin, rateLimit } from "./_security.js";

// Model fallback chain - if one is deprecated, next is tried automatically
const GROQ_MODELS = [
  "openai/gpt-oss-120b",
  "qwen/qwen3.6-27b",
  "qwen/qwen3-32b",
  "openai/gpt-oss-20b",
  "meta-llama/llama-4-scout-17b-16e-instruct",
  "llama3-70b-8192",
  "llama3-8b-8192",
];

const MODEL_ERROR_PHRASES = [
  "does not exist", "model_not_found", "model not found",
  "do not have access", "decommissioned", "deprecated",
  "not available", "invalid model",
];

function isModelError(msg) {
  const l = (msg || "").toLowerCase();
  return MODEL_ERROR_PHRASES.some((e) => l.includes(e));
}

async function callGroq(apiKey, prompt) {
  const preferModel = process.env.GROQ_MODEL || null;
  const models = preferModel
    ? [preferModel, ...GROQ_MODELS.filter((m) => m !== preferModel)]
    : GROQ_MODELS;

  let lastError = null;
  for (const model of models) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model, max_tokens: 1200, temperature: 0.3,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const errMsg = data?.error?.message || `HTTP ${res.status}`;
        if (isModelError(errMsg)) { lastError = errMsg; continue; }
        throw new Error(errMsg);
      }
      const text = data?.choices?.[0]?.message?.content || "";
      if (!text) throw new Error("Empty response");
      return { text, model, provider: "groq" };
    } catch (e) {
      if (isModelError(e?.message)) { lastError = e.message; continue; }
      throw e;
    }
  }
  throw new Error(`All Groq models unavailable. Last: ${lastError}`);
}

async function callAnthropic(apiKey, prompt) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1200, messages: [{ role: "user", content: prompt }] }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || `Anthropic HTTP ${res.status}`);
  const text = data?.content?.[0]?.text || "";
  if (!text) throw new Error("Empty response from Anthropic");
  return { text, model: "claude-sonnet-4-6", provider: "anthropic" };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!checkOrigin(req)) return res.status(403).json({ error: "Forbidden" });
  if (!rateLimit(req, { windowMs: 60000, max: 20 })) return res.status(429).json({ error: "Too many requests" });

  const { prompt } = req.body || {};
  if (!prompt || typeof prompt !== "string" || prompt.length > 8000)
    return res.status(400).json({ error: "Invalid prompt" });

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const groqKey      = process.env.GROQ_API_KEY;
  const forceGroq    = process.env.AI_PROVIDER === "groq";

  try {
    let result;
    if (anthropicKey && !forceGroq) {
      result = await callAnthropic(anthropicKey, prompt);
    } else if (groqKey) {
      result = await callGroq(groqKey, prompt);
    } else {
      return res.status(500).json({ error: "No AI key configured. Add GROQ_API_KEY or ANTHROPIC_API_KEY in Vercel." });
    }
    return res.status(200).json({ text: result.text, model: result.model, provider: result.provider });
  } catch (err) {
    console.error("analyze error:", err?.message);
    return res.status(500).json({ error: err?.message || "AI analysis failed" });
  }
}
