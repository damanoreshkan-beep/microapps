// Open-Meteo Air Quality adapter — no API key, CORS-friendly. Returns { items: dailyAqi, meta: { current+hourly } }.
// hero reads data.meta (current AQI + band + pollutants); strip reads meta.hourly (hourly AQI); days reads data.items.
import { viaProxy, isJsonObject } from "/_rt/feed.js";

const API = "https://air-quality-api.open-meteo.com/v1/air-quality";
// fixed coords keep tests/preview deterministic (no geocoding round-trip); the segment filter picks the city
const CITIES = {
  kyiv:    { lat: 50.4501, lon: 30.5234, uk: "Київ",    en: "Kyiv" },
  lviv:    { lat: 49.8397, lon: 24.0297, uk: "Львів",   en: "Lviv" },
  odesa:   { lat: 46.4825, lon: 30.7233, uk: "Одеса",   en: "Odesa" },
  kharkiv: { lat: 49.9935, lon: 36.2304, uk: "Харків",  en: "Kharkiv" },
  dnipro:  { lat: 48.4647, lon: 35.0462, uk: "Дніпро",  en: "Dnipro" },
};
// European AQI band by upper bound → [icon, colour, uk label, en label]. Face glyph + green→red colour
// read as air quality at a glance (not weather). 0-20 good … >100 extremely poor.
const BANDS = [
  [20, "lucide:smile", "#22c55e", "Добре", "Good"],
  [40, "lucide:smile", "#a3e635", "Прийнятно", "Fair"],
  [60, "lucide:meh", "#facc15", "Помірно", "Moderate"],
  [80, "lucide:frown", "#fb923c", "Погано", "Poor"],
  [100, "lucide:frown", "#f87171", "Дуже погано", "Very poor"],
  [Infinity, "lucide:skull", "#d946ef", "Небезпечно", "Extremely poor"],
];
const band = (aqi) => BANDS.find(([max]) => (aqi ?? 0) <= max) || BANDS[BANDS.length - 1];

function lang() { try { return (localStorage.getItem("air:locale") || "uk").includes("en") ? "en" : "uk"; } catch { return "uk"; } }
const round = (n) => n == null ? null : Math.round(n);

export async function load(filters = {}) {
  const en = lang() === "en";
  const city = CITIES[filters.city] || CITIES.kyiv;
  const url = `${API}?latitude=${city.lat}&longitude=${city.lon}`
    + "&current=european_aqi,pm2_5,pm10,ozone"
    + "&hourly=european_aqi"
    + "&timezone=auto&forecast_days=4";
  const r = JSON.parse(await viaProxy(url, isJsonObject));
  const cur = r.current || {};
  const H = r.hourly || {};

  const aqi = round(cur.european_aqi);
  const b = band(aqi);

  // hourly strip: from the current hour, next 24 entries
  const now = (cur.time || "").slice(0, 13);
  let start = (H.time || []).findIndex((tm) => tm.slice(0, 13) === now);
  if (start < 0) start = 0;
  const hourly = (H.time || []).slice(start, start + 24).map((tm, i) => {
    const a = round(H.european_aqi[start + i]);
    return { time: tm.slice(11, 16), aqi: a, tone: band(a)[2] };
  });

  // daily hi/lo AQI aggregated from the hourly series → data.items
  const byDay = {};
  (H.time || []).forEach((tm, i) => {
    const a = H.european_aqi[i];
    if (a == null) return;
    (byDay[tm.slice(0, 10)] ||= []).push(a);
  });
  const wd = en ? "en-US" : "uk-UA";
  const items = Object.keys(byDay).sort().slice(0, 4).map((d, i) => {
    const arr = byDay[d];
    const date = new Date(d + "T12:00:00");
    const day = i === 0 ? (en ? "Today" : "Сьогодні")
      : i === 1 ? (en ? "Tomorrow" : "Завтра")
      : date.toLocaleDateString(wd, { weekday: "long" });
    const hi = round(Math.max(...arr)), lo = round(Math.min(...arr));
    return { day, hi, lo, tone: band(hi)[2] };
  });

  const meta = {
    place: en ? city.en : city.uk,
    aqi,
    band: en ? b[4] : b[3],
    icon: b[1],
    tone: b[2],
    pm25: round(cur.pm2_5),
    pm10: round(cur.pm10),
    o3: round(cur.ozone),
    hourly,
  };
  return { items, meta };
}
