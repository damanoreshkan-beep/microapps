# microapps — farm

Micro mobile PWAs built on **nanoai2ui** (the spec-driven runtime, served at `/_rt/` from
`~/.claude/skills/microapp/runtime/`). Each app is `spec.json` (declarative UI) + `data.js`
(fetch/normalize) + boilerplate. Zero build, zero `node_modules`.

## Apps

| App | Dir | Families | Data source | App-specific runtime |
|---|---|---|---|---|
| Курси НБУ | `nbu-spec/` | list + converter | bank.gov.ua | — |
| DOU · бронювання | `dou-spec/` | list + filters | jobs.dou.ua | — |
| Крипто | `crypto/` | list + converter | CoinGecko | `card.trend` |
| Hacker News | `hn/` | list + filters | Algolia HN | `badge.icon` |
| (hand-coded ref) | `nbu-rates/` | — | bank.gov.ua | n/a |

## Dev

```sh
H=~/.claude/skills/microapp/harness/deno.json
deno task -c $H setup                 # Xvfb (once per session)
deno task -c $H serve  microapps/hn 8095
deno task -c $H e2e    microapps/hn   # functional gate
deno task -c $H check  microapps/hn   # a11y + overflow + watch-glance
deno task -c $H shot   microapps/hn out.png --device s25ultra --wait .card --settle 4500
```

## Add a new app

```sh
deno task -c $H new microapps/<name> "<Title>"   # scaffolds index.html, sw.js, manifest, brand
# then write ONLY: spec.json, data.js, e2e.spec.mjs, brand.svg
deno task -c $H icons microapps/<name>
```

Read `~/.claude/skills/microapp/runtime/SCHEMA.md` before writing `spec.json`. Shared `data.js`
fetching goes through `import { viaProxy, isJsonArray, isJsonObject } from "/_rt/feed.js"`.
