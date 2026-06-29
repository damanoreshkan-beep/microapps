// NavView — NFS-style 3D arrow that always points at a target, + compass + distance. Custom visual
// for the `tool` family, on shared primitives: geo/compass/haptic + geo math (/_rt/sensors.js),
// WMM declination (wmm.js), persisted targets (nanostores/persistent), i18n T (/_rt/core.js).
// Target picker is a HISTORY-BACKED sub-screen via the runtime `screen` prop (system Back closes it).
import { html } from "htm/preact";
import { useState, useEffect, useRef } from "preact/hooks";
import { useStore } from "@nanostores/preact";
import { persistentAtom } from "@nanostores/persistent";
import { geo, compass, haptic, distanceM, bearingDeg } from "/_rt/sensors.js";
import { declination } from "./wmm.js";
import { T } from "/_rt/core.js";

const Icon = (i, c = "") => html`<iconify-icon icon=${i} class=${c}></iconify-icon>`;
const targets = persistentAtom("navigator:targets", [], { encode: JSON.stringify, decode: JSON.parse });
const activeId = persistentAtom("navigator:active", "");
const CARD = { uk: ["Пн", "ПнСх", "Сх", "ПдСх", "Пд", "ПдЗх", "Зх", "ПнЗх"], en: ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] };
const fmtDist = (m, loc) => m < 1000 ? `${Math.round(m)} ${loc === "en" ? "m" : "м"}` : `${(m / 1000).toFixed(m < 10000 ? 1 : 0)} ${loc === "en" ? "km" : "км"}`;

// parse "lat,lng" or a Google/Apple Maps URL (@lat,lng | q=lat,lng | ll=lat,lng | destination=lat,lng)
function parseLatLng(s) {
  s = (s || "").trim();
  const m = s.match(/@(-?\d+\.\d+),\s*(-?\d+\.\d+)/) || s.match(/[?&](?:q|ll|daddr|destination)=(-?\d+\.\d+),\s*(-?\d+\.\d+)/) || s.match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  if (!m) return null;
  const lat = +m[1], lng = +m[2];
  return (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) ? { lat, lng } : null;
}

export function NavView({ t, loc, toast, screen, openScreen, closeScreen }) {
  const g = useStore(geo.data), gErr = useStore(geo.error), heading = useStore(compass.heading);
  const list = useStore(targets), aId = useStore(activeId);
  const [decl, setDecl] = useState(0);
  const [needCompass, setNeedCompass] = useState(false);
  const [input, setInput] = useState("");
  const lastCell = useRef("");
  const active = list.find((x) => x.id === aId) || null;

  useEffect(() => {
    geo.start();
    const DOE = typeof window !== "undefined" && window.DeviceOrientationEvent;
    if (DOE && typeof DOE.requestPermission === "function") setNeedCompass(true);   // iOS: needs a tap
    else compass.start();
    return () => { geo.stop(); compass.stop(); };
  }, []);

  // refresh declination when the ~0.5° location cell changes
  useEffect(() => {
    if (!g || !active) return;
    const c = `${Math.round(g.lat * 2)},${Math.round(g.lng * 2)}`;
    if (c === lastCell.current) return;
    lastCell.current = c;
    declination(g.lat, g.lng).then(setDecl);
  }, [g, active]);

  const enableCompass = async () => { if (await compass.request()) { compass.start(); setNeedCompass(false); haptic.ok(); } };
  const addTarget = (lat, lng, name) => {
    const tgt = { id: String(Date.now()), name: name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`, lat, lng };
    targets.set([tgt, ...list].slice(0, 50)); activeId.set(tgt.id); haptic.ok(); closeScreen();
  };
  const saveHere = () => { if (g) addTarget(g.lat, g.lng, T(t, "savedPoint")); };
  const addFromInput = () => { const p = parseLatLng(input); if (p) { addTarget(p.lat, p.lng); setInput(""); } else toast(T(t, "badCoords")); };
  const del = (id) => { targets.set(list.filter((x) => x.id !== id)); if (aId === id) activeId.set(""); };

  // ── target picker (history-backed sub-screen) ────────────────────────
  if (screen === "target") {
    return html`<div id="nav-chooser" class="flex flex-col gap-3 px-4 pt-3">
      <h2 class="font-bold text-lg flex items-center gap-2">${Icon("lucide:map-pin", "text-primary")}${T(t, "chooseTarget")}</h2>
      <button id="nav-here" class=${`btn rounded-2xl gap-2 ${g ? "btn-primary" : "btn-disabled"}`} onClick=${saveHere}>${Icon("lucide:crosshair")}${T(t, "saveHere")}</button>
      <div class="flex gap-2">
        <input id="nav-input" type="text" inputmode="decimal" placeholder=${T(t, "coordsPlaceholder")} class="input input-bordered rounded-2xl flex-1 min-w-0" value=${input} onInput=${(e) => setInput(e.target.value)} />
        <button id="nav-add" class="btn btn-primary rounded-2xl" onClick=${addFromInput}>${Icon("lucide:plus")}</button>
      </div>
      <div id="nav-saved" class="flex flex-col gap-2 mt-1">
        ${list.length ? list.map((x) => html`<div class=${`card bg-base-100 border rounded-2xl ${x.id === aId ? "border-primary" : "border-base-300"}`} key=${x.id}><div class="card-body p-3 px-4 flex-row items-center gap-3">
          <button class="flex-1 text-left min-w-0" onClick=${() => { activeId.set(x.id); haptic.ok(); closeScreen(); }}><div class="font-medium truncate">${x.name}</div><div class="text-xs text-base-content/70 tabular-nums">${x.lat.toFixed(4)}, ${x.lng.toFixed(4)}</div></button>
          <button class="btn btn-ghost btn-xs btn-circle text-error" aria-label=${T(t, "delete")} onClick=${() => del(x.id)}>${Icon("lucide:trash-2")}</button>
        </div></div>`) : html`<div class="text-sm text-base-content/70 text-center py-6">${T(t, "noTargets")}</div>`}
      </div>
    </div>`;
  }

  // ── main navigation screen ───────────────────────────────────────────
  const Gate = (icon, text, hint, action) => html`<div class="flex-1 flex flex-col items-center justify-center text-center gap-3 px-8">${Icon(icon, "text-5xl text-base-content/70")}<div class="font-medium">${text}</div>${hint ? html`<div class="text-sm text-base-content/70">${hint}</div>` : null}${action || null}</div>`;
  const headerBtn = html`<button id="nav-change" class="btn btn-sm btn-ghost bg-base-100 border border-base-300 rounded-full gap-1" onClick=${() => openScreen("target")}>${Icon("lucide:map-pin")}${active ? T(t, "change") : T(t, "chooseTarget")}</button>`;

  let body;
  if (!geo.supported) body = Gate("lucide:satellite", T(t, "noGeo"), T(t, "noGeoHint"));
  else if (!active) body = Gate("lucide:map-pin-off", T(t, "pickFirst"), T(t, "pickFirstHint"), html`<button class="btn btn-primary rounded-2xl mt-1" onClick=${() => openScreen("target")}>${T(t, "chooseTarget")}</button>`);
  else if (gErr === "denied") body = Gate("lucide:map-pin-off", T(t, "geoDenied"), T(t, "geoDeniedHint"));
  else if (!g) body = Gate("lucide:loader", T(t, "locating"), T(t, "locatingHint"));
  else {
    const dist = distanceM(g, active);
    const arrived = dist < 15;
    const brTrue = bearingDeg(g, active);
    const headTrue = heading == null ? null : (heading + decl);
    const arrow = headTrue == null ? brTrue : (brTrue - headTrue);   // device-frame angle (north-up fallback)
    const cards = CARD[loc === "en" ? "en" : "uk"];
    body = html`<div class="flex-1 flex flex-col">
      <div id="nav-scene" class="flex-1 flex items-center justify-center" style="perspective:700px">
        ${arrived
          ? html`<div class="flex flex-col items-center gap-2 text-success">${Icon("lucide:circle-check-big", "text-[7rem]")}<div class="font-bold text-xl">${T(t, "arrived")}</div></div>`
          : html`<div class="transition-transform duration-200 ease-out" style=${`transform: rotateX(58deg) rotateZ(${arrow}deg)`}>${Icon("lucide:navigation", "text-primary text-[9rem] drop-shadow-[0_10px_20px_rgba(0,0,0,.5)]")}</div>`}
      </div>
      <div class="flex items-end justify-between gap-3 px-1 pb-1">
        <div><div class="text-4xl font-bold tabular-nums leading-none">${fmtDist(dist, loc)}</div><div class="text-sm text-base-content/70 truncate max-w-[60vw]">${Icon("lucide:flag", "text-xs")} ${active.name}</div></div>
        <div class="text-right">
          ${heading == null
            ? html`<button id="nav-compass" class="btn btn-sm btn-primary rounded-full gap-1" onClick=${enableCompass}>${Icon("lucide:compass")}${T(t, needCompass ? "enableCompass" : "noCompass")}</button>`
            : html`<div class="tabular-nums"><span class="text-2xl font-bold">${Math.round(heading)}°</span> <span class="text-base-content/70">${cards[Math.round(heading / 45) % 8]}</span></div><div class="text-xs text-base-content/70">${T(t, "magDecl")} ${decl >= 0 ? "+" : ""}${decl.toFixed(1)}°</div>`}
        </div>
      </div>
    </div>`;
  }

  return html`<div class="flex flex-col" style="height:calc(100dvh - 9rem)">
    <div class="flex items-center justify-between gap-2 px-4 pt-2"><div class="font-semibold text-base-content/80 truncate min-w-0">${T(t, "title")}</div><div class="shrink-0">${headerBtn}</div></div>
    ${body}
  </div>`;
}

export const views = { nav: NavView };
