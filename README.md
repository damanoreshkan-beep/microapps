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
| GitHub Trending | `gh/` | list + filters | GitHub Search | `card.trend`/chips |
| Галерея мистецтва | `art/` | media gallery | The Met | `card.image` |
| Погода | `weather/` | dashboard (hero) | Open-Meteo | `dashboard` tab |
| Країни світу | `countries/` | media gallery | mledoze + flagcdn | detail page (Intl UA names) |
| Лінійка | `ruler/` | tool (sensor) | device hardware | `tool` tab + `sensors.js` (haptic) |
| (hand-coded ref) | `nbu-rates/` | — | bank.gov.ua | n/a |

## Dev

> Pass **absolute** appdirs — `deno task` runs with cwd = the harness dir, so a relative
> `microapps/x` resolves under the harness, not here.

```sh
H=~/.claude/skills/microapp/harness/deno.json
deno task -c $H setup                          # Xvfb (once per session; auto-restarts if it dies)
deno task -c $H verify    /root/microapps/hn   # FAST: e2e + design in one browser (use this)
deno task -c $H verify    /root/microapps/hn --shots   # + writes states/{main,last}.png
deno task -c $H check-all  /root/microapps     # regression: verify EVERY app (run after runtime edits)
deno task -c $H probe "<url>"                   # vet a data source before building on it
deno task -c $H serve     /root/microapps/hn 8095      # dev server (+/feed proxy)
# granular gates still exist: e2e · check · shot
```

## Add a new app

```sh
# fastest: scaffold a whole family — green under `verify` out of the box, then swap the data stub
deno task -c $H new /root/microapps/<name> "<Title>" dim "#1c212b" --family dashboard
deno task -c $H icons  /root/microapps/<name>
deno task -c $H verify /root/microapps/<name>          # confirm green, then wire the real source
# (omit --family to scaffold only the shell and hand-write spec.json/data.js/e2e.spec.mjs)
```

Families: `list` · `converter` · `dashboard` · `gallery`. Read
`~/.claude/skills/microapp/runtime/SCHEMA.md` before editing `spec.json`. Shared `data.js`
fetching goes through `import { viaProxy, isJsonArray, isJsonObject } from "/_rt/feed.js"` —
**probe the URL first**.
