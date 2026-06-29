// NavView — NFS-style 3D arrow that always points at a target, + compass + your location + distance.
// Custom visual for the `tool` family on shared primitives: geo/compass/haptic + geo math
// (/_rt/sensors.js), WMM declination (wmm.js), persisted targets, i18n T (/_rt/core.js).
// Target picker is a HISTORY-BACKED sub-screen via the runtime `screen` prop (system Back closes it).
// ?mock=1 injects a fake position+heading+target so the live screen renders without hardware
// (lets `shot`/the UX gate review the real UI — headless Chromium has no GPS/compass).
import { html } from "htm/preact";
import { useState, useEffect, useRef } from "preact/hooks";
import { useStore } from "@nanostores/preact";
import { persistentAtom } from "@nanostores/persistent";
import { geo, compass, haptic, distanceM, bearingDeg } from "/_rt/sensors.js";
import { declination } from "./wmm.js";
import { reverseName } from "./geocode.js";
import { T } from "/_rt/core.js";

const Icon = (i, c = "") => html`<iconify-icon icon=${i} class=${c}></iconify-icon>`;
const targets = persistentAtom("navigator:targets", [], { encode: JSON.stringify, decode: JSON.parse });
const activeId = persistentAtom("navigator:active", "");
const CARD = { uk: ["Пн", "ПнСх", "Сх", "ПдСх", "Пд", "ПдЗх", "Зх", "ПнЗх"], en: ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] };
const fmtDist = (m, loc) => m < 1000 ? `${Math.round(m)} ${loc === "en" ? "m" : "м"}` : `${(m / 1000).toFixed(m < 10000 ? 1 : 0)} ${loc === "en" ? "km" : "км"}`;
const cardOf = (deg, loc) => CARD[loc === "en" ? "en" : "uk"][Math.round(((deg % 360) + 360) % 360 / 45) % 8];

// extract a lat,lng from a plain string OR a maps URL (several patterns incl. URL-encoded comma)
function coordFromAny(s) {
  s = s || "";
  const m = s.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) || s.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/)
    || s.match(/[?&](?:q|ll|daddr|destination)=(-?\d+\.\d+)(?:,|%2C)(-?\d+\.\d+)/i)
    || s.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
  if (!m) return null;
  const lat = +m[1], lng = +m[2];
  return (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) ? { lat, lng } : null;
}
// resolve coords from coords / a maps URL / a SHORT maps link (maps.app.goo.gl) via the /feed proxy:
// follow the redirect (x-resolved-url), parse coord patterns, else geocode the /place/<name> (Open-Meteo, no key).
async function resolveLink(input) {
  input = (input || "").trim();
  const direct = coordFromAny(input);
  if (direct) return direct;
  if (!/^https?:\/\//i.test(input)) return null;
  try {
    // 1) follow the redirect server-side → final URL in the body (?resolve=1, bulletproof)
    const finalUrl = await fetch("/feed?resolve=1&url=" + encodeURIComponent(input)).then((r) => r.text()).catch(() => "");
    const fromUrl = coordFromAny(finalUrl);               // @lat,lng / !3d!4d / q= / ll=
    if (fromUrl) return fromUrl;
    // 2) place-by-id link (/place/<name>) → geocode the name (Open-Meteo, no key)
    const raw = (finalUrl.match(/\/place\/([^/@]+)/) || [])[1];
    if (raw) {
      const place = decodeURIComponent(raw).replace(/\+/g, " ").split(",")[0].trim();
      const j = JSON.parse(await fetch("/feed?url=" + encodeURIComponent("https://geocoding-api.open-meteo.com/v1/search?count=1&language=uk&name=" + encodeURIComponent(place))).then((r) => r.text()));
      if (j.results && j.results[0]) return { lat: j.results[0].latitude, lng: j.results[0].longitude, name: place };
    }
    // 3) last resort: scrape coords from the page body
    return coordFromAny(await fetch("/feed?url=" + encodeURIComponent(input)).then((r) => r.text()).catch(() => ""));
  } catch { /* network/parse */ }
  return null;
}

export function NavView({ t, loc, toast, screen, openScreen, closeScreen }) {
  const g = useStore(geo.data), gErr = useStore(geo.error), heading = useStore(compass.heading);
  const list = useStore(targets), aId = useStore(activeId);
  const [decl, setDecl] = useState(0);
  const [needCompass, setNeedCompass] = useState(false);
  const [input, setInput] = useState("");
  const [resolving, setResolving] = useState(false);
  const [hereName, setHereName] = useState("");
  const lastCell = useRef(""), lastHere = useRef("");
  const active = list.find((x) => x.id === aId) || null;

  useEffect(() => {
    if (typeof location !== "undefined" && new URLSearchParams(location.search).has("mock")) {   // demo for shots/UX gate
      geo.data.set({ lat: 50.4501, lng: 30.5234, accuracy: 12, heading: null, speed: 0, ts: 0 });
      compass.heading.set(40);
      if (!targets.get().length) { targets.set([{ id: "mock", name: "Майдан Незалежності", lat: 50.449, lng: 30.5247 }]); activeId.set("mock"); }
      return;
    }
    geo.start();
    const DOE = typeof window !== "undefined" && window.DeviceOrientationEvent;
    if (DOE && typeof DOE.requestPermission === "function") setNeedCompass(true);   // iOS: needs a tap
    else compass.start();
    return () => { geo.stop(); compass.stop(); };
  }, []);

  useEffect(() => {
    if (!g || !active) return;
    const c = `${Math.round(g.lat * 2)},${Math.round(g.lng * 2)}`;
    if (c === lastCell.current) return;
    lastCell.current = c; declination(g.lat, g.lng).then(setDecl);
  }, [g, active]);

  // reverse-geocode the current position (district-level cell, so it doesn't refetch every GPS tick)
  useEffect(() => {
    if (!g) return;
    const c = `${g.lat.toFixed(2)},${g.lng.toFixed(2)}`;
    if (c === lastHere.current) return;
    lastHere.current = c; reverseName(g.lat, g.lng).then((n) => n && setHereName(n));
  }, [g]);

  const enableCompass = async () => { if (await compass.request()) { compass.start(); setNeedCompass(false); haptic.ok(); } };
  const addTarget = async (lat, lng, name) => {                       // name a point by its place (reverse geocode) when none given
    const label = name || (await reverseName(lat, lng)) || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    const tgt = { id: String(Date.now()), name: label, lat, lng };
    targets.set([tgt, ...list].slice(0, 50)); activeId.set(tgt.id); haptic.ok(); closeScreen();
  };
  const saveHere = async () => { if (!g || resolving) return; setResolving(true); await addTarget(g.lat, g.lng); setResolving(false); };
  const addFromInput = async () => {
    if (!input.trim() || resolving) return;
    setResolving(true); const p = await resolveLink(input);
    if (p) { await addTarget(p.lat, p.lng, p.name); setInput(""); } else toast(T(t, "badCoords"));
    setResolving(false);
  };
  const del = (id) => { targets.set(list.filter((x) => x.id !== id)); if (aId === id) activeId.set(""); };

  // signal quality from accuracy (m)
  const sig = (acc) => acc == null ? { c: "bg-base-content/40", k: "—" } : acc <= 20 ? { c: "bg-success", k: T(t, "sigGood") } : acc <= 50 ? { c: "bg-warning", k: T(t, "sigOk") } : { c: "bg-error", k: T(t, "sigPoor") };

  // ── target picker (history-backed sub-screen) ────────────────────────
  if (screen === "target") {
    return html`<div id="nav-chooser" class="flex flex-col gap-3 px-4 pt-3">
      <h2 class="font-bold text-lg flex items-center gap-2">${Icon("lucide:map-pin", "text-primary")}${T(t, "chooseTarget")}</h2>
      ${g ? html`<div class="text-xs text-base-content/70 flex items-center gap-1 -mt-1">${Icon("lucide:locate-fixed", "text-success")}${T(t, "youHere")}: <span class="tabular-nums">${g.lat.toFixed(4)}, ${g.lng.toFixed(4)}</span></div>` : null}
      <button id="nav-here" class=${`btn rounded-2xl gap-2 ${g && !resolving ? "btn-primary" : "btn-disabled"}`} onClick=${saveHere}>${resolving ? html`<span class="loading loading-spinner loading-sm"></span>` : Icon("lucide:crosshair")}${T(t, "saveHere")}</button>
      ${g && hereName ? html`<div class="text-xs text-base-content/70 -mt-1 px-1 flex items-center gap-1">${Icon("lucide:map-pin", "text-primary")}${hereName}</div>` : null}
      <div class="flex gap-2">
        <input id="nav-input" type="text" placeholder=${T(t, "coordsPlaceholder")} class="input input-bordered rounded-2xl flex-1 min-w-0" value=${input} onInput=${(e) => setInput(e.target.value)} onKeyDown=${(e) => e.key === "Enter" && addFromInput()} />
        <button id="nav-add" class=${`btn btn-primary rounded-2xl ${resolving ? "btn-disabled" : ""}`} onClick=${addFromInput}>${resolving ? html`<span class="loading loading-spinner loading-sm"></span>` : Icon("lucide:plus")}</button>
      </div>
      <div class="text-xs text-base-content/60 -mt-1 px-1">${T(t, "inputHint")}</div>
      <div id="nav-saved" class="flex flex-col gap-2 mt-1">
        ${list.length ? list.map((x) => html`<div class=${`card bg-base-100 border rounded-2xl ${x.id === aId ? "border-primary" : "border-base-300"}`} key=${x.id}><div class="card-body p-3 px-4 flex-row items-center gap-3">
          <button class="flex-1 text-left min-w-0" onClick=${() => { activeId.set(x.id); haptic.ok(); closeScreen(); }}><div class="font-medium truncate flex items-center gap-1.5">${x.id === aId ? Icon("lucide:check", "text-primary") : null}${x.name}</div><div class="text-xs text-base-content/70 tabular-nums">${x.lat.toFixed(4)}, ${x.lng.toFixed(4)}${g ? ` · ${fmtDist(distanceM(g, x), loc)}` : ""}</div></button>
          <button class="btn btn-ghost btn-xs btn-circle text-error" aria-label=${T(t, "delete")} onClick=${() => del(x.id)}>${Icon("lucide:trash-2")}</button>
        </div></div>`) : html`<div class="text-sm text-base-content/70 text-center py-6">${T(t, "noTargets")}</div>`}
      </div>
    </div>`;
  }

  // ── main navigation screen ───────────────────────────────────────────
  const Gate = (icon, text, hint, action) => html`<div class="flex-1 flex flex-col items-center justify-center text-center gap-3 px-8">${Icon(icon, "text-5xl text-base-content/70")}<div class="font-medium">${text}</div>${hint ? html`<div class="text-sm text-base-content/70">${hint}</div>` : null}${action || null}</div>`;
  const headerBtn = html`<button id="nav-change" class="btn btn-sm btn-ghost bg-base-100 border border-base-300 rounded-full gap-1 shrink-0" onClick=${() => openScreen("target")}>${Icon("lucide:map-pin")}${active ? T(t, "change") : T(t, "chooseTarget")}</button>`;

  let body;
  if (!geo.supported) body = Gate("lucide:satellite", T(t, "noGeo"), T(t, "noGeoHint"));
  else if (!active) body = Gate("lucide:map-pin-off", T(t, "pickFirst"), T(t, "pickFirstHint"), html`<button class="btn btn-primary rounded-2xl mt-1" onClick=${() => openScreen("target")}>${T(t, "chooseTarget")}</button>`);
  else if (gErr === "denied") body = Gate("lucide:map-pin-off", T(t, "geoDenied"), T(t, "geoDeniedHint"));
  else if (!g) body = Gate("lucide:loader-circle", T(t, "locating"), T(t, "locatingHint"));
  else {
    const dist = distanceM(g, active), arrived = dist < 15;
    const brTrue = bearingDeg(g, active);
    const headTrue = heading == null ? null : (heading + decl);
    const rel = headTrue == null ? brTrue : (brTrue - headTrue);   // angle to target relative to forward (up)
    const arrowRot = rel - 45;                                      // lucide:navigation glyph points 45° (NE) by default — compensate
    const sgn = ((rel % 360) + 540) % 360 - 180;                    // -180..180; + = target is to your right
    const aligned = Math.abs(sgn) <= 12;
    const q = sig(g.accuracy);
    body = html`<div class="flex-1 flex flex-col gap-3">
      <div id="nav-scene" class="flex-1 flex flex-col items-center justify-center gap-4" style="perspective:800px">
        ${arrived
          ? html`<div class="flex flex-col items-center gap-2 text-success">${Icon("lucide:circle-check-big", "text-[7rem]")}<div class="font-bold text-xl">${T(t, "arrived")}</div></div>`
          : html`<div class="relative w-60 h-60 flex items-center justify-center">
              <div class="absolute inset-0 rounded-full border border-primary/15 bg-primary/5" style="transform:rotateX(62deg)"></div>
              <div class="absolute inset-10 rounded-full border border-primary/10" style="transform:rotateX(62deg)"></div>
              <div class="absolute top-1 flex flex-col items-center text-base-content/50">${Icon("lucide:chevrons-up", "text-base-content/40")}<span class="text-[10px]">${T(t, "forward")}</span></div>
              <div class="transition-transform duration-200 ease-out" style=${`transform: rotateZ(${arrowRot}deg)`}>${Icon("lucide:navigation", "text-primary text-[7.5rem] drop-shadow-[0_8px_16px_rgba(56,189,248,.45)]")}</div>
            </div>
            <div class="badge badge-lg bg-base-100 border-base-300 gap-1 font-medium">${Icon("lucide:compass", "text-primary")}${T(t, "toTarget")}: ${cardOf(brTrue, loc)} · ${Math.round(brTrue)}°</div>
            <div class=${`text-sm text-center px-6 flex items-center gap-1.5 ${aligned ? "text-success font-semibold" : "text-base-content/70"}`}>${aligned ? html`${Icon("lucide:check")}${T(t, "goStraight")}` : html`${Icon(sgn > 0 ? "lucide:corner-up-right" : "lucide:corner-up-left")}${T(t, sgn > 0 ? "turnRight" : "turnLeft")}`}</div>`}
      </div>
      <div class="card bg-base-100 border border-base-300 rounded-2xl"><div class="card-body p-4 gap-2.5">
        <div><div class="text-xs text-base-content/60 flex items-center gap-1">${Icon("lucide:flag", "text-primary")}${T(t, "toLabel")}</div>
          <div class="text-lg font-semibold leading-tight break-words">${active.name}</div></div>
        <div class="flex items-end justify-between gap-3 pt-2 border-t border-base-300/60">
          <div class="text-4xl font-bold tabular-nums leading-none">${fmtDist(dist, loc)}</div>
          <div class="text-right shrink-0">
            ${heading == null
              ? html`<button id="nav-compass" class="btn btn-xs btn-primary rounded-full gap-1" onClick=${enableCompass}>${Icon("lucide:compass")}${T(t, needCompass ? "enableCompass" : "noCompass")}</button>`
              : html`<div class="text-xs text-base-content/60">${T(t, "course")}</div><div class="tabular-nums leading-none"><span class="text-2xl font-bold">${Math.round(heading)}°</span> <span class="text-base-content/70">${cardOf(heading, loc)}</span></div>`}
          </div>
        </div>
        <div class="pt-2 border-t border-base-300/60">
          <div class="text-xs text-base-content/60 flex items-center gap-1">${Icon("lucide:locate-fixed", "text-success")}${T(t, "youHere")}</div>
          ${hereName ? html`<div class="text-sm font-medium break-words">${hereName}</div>` : null}
          <div class="text-xs text-base-content/70 flex items-center gap-x-2 gap-y-0.5 flex-wrap mt-0.5"><span class="flex items-center gap-1.5"><span class=${`inline-block w-2 h-2 rounded-full ${q.c}`}></span>±${Math.round(g.accuracy)} ${loc === "en" ? "m" : "м"} · ${q.k}</span><span class="tabular-nums opacity-70">${g.lat.toFixed(4)}, ${g.lng.toFixed(4)}</span></div>
        </div>
      </div></div>
    </div>`;
  }

  return html`<div class="flex flex-col px-4 pt-2 pb-3" style="height:calc(100dvh - 8.5rem)">
    <div class="flex justify-end mb-1">${headerBtn}</div>
    ${body}
  </div>`;
}

export const views = { nav: NavView };
