// Reverse geocoding (lat,lng → human place name) via BigDataCloud's client endpoint — no API key,
// returns Ukrainian names (city + district), CORS-friendly (we route through /feed anyway). Nominatim
// 403s our proxy and Photon has no `uk`, so BigDataCloud is the keyless pick. Result cached per ~100 m
// cell in localStorage → cheap + works offline once seen.
const KEY = "navigator:places";
const cell = (lat, lng) => `${lat.toFixed(3)},${lng.toFixed(3)}`;
const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; } };

export async function reverseName(lat, lng) {
  const cache = read(), k = cell(lat, lng);
  if (k in cache) return cache[k];
  try {
    const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=uk`;
    const d = JSON.parse(await fetch("/feed?url=" + encodeURIComponent(url)).then((r) => r.text()));
    const parts = [];
    for (const p of [d.locality, d.city, d.principalSubdivision]) if (p && !parts.includes(p)) parts.push(p);
    const label = parts.slice(0, 2).join(", ") || d.countryName || "";
    if (label) { cache[k] = label; try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch { /* */ } }
    return label || null;
  } catch { return cache[k] ?? null; }
}
