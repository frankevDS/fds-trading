import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// FDS Trading - Vite config
// Local dev note: `npm run dev` serves the frontend only. The /api functions
// (Anthropic AI proxy + Binance Testnet proxy) are Vercel serverless functions
// and do not run under plain `vite dev`. For full local testing of AI Analyse
// and Binance Testnet trading, install the Vercel CLI and run `vercel dev`
// instead (see README.md).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
});
