const GROQ_MODEL = "llama-3.3-70b-versatile";
const ANTHROPIC_MODEL = "claude-sonnet-4-6";

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

  try {
    const text = provider === "groq" ? await callGroq(prompt) : await callAnthropic(prompt);
    res.status(200).json({ text, provider });
  } catch (err) {
    res.status(500).json({ error: err?.message || "Unknown server error" });
  }
}