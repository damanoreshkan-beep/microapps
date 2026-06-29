// NoiseView — approximate sound-level meter for the `tool` family, on shared primitives:
// mic loudness (/_rt/sensors.js), persisted calibration offset (nanostores/persistent), i18n T.
// Mic needs a user gesture → an "enable" gate. ?mock=1 injects a level so the live screen renders
// headless (UX gate). Calibration is a HISTORY-BACKED sub-screen via the runtime `screen` prop.
import { html } from "htm/preact";
import { useState, useEffect } from "preact/hooks";
import { useStore } from "@nanostores/preact";
import { persistentAtom } from "@nanostores/persistent";
import { mic, haptic } from "/_rt/sensors.js";
import { T } from "/_rt/core.js";

const Icon = (i, c = "") => html`<iconify-icon icon=${i} class=${c}></iconify-icon>`;
const cal = persistentAtom("noise:cal", "0");          // user calibration offset (dB), persisted
const zoneOf = (db) =>
  db < 40 ? { t: "text-success", b: "bg-success", k: "zVeryQuiet" } :
  db < 55 ? { t: "text-success", b: "bg-success", k: "zQuiet" } :
  db < 70 ? { t: "text-warning", b: "bg-warning", k: "zTalk" } :
  db < 85 ? { t: "text-warning", b: "bg-warning", k: "zLoud" } :
  { t: "text-error", b: "bg-error", k: "zHarm" };

export function NoiseView({ t, toast, screen, openScreen, closeScreen }) {
  const rawDb = useStore(mic.db), rawPeak = useStore(mic.peak), perm = useStore(mic.permission);
  const off = Number(useStore(cal)) || 0;

  useEffect(() => {
    if (typeof location !== "undefined" && new URLSearchParams(location.search).has("mock")) { mic.db.set(58); mic.peak.set(72); return; }
    // pre-detect a previously-blocked mic so we can show RESET steps instead of a dead "enable" button
    try { navigator.permissions?.query?.({ name: "microphone" }).then((p) => { mic.permission.set(p.state); p.onchange = () => mic.permission.set(p.state); }).catch(() => {}); } catch { /* */ }
    return () => mic.stop();
  }, []);
  const secure = typeof window === "undefined" || window.isSecureContext;   // getUserMedia needs https or localhost

  const enable = async () => { if (!(await mic.start())) haptic.bump(); };

  // ── calibration sub-screen (history-backed) ──────────────────────────
  if (screen === "calib") {
    return html`<div id="noise-calib" class="flex flex-col gap-4 px-4 pt-3">
      <h2 class="font-bold text-lg flex items-center gap-2">${Icon("lucide:sliders-horizontal", "text-primary")}${T(t, "calibTitle")}</h2>
      <p class="text-sm text-base-content/70">${T(t, "calibHint")}</p>
      <input id="calib-range" type="range" min="-30" max="30" step="1" value=${off} class="range range-primary" onInput=${(e) => cal.set(String(e.target.value))} />
      <div class="text-center tabular-nums text-sm text-base-content/70">${off >= 0 ? "+" : ""}${off} ${T(t, "unit")}</div>
      <div class="flex gap-2">
        <button class="btn btn-ghost rounded-2xl flex-1" onClick=${() => cal.set("0")}>${T(t, "calibReset")}</button>
        <button id="calib-save" class="btn btn-primary rounded-2xl flex-1" onClick=${() => { closeScreen(); haptic.ok(); toast(T(t, "calibDone")); }}>${T(t, "calibSave")}</button>
      </div>
    </div>`;
  }

  const running = rawDb != null;
  const db = running ? Math.max(0, Math.min(130, rawDb + off)) : null;
  const peak = Math.max(0, Math.min(130, rawPeak + off));
  const z = running ? zoneOf(db) : null;
  const pct = (v) => Math.max(0, Math.min(100, (v / 120) * 100));

  return html`<div class="flex flex-col px-4 pt-2" style="height:calc(100dvh - 8.5rem)">
    <div class="flex justify-end mb-1">
      <button id="noise-calib-btn" class="btn btn-sm btn-ghost bg-base-100 border border-base-300 rounded-full gap-1" onClick=${() => openScreen("calib")}>${Icon("lucide:sliders-horizontal")}${T(t, "calibrate")}</button>
    </div>
    ${!running
      ? html`<div class="flex-1 flex flex-col items-center justify-center text-center gap-4 px-6">
          ${!secure
            ? html`${Icon("lucide:shield-alert", "text-5xl text-warning/80")}<div class="font-medium">${T(t, "secureNeeded")}</div><div class="text-sm text-base-content/70 break-words">${T(t, "secureHint")} <span class="tabular-nums">${typeof location !== "undefined" ? location.host : ""}</span></div>`
            : !mic.supported
              ? html`${Icon("lucide:mic-off", "text-5xl text-base-content/70")}<div class="font-medium">${T(t, "noMic")}</div><div class="text-sm text-base-content/70">${T(t, "noMicHint")}</div>`
              : perm === "denied"
                ? html`${Icon("lucide:mic-off", "text-5xl text-error/80")}<div class="font-medium">${T(t, "micDenied")}</div>
                    <div class="text-sm text-base-content/70 text-left max-w-xs space-y-1"><div>${Icon("lucide:circle-1", "text-primary")} ${T(t, "fixSite")}</div><div>${Icon("lucide:circle-2", "text-primary")} ${T(t, "fixOs")}</div><div>${Icon("lucide:circle-3", "text-primary")} ${T(t, "fixReload")}</div></div>
                    <button id="noise-enable" class="btn btn-ghost btn-sm rounded-2xl gap-1 mt-1" onClick=${enable}>${Icon("lucide:rotate-cw")}${T(t, "retry")}</button>`
                : html`${Icon("lucide:mic", "text-5xl text-primary")}<div class="text-sm text-base-content/70">${T(t, "micHint")}</div>
                    <button id="noise-enable" class="btn btn-primary rounded-2xl gap-2 mt-1" onClick=${enable}>${Icon("lucide:mic")}${T(t, "enableMic")}</button>`}
        </div>`
      : html`<div class="flex-1 flex flex-col items-center justify-center gap-5">
          <div class="text-center">
            <div class="tabular-nums leading-none"><span id="noise-db" class=${`text-7xl font-bold ${z.t}`}>${db}</span><span class="text-2xl font-semibold text-base-content/70"> ${T(t, "unit")}</span></div>
            <div class=${`mt-1 font-medium ${z.t}`}>${T(t, z.k)}</div>
          </div>
          <div class="w-full max-w-sm">
            <div class="relative h-4 rounded-full bg-base-300 overflow-hidden">
              <div class=${`absolute inset-y-0 left-0 ${z.b} transition-all duration-100`} style=${`width:${pct(db)}%`}></div>
              <div class="absolute inset-y-0 w-0.5 bg-base-content/70" style=${`left:${pct(peak)}%`}></div>
            </div>
            <div class="flex justify-between text-xs text-base-content/60 mt-1"><span>${T(t, "zQuiet")}</span><span>${T(t, "zLoud")}</span></div>
          </div>
          <div class="flex items-center gap-3 text-sm">
            <span class="text-base-content/70 tabular-nums">${T(t, "peak")}: <b>${peak}</b> ${T(t, "unit")}</span>
            <button id="noise-reset" class="btn btn-xs btn-ghost bg-base-100 border border-base-300 rounded-full gap-1" onClick=${() => mic.resetPeak()}>${Icon("lucide:rotate-ccw")}${T(t, "resetPeak")}</button>
          </div>
          <div class="text-xs text-base-content/60">${T(t, "approxNote")}</div>
        </div>`}
  </div>`;
}

export const views = { meter: NoiseView };
