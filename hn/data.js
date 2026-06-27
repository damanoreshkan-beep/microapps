// Hacker News adapter (Algolia HN Search API). Returns normalized { items, meta }.
const PROXIES = [
  (u) => `/feed?url=${encodeURIComponent(u)}`,
  (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
  (u) => `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(u)}`,
];
const FEEDS = {
  front_page: "search?tags=front_page",
  story: "search_by_date?tags=story",
  ask_hn: "search?tags=ask_hn",
  show_hn: "search?tags=show_hn",
};
async function via(url) {
  let err;
  for (const w of PROXIES) {
    const c = new AbortController(), t = setTimeout(() => c.abort(), 10000);
    try { const r = await fetch(w(url), { signal: c.signal }); if (!r.ok) throw 0; const x = await r.text(); if (x.trim().startsWith("{")) return x; throw 0; }
    catch (e) { err = e; } finally { clearTimeout(t); }
  }
  throw err;
}
const stripHtml = (s) => { const d = document.createElement("div"); d.innerHTML = s; return d.textContent.replace(/\s+/g, " ").trim(); };
const domainOf = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; } };
export async function load(filters) {
  const tag = FEEDS[filters.tags] ? filters.tags : "front_page";
  const url = "https://hn.algolia.com/api/v1/" + FEEDS[tag] + "&hitsPerPage=30";
  const data = JSON.parse(await via(url));
  const items = (data.hits || []).filter((h) => h.title).map((h) => ({
    id: String(h.objectID),
    title: h.title,
    author: h.author || "",
    score: String(h.points ?? 0),
    comments: String(h.num_comments ?? 0),
    domain: h.url ? domainOf(h.url) : "news.ycombinator.com",
    text: h.story_text ? stripHtml(h.story_text).slice(0, 160) : "",
    link: "https://news.ycombinator.com/item?id=" + h.objectID,
    ts: (h.created_at_i || 0) * 1000,
  }));
  return { items, meta: {} };
}
