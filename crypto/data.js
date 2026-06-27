// CoinGecko data adapter — the only app-specific code. Returns normalized { items, meta }.
const PROXIES = [
  (u) => `/feed?url=${encodeURIComponent(u)}`,
  (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
  (u) => `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(u)}`,
];
const API = "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&sparkline=false";
async function via(url) {
  let err;
  for (const w of PROXIES) {
    const c = new AbortController(), t = setTimeout(() => c.abort(), 10000);
    try { const r = await fetch(w(url), { signal: c.signal }); if (!r.ok) throw 0; const x = await r.text(); if (x.trim().startsWith("[")) return x; throw 0; }
    catch (e) { err = e; } finally { clearTimeout(t); }
  }
  throw err;
}
export async function load() {
  const data = JSON.parse(await via(API));
  const items = data
    .filter((c) => c.symbol && c.current_price != null)
    .map((c) => ({ sym: c.symbol.toUpperCase(), name: c.name, price: c.current_price, chg: c.price_change_percentage_24h }));
  return { items, meta: {} };
}
