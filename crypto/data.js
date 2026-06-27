// CoinGecko data adapter — the only app-specific code. Returns normalized { items, meta }.
import { viaProxy, isJsonArray } from "/_rt/feed.js";
const API = "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&sparkline=false";
export async function load() {
  const data = JSON.parse(await viaProxy(API, isJsonArray));
  const items = data
    .filter((c) => c.symbol && c.current_price != null)
    .map((c) => ({ sym: c.symbol.toUpperCase(), name: c.name, price: c.current_price, chg: c.price_change_percentage_24h }));
  return { items, meta: {} };
}
