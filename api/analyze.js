// FDS Trading - AI Analysis proxy with dynamic Groq model discovery
//
// Uses Groq's /v1/models endpoint to discover what models are currently
// available on your account - completely auto-updating, never breaks on
// model deprecation again.
//
// Model selection priority:
// 1. GROQ_MODEL env var if set (manual override)
// 2. Largest available chat model from live Groq models API
// 3. Static fallback list if API call fails

import { checkOrigin, rateLimit } from "./_security.js";

// Static fallback list - used only if Groq models API is unreachable
const FALLBACK_MODELS = [
  "llama-3.3-70b-versatile",
  "llama-3.1-70b-versatile",
  "llama3-70b-8192",
  "llama3-8b-8192",
  "gemma2-9b-it",
  "mixtral-8x7b-32768",
];

// Cache discovered models for 1 hour to avoid querying on every request
let modelCache = null;
let modelCacheTime = 0;
const MODEL_CACHE_TTL = 60 * 60 * 1000;

async function getAvailableModels(apiKey) {
  const now = Date.now();

  // Return override if set
  const override = process.env.GROQ_MODEL;
  if (override) return [override, ...FALLBACK_MODELS];

  // Return cached if fresh
  if (modelCache && now - modelCacheTime < MODEL_CACHE_TTL) {
    return modelCache;
  }

  try {
    const r = await fetch("https://api.groq.com/openai/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(5000),
    });

    if (!r.ok) {
      console.warn("Groq models API returned:", r.status);
      return FALLBACK_MODELS;
    }

    const data = await r.json();
    const models = (data.data || [])
      .filter((m) => {
        const id = m.id || "";
        // Keep only text chat models, exclude audio/image/embedding/guard models
        return (
          m.active !== false &&
          !id.includes("tts") &&
          !id.includes("whisper") &&
          !id.includes("guard") &&
          !id.includes("embed") &&
          !id.includes("vision") &&
          !id.includes("image")
        );
      })
      .sort((a, b) => {
        // Prefer larger context window and newer models
        const cw = (b.context_window || 0) - (a.context_window || 0);
        if (cw !== 0) return cw;
        return (b.id > a.id ? 1 : -1);
      })
      .map((m) => m.id);

    if (models.length > 0) {
      console.log(`Groq: discovered ${models.length} models. Using: ${models[0]}`);
      modelCache = models;
      modelCacheTime = now;
      return models;
    }
  } catch (e) {
    console.warn("Groq models discovery failed:", e?.message);
  }

  return FALLBACK_MODELS;
}

async function callGroq(apiKey, prompt) {
  const models = await getAvailableModels(apiKey);

  for (const model of models) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 25000); // 25s timeout

      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          max_tokens: 1000,
          temperature: 0.3,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch {
        console.warn(`Groq model ${model} returned non-JSON:`, text.slice(0, 100));
        continue;
      }

      if (!res.ok) {
        const msg = data?.error?.message || data?.message || `HTTP ${res.status}`;
        const isModelErr = /does not exist|not found|access|deprecated|decommission/i.test(msg);
        console.warn(`Groq model ${model}:`, msg);
        if (isModelErr) continue; // try next model
        throw new Error(msg); // real error, stop trying
      }

      const content = data?.choices?.[0]?.message?.content;
      if (!content) { console.warn(`Groq model ${model}: empty response`); continue; }

      return { text: content, model, provider: "groq" };

    } catch (e) {
      if (e.name === "AbortError") { console.warn(`Groq model ${model}: timeout`); continue; }
      const isModelErr = /does not exist|not found|access|deprecated|decommission/i.test(e?.message || "");
      if (isModelErr) { console.warn(`Groq model ${model}: model error, trying next`); continue; }
      throw e;
    }
  }

  throw new Error("No working Groq model found. Check your GROQ_API_KEY is valid and has available quota.");
}

async function callAnthropic(apiKey, prompt) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { throw new Error("Anthropic returned non-JSON response"); }
  if (!res.ok) throw new Error(data?.error?.message || `Anthropic HTTP ${res.status}`);
  const content = data?.content?.[0]?.text;
  if (!content) throw new Error("Empty response from Anthropic");
  return { text: content, model: "claude-sonnet-4-6", provider: "anthropic" };
}

export default async function handler(req, res) {
  // Always return JSON - wrap everything
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }
    if (!checkOrigin(req)) {
      return res.status(403).json({ error: "Forbidden - request blocked by origin check" });
    }
    if (!rateLimit(req, { windowMs: 60000, max: 20 })) {
      return res.status(429).json({ error: "Too many requests - please wait a minute" });
    }

    const { prompt } = req.body || {};
    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ error: "Missing or invalid prompt" });
    }
    if (prompt.length > 8000) {
      return res.status(400).json({ error: "Prompt too long (max 8000 chars)" });
    }

    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    const groqKey      = process.env.GROQ_API_KEY;
    const forceGroq    = process.env.AI_PROVIDER === "groq";

    if (!anthropicKey && !groqKey) {
      return res.status(500).json({
        error: "No AI API key configured. Add GROQ_API_KEY to Vercel environment variables, then redeploy.",
      });
    }

    let result;
    if (anthropicKey && !forceGroq) {
      result = await callAnthropic(anthropicKey, prompt);
    } else if (groqKey) {
      result = await callGroq(groqKey, prompt);
    }

    return res.status(200).json({ text: result.text, model: result.model, provider: result.provider });

  } catch (err) {
    console.error("analyze.js error:", err?.message);
    return res.status(500).json({
      error: err?.message || "AI analysis failed - please try again",
    });
  }
}
