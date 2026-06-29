// Assemble dist/ for static hosting (GitHub Pages) — no backend. Runtime at _rt/, every app copied
// in, an auto-generated portal at index.html, and the absolute /_rt/ rewritten to the Pages base.
// Data apps work via the direct-first / public-proxy chain in feed.js.
//   deno run -A deploy/build.mjs [basePath]    e.g. /microapps  ("" = served at domain root)
import { walk } from "jsr:@std/fs@^1/walk";

const BASE = (Deno.args[0] ?? "").replace(/\/$/, "");
const ROOT = Deno.cwd();
const DIST = `${ROOT}/dist`;

const sh = async (...a) => {
  const { code, stderr } = await new Deno.Command(a[0], { args: a.slice(1) }).output();
  if (code) throw new Error(`${a.join(" ")}: ${new TextDecoder().decode(stderr)}`);
};

await Deno.remove(DIST, { recursive: true }).catch(() => {});
await Deno.mkdir(DIST, { recursive: true });

// shared runtime → dist/_rt (drop dev-only test/config files)
await sh("cp", "-r", `${ROOT}/skill/runtime`, `${DIST}/_rt`);
for await (const e of Deno.readDir(`${DIST}/_rt`)) {
  if (/_test\.|^deno\.(json|lock)$/.test(e.name)) await Deno.remove(`${DIST}/_rt/${e.name}`).catch(() => {});
}

// every spec-driven app → dist/<app>, collect portal entries
const apps = [];
for await (const e of Deno.readDir(ROOT)) {
  if (!e.isDirectory || e.name === "dist" || e.name === "skill" || e.name.startsWith(".")) continue;
  let spec;
  try { spec = JSON.parse(await Deno.readTextFile(`${ROOT}/${e.name}/spec.json`)); } catch { continue; }
  await sh("cp", "-r", `${ROOT}/${e.name}`, `${DIST}/${e.name}`);
  await Deno.remove(`${DIST}/${e.name}/e2e.spec.mjs`).catch(() => {});
  await Deno.remove(`${DIST}/${e.name}/states`, { recursive: true }).catch(() => {});
  const dict = spec.i18n?.uk || spec.i18n?.en || {};
  const tab0 = spec.tabs?.[0] || {};
  apps.push({
    id: e.name,
    title: dict[tab0.titleKey] || dict.title || e.name,
    icon: spec.profile?.icon || tab0.icon || "lucide:app-window",
  });
}
apps.sort((a, b) => a.title.localeCompare(b.title, "uk"));

// portal index.html
const cards = apps.map((a) => `      <a class="flex flex-col items-center gap-2 p-4 rounded-3xl bg-base-100 border border-base-300 active:scale-95 transition" href="${BASE}/${a.id}/">
        <iconify-icon icon="${a.icon}" class="text-4xl text-primary"></iconify-icon>
        <span class="text-sm font-medium text-center leading-tight">${a.title}</span>
      </a>`).join("\n");
const portal = `<!DOCTYPE html>
<html lang="uk" data-theme="dim">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="theme-color" content="#1c212b">
  <title>Мікроапки</title>
  <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
  <link href="https://cdn.jsdelivr.net/npm/daisyui@5" rel="stylesheet" type="text/css" />
  <link href="https://cdn.jsdelivr.net/npm/daisyui@5/themes.css" rel="stylesheet" type="text/css" />
  <script src="https://code.iconify.design/iconify-icon/3.0.0/iconify-icon.min.js"></script>
  <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@500;700;800&display=swap" rel="stylesheet">
  <style>body{font-family:'Manrope',ui-sans-serif,system-ui,sans-serif}</style>
</head>
<body class="bg-base-200 min-h-dvh">
  <main class="max-w-md mx-auto px-4 py-8">
    <h1 class="text-2xl font-extrabold mb-1">Мікроапки</h1>
    <p class="text-sm text-base-content/60 mb-6">${apps.length} застосунків · працюють офлайн</p>
    <div class="grid grid-cols-3 gap-3">
${cards}
    </div>
  </main>
</body>
</html>
`;
await Deno.writeTextFile(`${DIST}/index.html`, portal);

// rewrite absolute /_rt/ → BASE/_rt/ so module imports resolve under the Pages base path
if (BASE) {
  for await (const f of walk(DIST, { exts: ["html", "js", "json", "webmanifest"] })) {
    const s = await Deno.readTextFile(f.path);
    if (s.includes("/_rt/")) await Deno.writeTextFile(f.path, s.replaceAll("/_rt/", `${BASE}/_rt/`));
  }
}

console.log(`dist assembled: ${apps.length} apps + portal, base="${BASE || "/"}"`);
