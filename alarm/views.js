// GuardView — motion alarm for the `tool` family on shared primitives: motion jolt + haptic + wakeLock
// (/_rt/sensors.js), persisted sensitivity (nanostores/persistent), i18n T. AudioContext is created on
// the ARM gesture (autoplay policy) so the siren can sound later on trigger. ?mock renders the armed
// screen. Sensitivity is a HISTORY-BACKED sub-screen via the runtime `screen` prop.
import { html } from "htm/preact";
import { useState, useEffect, useRef } from "preact/hooks";
import { useStore } from "@nanostores/preact";
import { persistentAtom } from "@nanostores/persistent";
import { motion, haptic, wakeLock } from "/_rt/sensors.js";
import { T } from "/_rt/core.js";

const Icon = (i, c = "") => html`<iconify-icon icon=${i} class=${c}></iconify-icon>`;
const thr = persistentAtom("alarm:thr", "1.6");   // jolt threshold (m/s²); lower = more sensitive
const GRACE = 5;                                   // seconds to put the phone down before arming
const isMock = () => typeof location !== "undefined" && new URLSearchParams(location.search).has("mock");

export function GuardView({ t, toast, screen, openScreen, closeScreen }) {
  const jolt = useStore(motion.jolt), perm = useStore(motion.permission);
  const threshold = Math.max(0.3, Number(useStore(thr)) || 1.6);
  const [phase, setPhase] = useState(() => (isMock() ? "armed" : "idle"));   // idle | arming | armed | triggered
  const [count, setCount] = useState(GRACE);
  const ctxRef = useRef(null), siren = useRef(null), sirenInt = useRef(0), vibInt = useRef(0), graceInt = useRef(0);
  const secure = typeof window === "undefined" || window.isSecureContext;

  const stopSound = () => {
    clearInterval(sirenInt.current); clearInterval(vibInt.current);
    try { siren.current?.osc.stop(); } catch { /* */ } siren.current = null;
    try { navigator.vibrate?.(0); } catch { /* */ }
  };
  const teardown = () => { clearInterval(graceInt.current); stopSound(); motion.stop(); wakeLock.off(); try { ctxRef.current?.close(); } catch { /* */ } ctxRef.current = null; };
  useEffect(() => () => teardown(), []);   // full cleanup on unmount

  const startSiren = () => {
    const ctx = ctxRef.current; if (!ctx) return;
    try {
      const osc = ctx.createOscillator(), g = ctx.createGain();
      osc.type = "square"; osc.frequency.value = 800; g.gain.value = 0.4;
      osc.connect(g); g.connect(ctx.destination); osc.start();
      siren.current = { osc, g };
      sirenInt.current = setInterval(() => { if (siren.current) siren.current.osc.frequency.value = siren.current.osc.frequency.value < 900 ? 1000 : 700; }, 300);
    } catch { /* */ }
    const buzz = () => { try { navigator.vibrate?.([500, 200]); } catch { /* */ } };
    buzz(); vibInt.current = setInterval(buzz, 700);
  };
  const trigger = () => { setPhase("triggered"); startSiren(); };

  // movement watcher — fire once while armed
  useEffect(() => { if (phase === "armed" && jolt > threshold) trigger(); }, [jolt, phase, threshold]);

  const arm = async () => {
    if (!(await motion.request())) { haptic.bump(); return; }
    setCount(GRACE); setPhase("arming"); haptic.ok();                       // transition immediately
    graceInt.current = setInterval(() => setCount((c) => { if (c <= 1) { clearInterval(graceInt.current); setPhase("armed"); return 0; } return c - 1; }), 1000);
    motion.start(); wakeLock.on();
    try { const AC = window.AudioContext || window.webkitAudioContext; ctxRef.current = new AC(); ctxRef.current.resume?.(); } catch { /* */ }  // create on gesture (fire-and-forget)
  };
  const disarm = () => { teardown(); setPhase("idle"); haptic.ok(); };

  // ── sensitivity sub-screen (history-backed) ──────────────────────────
  if (screen === "sens") {
    return html`<div id="guard-sens" class="flex flex-col gap-4 px-4 pt-3">
      <h2 class="font-bold text-lg flex items-center gap-2">${Icon("lucide:gauge", "text-primary")}${T(t, "sensTitle")}</h2>
      <p class="text-sm text-base-content/70">${T(t, "sensHint")}</p>
      <input id="sens-range" type="range" min="0.6" max="4" step="0.1" value=${5 - threshold} class="range range-primary" onInput=${(e) => thr.set(String((5 - Number(e.target.value)).toFixed(1)))} />
      <div class="flex justify-between text-xs text-base-content/70"><span>${T(t, "sensLow")}</span><span class="tabular-nums">${threshold.toFixed(1)} м/с²</span><span>${T(t, "sensHigh")}</span></div>
      <button id="sens-save" class="btn btn-primary rounded-2xl mt-1" onClick=${() => { closeScreen(); haptic.ok(); toast(T(t, "sensDone")); }}>${T(t, "sensSave")}</button>
    </div>`;
  }

  const header = html`<div class="flex justify-end mb-1"><button id="guard-sens-btn" class="btn btn-sm btn-ghost bg-base-100 border border-base-300 rounded-full gap-1" onClick=${() => openScreen("sens")}>${Icon("lucide:gauge")}${T(t, "sensitivity")}</button></div>`;
  const Gate = (icon, ic, title, hint, btn) => html`<div class="flex-1 flex flex-col items-center justify-center text-center gap-3 px-8">${Icon(icon, `text-6xl ${ic}`)}<div class="font-semibold text-lg">${title}</div><div class="text-sm text-base-content/70">${hint}</div>${btn || null}</div>`;

  let body;
  if (phase === "idle") {
    body = !secure ? Gate("lucide:shield-alert", "text-warning/80", T(t, "secureNeeded"), T(t, "secureHint"))
      : !motion.supported ? Gate("lucide:shield-x", "text-base-content/70", T(t, "noMotion"), T(t, "noMotionHint"))
      : perm === "denied" ? Gate("lucide:shield-x", "text-error/80", T(t, "motionDenied"), T(t, "motionDeniedHint"), html`<button id="arm-btn" class="btn btn-ghost btn-sm rounded-2xl gap-1 mt-1" onClick=${arm}>${Icon("lucide:rotate-cw")}${T(t, "arm")}</button>`)
      : html`<div class="flex-1 flex flex-col items-center justify-center text-center gap-4 px-8">
          ${Icon("lucide:shield-off", "text-7xl text-base-content/50")}
          <div><div class="font-bold text-xl">${T(t, "idleTitle")}</div><div class="text-sm text-base-content/70 mt-1">${T(t, "idleHint")}</div></div>
          <button id="arm-btn" class="btn btn-primary btn-lg rounded-2xl gap-2 mt-1" onClick=${arm}>${Icon("lucide:shield")}${T(t, "arm")}</button>
          <div class="text-xs text-base-content/70 flex items-center gap-1">${Icon("lucide:info")}${T(t, "bgNote")}</div>
        </div>`;
  } else if (phase === "arming") {
    body = html`<div class="flex-1 flex flex-col items-center justify-center text-center gap-4 px-8">
      ${Icon("lucide:shield-half", "text-7xl text-warning animate-pulse")}
      <div><div class="font-bold text-xl">${T(t, "armingTitle")}</div><div class="text-sm text-base-content/70 mt-1">${T(t, "armingHint")}</div></div>
      <div class="text-6xl font-bold tabular-nums text-warning">${count}</div>
      <button id="guard-disarm" class="btn btn-ghost rounded-2xl gap-2" onClick=${disarm}>${Icon("lucide:x")}${T(t, "cancel")}</button>
    </div>`;
  } else if (phase === "armed") {
    body = html`<div class="flex-1 flex flex-col items-center justify-center text-center gap-4 px-8">
      <div class="relative">${Icon("lucide:shield-check", "text-8xl text-success")}<span class="absolute inset-0 rounded-full bg-success/20 animate-ping"></span></div>
      <div><div class="font-bold text-xl text-success">${T(t, "armedTitle")}</div><div class="text-sm text-base-content/70 mt-1">${T(t, "armedHint")}</div></div>
      <button id="guard-disarm" class="btn btn-outline btn-success rounded-2xl gap-2 mt-2" onClick=${disarm}>${Icon("lucide:shield-off")}${T(t, "disarm")}</button>
    </div>`;
  } else {
    body = html`<div class="flex-1 flex flex-col items-center justify-center text-center gap-5 px-8">
      ${Icon("lucide:siren", "text-[8rem] text-error animate-pulse")}
      <div><div class="font-extrabold text-4xl text-error tracking-wide">${T(t, "triggeredTitle")}</div><div class="text-base text-error/80 mt-1">${T(t, "triggeredHint")}</div></div>
      <button id="guard-disarm" class="btn btn-error btn-lg rounded-2xl gap-2 mt-2" onClick=${disarm}>${Icon("lucide:shield-off")}${T(t, "disarm")}</button>
    </div>`;
  }

  return html`<div class=${`flex flex-col px-4 pt-2 transition-colors ${phase === "triggered" ? "bg-error/15" : ""}`} style="height:calc(100dvh - 8.5rem)">
    ${header}
    ${body}
  </div>`;
}

export const views = { guard: GuardView };
