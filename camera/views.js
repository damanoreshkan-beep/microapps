// CamView — camera with live CSS-filter presets (2026 trends). Fixes: WYSIWYG (preview box aspect =
// video aspect → capture matches), pinch zoom (hardware via applyConstraints, else digital crop;
// touch-action:none stops the PAGE zooming), continuous autofocus (sensors.js), no black screen
// (play on loadedmetadata + spinner), flip keeps the preview (not the enable gate). ?mock renders a sample.
import { html } from "htm/preact";
import { useState, useEffect, useRef } from "preact/hooks";
import { useStore } from "@nanostores/preact";
import { persistentAtom } from "@nanostores/persistent";
import { camera, haptic } from "/_rt/sensors.js";
import { T } from "/_rt/core.js";

const Icon = (i, c = "") => html`<iconify-icon icon=${i} class=${c}></iconify-icon>`;
const PRESETS = [
  { k: "pOriginal", css: "none" },
  { k: "pPortra", css: "contrast(.92) saturate(1.12) sepia(.18) brightness(1.05)" },
  { k: "pCinema", css: "contrast(1.18) saturate(1.3) hue-rotate(-10deg) brightness(.98)" },
  { k: "pMoody", css: "contrast(1.12) saturate(.85) brightness(.93) sepia(.12)" },
  { k: "pVintage", css: "contrast(.85) saturate(.8) sepia(.35) brightness(1.06)" },
  { k: "pPastel", css: "contrast(.9) saturate(.82) brightness(1.1) sepia(.05)" },
  { k: "pNoir", css: "grayscale(1) contrast(1.08) sepia(.22) brightness(1.02)" },
  { k: "pCool", css: "contrast(1.1) saturate(1.12) hue-rotate(10deg) brightness(1.02)" },
];
const presetIdx = persistentAtom("camera:preset", "0");
const MOCK_IMG = "https://picsum.photos/id/64/720/1280";
const dist = (ts) => Math.hypot(ts[0].clientX - ts[1].clientX, ts[0].clientY - ts[1].clientY);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function CamView({ t, toast }) {
  const stream = useStore(camera.stream), perm = useStore(camera.permission);
  const idx = clamp(Number(useStore(presetIdx)) || 0, 0, PRESETS.length - 1);
  const preset = PRESETS[idx];
  const mock = typeof location !== "undefined" && new URLSearchParams(location.search).has("mock");
  const secure = typeof window === "undefined" || window.isSecureContext;

  const [shot, setShot] = useState(null);
  const [active, setActive] = useState(mock);       // a session started → never show the enable gate during flips
  const [dim, setDim] = useState(null);             // {w,h} actual video size → preview aspect = WYSIWYG
  const [ready, setReady] = useState(mock);
  const [zoom, setZoom] = useState(1);              // current zoom (hardware units or digital factor)
  const videoRef = useRef(null), pinch = useRef(null);
  const cssFilter = preset.css === "none" ? "none" : preset.css;

  useEffect(() => { const v = videoRef.current; if (v && stream) { v.srcObject = stream; v.play?.().catch(() => {}); } }, [stream]);
  useEffect(() => {
    try { navigator.permissions?.query?.({ name: "camera" }).then((p) => { camera.permission.set(p.state); p.onchange = () => camera.permission.set(p.state); }).catch(() => {}); } catch { /* */ }
    return () => camera.stop();
  }, []);

  const enable = async () => { setActive(true); setReady(false); if (!(await camera.start())) { haptic.bump(); setActive(false); } };
  const flip = async () => { setReady(false); setZoom(1); await camera.flip(); };
  const onMeta = () => { const v = videoRef.current; if (v?.videoWidth) { setDim({ w: v.videoWidth, h: v.videoHeight }); setReady(true); } };

  // pinch → hardware zoom (applyConstraints) if available, else digital (CSS + capture crop)
  const hwZoom = () => camera.zoomRange();
  const onTouchStart = (e) => { if (e.touches.length === 2) pinch.current = { d0: dist(e.touches), z0: zoom }; };
  const onTouchMove = (e) => {
    if (e.touches.length !== 2 || !pinch.current) return;
    const f = dist(e.touches) / pinch.current.d0, hw = hwZoom();
    const nz = hw ? clamp(pinch.current.z0 * f, hw.min, hw.max) : clamp(pinch.current.z0 * f, 1, 4);
    setZoom(nz); if (hw) camera.setZoom(nz);
  };
  const onTouchEnd = (e) => { if (e.touches.length < 2) pinch.current = null; };

  const capture = () => {
    const v = videoRef.current; if (!v?.videoWidth) return;
    const vw = v.videoWidth, vh = v.videoHeight;
    const dz = hwZoom() ? 1 : zoom;                 // digital crop only when zoom isn't done by the sensor
    const sw = vw / dz, sh = vh / dz, sx = (vw - sw) / 2, sy = (vh - sh) / 2;
    const c = document.createElement("canvas"); c.width = vw; c.height = vh;
    const x = c.getContext("2d");
    if (camera.facing === "user") { x.translate(vw, 0); x.scale(-1, 1); }
    x.filter = cssFilter;
    x.drawImage(v, sx, sy, sw, sh, 0, 0, vw, vh);
    c.toBlob((b) => { if (b) { setShot(URL.createObjectURL(b)); haptic.ok(); } }, "image/jpeg", 0.92);
  };

  // video transform: mirror front + digital zoom (skip scale when hardware-zoomed)
  const sx = (camera.facing === "user" ? -1 : 1) * (hwZoom() ? 1 : zoom);
  const sy = hwZoom() ? 1 : zoom;
  const vStyle = `filter:${cssFilter};transform:scaleX(${sx}) scaleY(${sy})`;
  const aspect = dim ? `${dim.w}/${dim.h}` : "3/4";

  let inner;
  if (shot) inner = html`<img src=${shot} class="w-full h-full object-contain" alt="" />`;
  else if (!active) inner = html`<div class="absolute inset-0 flex flex-col items-center justify-center text-center gap-3 px-8 text-base-content">
    ${!secure ? html`${Icon("lucide:shield-alert", "text-5xl text-warning/80")}<div class="font-medium">${T(t, "secureNeeded")}</div><div class="text-sm text-base-content/70">${T(t, "secureHint")}</div>`
      : !camera.supported ? html`${Icon("lucide:camera-off", "text-5xl text-base-content/60")}<div class="font-medium">${T(t, "noCam")}</div><div class="text-sm text-base-content/70">${T(t, "noCamHint")}</div>`
      : perm === "denied" ? html`${Icon("lucide:camera-off", "text-5xl text-error/80")}<div class="font-medium">${T(t, "camDenied")}</div><div class="text-sm text-base-content/70">${T(t, "camDeniedHint")}</div><button id="cam-enable" class="btn btn-ghost btn-sm rounded-2xl gap-1 mt-1" onClick=${enable}>${Icon("lucide:rotate-cw")}${T(t, "enableCam")}</button>`
      : html`${Icon("lucide:camera", "text-5xl text-primary")}<div class="text-sm text-base-content/70">${T(t, "camHint")}</div><button id="cam-enable" class="btn btn-primary rounded-2xl gap-2 mt-1" onClick=${enable}>${Icon("lucide:camera")}${T(t, "enableCam")}</button>`}
  </div>`;
  else if (mock) inner = html`<img src=${MOCK_IMG} class="w-full h-full object-cover" style=${`filter:${cssFilter}`} alt="" />`;
  else inner = html`
    <video id="cam-video" ref=${videoRef} autoplay playsinline muted onloadedmetadata=${onMeta} class="w-full h-full object-cover" style=${vStyle}></video>
    ${!ready ? html`<div class="absolute inset-0 flex items-center justify-center bg-black"><span class="loading loading-spinner loading-lg text-primary"></span></div>` : null}`;

  return html`<div class="flex flex-col px-3 pt-2 pb-2 gap-2" style="height:calc(100dvh - 8.5rem)">
    <div class="flex-1 flex items-center justify-center min-h-0">
      <div class="relative w-full rounded-2xl overflow-hidden bg-black select-none" style=${`aspect-ratio:${aspect};max-height:100%;touch-action:none`}
           onTouchStart=${onTouchStart} onTouchMove=${onTouchMove} onTouchEnd=${onTouchEnd}>
        ${inner}
        ${active && !shot && ready ? html`<button id="cam-flip" class="btn btn-circle btn-sm bg-black/50 border-0 text-white absolute top-2 right-2" aria-label=${T(t, "flip")} onClick=${flip}>${Icon("lucide:switch-camera", "text-lg")}</button>` : null}
        ${zoom > 1.05 ? html`<div class="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/55 text-white text-xs font-medium tabular-nums rounded-full px-2.5 py-1">${zoom.toFixed(1)}×</div>` : null}
      </div>
    </div>

    <div id="cam-strip" class="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
      ${PRESETS.map((p, i) => html`<button data-preset=${i} key=${p.k} onClick=${() => presetIdx.set(String(i))}
        class=${`shrink-0 rounded-xl px-3 py-2 text-xs font-medium border ${i === idx ? "border-primary bg-primary/15 text-primary" : "border-base-300 bg-base-100 text-base-content/80"}`}>${T(t, p.k)}</button>`)}
    </div>

    <div class="flex items-center justify-center gap-4 h-16">
      ${shot
        ? html`<button class="btn btn-ghost rounded-2xl gap-2" onClick=${() => setShot(null)}>${Icon("lucide:rotate-ccw")}${T(t, "retake")}</button>
            <a href=${shot} download="photo.jpg" class="btn btn-primary rounded-2xl gap-2" onClick=${() => { haptic.ok(); toast(T(t, "saved")); }}>${Icon("lucide:download")}${T(t, "save")}</a>`
        : html`<button id="cam-capture" class=${`btn btn-circle w-16 h-16 ${active && stream && ready ? "btn-primary" : "btn-disabled"}`} aria-label=${T(t, "capture")} onClick=${capture}>${Icon("lucide:circle", "text-3xl")}</button>`}
    </div>
  </div>`;
}

export const views = { cam: CamView };
