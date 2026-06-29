// Countries adapter — mledoze/countries (static, no key) + flagcdn flags + native Intl localization.
// restcountries.com is dead (all versions deprecated → 200 {success:false}); this static dump is the
// reliable replacement. Country & region names are localized via Intl.DisplayNames (no dictionary):
// the V8 engine ships UA names. Raw array is cached; names are (re)localized on every load so the
// EN/UA toggle + region refetch both relabel. English name is kept too → bilingual search.
import { viaProxy, isJsonArray } from "/_rt/feed.js";

const SRC = "https://raw.githubusercontent.com/mledoze/countries/master/countries.json";
const flagUrl = (cca2) => `https://flagcdn.com/w320/${cca2.toLowerCase()}.png`;
const REGIONS = { Africa: ["Африка", "Africa"], Americas: ["Америка", "Americas"], Asia: ["Азія", "Asia"], Europe: ["Європа", "Europe"], Oceania: ["Океанія", "Oceania"], Antarctic: ["Антарктика", "Antarctic"] };

function lang() { try { return (localStorage.getItem("countries:locale") || "uk").includes("en") ? "en" : "uk"; } catch { return "uk"; } }

let CACHE = null;   // raw, normalized array — cached once; localization happens per-load
async function raw() {
  if (CACHE) return CACHE;
  const data = JSON.parse(await viaProxy(SRC, isJsonArray, 15000));
  CACHE = data
    .filter((c) => c.cca2 && c.name?.common)
    .map((c) => ({
      cca2: c.cca2, nameEn: c.name.common, capital: (c.capital && c.capital[0]) || "—",
      regionRaw: c.region || "", area: c.area || 0,
      latlng: Array.isArray(c.latlng) && c.latlng.length === 2 ? c.latlng : null,
    }));
  return CACHE;
}

export async function load(filters = {}) {
  const en = lang() === "en";
  const names = new Intl.DisplayNames([en ? "en" : "uk"], { type: "region" });
  const nf = new Intl.NumberFormat(en ? "en-US" : "uk-UA");
  let items = await raw();
  if (filters.region) items = items.filter((c) => c.regionRaw === filters.region);
  const out = items
    .map((c) => {
      let name = c.nameEn;
      try { name = names.of(c.cca2) || c.nameEn; } catch { /* non-ISO code */ }
      return {
        id: c.cca2, name, nameEn: c.nameEn, capital: c.capital,
        region: (REGIONS[c.regionRaw]?.[en ? 1 : 0]) || c.regionRaw, regionRaw: c.regionRaw,
        area: c.area ? nf.format(Math.round(c.area)) + " км²" : "",
        flag: flagUrl(c.cca2),
        map: c.latlng ? `https://www.google.com/maps/@${c.latlng[0]},${c.latlng[1]},5z` : "https://maps.google.com",
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, en ? "en" : "uk"));
  return { items: out, meta: { total: out.length } };
}
