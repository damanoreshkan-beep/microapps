// LightView — flashlight for the `tool` family. Camera LED via track torch (applyConstraints) when the
// device exposes it (back camera), else a full-screen white "screen light" fallback. SOS strobes the
// light in Morse ···———···. wakeLock keeps the screen on. ?mock shows the on state.
import { html } from "htm/preact";
import { useState, useEffect, useRef } from "preact/hooks";
import { camera, haptic, wakeLock } from "/_rt/sensors.js";
import { T } from "/_rt/core.js";

const Icon = (i, c = "") => html`<iconify-icon icon=${i} class=${c}></iconify-icon>`;
const U = 220;
const SOS = [[1, U], [0, U], [1, U], [0, U], [1, U], [0, 3 * U],            // S
  [1, 3 * U], [0, U], [1, 3 * U], [0, U], [1, 3 * U], [0, 3 * U],           // O
  [1, U], [0, U], [1, U], [0, U], [1, U], [0, 7 * U]];                      // S + word gap

export function LightView({ t }) {
  const mock = typeof location !== "undefined" && new URLSearchParams(location.search).has("mock");
  const secure = typeof window === "undefined" || window.isSecureContext;
  const [on, setOn] = useState(mock);
  const [mode, setMode] = useState(mock ? "torch" : null);   // "torch" | "screen"
  const [sos, setSos] = useState(false);
  const [lit, setLit] = useState(mock);                      // current light state (for screen flash / icon)
  const sosT = useRef(0), modeRef = useRef(mock ? "torch" : null);

  const apply = (v) => { setLit(!!v); if (modeRef.current === "torch") camera.torch(v); };
  const stopSos = (steady) => { clearTimeout(sosT.current); apply(steady ? 1 : 0); };
  const startSos = () => { let i = 0; const step = () => { const [l, ms] = SOS[i % SOS.length]; apply(l); i++; sosT.current = setTimeout(step, ms); }; step(); };

  useEffect(() => () => { clearTimeout(sosT.current); camera.stop(); wakeLock.off(); }, []);

  const powerOn = async () => {
    let m = "screen";
    try { if (await camera.start("environment") && camera.torchSupported()) { await camera.torch(true); m = "torch"; } else camera.stop(); } catch { /* */ }
    modeRef.current = m; setMode(m); setOn(true); setLit(true); wakeLock.on(); haptic.ok();
  };
  const powerOff = () => { clearTimeout(sosT.current); camera.stop(); wakeLock.off(); setOn(false); setSos(false); setLit(false); setMode(null); modeRef.current = null; haptic.ok(); };
  const toggleSos = () => { if (!on) return; if (sos) { setSos(false); stopSos(true); } else { setSos(true); haptic.bump(); startSos(); } };

  const screenFlash = on && mode === "screen";

  return html`<div class="relative flex flex-col items-center justify-center" style="height:calc(100dvh - 8.5rem)">
    ${screenFlash ? html`<div class="fixed inset-0 z-30 transition-opacity duration-75" style=${`background:#fff;opacity:${lit ? 1 : 0}`} onClick=${powerOff}></div>` : null}
    <div class=${`relative z-40 flex flex-col items-center gap-6 px-4 text-center ${screenFlash ? "bg-base-100/85 backdrop-blur rounded-3xl py-8" : ""}`}>
      <div class=${`rounded-full p-8 transition-colors ${on && lit ? "bg-warning/20" : "bg-base-300"}`}>${Icon("lucide:flashlight", `text-7xl ${on && lit ? "text-warning" : "text-base-content/50"}`)}</div>
      <div><div class="font-bold text-xl">${T(t, on ? "on" : "off")}</div>
        ${on ? html`<div class="text-sm text-base-content/70 mt-1">${T(t, mode === "torch" ? "modeTorch" : "modeScreen")}</div>` : (!secure ? html`<div class="text-sm text-warning/80 mt-1">${T(t, "modeScreen")}</div>` : null)}</div>
      <button id="fl-power" class=${`btn btn-lg max-w-full rounded-2xl gap-2 ${on ? "btn-warning" : "btn-primary"}`} onClick=${on ? powerOff : powerOn}>${Icon(on ? "lucide:power-off" : "lucide:power")}${T(t, on ? "turnOff" : "turnOn")}</button>
      ${on ? html`<button id="fl-sos" class=${`btn max-w-full rounded-2xl gap-2 ${sos ? "btn-error" : "btn-ghost bg-base-200"}`} onClick=${toggleSos}>${Icon("lucide:siren")}${T(t, "sos")}</button>
        <div class="text-xs text-base-content/60">${sos ? T(t, "sosNote") : (screenFlash ? T(t, "tapOff") : "")}</div>` : null}
    </div>
  </div>`;
}

export const views = { light: LightView };
