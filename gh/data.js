// GitHub Trending adapter (GitHub Search API). Returns normalized { items, meta }.
import { viaProxy, isJsonObject } from "/_rt/feed.js";
const SINCE = { day: 1, week: 7, month: 30 };
const fmtK = (n) => n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, "") + "k" : String(n);
export async function load(filters) {
  const days = SINCE[filters.since] || 7;
  const date = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
  const lang = filters.lang && filters.lang !== "all" ? ` language:${filters.lang}` : "";
  const q = encodeURIComponent(`stars:>50 created:>${date}${lang}`);
  const url = `https://api.github.com/search/repositories?q=${q}&sort=stars&order=desc&per_page=30`;
  const data = JSON.parse(await viaProxy(url, isJsonObject));
  const items = (data.items || []).map((r) => ({
    id: String(r.id),
    name: r.full_name,
    desc: r.description || "",
    stars: fmtK(r.stargazers_count || 0),
    forks: fmtK(r.forks_count || 0),
    lang: r.language || "",
    link: r.html_url,
    ts: new Date(r.pushed_at).getTime(),
  }));
  return { items, meta: {} };
}
