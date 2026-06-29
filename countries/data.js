// Countries adapter — mledoze/countries (static, no key) + flagcdn flags + native Intl localization.
// restcountries.com is dead (all versions deprecated → 200 {success:false}); this static dump is the
// reliable replacement. Country & region names are localized via Intl.DisplayNames (no dictionary);
// raw array is cached and (re)localized per load so the EN/UA toggle + region refetch both relabel.
// English name is kept too → bilingual search. Rich fields power the in-app detail page.
import { viaProxy, isJsonArray } from "/_rt/feed.js";

const SRC = "https://raw.githubusercontent.com/mledoze/countries/master/countries.json";
const flagUrl = (cca2) => `https://flagcdn.com/w320/${cca2.toLowerCase()}.png`;
const REGIONS = { Africa: ["Африка", "Africa"], Americas: ["Америка", "Americas"], Asia: ["Азія", "Asia"], Europe: ["Європа", "Europe"], Oceania: ["Океанія", "Oceania"], Antarctic: ["Антарктика", "Antarctic"] };

function lang() { try { return (localStorage.getItem("countries:locale") || "uk").includes("en") ? "en" : "uk"; } catch { return "uk"; } }
const callingCode = (idd) => { if (!idd?.root) return ""; const s = idd.suffixes || []; return idd.root + (s.length === 1 ? s[0] : ""); };

let CACHE = null;   // raw, normalized array — cached once; localization happens per-load
async function raw() {
  if (CACHE) return CACHE;
  const data = JSON.parse(await viaProxy(SRC, isJsonArray, 15000));
  CACHE = data
    .filter((c) => c.cca2 && c.name?.common)
    .map((c) => ({
      cca2: c.cca2, cca3: c.cca3, nameEn: c.name.common, official: c.name.official || c.name.common,
      capital: (c.capital && c.capital[0]) || "—", regionRaw: c.region || "", subregion: c.subregion || "",
      area: c.area || 0, latlng: Array.isArray(c.latlng) && c.latlng.length === 2 ? c.latlng : null,
      languages: c.languages ? Object.values(c.languages) : [],
      currencies: c.currencies ? Object.values(c.currencies).map((x) => x.symbol ? `${x.name} (${x.symbol})` : x.name) : [],
      calling: callingCode(c.idd), tld: Array.isArray(c.tld) ? c.tld.join(" ") : "",
      borders: Array.isArray(c.borders) ? c.borders : [],
    }));
  return CACHE;
}

export async function load(filters = {}) {
  const en = lang() === "en";
  const names = new Intl.DisplayNames([en ? "en" : "uk"], { type: "region" });
  const nf = new Intl.NumberFormat(en ? "en-US" : "uk-UA");
  const list = await raw();
  const byCca3 = Object.fromEntries(list.map((c) => [c.cca3, c.cca2]));
  const locName = (cca2) => { try { return names.of(cca2); } catch { return null; } };

  let items = filters.region ? list.filter((c) => c.regionRaw === filters.region) : list;
  const out = items
    .map((c) => {
      const name = locName(c.cca2) || c.nameEn;
      const region = (REGIONS[c.regionRaw]?.[en ? 1 : 0]) || c.regionRaw;
      const borders = c.borders.map((b) => locName(byCca3[b]) || b).join(", ");
      return {
        id: c.cca2, name, nameEn: c.nameEn, official: c.official, capital: c.capital,
        region, regionRaw: c.regionRaw,
        regionFull: c.subregion ? `${region} · ${c.subregion}` : region,
        area: c.area ? nf.format(Math.round(c.area)) + " км²" : "",
        languages: c.languages.join(", "), currencies: c.currencies.join(", "),
        calling: c.calling, tld: c.tld, borders,
        flag: flagUrl(c.cca2),
        map: c.latlng ? `https://www.google.com/maps/@${c.latlng[0]},${c.latlng[1]},5z` : "https://maps.google.com",
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, en ? "en" : "uk"));
  return { items: out, meta: { total: out.length } };
}
