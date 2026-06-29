// Magnetic declination (true − magnetic north) via the World Magnetic Model, no API key.
// Uses the `geomagnetism` package (bundles WMM) from esm.sh, called with a date inside the
// WMM2020 validity window — declination drifts ~0.1°/yr, so the ~1.5yr extrapolation to now is
// <0.3°, far under the compass's own ~10° noise. The numeric result is cached per ~0.5° cell in
// localStorage, so once computed a location works fully offline even if the lib can't reload.
const KEY = "navigator:decl";
const cell = (lat, lng) => `${Math.round(lat * 2) / 2},${Math.round(lng * 2) / 2}`;
const readCache = () => { try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; } };

let MODEL_P = null;   // lazy, shared promise

export async function declination(lat, lng) {
  const cache = readCache(), k = cell(lat, lng);
  if (k in cache) return cache[k];
  try {
    MODEL_P ||= import("https://esm.sh/geomagnetism@0.1.1").then((m) => (m.default ?? m).model(new Date("2024-12-01")));
    const model = await MODEL_P;
    const d = model.point([lat, lng]).decl;
    cache[k] = Math.round(d * 10) / 10;
    try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch { /* */ }
    return cache[k];
  } catch {
    return cache[k] ?? 0;   // offline first-run / lib unavailable → magnetic (0 correction)
  }
}
