// FDS Trading - AI signal analysis proxy
//
// The browser can never hold an Anthropic API key safely, so this serverless
// function is the only thing that talks to api.anthropic.com. Set
// ANTHROPIC_API_KEY in your Vercel project's Environment Variables (or in a
// local .env when running `vercel dev`) - see README.md.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({
      error:
        "Server is missing ANTHROPIC_API_KEY. Add it under Vercel > Project > Settings > Environment Variables, then redeploy.",
    });
    return;
  }

  const { prompt } = req.body || {};
  if (!prompt || typeof prompt !== "string") {
    res.status(400).json({ error: "Missing prompt" });
    return;
  }

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
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

    const data = await r.json();

    if (!r.ok) {
      res.status(r.status).json({
        error: data?.error?.message || "Anthropic API returned an error",
      });
      return;
    }

    const text = (data.content || []).map((b) => b.text || "").join("");
    res.status(200).json({ text });
  } catch (err) {
    res.status(500).json({ error: err?.message || "Unknown server error" });
  }
}
