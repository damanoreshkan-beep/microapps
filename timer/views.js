// Stopwatch + Timer — tool family (no sensors, no data). rAF-driven time, wakeLock while running,
// Web Audio beep + haptic on timer finish. ?mock shows a populated stopwatch for review.
import { html } from "htm/preact";
import { useState, useEffect, useRef } from "preact/hooks";
import { wakeLock, haptic } from "/_rt/sensors.js";
import { T } from "/_rt/core.js";

const Icon = (i, c = "") => html`<iconify-icon icon=${i} class=${c}></iconify-icon>`;
const mock = () => typeof location !== "undefined" && new URLSearchParams(location.search).has("mock");
const pad = (n, l = 2) => String(n).padStart(l, "0");
const fmtSW = (ms) => `${pad(Math.floor(ms / 60000))}:${pad(Math.floor(ms / 1000) % 60)}.${pad(Math.floor(ms / 10) % 100)}`;
const fmtT = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)), h = Math.floor(s / 3600); return (h ? `${h}:${pad(Math.floor(s / 60) % 60)}` : `${pad(Math.floor(s / 60))}`) + `:${pad(s % 60)}`; };

// ── Stopwatch ────────────────────────────────────────────────────────────
function StopwatchView({ t }) {
  const M = mock();
  const [running, setRunning] = useState(false);
  const [el, setEl] = useState(M ? 83450 : 0);
  const [laps, setLaps] = useState(M ? [83450, 41280] : []);
  const r = useRef({ start: 0, base: M ? 83450 : 0, raf: 0 });

  const loop = () => { setEl(r.current.base + (performance.now() - r.current.start)); r.current.raf = requestAnimationFrame(loop); };
  useEffect(() => () => { cancelAnimationFrame(r.current.raf); wakeLock.off(); }, []);

  const start = () => { r.current.start = performance.now(); r.current.raf = requestAnimationFrame(loop); setRunning(true); wakeLock.on(); haptic.tick(); };
  const pause = () => { cancelAnimationFrame(r.current.raf); r.current.base = el; setRunning(false); wakeLock.off(); haptic.tick(); };
  const reset = () => { cancelAnimationFrame(r.current.raf); r.current.base = 0; setEl(0); setLaps([]); setRunning(false); wakeLock.off(); haptic.bump(); };
  const lap = () => { setLaps((l) => [el, ...l]); haptic.tick(); };

  return html`<div class="flex flex-col items-center" style="min-height:calc(100dvh - 8.5rem)">
    <div class="flex-1 flex items-center justify-center w-full">
      <div id="sw-time" class="text-6xl font-bold tabular-nums tracking-tight">${fmtSW(el)}</div>
    </div>
    <div class="flex gap-3 w-full max-w-xs">
      ${running
        ? html`<button id="sw-lap" class="btn btn-lg flex-1 rounded-2xl bg-base-200" onClick=${lap}>${Icon("lucide:flag")}${T(t, "lap")}</button>
            <button id="sw-stop" class="btn btn-lg flex-1 rounded-2xl btn-warning" onClick=${pause}>${Icon("lucide:pause")}${T(t, "pause")}</button>`
        : html`<button id="sw-reset" class="btn btn-lg flex-1 rounded-2xl bg-base-200 ${el ? "" : "btn-disabled opacity-50"}" onClick=${reset}>${Icon("lucide:rotate-ccw")}${T(t, "reset")}</button>
            <button id="sw-start" class="btn btn-lg flex-1 rounded-2xl btn-primary" onClick=${start}>${Icon("lucide:play")}${T(t, "start")}</button>`}
    </div>
    ${laps.length ? html`<div class="w-full max-w-xs mt-5 flex flex-col gap-1.5">${laps.map((lp, i) => html`<div class="flex justify-between text-sm px-2 py-1.5 rounded-xl bg-base-100/60" key=${i}>
      <span class="text-base-content/60">${T(t, "lap")} ${laps.length - i}</span><span class="tabular-nums font-medium">${fmtSW(lp)}</span></div>`)}</div>` : null}
  </div>`;
}

// ── Timer ────────────────────────────────────────────────────────────────
const PRESETS = [60, 180, 300, 600];          // seconds
const ADJ = [[-60, "−1:00"], [-10, "−0:10"], [10, "+0:10"], [60, "+1:00"]];

function TimerView({ t }) {
  const M = mock();
  const [target, setTarget] = useState(M ? 300000 : 60000);
  const [rem, setRem] = useState(M ? 187000 : 60000);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const r = useRef({ end: 0, raf: 0, ctx: null });

  useEffect(() => () => { cancelAnimationFrame(r.current.raf); wakeLock.off(); }, []);

  const beep = () => { try {
    const ctx = r.current.ctx || (r.current.ctx = new (window.AudioContext || window.webkitAudioContext)());
    ctx.resume?.();
    [0, 0.28, 0.56].forEach((dt) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = 880; o.connect(g); g.connect(ctx.destination);
      const t0 = ctx.currentTime + dt; g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.35, t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.22); o.start(t0); o.stop(t0 + 0.24); });
  } catch { /* */ } };

  const loop = () => { const left = r.current.end - performance.now(); if (left <= 0) { finish(); } else { setRem(left); r.current.raf = requestAnimationFrame(loop); } };
  const finish = () => { cancelAnimationFrame(r.current.raf); setRem(0); setDone(true); setRunning(false); wakeLock.off(); beep(); haptic.ok(); };
  const start = () => { if (rem <= 0) return; try { r.current.ctx ||= new (window.AudioContext || window.webkitAudioContext)(); } catch { /* */ } r.current.end = performance.now() + rem; r.current.raf = requestAnimationFrame(loop); setRunning(true); setDone(false); wakeLock.on(); haptic.tick(); };
  const pause = () => { cancelAnimationFrame(r.current.raf); setRem(r.current.end - performance.now()); setRunning(false); wakeLock.off(); haptic.tick(); };
  const reset = () => { cancelAnimationFrame(r.current.raf); setRem(target); setDone(false); setRunning(false); wakeLock.off(); haptic.bump(); };
  const setPreset = (sec) => { const ms = sec * 1000; setTarget(ms); setRem(ms); setDone(false); haptic.tick(); };
  const adjust = (sec) => { const ms = Math.max(10000, Math.min(5999000, rem + sec * 1000)); setTarget(ms); setRem(ms); setDone(false); haptic.tick(); };

  const idle = !running && !done;
  return html`<div class="flex flex-col items-center" style="min-height:calc(100dvh - 8.5rem)">
    <div class="flex-1 flex flex-col items-center justify-center gap-2 w-full">
      <div id="tm-time" class=${`text-7xl font-bold tabular-nums ${done ? "text-success" : ""}`}>${fmtT(rem)}</div>
      ${done ? html`<div id="tm-done" class="text-success font-semibold text-lg">${T(t, "done")}</div>` : null}
    </div>
    ${idle ? html`<div class="w-full max-w-xs flex flex-col gap-3 mb-4">
      <div class="flex gap-2 justify-center flex-wrap">${PRESETS.map((p) => html`<button class=${`btn btn-sm rounded-xl ${target === p * 1000 ? "btn-primary" : "bg-base-200"}`} onClick=${() => setPreset(p)} key=${p}>${fmtT(p * 1000)}</button>`)}</div>
      <div class="flex gap-2 justify-center">${ADJ.map(([sec, lab]) => html`<button class="btn btn-sm rounded-xl bg-base-200 tabular-nums" onClick=${() => adjust(sec)} key=${lab}>${lab}</button>`)}</div>
    </div>` : null}
    <div class="flex gap-3 w-full max-w-xs">
      ${running
        ? html`<button id="tm-stop" class="btn btn-lg flex-1 rounded-2xl btn-warning" onClick=${pause}>${Icon("lucide:pause")}${T(t, "pause")}</button>`
        : html`<button id="tm-reset" class="btn btn-lg flex-1 rounded-2xl bg-base-200" onClick=${reset}>${Icon("lucide:rotate-ccw")}${T(t, "reset")}</button>
            <button id="tm-start" class="btn btn-lg flex-1 rounded-2xl btn-primary ${rem > 0 ? "" : "btn-disabled opacity-50"}" onClick=${start}>${Icon("lucide:play")}${T(t, "start")}</button>`}
    </div>
  </div>`;
}

export const views = { stopwatch: StopwatchView, timer: TimerView };
