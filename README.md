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
| Навігатор | `navigator/` | tool (sensor) | GPS + compass + WMM | `sensors.js` geo/compass; CSS-3D arrow |
| Шумомір | `noise/` | tool (sensor) | microphone | `sensors.js` mic (approx dB) |
| Сигналізація | `alarm/` | tool (sensor) | accelerometer | `sensors.js` motion + wakeLock |
| Камера | `camera/` | tool (sensor) | camera | `sensors.js` camera; CSS-filter presets |
| QR-сканер | `qr/` | tool (sensor) | camera + BarcodeDetector | reuses camera; jsQR fallback |
| Ліхтарик | `flashlight/` | tool (sensor) | camera torch | `sensors.js` torch + wakeLock; screen-light + SOS fallback |
| (hand-coded ref) | `nbu-rates/` | — | bank.gov.ua | n/a |

## Dev

**The gate runs in CI** (`.github/workflows/verify.yml`) — `check-all` over the whole farm on
ubuntu-latest. Headed Chromium under the local proot/Android env crashed the terminal, so the
browser is **off-device**. The harness+runtime come in as the `skill/` git submodule
(`damanoreshkan-beep/microapp-skill`); `check-all` skips it (no top-level `spec.json`).

Local cycle is **browser-free**:

```sh
H=~/.claude/skills/microapp/harness/deno.json
# build the app, then validate WITHOUT a browser:
deno eval 'import {validateSpec} from "file://'$PWD'/skill/runtime/validate.js"; …'  # spec ok ✓
deno check  /root/microapps/<app>/*.js
deno test -A -c skill/runtime/deno.json skill/runtime flashlight   # fast pure-logic tests, no browser
deno task -c $H serve /root/microapps/<app> 8095   # eyeball locally (serve is fine; no Chromium)
git add -A && git commit -m "…" && git push        # → CI runs verify; gh run watch
```

> Never run `verify` / `check-all` / `icons` / `shot` / `setup` on-device — that is what crashed
> the terminal. Push and let CI be the gate. After editing the harness/runtime, commit+push the
> skill repo, then bump the submodule pointer here (`git -C skill pull && git add skill`).
>
> Pass **absolute** appdirs to any `deno task` — cwd = the harness dir.

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
