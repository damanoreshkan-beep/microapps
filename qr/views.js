// ScanView — QR/barcode scanner for the `tool` family. Reuses the shared camera (/_rt/sensors.js);
// decodes via the native BarcodeDetector (Android Chrome) with a jsQR WASM-free fallback (iOS/desktop).
// On a hit: show value → Open (URL) / Copy, save to history. ?mock shows a result so the live screen
// renders headless. History is a HISTORY-BACKED sub-screen via the runtime `screen` prop.
import { html } from "htm/preact";
import { useState, useEffect, useRef } from "preact/hooks";
import { useStore } from "@nanostores/preact";
import { persistentAtom } from "@nanostores/persistent";
import { camera, haptic } from "/_rt/sensors.js";
import { T } from "/_rt/core.js";

const Icon = (i, c = "") => html`<iconify-icon icon=${i} class=${c}></iconify-icon>`;
const hist = persistentAtom("qr:history", [], { encode: JSON.stringify, decode: JSON.parse });
const isURL = (s) => /^https?:\/\//i.test((s || "").trim());

export function ScanView({ t, toast, screen, openScreen, closeScreen }) {
  const stream = useStore(camera.stream), perm = useStore(camera.permission), history = useStore(hist);
  const mock = typeof location !== "undefined" && new URLSearchParams(location.search).has("mock");
  const secure = typeof window === "undefined" || window.isSecureContext;
  const [active, setActive] = useState(mock);
  const [ready, setReady] = useState(mock);
  const [result, setResult] = useState(() => (mock ? { value: "https://anubis.world", format: "qr_code" } : null));
  const videoRef = useRef(null);

  useEffect(() => { const v = videoRef.current; if (v && stream) { v.srcObject = stream; v.play?.().catch(() => {}); } }, [stream]);
  useEffect(() => {
    try { navigator.permissions?.query?.({ name: "camera" }).then((p) => { camera.permission.set(p.state); p.onchange = () => camera.permission.set(p.state); }).catch(() => {}); } catch { /* */ }
    return () => camera.stop();
  }, []);

  const found = (value, format) => {
    if (!value) return;
    setResult({ value, format });
    hist.set([{ v: value, ts: Date.now() }, ...history.filter((h) => h.v !== value)].slice(0, 40));
    haptic.ok();
  };

  // scan loop — native BarcodeDetector if present, else lazy jsQR; runs only while live & not holding a result
  useEffect(() => {
    if (!stream || !ready || result || mock) return;
    let stop = false, det = null, jsqr = null, canvas = null;
    (async () => {
      try {
        if ("BarcodeDetector" in window) det = new window.BarcodeDetector({ formats: ["qr_code", "ean_13", "ean_8", "code_128", "code_39", "upc_a", "upc_e", "data_matrix", "itf"] });
        else { jsqr = (await import("https://esm.sh/jsqr@1.4.0")).default; canvas = document.createElement("canvas"); }
      } catch { /* */ }
      const tick = async () => {
        if (stop) return;
        const v = videoRef.current;
        if (v && v.videoWidth) {
          try {
            if (det) { const codes = await det.detect(v); if (codes && codes[0]) { found(codes[0].rawValue, codes[0].format); return; } }
            else if (jsqr) { const w = Math.min(640, v.videoWidth), h = Math.round(w * v.videoHeight / v.videoWidth); canvas.width = w; canvas.height = h; const cx = canvas.getContext("2d"); cx.drawImage(v, 0, 0, w, h); const r = jsqr(cx.getImageData(0, 0, w, h).data, w, h); if (r && r.data) { found(r.data, "qr_code"); return; } }
          } catch { /* */ }
        }
        if (!stop) setTimeout(() => requestAnimationFrame(tick), 220);   // ~4 scans/sec
      };
      tick();
    })();
    return () => { stop = true; };
  }, [stream, ready, result, mock]);

  const enable = async () => { setActive(true); setReady(false); if (!(await camera.start())) { haptic.bump(); setActive(false); return; } if (camera.facing !== "environment") camera.flip(); };
  const flip = () => { setReady(false); camera.flip(); };
  const again = () => setResult(null);
  const copy = async () => { try { await navigator.clipboard?.writeText(result.value); toast(T(t, "copied")); haptic.ok(); } catch { /* */ } };

  // ── history sub-screen (history-backed) ──────────────────────────────
  if (screen === "history") {
    return html`<div id="qr-history" class="flex flex-col gap-3 px-4 pt-3">
      <div class="flex items-center justify-between"><h2 class="font-bold text-lg flex items-center gap-2">${Icon("lucide:history", "text-primary")}${T(t, "historyTitle")}</h2>
        ${history.length ? html`<button class="btn btn-ghost btn-sm text-error gap-1" onClick=${() => hist.set([])}>${Icon("lucide:trash-2")}${T(t, "clear")}</button>` : null}</div>
      ${history.length
        ? history.map((h, i) => html`<button class="card bg-base-100 border border-base-300 rounded-2xl text-left" key=${i} onClick=${() => { setResult({ value: h.v, format: "" }); closeScreen(); }}><div class="card-body p-3 px-4 flex-row items-center gap-2">${Icon(isURL(h.v) ? "lucide:link" : "lucide:text", "text-primary shrink-0")}<span class="text-sm break-all line-clamp-2">${h.v}</span></div></button>`)
        : html`<div class="text-sm text-base-content/70 text-center py-10">${T(t, "noHistory")}</div>`}
    </div>`;
  }

  const reticle = html`<div class="absolute inset-0 pointer-events-none flex items-center justify-center"><div class="relative w-56 h-56 max-w-[70vw] max-h-[70vw]">
    ${["top-0 left-0 border-t-4 border-l-4 rounded-tl-xl", "top-0 right-0 border-t-4 border-r-4 rounded-tr-xl", "bottom-0 left-0 border-b-4 border-l-4 rounded-bl-xl", "bottom-0 right-0 border-b-4 border-r-4 rounded-br-xl"].map((c, i) => html`<span class=${`absolute w-8 h-8 border-primary ${c}`} key=${i}></span>`)}
  </div></div>`;

  return html`<div class="flex flex-col px-3 pt-2 pb-2 gap-2" style="height:calc(100dvh - 8.5rem)">
    <div class="flex justify-end mb-0.5"><button id="qr-history-btn" class="btn btn-sm btn-ghost bg-base-100 border border-base-300 rounded-full gap-1" onClick=${() => openScreen("history")}>${Icon("lucide:history")}${T(t, "history")} ${history.length ? html`<span class="badge badge-xs badge-primary">${history.length}</span>` : null}</button></div>

    <div class="relative flex-1 rounded-2xl overflow-hidden bg-black flex items-center justify-center min-h-0">
      ${!active
        ? html`<div class="flex flex-col items-center justify-center text-center gap-3 px-8 text-base-content">
            ${!secure ? html`${Icon("lucide:shield-alert", "text-5xl text-warning/80")}<div class="font-medium">${T(t, "secureNeeded")}</div><div class="text-sm text-base-content/70">${T(t, "secureHint")}</div>`
              : !camera.supported ? html`${Icon("lucide:camera-off", "text-5xl text-base-content/60")}<div class="font-medium">${T(t, "noCam")}</div><div class="text-sm text-base-content/70">${T(t, "noCamHint")}</div>`
              : perm === "denied" ? html`${Icon("lucide:camera-off", "text-5xl text-error/80")}<div class="font-medium">${T(t, "camDenied")}</div><div class="text-sm text-base-content/70">${T(t, "camDeniedHint")}</div><button id="scan-enable" class="btn btn-ghost btn-sm rounded-2xl gap-1 mt-1" onClick=${enable}>${Icon("lucide:rotate-cw")}${T(t, "enableCam")}</button>`
              : html`${Icon("lucide:scan-line", "text-5xl text-primary")}<div class="text-sm text-base-content/70">${T(t, "camHint")}</div><button id="scan-enable" class="btn btn-primary rounded-2xl gap-2 mt-1" onClick=${enable}>${Icon("lucide:camera")}${T(t, "enableCam")}</button>`}
          </div>`
        : html`
            ${mock ? html`<div class="absolute inset-0 bg-gradient-to-br from-base-300 to-black"></div>` : html`<video ref=${videoRef} autoplay playsinline muted onloadedmetadata=${() => { if (videoRef.current?.videoWidth) setReady(true); }} class="w-full h-full object-cover"></video>`}
            ${!ready && !mock ? html`<div class="absolute inset-0 flex items-center justify-center bg-black"><span class="loading loading-spinner loading-lg text-primary"></span></div>` : null}
            ${!result ? reticle : null}
            ${!result ? html`<div class="absolute bottom-2 left-0 right-0 flex justify-center"><span class="bg-black/55 text-white text-xs rounded-full px-3 py-1">${T(t, "scanHint")}</span></div>` : null}
            ${!result ? html`<button id="scan-flip" class="btn btn-circle btn-sm bg-black/50 border-0 text-white absolute top-2 right-2" aria-label=${T(t, "flip")} onClick=${flip}>${Icon("lucide:switch-camera", "text-lg")}</button>` : null}`}
    </div>

    ${result ? html`<div class="card bg-base-100 border border-base-300 rounded-2xl"><div class="card-body p-4 gap-3">
      <div class="flex items-start gap-2">${Icon(isURL(result.value) ? "lucide:link" : "lucide:text", "text-primary text-xl mt-0.5 shrink-0")}<div class="text-sm break-all flex-1 min-w-0">${result.value}</div></div>
      <div class="flex gap-2">
        ${isURL(result.value) ? html`<a href=${result.value} target="_blank" rel="noopener" class="btn btn-primary rounded-2xl flex-1 gap-1">${Icon("lucide:external-link")}${T(t, "open")}</a>` : null}
        <button class="btn btn-ghost bg-base-200 rounded-2xl flex-1 gap-1" onClick=${copy}>${Icon("lucide:copy")}${T(t, "copy")}</button>
      </div>
      <button id="scan-again" class="btn btn-ghost btn-sm rounded-2xl gap-1" onClick=${again}>${Icon("lucide:scan-line")}${T(t, "scanAgain")}</button>
    </div></div>` : null}
  </div>`;
}

export const views = { scan: ScanView };
