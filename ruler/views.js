// RulerView — the irreducible custom visual for the `tool` family. Built on shared primitives:
// preact hooks (import map), persisted calibration (nanostores/persistent), haptics (/_rt/sensors.js),
// i18n T (/_rt/core.js). The shell (AppBar/Dock/Profile/theme/install/routing/gates) is the runtime's.
// IMPORTANT: the calibration sub-screen routes through the runtime's history-backed `screen` prop
// (NOT local state) so the system Back button closes it instead of exiting the app.
import { html } from "htm/preact";
import { useState, useRef, useEffect, useCallback } from "preact/hooks";
import { useStore } from "@nanostores/preact";
import { persistentAtom } from "@nanostores/persistent";
import { haptic } from "/_rt/sensors.js";
import { T } from "/_rt/core.js";

const Icon = (i, c = "") => html`<iconify-icon icon=${i} class=${c}></iconify-icon>`;
// CSS px per real cm. Calibrated by the user; default is a reasonable phone guess (refined per device).
const pxPerCm = persistentAtom("ruler:pxPerCm", "56");
const CARD_CM = 5.4; // bank-card SHORT edge (53.98 mm) — fits a narrow phone width, unlike the long edge

export function RulerView({ t, toast, screen, openScreen, closeScreen }) {
  const ppc = Math.max(20, Number(useStore(pxPerCm)) || 56);
  const [markerY, setMarkerY] = useState(0);
  const [boxH, setBoxH] = useState(0);
  const boxRef = useRef(null);
  const lastCm = useRef(0);
  const onCalib = screen === "calib";

  useEffect(() => {
    const el = boxRef.current; if (!el || typeof ResizeObserver === "undefined") { if (el) setBoxH(el.clientHeight); return; }
    const measure = () => setBoxH(el.clientHeight);
    measure(); const ro = new ResizeObserver(measure); ro.observe(el);
    return () => ro.disconnect();
  }, [onCalib]);

  const drag = useCallback((e) => {
    const r = boxRef.current.getBoundingClientRect();
    const y = Math.max(0, Math.min(r.height, (e.clientY ?? 0) - r.top));
    setMarkerY(y);
    const c = Math.floor(y / ppc);
    if (c !== lastCm.current) { lastCm.current = c; haptic.tick(); }   // light buzz crossing each cm
  }, [ppc]);
  const onDown = (e) => { e.currentTarget.setPointerCapture?.(e.pointerId); drag(e); };

  const cm = markerY / ppc;
  const mm = Math.round(cm * 10);

  // ── calibration sub-screen (history-backed via `screen`) ─────────────
  if (onCalib) {
    return html`<div id="calib" class="flex flex-col gap-4 px-4 pt-3">
      <div class="card bg-base-100 border border-base-300 rounded-2xl"><div class="card-body p-4 gap-3">
        <h2 class="font-bold text-lg flex items-center gap-2">${Icon("lucide:scan-line", "text-primary")}${T(t, "calibTitle")}</h2>
        <p class="text-sm text-base-content/70">${T(t, "calibHint")}</p>
        <div class="py-3 flex flex-col items-start gap-1">
          <div class="h-12 rounded-lg bg-primary/25 border-2 border-primary flex items-center justify-center text-xs text-primary font-medium" style=${`width:${ppc * CARD_CM}px`}>${CARD_CM} см</div>
        </div>
        <input id="calib-range" type="range" min="38" max="80" step="0.2" value=${ppc} class="range range-primary" onInput=${(e) => pxPerCm.set(String(e.target.value))} />
        <div class="text-center tabular-nums text-sm text-base-content/70">${ppc.toFixed(1)} px / см</div>
        <button id="calib-save" class="btn btn-primary rounded-2xl mt-1" onClick=${() => { closeScreen(); haptic.ok(); toast(T(t, "calibDone")); }}>${T(t, "calibSave")}</button>
      </div></div>
    </div>`;
  }

  // ── ruler screen (scale flush to the LEFT screen edge) ───────────────
  const ticks = [];
  const maxMm = Math.ceil((boxH || 600) / ppc) * 10;
  for (let i = 0; i <= maxMm; i++) {
    const y = (i / 10) * ppc;
    if (boxH && y > boxH) break;
    const isCm = i % 10 === 0, isHalf = i % 5 === 0;
    ticks.push(html`<div class="aw-tick absolute left-0 bg-base-content/70" key=${"t" + i} style=${`top:${y}px;height:1.5px;width:${isCm ? 56 : isHalf ? 34 : 20}px`}></div>`);
    if (isCm && i > 0) ticks.push(html`<div class="absolute text-xs tabular-nums text-base-content/80" key=${"n" + i} style=${`top:${y - 7}px;left:62px`}>${i / 10}</div>`);
  }

  return html`<div class="flex flex-col" style="height:calc(100dvh - 9rem)">
    <div class="flex items-center gap-3 px-4 pt-2">
      <div id="ruler-readout" class="flex-1 tabular-nums"><span class="text-3xl font-bold">${cm.toFixed(1)}</span><span class="text-lg font-semibold"> см</span><span class="text-base-content/70 text-sm"> · ${mm} мм</span></div>
      <button id="ruler-calib" class="btn btn-sm btn-ghost bg-base-100 border border-base-300 rounded-full gap-1" onClick=${() => openScreen("calib")}>${Icon("lucide:scan-line")}${T(t, "calibrate")}</button>
    </div>
    <div class="text-xs text-base-content/70 px-4 mt-0.5">${T(t, "rulerHint")}</div>
    <div id="ruler-box" ref=${boxRef} class="relative flex-1 bg-base-100 border-y border-base-300 overflow-hidden select-none mt-2" style="touch-action:none"
         onPointerDown=${onDown} onPointerMove=${(e) => e.buttons && drag(e)}>
      ${ticks}
      <div class="absolute left-0 right-0 flex items-center pointer-events-none" style=${`top:${markerY}px;transform:translateY(-50%)`}>
        <div class="h-0.5 flex-1 bg-primary"></div>
        <div class="bg-primary text-primary-content text-xs font-bold tabular-nums rounded-l-lg px-2 py-1 shadow">${cm.toFixed(1)} см</div>
      </div>
      <div class="absolute right-2 pointer-events-none" style=${`top:${markerY}px;transform:translateY(-50%)`}>${Icon("lucide:grip-horizontal", "text-primary text-2xl")}</div>
    </div>
  </div>`;
}

export const views = { ruler: RulerView };
