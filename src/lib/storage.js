// FDS Trading - localStorage persistence layer
//
// Saves and restores all trading state so nothing is lost when the browser
// closes, the computer shuts down, or the power goes out.
//
// Each piece of state has its own key so they can be read/written
// independently. Values are JSON-serialised before writing.
//
// Browser localStorage has no expiry - data persists until the user
// explicitly clears browser data or the user calls clearAll().
//
// Storage keys:
//   fds_trades        - open and closed trade records
//   fds_wallet        - balance, totalDeposited, and deposit/withdrawal history
//   fds_journal       - manual and AI-generated journal entries
//   fds_watchlist     - starred instrument IDs
//   fds_market_tab    - last selected market tab (CRYPTO/STOCKS/FOREX)
//   fds_nav           - last active nav section

const KEYS = {
  TRADES:   "fds_trades",
  WALLET:   "fds_wallet",
  JOURNAL:  "fds_journal",
  WATCHLIST:"fds_watchlist",
  MKTAB:    "fds_market_tab",
  NAV:      "fds_nav",
};

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw !== null ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    // Storage full (rare) - silently ignore rather than crashing the app
    console.warn("FDS: localStorage write failed", key, e?.message);
  }
}

// --- Public API ---

export const storage = {
  // Trades
  loadTrades:   (fallback = []) => read(KEYS.TRADES, fallback),
  saveTrades:   (v) => write(KEYS.TRADES, v),

  // Wallet
  loadWallet:   (fallback) => read(KEYS.WALLET, fallback),
  saveWallet:   (v) => write(KEYS.WALLET, v),

  // Journal
  loadJournal:  (fallback = []) => read(KEYS.JOURNAL, fallback),
  saveJournal:  (v) => write(KEYS.JOURNAL, v),

  // Watchlist
  loadWatchlist:(fallback = []) => read(KEYS.WATCHLIST, fallback),
  saveWatchlist:(v) => write(KEYS.WATCHLIST, v),

  // Last market tab
  loadMktab:    (fallback = "CRYPTO") => read(KEYS.MKTAB, fallback),
  saveMktab:    (v) => write(KEYS.MKTAB, v),

  // Last nav section
  loadNav:      (fallback = "DASHBOARD") => read(KEYS.NAV, fallback),
  saveNav:      (v) => write(KEYS.NAV, v),

  // Nuke everything (useful for a "Reset account" button)
  clearAll: () => Object.values(KEYS).forEach((k) => localStorage.removeItem(k)),

  // How much storage is being used (approximate, in KB)
  usageKB: () => {
    try {
      return (
        Object.values(KEYS).reduce((sum, k) => {
          const v = localStorage.getItem(k);
          return sum + (v ? v.length : 0);
        }, 0) / 1024
      ).toFixed(1);
    } catch {
      return "?";
    }
  },
};
