// NBU data adapter — the only app-specific code. Returns normalized { items, meta }.
const PROXIES = [
  (u) => `/feed?url=${encodeURIComponent(u)}`,
  (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
  (u) => `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(u)}`,
];
const API = "https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?json";
const POPULAR = ["USD", "EUR", "PLN", "GBP", "CHF", "CZK", "CAD", "JPY", "TRY"];
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
  const date = data[0]?.exchangedate || "";
  const items = data.map((d) => ({ cc: d.cc, name: d.txt, rate: d.rate }));
  items.sort((a, b) => { const pa = POPULAR.indexOf(a.cc), pb = POPULAR.indexOf(b.cc); return (pa < 0 ? 99 : pa) - (pb < 0 ? 99 : pb) || a.cc.localeCompare(b.cc); });
  return { items, meta: { date } };
}
