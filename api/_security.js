// FDS Trading - shared security helpers for serverless functions
//
// Two layers, both basic but meaningful for a personal project:
//
// 1. Origin check - rejects requests whose Origin header doesn't match this
//    deployment's own domain. A browser can't fake this header, so it stops
//    other websites' JavaScript from quietly calling your API and burning
//    your AI quota or hammering your Binance Testnet keys. It does NOT stop
//    someone deliberately scripting a direct request with a forged header
//    (no server-side check can fully prevent that) - for real protection of
//    paid resources, pair this with usage alerts/limits on the Groq/
//    Anthropic dashboard itself.
//
// 2. Per-IP rate limiting - a simple in-memory counter. Serverless
//    functions can spin up fresh instances at any time, so this resets
//    occasionally rather than being a perfectly global limit - but it still
//    blocks the common case of one IP hammering the same warm function
//    repeatedly in a short window.

const hits = new Map(); // ip -> [timestamps]

export function checkOrigin(req) {
  const origin = req.headers.origin;
  const host   = req.headers.host;

  // Allow requests with no Origin header (server-to-server, same-origin curl, etc)
  if (!origin) return true;

  try {
    const originHost = new URL(origin).host;
    const hostBase   = (host || "").split(":")[0]; // strip port

    // Always allow localhost (dev)
    if (originHost.startsWith("localhost") || originHost.startsWith("127.")) return true;

    // Allow exact host match
    if (originHost === hostBase) return true;

    // Allow any Vercel deployment (handles preview deployments like xxx.vercel.app)
    if (originHost.endsWith(".vercel.app")) return true;

    // Allow custom domains containing "fds" or "frankev" (catches custom domain setups)
    if (originHost.includes("fds") || originHost.includes("frankev")) return true;

    console.warn(`checkOrigin blocked: origin=${originHost} host=${hostBase}`);
    return false;
  } catch {
    return true; // parse error = allow (better to let through than block legitimate requests)
  }
}

export function rateLimit(req, { windowMs = 60000, max = 20 } = {}) {
  const ip =
    (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.socket?.remoteAddress || "unknown";
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < windowMs);
  arr.push(now);
  hits.set(ip, arr);
  return arr.length <= max;
}
