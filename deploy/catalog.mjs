// Generate the live app catalog (title → Pages URL + tagline) and inject it into README.md between
// <!-- CATALOG:START/END --> markers, so the repo front page stays in sync with the farm.
//   deno run -A deploy/catalog.mjs
const BASE = "https://damanoreshkan-beep.github.io/microapps";
const ROOT = Deno.cwd();

const apps = [];
for await (const e of Deno.readDir(ROOT)) {
  if (!e.isDirectory || e.name === "dist" || e.name === "skill" || e.name.startsWith(".")) continue;
  let spec;
  try { spec = JSON.parse(await Deno.readTextFile(`${ROOT}/${e.name}/spec.json`)); } catch { continue; }
  const d = spec.i18n?.uk || spec.i18n?.en || {};
  const tab0 = spec.tabs?.[0] || {};
  apps.push({
    id: e.name,
    title: d[tab0.titleKey] || d.title || e.name,
    desc: d.profTagline || "",
  });
}
apps.sort((a, b) => a.title.localeCompare(b.title, "uk"));

const rows = apps.map((a) => `| **[${a.title}](${BASE}/${a.id}/)** | ${a.desc} |`).join("\n");
const block = `<!-- CATALOG:START -->

**[🚀 Портал — усі застосунки](${BASE}/)** · ${apps.length} мікроапок · працюють офлайн (PWA)

| Застосунок | Опис |
|---|---|
${rows}

<!-- CATALOG:END -->`;

let readme = await Deno.readTextFile(`${ROOT}/README.md`);
if (/<!-- CATALOG:START -->[\s\S]*<!-- CATALOG:END -->/.test(readme)) {
  readme = readme.replace(/<!-- CATALOG:START -->[\s\S]*<!-- CATALOG:END -->/, block);
} else {
  readme = readme.replace(/^(#[^\n]*\n)/, `$1\n${block}\n`);
}
await Deno.writeTextFile(`${ROOT}/README.md`, readme);
console.log(`catalog: ${apps.length} apps written to README.md`);
