// Deno test for the pure-logic exports of the micro-app runtime core.
// Run:  deno test --allow-read --import-map=importmap.json runtime_core_test.js
// (no DOM, no browser — only pure functions are exercised)
//
// ════════════════════════════════════════════════════════════════════════
//  BLOCKERS DISCOVERED WHILE WRITING THIS TEST — read before running.
//  Per the task, these are documented here instead of being papered over
//  with an inline copy of the functions (an inline copy is NOT allowed:
//  it would test a fake, not the shipped runtime).
//
//  (1) core.js is NOT standalone-importable under Deno.
//      Its first two lines are bare specifiers:
//          import { atom, map, computed }  from "nanostores";
//          import { persistentAtom }       from "@nanostores/persistent";
//      Deno resolves the FULL module graph before ANY export becomes
//      reachable — so even the pure, DOM-free `T` cannot be imported under
//      plain `deno test`. It fails at link time with:
//          error: Import "@nanostores/persistent" not a dependency
//      In production these specifiers are supplied by the app's HTML
//      <script type="importmap"> pointing at esm.sh, which `deno test`
//      does NOT read. To run this test you MUST hand Deno an import map:
//          deno test --allow-read --import-map=importmap.json runtime_core_test.js
//      with importmap.json:
//          { "imports": {
//              "nanostores":              "https://esm.sh/nanostores@0.11",
//              "@nanostores/persistent":  "https://esm.sh/@nanostores/persistent@0.10"
//          } }
//      (the first run also needs --allow-net to populate Deno's cache).
//
//  (2) `validateSpec` DOES NOT EXIST.
//      There is no `validateSpec` export in core.js, nor anywhere under
//      runtime/. A grep of core.js / index.js / render.js yields only:
//          createApp, T, isIOS, isStandalone   (core.js)
//          setApp, App                          (render.js)
//          start                                (index.js)
//      Spec validation is currently NOT performed by the runtime at all —
//      harness/check.mjs only runs browser design gates (a11y / overflow),
//      not schema validation. This directly contradicts the stated #1
//      production criterion ("an AI authoring spec.json must NOT be able to
//      get it silently wrong — explicit schema + loud validation"): there
//      is no loud validation to import. The validateSpec tests below encode
//      the intended contract (throws on a malformed spec, accepts both
//      reference specs) and will start passing once such an export is added
//      to core.js. Until then they fail loudly with an actionable message.
//
//  Because a STATIC `import { T, validateSpec } from "...core.js"` would
//  abort the entire module (missing export => link-time SyntaxError, and/or
//  the bare-specifier error above), the module is loaded via a guarded
//  DYNAMIC import. That converts a whole-file crash into one readable
//  failure per test, each pointing at the blocker responsible.
// ════════════════════════════════════════════════════════════════════════

import { assert, assertEquals, assertThrows } from "jsr:@std/assert@^1";

const CORE = "file:///root/.claude/skills/microapp/runtime/core.js";

let mod = null, importErr = null;
try { mod = await import(CORE); } catch (e) { importErr = e; }

// Resolve a named export or throw a message that names the exact blocker.
function need(name) {
  if (importErr) {
    throw new Error(
      `cannot import ${CORE}: ${importErr.message}\n` +
      `  → BLOCKER (1): core.js imports bare "nanostores" / "@nanostores/persistent"; ` +
      `supply --import-map (see header).`,
    );
  }
  const fn = mod[name];
  if (typeof fn !== "function") {
    throw new Error(
      `core.js does not export ${name}()\n` +
      `  → BLOCKER (2): ${name} is not implemented in the runtime (see header).`,
    );
  }
  return fn;
}

async function readSpec(path) {
  return JSON.parse(await Deno.readTextFile(path));
}

// ── T(): interpolation of {param}, fallback to key when missing ──────────

Deno.test("T: interpolates a {param} placeholder", () => {
  const T = need("T");
  assertEquals(T({ greet: "Hi {name}" }, "greet", { name: "Dan" }), "Hi Dan");
});

Deno.test("T: interpolates multiple distinct params", () => {
  const T = need("T");
  assertEquals(
    T({ s: "{bron} with deferment · {rest} others" }, "s", { bron: 3, rest: 7 }),
    "3 with deferment · 7 others",
  );
});

Deno.test("T: replaces EVERY occurrence of the same param (replaceAll)", () => {
  const T = need("T");
  assertEquals(T({ k: "{x}+{x}={y}" }, "k", { x: 2, y: 4 }), "2+2=4");
});

Deno.test("T: falls back to the raw key when the key is absent from the dict", () => {
  const T = need("T");
  assertEquals(T({}, "missing.key"), "missing.key");
});

Deno.test("T: returns the raw value verbatim when no params are passed", () => {
  const T = need("T");
  assertEquals(T({ a: "plain text" }, "a"), "plain text");
});

Deno.test("T: leaves unknown placeholders untouched", () => {
  const T = need("T");
  assertEquals(T({ a: "{x} {y}" }, "a", { x: "1" }), "1 {y}");
});

Deno.test("T: coerces non-string dict values before replacing", () => {
  const T = need("T");
  // value is a number-bearing template; param numbers stringify
  assertEquals(T({ a: "= {n}" }, "a", { n: 0 }), "= 0");
});

// ── validateSpec(): accepts both reference specs, rejects broken ones ─────
// Contract assumed (matching "loud validation"): THROWS on a malformed
// spec, and does not throw on a valid one.

Deno.test("validateSpec: accepts the dou reference spec", async () => {
  const validateSpec = need("validateSpec");
  const s = await readSpec("/root/microapps/dou-spec/spec.json");
  validateSpec(s); // must not throw
});

Deno.test("validateSpec: accepts the nbu reference spec", async () => {
  const validateSpec = need("validateSpec");
  const s = await readSpec("/root/microapps/nbu-spec/spec.json");
  validateSpec(s); // must not throw
});

Deno.test("validateSpec: rejects a spec with no `id`", () => {
  const validateSpec = need("validateSpec");
  assertThrows(() =>
    validateSpec({
      tabs: [{ id: "t", type: "list" }],
      i18n: { en: {} },
    }),
  );
});

Deno.test("validateSpec: rejects a spec with no `tabs`", () => {
  const validateSpec = need("validateSpec");
  // createApp reads spec.tabs[0].id, so an absent tabs array is fatal.
  assertThrows(() => validateSpec({ id: "x", i18n: { en: {} } }));
});

Deno.test("validateSpec: rejects a spec with an empty `tabs` array", () => {
  const validateSpec = need("validateSpec");
  assertThrows(() => validateSpec({ id: "x", tabs: [], i18n: { en: {} } }));
});

Deno.test("validateSpec: rejects a spec with no `i18n` dictionary", () => {
  const validateSpec = need("validateSpec");
  // S.t = spec.i18n[l] || spec.i18n.en — a missing i18n yields no strings.
  assertThrows(() => validateSpec({ id: "x", tabs: [{ id: "t", type: "list" }] }));
});

Deno.test("validateSpec: rejects a tab with an unknown `type`", () => {
  const validateSpec = need("validateSpec");
  assertThrows(() =>
    validateSpec({
      id: "x",
      tabs: [{ id: "t", type: "wormhole" }], // not list|converter|profile
      i18n: { en: { title: "X" } },
    }),
  );
});
