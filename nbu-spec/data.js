// NBU data adapter — the only app-specific code. Returns normalized { items, meta }.
import { viaProxy, isJsonArray } from "/_rt/feed.js";
const API = "https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?json";
const POPULAR = ["USD", "EUR", "PLN", "GBP", "CHF", "CZK", "CAD", "JPY", "TRY"];
export async function load() {
  const data = JSON.parse(await viaProxy(API, isJsonArray));
  const date = data[0]?.exchangedate || "";
  const items = data.map((d) => ({ cc: d.cc, name: d.txt, rate: d.rate }));
  items.sort((a, b) => { const pa = POPULAR.indexOf(a.cc), pb = POPULAR.indexOf(b.cc); return (pa < 0 ? 99 : pa) - (pb < 0 ? 99 : pb) || a.cc.localeCompare(b.cc); });
  return { items, meta: { date } };
}
