// Open-Meteo adapter — no API key, CORS-friendly, rock-solid. Returns { items: dailyDays, meta: { current+hourly } }.
// hero reads data.meta (flattened current conditions); strip reads meta.hourly; days reads data.items.
import { viaProxy, isJsonObject } from "/_rt/feed.js";

const API = "https://api.open-meteo.com/v1/forecast";
// fixed coords keep tests/preview deterministic (no geocoding round-trip); segment filter picks the city
const CITIES = {
  kyiv:    { lat: 50.4501, lon: 30.5234, uk: "Київ",    en: "Kyiv" },
  lviv:    { lat: 49.8397, lon: 24.0297, uk: "Львів",   en: "Lviv" },
  odesa:   { lat: 46.4825, lon: 30.7233, uk: "Одеса",   en: "Odesa" },
  kharkiv: { lat: 49.9935, lon: 36.2304, uk: "Харків",  en: "Kharkiv" },
  dnipro:  { lat: 48.4647, lon: 35.0462, uk: "Дніпро",  en: "Dnipro" },
};
// WMO weather code → [iconify icon, uk summary, en summary]
const WMO = {
  0:  ["lucide:sun", "Ясно", "Clear sky"],
  1:  ["lucide:sun", "Переважно ясно", "Mostly clear"],
  2:  ["lucide:cloud-sun", "Мінлива хмарність", "Partly cloudy"],
  3:  ["lucide:cloud", "Хмарно", "Overcast"],
  45: ["lucide:cloud-fog", "Туман", "Fog"],
  48: ["lucide:cloud-fog", "Паморозь", "Rime fog"],
  51: ["lucide:cloud-drizzle", "Слабка мряка", "Light drizzle"],
  53: ["lucide:cloud-drizzle", "Мряка", "Drizzle"],
  55: ["lucide:cloud-drizzle", "Сильна мряка", "Dense drizzle"],
  56: ["lucide:cloud-drizzle", "Ожеледна мряка", "Freezing drizzle"],
  57: ["lucide:cloud-drizzle", "Ожеледна мряка", "Freezing drizzle"],
  61: ["lucide:cloud-rain", "Слабкий дощ", "Light rain"],
  63: ["lucide:cloud-rain", "Дощ", "Rain"],
  65: ["lucide:cloud-rain-wind", "Сильний дощ", "Heavy rain"],
  66: ["lucide:cloud-rain", "Ожеледний дощ", "Freezing rain"],
  67: ["lucide:cloud-rain-wind", "Ожеледний дощ", "Freezing rain"],
  71: ["lucide:cloud-snow", "Слабкий сніг", "Light snow"],
  73: ["lucide:cloud-snow", "Сніг", "Snow"],
  75: ["lucide:snowflake", "Сильний сніг", "Heavy snow"],
  77: ["lucide:cloud-snow", "Снігова крупа", "Snow grains"],
  80: ["lucide:cloud-rain", "Зливи", "Rain showers"],
  81: ["lucide:cloud-rain", "Зливи", "Rain showers"],
  82: ["lucide:cloud-rain-wind", "Сильні зливи", "Violent showers"],
  85: ["lucide:cloud-snow", "Снігопад", "Snow showers"],
  86: ["lucide:snowflake", "Сильний снігопад", "Heavy snow showers"],
  95: ["lucide:cloud-lightning", "Гроза", "Thunderstorm"],
  96: ["lucide:cloud-lightning", "Гроза з градом", "Thunderstorm, hail"],
  99: ["lucide:cloud-lightning", "Сильна гроза з градом", "Severe thunderstorm"],
};
const codeOf = (c, i) => (WMO[c] || WMO[3])[i];

// locale comes from the persisted nanostore (runtime writes "weather:locale" as a plain string)
function lang() { try { return (localStorage.getItem("weather:locale") || "uk").includes("en") ? "en" : "uk"; } catch { return "uk"; } }
const round = (n) => n == null ? null : Math.round(n);

export async function load(filters = {}) {
  const en = lang() === "en";
  const city = CITIES[filters.city] || CITIES.kyiv;
  const url = `${API}?latitude=${city.lat}&longitude=${city.lon}`
    + "&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m"
    + "&hourly=temperature_2m,weather_code"
    + "&daily=weather_code,temperature_2m_max,temperature_2m_min"
    + "&timezone=auto&forecast_days=7";
  const r = JSON.parse(await viaProxy(url, isJsonObject));
  const cur = r.current || {};
  const H = r.hourly || {}, D = r.daily || {};

  // hourly strip: from the current hour, next 24 entries
  const now = (cur.time || "").slice(0, 13);
  let start = (H.time || []).findIndex((tm) => tm.slice(0, 13) === now);
  if (start < 0) start = 0;
  const hourly = (H.time || []).slice(start, start + 24).map((tm, i) => {
    const code = H.weather_code[start + i];
    return { time: tm.slice(11, 16), icon: codeOf(code, 0), temp: round(H.temperature_2m[start + i]) + "°" };
  });

  // daily list (7 days) → data.items
  const wd = en ? "en-US" : "uk-UA";
  const items = (D.time || []).map((ds, i) => {
    const date = new Date(ds + "T12:00:00");
    const day = i === 0 ? (en ? "Today" : "Сьогодні")
      : i === 1 ? (en ? "Tomorrow" : "Завтра")
      : date.toLocaleDateString(wd, { weekday: "long" });
    return { day, icon: codeOf(D.weather_code[i], 0), hi: round(D.temperature_2m_max[i]), lo: round(D.temperature_2m_min[i]) };
  });

  const meta = {
    place: en ? city.en : city.uk,
    temp: round(cur.temperature_2m),
    feels: round(cur.apparent_temperature),
    wind: round(cur.wind_speed_10m),
    humidity: cur.relative_humidity_2m,
    icon: codeOf(cur.weather_code, 0),
    summary: codeOf(cur.weather_code, en ? 2 : 1),
    hourly,
  };
  return { items, meta };
}
