// FDS Trading - shared constants
//
// CRYPTO prices are now real (see lib/binanceFeed.js), so each crypto
// instrument carries a `binanceSymbol` used both for the public market-data
// stream and for Binance Testnet order placement. STOCKS and FOREX remain on
// the simulated engine (lib/simEngine.js) for this phase - clearly labeled
// "Simulated" in the UI - and are good candidates for a real feed
// (Alpaca / OANDA) in a follow-up phase.

export const INSTRUMENTS = {
  CRYPTO: [
    { id: "bitcoin", label: "BTC/USDT", name: "Bitcoin", binanceSymbol: "BTCUSDT" },
    { id: "ethereum", label: "ETH/USDT", name: "Ethereum", binanceSymbol: "ETHUSDT" },
    { id: "solana", label: "SOL/USDT", name: "Solana", binanceSymbol: "SOLUSDT" },
    { id: "bnb", label: "BNB/USDT", name: "BNB", binanceSymbol: "BNBUSDT" },
    { id: "xrp", label: "XRP/USDT", name: "Ripple", binanceSymbol: "XRPUSDT" },
    { id: "cardano", label: "ADA/USDT", name: "Cardano", binanceSymbol: "ADAUSDT" },
    { id: "avalanche", label: "AVAX/USDT", name: "Avalanche", binanceSymbol: "AVAXUSDT" },
    { id: "dogecoin", label: "DOGE/USDT", name: "Dogecoin", binanceSymbol: "DOGEUSDT" },
    { id: "polkadot", label: "DOT/USDT", name: "Polkadot", binanceSymbol: "DOTUSDT" },
    { id: "chainlink", label: "LINK/USDT", name: "Chainlink", binanceSymbol: "LINKUSDT" },
    // Polygon's token swapped MATIC -> POL on Binance in Sept 2024.
    { id: "polygon", label: "POL/USDT", name: "Polygon", binanceSymbol: "POLUSDT" },
    { id: "uniswap", label: "UNI/USDT", name: "Uniswap", binanceSymbol: "UNIUSDT" },
  ],
  STOCKS: [
    { id: "AAPL", label: "AAPL", name: "Apple", base: 213, vol: 0.012 },
    { id: "TSLA", label: "TSLA", name: "Tesla", base: 178, vol: 0.028 },
    { id: "NVDA", label: "NVDA", name: "NVIDIA", base: 875, vol: 0.02 },
    { id: "MSFT", label: "MSFT", name: "Microsoft", base: 420, vol: 0.01 },
    { id: "AMZN", label: "AMZN", name: "Amazon", base: 185, vol: 0.014 },
    { id: "GOOGL", label: "GOOGL", name: "Alphabet", base: 175, vol: 0.011 },
    { id: "META", label: "META", name: "Meta", base: 520, vol: 0.018 },
    { id: "NFLX", label: "NFLX", name: "Netflix", base: 630, vol: 0.022 },
    { id: "AMD", label: "AMD", name: "AMD", base: 158, vol: 0.024 },
    { id: "COIN", label: "COIN", name: "Coinbase", base: 228, vol: 0.03 },
    { id: "SPY", label: "SPY", name: "SP500 ETF", base: 535, vol: 0.008 },
    { id: "QQQ", label: "QQQ", name: "NASDAQ ETF", base: 460, vol: 0.01 },
  ],
  FOREX: [
    { id: "EURUSD", label: "EUR/USD", name: "Euro Dollar", base: 1.0832, vol: 0.0025 },
    { id: "GBPUSD", label: "GBP/USD", name: "Pound Dollar", base: 1.2741, vol: 0.003 },
    { id: "USDJPY", label: "USD/JPY", name: "Dollar Yen", base: 154.23, vol: 0.002 },
    { id: "AUDUSD", label: "AUD/USD", name: "Aussie Dollar", base: 0.6521, vol: 0.0028 },
    { id: "USDCAD", label: "USD/CAD", name: "Dollar CAD", base: 1.364, vol: 0.0022 },
    { id: "NZDUSD", label: "NZD/USD", name: "Kiwi Dollar", base: 0.597, vol: 0.003 },
    { id: "USDCHF", label: "USD/CHF", name: "Dollar Franc", base: 0.902, vol: 0.0018 },
    { id: "EURGBP", label: "EUR/GBP", name: "Euro Pound", base: 0.85, vol: 0.002 },
    { id: "GBPJPY", label: "GBP/JPY", name: "Pound Yen", base: 196.5, vol: 0.0035 },
    { id: "XAUUSD", label: "XAU/USD", name: "Gold Dollar", base: 2320.0, vol: 0.0015 },
    { id: "XAGUSD", label: "XAG/USD", name: "Silver Dollar", base: 27.5, vol: 0.0022 },
    { id: "USOIL", label: "WTI/USD", name: "WTI Crude Oil", base: 79.8, vol: 0.003 },
  ],
};

export const NAV_ITEMS = [
  "DASHBOARD",
  "MARKETS",
  "SCANNER",
  "WALLET",
  "TRADES",
  "JOURNAL",
  "PORTFOLIO",
  "BROKER",
];
export const MKTABS = ["CRYPTO", "STOCKS", "FOREX"];

export const NAV_ICONS = {
  DASHBOARD: "🏠",
  MARKETS: "📊",
  SCANNER: "🔍",
  WALLET: "💰",
  TRADES: "💹",
  JOURNAL: "📓",
  PORTFOLIO: "📋",
  BROKER: "🔗",
};

export const SIG = {
  STRONG_BUY: { label: "STRONG BUY", color: "#15803d", bg: "#dcfce7", border: "#86efac" },
  BUY: { label: "BUY", color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0" },
  HOLD: { label: "HOLD", color: "#b45309", bg: "#fffbeb", border: "#fde68a" },
  SELL: { label: "SELL", color: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
  STRONG_SELL: { label: "STRONG SELL", color: "#991b1b", bg: "#fff1f2", border: "#fecdd3" },
};

export const C = {
  bg: "#f1f5f9",
  card: "#ffffff",
  border: "#e2e8f0",
  text: "#0f172a",
  text2: "#475569",
  text3: "#94a3b8",
  blue: "#2563eb",
  blueL: "#eff6ff",
  blueB: "#bfdbfe",
  green: "#16a34a",
  greenL: "#f0fdf4",
  greenB: "#bbf7d0",
  red: "#dc2626",
  redL: "#fef2f2",
  redB: "#fecaca",
  yellow: "#d97706",
  yellowL: "#fffbeb",
  yellowB: "#fde68a",
  purple: "#7c3aed",
  nav: "#0f172a",
};

export const F4 = ["EURUSD", "GBPUSD", "AUDUSD", "NZDUSD", "USDCHF", "EURGBP"];

export const INIT_WALLET = {
  balance: 10000,
  totalDeposited: 10000,
  history: [
    {
      type: "DEPOSIT",
      amount: 10000,
      note: "FDS Trading welcome virtual funds",
      date: new Date().toISOString(),
    },
  ],
};
