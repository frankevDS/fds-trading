# FDS Trading

AI-powered trading signal platform - virtual wallet, live crypto market data, AI signal analysis, and real paper trading on Binance Testnet.

## What changed in this rebuild

The previous version was a single React component file with no build setup (that's why Vercel couldn't deploy it), simulated prices for every market, and an AI panel that called `api.anthropic.com` directly from the browser with no API key (which can never work - browsers can't hold that secret).

This version:

- Is a real Vite project that deploys cleanly to Vercel.
- Pulls **live crypto prices** from Binance's free public API (REST seed + WebSocket ticker) - no key required, replacing the random-walk simulator for the CRYPTO tab.
- Routes the **AI Analyse** feature through a small serverless function (`api/analyze.js`) that holds your AI key server-side, supporting either Anthropic (Claude) or Groq (free) - see "Switching AI providers" below.
- Adds a real **Binance Testnet** connection (`api/binance-testnet.js`) - sandbox funds, real order matching - so crypto trades placed from the app are genuine paper orders, not just local arithmetic.
- Keeps **STOCKS and FOREX simulated** for now (clearly labeled "SIM" in the UI) - good next candidates for a real feed (Alpaca, OANDA) in a follow-up phase.
- **Trades are clickable** - tap any open or closed position to see its price chart since open, live indicators, and what your stop loss / take profit would be worth in dollars.
- The **AI Analyse panel includes a profit calculator** - enter an amount and see the potential dollar/percent outcome at the AI's suggested stop loss and take-profit levels.
- Is **installable as an app** on phones and desktops (PWA manifest + service worker + icons).
- Has **basic API hardening** - origin checks and per-IP rate limiting on both serverless functions, so a stranger who finds your deployed URL can't freely burn through your AI quota or hammer your endpoints.

## Project structure

```
fds-trading/
  api/
    analyze.js             Anthropic proxy (holds ANTHROPIC_API_KEY)
    binance-testnet.js     Binance Testnet proxy (signs requests server-side)
  src/
    lib/
      constants.js         Instrument lists, colors, nav config
      indicators.js        RSI/MACD/BB/Stochastic math + formatting
      simEngine.js          Simulated price engine (stocks/forex only)
      binanceFeed.js        Live crypto market data (public, no key)
      binanceTrade.js       Client helper for the Testnet proxy
    components/             One file per view/widget
    App.jsx
    main.jsx
  package.json
  vite.config.js
  index.html
```

## Run it locally

```bash
npm install
npm run dev
```

This serves the frontend at `http://localhost:5173`. Crypto prices will work immediately (no key needed). **AI Analyse and Binance Testnet trading need the `/api` serverless functions**, which plain `vite dev` doesn't run.

To test those locally too, install the Vercel CLI once and run:

```bash
npm i -g vercel
vercel dev
```

Create a `.env` (copy `.env.example`) with your `ANTHROPIC_API_KEY` first.

## Deploy to Vercel

1. Push this folder to a GitHub repo and import it in Vercel (or `vercel` from the CLI). Vercel auto-detects Vite + the `/api` folder - no extra config needed.
2. In the Vercel project, go to **Settings > Environment Variables** and add **one** of these (AI Analyse needs at least one):
   - `ANTHROPIC_API_KEY` - paid, pay-as-you-go. Get one at console.anthropic.com.
   - `GROQ_API_KEY` - **free, no credit card.** Get one at console.groq.com/keys. Runs an open model (Llama 3.3 70B) instead of Claude - quality is good but not the same as Claude.

   You can set both and switch later - see "Switching AI providers" below.
3. Redeploy after adding the env var (env vars only apply to new deployments).

Binance Testnet keys are **not** an env var - each visitor connects their own from the BROKER tab, and they're stored only in that browser's `localStorage`.

## Setting up Binance Testnet (for real paper trading)

1. Go to testnet.binance.vision and log in with GitHub.
2. Generate an **HMAC** API key + secret. These are sandbox-only and unrelated to any real Binance.com account.
3. In the app, open **BROKER** and paste them in.
4. Your testnet account starts empty - use the faucet on testnet.binance.vision to get sandbox USDT before trading.

Once connected, the **TRADE** button on crypto cards places a real market BUY order on Binance Testnet (spot accounts can't open shorts, so SELL is only used to close an existing position from the Trades tab).

## Fixing "Service unavailable from a restricted location" on Binance Testnet

This is not about where *you* are - it's about where Vercel runs your serverless function. By default that's a US data center, and Binance blocks API requests from US server infrastructure (a well-documented, common issue - search the exact error and you'll see the same message from developers worldwide on AWS/Vercel/Heroku/Colab, regardless of their own country).

`vercel.json` in this project sets the function region to `fra1` (Frankfurt) to avoid that block. To make sure it's actually applied:

1. In Vercel: **Settings > Functions** (or **General**, depending on layout) - look for **Function Region**.
2. Confirm it shows **Frankfurt, Germany (fra1)**. If it still shows Washington D.C. (iad1), select Frankfurt manually and save.
3. Redeploy.

If Frankfurt is ever blocked too (rare, but Binance's restricted list can change), try `sin1` (Singapore) or `hnd1` (Tokyo) instead - edit the `regions` array in `vercel.json` and redeploy.

## Switching AI providers (Anthropic <-> Groq)

`api/analyze.js` supports both and picks automatically:

- Only `ANTHROPIC_API_KEY` set -> uses Claude.
- Only `GROQ_API_KEY` set -> uses Groq (free, Llama 3.3 70B).
- Both set -> uses Claude, unless you add `AI_PROVIDER=groq` to force Groq.
- Neither set -> AI Analyse shows a clear "no AI key configured" message instead of failing silently.

To switch later, just change the env vars in Vercel and redeploy - no code changes needed. Groq is a good free way to test the feature end-to-end before deciding whether Claude's answer quality is worth paying for.

## Security notes

- **Your AI and Binance keys never reach the browser.** `ANTHROPIC_API_KEY`/`GROQ_API_KEY` live only in Vercel's environment variables; Binance Testnet keys live only in your own browser's `localStorage` and are sent per-request to your own `/api/binance-testnet` function, which signs and forwards them - never logged, never stored server-side.
- **Both serverless functions check the request's Origin** and reject anything not coming from your own deployed domain, plus apply basic per-IP rate limiting. This stops casual abuse (other sites' scripts calling your API, or one IP hammering it) but isn't a substitute for watching your usage - check usage dashboards on console.anthropic.com / console.groq.com occasionally, and rotate a key immediately if you ever suspect it leaked.
- **Binance Testnet only** - this app deliberately never talks to the real exchange, so even a worst-case key leak only exposes sandbox funds, not real money.
- If you ever accidentally commit a real API key to GitHub, treat it as compromised: revoke/regenerate it immediately, don't just delete the line - it stays in your repo's history otherwise. Keep `.env` out of git (already covered by `.gitignore`).

## Known limitations / good next steps

- **Stocks and forex are still simulated.** A real feed would need a provider like Alpaca (stocks, free paper trading + data) or OANDA (forex, free practice account) wired up the same way Binance is here - public data direct from the client where possible, signed/keyed calls through a serverless proxy.
- **Binance public market data is read directly from the browser.** If it's ever blocked in your region/network, swap `REST_BASE`/`WS_BASE` in `src/lib/binanceFeed.js` for Binance.US's equivalents.
- **Testnet order precision is simplified.** Buys use `quoteOrderQty` (spend $X) so Binance handles lot-size rounding; closes always sell the exact quantity that was bought, which keeps things valid without extra lookups. If a symbol isn't listed on testnet, Binance's own error message is shown rather than failing silently.
- No automated tests yet - this was hand-verified with a JS/JSX syntax + bundle check, not a live `npm run build`, since the build environment here has no network access. Run `npm run build` yourself before deploying to be sure.
