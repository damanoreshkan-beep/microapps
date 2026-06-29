// CamView — camera with live CSS-filter presets (2026 trends) for the `tool` family. getUserMedia
// video (/_rt/sensors.js camera) → <video> with CSS `filter` for preview; the SAME string on a canvas
// (ctx.filter) captures the photo → download. ?mock shows a sample image so the live UI renders headless.
import { html } from "htm/preact";
import { useState, useEffect, useRef } from "preact/hooks";
import { useStore } from "@nanostores/preact";
import { persistentAtom } from "@nanostores/persistent";
import { camera, haptic } from "/_rt/sensors.js";
import { T } from "/_rt/core.js";

const Icon = (i, c = "") => html`<iconify-icon icon=${i} class=${c}></iconify-icon>`;
// 2026 trend presets as tuned CSS filter stacks (contrast/saturate/sepia/hue-rotate/brightness/grayscale)
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

export function CamView({ t, toast }) {
  const stream = useStore(camera.stream), perm = useStore(camera.permission);
  const idx = Math.min(PRESETS.length - 1, Math.max(0, Number(useStore(presetIdx)) || 0));
  const preset = PRESETS[idx];
  const [shot, setShot] = useState(null);
  const videoRef = useRef(null);
  const mock = typeof location !== "undefined" && new URLSearchParams(location.search).has("mock");
  const secure = typeof window === "undefined" || window.isSecureContext;
  const live = !!stream || mock;
  const filterStyle = `filter:${preset.css === "none" ? "none" : preset.css}`;
  const mirror = camera.facing === "user" ? "transform:scaleX(-1)" : "";

  useEffect(() => { const v = videoRef.current; if (v && stream) { v.srcObject = stream; v.play?.().catch(() => {}); } }, [stream]);
  useEffect(() => {
    try { navigator.permissions?.query?.({ name: "camera" }).then((p) => { camera.permission.set(p.state); p.onchange = () => camera.permission.set(p.state); }).catch(() => {}); } catch { /* */ }
    return () => camera.stop();
  }, []);

  const enable = async () => { if (!(await camera.start())) haptic.bump(); };
  const flip = () => camera.flip();
  const capture = () => {
    const v = videoRef.current; if (!v || !v.videoWidth) return;
    const c = document.createElement("canvas"); c.width = v.videoWidth; c.height = v.videoHeight;
    const x = c.getContext("2d");
    if (camera.facing === "user") { x.translate(c.width, 0); x.scale(-1, 1); }
    x.filter = preset.css === "none" ? "none" : preset.css;
    x.drawImage(v, 0, 0, c.width, c.height);
    c.toBlob((b) => { if (b) { setShot(URL.createObjectURL(b)); haptic.ok(); } }, "image/jpeg", 0.92);
  };

  return html`<div class="flex flex-col px-3 pt-2 pb-2 gap-2" style="height:calc(100dvh - 8.5rem)">
    <div class="relative flex-1 rounded-2xl overflow-hidden bg-black flex items-center justify-center">
      ${shot
        ? html`<img src=${shot} class="w-full h-full object-contain" alt="" />`
        : live
          ? (mock
              ? html`<img src=${MOCK_IMG} class="w-full h-full object-cover" style=${filterStyle} alt="" />`
              : html`<video id="cam-video" ref=${videoRef} autoplay playsinline muted class="w-full h-full object-cover" style=${`${filterStyle};${mirror}`}></video>`)
          : html`<div class="flex flex-col items-center justify-center text-center gap-3 px-8 text-base-content">
              ${!secure ? html`${Icon("lucide:shield-alert", "text-5xl text-warning/80")}<div class="font-medium">${T(t, "secureNeeded")}</div><div class="text-sm text-base-content/70">${T(t, "secureHint")}</div>`
                : !camera.supported ? html`${Icon("lucide:camera-off", "text-5xl text-base-content/60")}<div class="font-medium">${T(t, "noCam")}</div><div class="text-sm text-base-content/70">${T(t, "noCamHint")}</div>`
                : perm === "denied" ? html`${Icon("lucide:camera-off", "text-5xl text-error/80")}<div class="font-medium">${T(t, "camDenied")}</div><div class="text-sm text-base-content/70">${T(t, "camDeniedHint")}</div><button id="cam-enable" class="btn btn-ghost btn-sm rounded-2xl gap-1 mt-1" onClick=${enable}>${Icon("lucide:rotate-cw")}${T(t, "enableCam")}</button>`
                : html`${Icon("lucide:camera", "text-5xl text-primary")}<div class="text-sm text-base-content/70">${T(t, "camHint")}</div><button id="cam-enable" class="btn btn-primary rounded-2xl gap-2 mt-1" onClick=${enable}>${Icon("lucide:camera")}${T(t, "enableCam")}</button>`}
            </div>`}
      ${live && !shot ? html`<button id="cam-flip" class="btn btn-circle btn-sm bg-black/50 border-0 text-white absolute top-2 right-2" aria-label=${T(t, "flip")} onClick=${flip}>${Icon("lucide:switch-camera", "text-lg")}</button>` : null}
    </div>

    <div id="cam-strip" class="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
      ${PRESETS.map((p, i) => html`<button data-preset=${i} key=${p.k} onClick=${() => presetIdx.set(String(i))}
        class=${`shrink-0 rounded-xl px-3 py-2 text-xs font-medium border ${i === idx ? "border-primary bg-primary/15 text-primary" : "border-base-300 bg-base-100 text-base-content/80"}`}>${T(t, p.k)}</button>`)}
    </div>

    <div class="flex items-center justify-center gap-4 h-16">
      ${shot
        ? html`<button class="btn btn-ghost rounded-2xl gap-2" onClick=${() => setShot(null)}>${Icon("lucide:rotate-ccw")}${T(t, "retake")}</button>
            <a href=${shot} download="photo.jpg" class="btn btn-primary rounded-2xl gap-2" onClick=${() => { haptic.ok(); toast(T(t, "saved")); }}>${Icon("lucide:download")}${T(t, "save")}</a>`
        : html`<button id="cam-capture" class=${`btn btn-circle w-16 h-16 ${live ? "btn-primary" : "btn-disabled"}`} aria-label=${T(t, "capture")} onClick=${capture}>${Icon("lucide:circle", "text-3xl")}</button>`}
    </div>
  </div>`;
}

export const views = { cam: CamView };
