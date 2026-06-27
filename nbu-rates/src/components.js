import { Fragment } from "preact";
import { useRef, useEffect } from "preact/hooks";
import { html } from "htm/preact";
import { useStore } from "@nanostores/preact";
import {
  $query, $rates, $fav, $tab, $theme, $amount, $from, $to, $toast,
  $installEvent, $installOpen, isIOS, isStandalone, toggleFav, load, swap,
} from "./store.js";
import { messages, $locale, LOCALES } from "./i18n.js";

const Icon = (icon, cls = "") => html`<iconify-icon icon=${icon} class=${cls}></iconify-icon>`;
const fmt = (n, loc) => Number(n).toLocaleString(loc === "uk" ? "uk-UA" : "en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 });

function RateRow({ r }) {
  const t = useStore(messages), loc = useStore($locale), fav = useStore($fav);
  const on = !!fav[r.cc];
  return html`<div class="card @container bg-base-100 border border-base-300 rounded-2xl">
    <div class="card-body p-3 px-4 flex-row items-center gap-3 @max-[260px]:px-2.5 @max-[260px]:gap-2">
      <div class="font-bold text-primary w-11 shrink-0 @max-[260px]:w-8 @max-[260px]:text-sm">${r.cc}</div>
      <div class="flex-1 min-w-0 @max-[260px]:hidden">
        <div class="font-medium truncate text-sm">${r.name}</div>
      </div>
      <div class="text-right font-semibold tabular-nums @max-[260px]:text-sm">${fmt(r.rate, loc)} ₴</div>
      <button data-fav=${r.cc} aria-label=${on ? t.unfavAria : t.favAria}
        onClick=${() => toggleFav(r.cc)}
        class=${`btn btn-ghost btn-xs btn-circle ${on ? "text-primary" : "opacity-50"}`}>${Icon("lucide:star", "text-lg")}</button>
    </div></div>`;
}

function Section({ icon, title, items }) {
  if (!items.length) return null;
  return html`<${Fragment}>
    <div class="flex items-center gap-2 mt-3 mb-1 px-1">
      <span class="text-sm font-semibold flex items-center gap-1.5">${Icon(icon)}${title}</span>
      <span class="badge badge-sm badge-ghost">${items.length}</span>
      <span class="flex-1 h-px bg-base-300"></span>
    </div>
    ${items.map((r) => html`<${RateRow} r=${r} key=${r.cc} />`)}
  </${Fragment}>`;
}

const EmptyState = ({ icon, text, hint }) => html`<div class="flex flex-col items-center text-base-content/60 py-16 gap-2 text-center px-6">
  ${Icon(icon, "text-4xl")}<span class="font-medium">${text}</span>${hint && html`<span class="text-sm text-base-content/60">${hint}</span>`}</div>`;

const Skeleton = ({ n = 7 }) => html`<${Fragment}>${Array.from({ length: n }, (_, i) => html`
  <div class="card bg-base-100 border border-base-300 rounded-2xl" key=${i}><div class="card-body p-3 px-4 flex-row items-center gap-3">
    <div class="skeleton h-5 w-10"></div><div class="skeleton h-4 flex-1"></div><div class="skeleton h-5 w-16"></div></div></div>`)}</${Fragment}>`;

function RatesView() {
  const t = useStore(messages), rates = useStore($rates), q = useStore($query).trim().toLowerCase(), fav = useStore($fav);
  if (rates.loading) return html`<${Skeleton} />`;
  if (rates.error) return html`<${EmptyState} icon="lucide:cloud-off" text=${t.statusError} hint=${t.errorHint} />`;
  const f = rates.list.filter((r) => (r.cc + " " + r.name).toLowerCase().includes(q));
  if (!f.length) return html`<${EmptyState} icon="lucide:search-x" text=${t.noResults} hint=${t.noResultsHint} />`;
  const favs = f.filter((r) => fav[r.cc]), others = f.filter((r) => !fav[r.cc]);
  return html`<${Fragment}>
    <${Section} icon="lucide:star" title=${t.favSection} items=${favs} />
    <${Section} icon="lucide:coins" title=${t.allSection} items=${others} />
  </${Fragment}>`;
}

const QUICK = ["100", "500", "1000", "5000"];
function ConverterView() {
  const t = useStore(messages), rates = useStore($rates), loc = useStore($locale);
  const amount = useStore($amount), from = useStore($from), to = useStore($to);
  const list = rates.list;
  const opts = [{ cc: "UAH" }, ...list];
  const rateOf = (cc) => cc === "UAH" ? 1 : (list.find((r) => r.cc === cc)?.rate || 0);
  const amt = parseFloat(String(amount).replace(",", ".")) || 0;
  const rf = rateOf(from), rt = rateOf(to);
  const result = rt ? amt * rf / rt : 0;
  const Select = (id, val, set) => html`<select id=${id} class="select select-bordered rounded-2xl font-semibold w-28" value=${val} onChange=${(e) => set(e.target.value)}>
    ${opts.map((r) => html`<option value=${r.cc} key=${r.cc}>${r.cc}</option>`)}</select>`;
  return html`<div class="card bg-base-100 border border-base-300 rounded-2xl mt-2"><div class="card-body p-4 gap-3">
    <div class="flex flex-wrap gap-2">${QUICK.map((q) => html`<button class=${`btn btn-sm rounded-full ${amount === q ? "btn-primary" : "btn-ghost bg-base-200"}`} key=${q} onClick=${() => $amount.set(q)}>${q}</button>`)}</div>
    <div class="flex gap-2 items-center">
      <input id="conv-amount" type="text" inputmode="decimal" class="input input-bordered rounded-2xl text-lg font-semibold tabular-nums flex-1 min-w-0"
        value=${amount} onInput=${(e) => $amount.set(e.target.value)} />
      ${Select("conv-from", from, (v) => $from.set(v))}
    </div>
    <button id="conv-swap" class="btn btn-circle btn-ghost btn-sm mx-auto -my-1" aria-label=${t.swap} onClick=${() => swap()}>${Icon("lucide:arrow-up-down", "text-xl text-primary")}</button>
    <div class="flex gap-2 items-center">
      <div id="conv-result" class="input input-bordered rounded-2xl flex-1 min-w-0 flex items-center text-lg font-bold text-primary tabular-nums bg-base-200/40">${fmt(result, loc)}</div>
      ${Select("conv-to", to, (v) => $to.set(v))}
    </div>
    <div class="text-xs text-base-content/60 mt-1">${t.perUnit2({ a: from, b: to, rate: rt ? fmt(rf / rt, loc) : "—" })}</div>
  </div></div>`;
}

function Profile() {
  const t = useStore(messages), theme = useStore($theme), loc = useStore($locale);
  return html`<div class="flex flex-col gap-3 mt-2">
    ${!isStandalone() ? html`<button id="p-install" class="card bg-primary/10 border border-primary/25 rounded-2xl active:scale-[.99] transition" onClick=${() => $installOpen.set(true)}>
      <div class="card-body p-4 flex-row items-center gap-3">${Icon("lucide:download", "text-xl text-primary")}<span class="flex-1 font-medium text-left text-primary">${t.install}</span>${Icon("lucide:chevron-right", "text-primary opacity-60")}</div>
    </button>` : null}
    <div class="card bg-base-100 border border-base-300 rounded-2xl"><div class="card-body items-center text-center gap-1 py-6">
      <div class="avatar avatar-placeholder"><div class="bg-primary/15 text-primary w-16 rounded-full">${Icon("lucide:coins", "text-3xl")}</div></div>
      <h2 class="font-bold text-lg mt-1">${t.title}</h2>
      <p class="text-sm text-base-content/70">${t.profTagline}</p>
    </div></div>
    <div class="card bg-base-100 border border-base-300 rounded-2xl"><div class="card-body p-4 flex-row items-center gap-3">
      ${Icon("lucide:moon", "text-xl")}<span class="flex-1 font-medium">${t.profTheme}</span>
      <input id="p-theme" type="checkbox" class="toggle toggle-primary" checked=${theme === "dim"} onChange=${(e) => $theme.set(e.target.checked ? "dim" : "light")} />
    </div></div>
    <div class="card bg-base-100 border border-base-300 rounded-2xl"><div class="card-body p-4 flex-row items-center gap-3">
      ${Icon("lucide:languages", "text-xl")}<span class="flex-1 font-medium">${t.profLang}</span>
      <div class="join" id="p-lang">${LOCALES.map(([code, label]) => html`<button class=${`btn btn-sm join-item ${loc === code ? "btn-active btn-primary" : ""}`} data-loc=${code} key=${code} onClick=${() => $locale.set(code)}>${label}</button>`)}</div>
    </div></div>
    <a href="https://bank.gov.ua/" target="_blank" rel="noopener" class="card bg-base-100 border border-base-300 rounded-2xl active:scale-[.99] transition">
      <div class="card-body p-4 flex-row items-center gap-3">${Icon("lucide:landmark", "text-xl")}<span class="flex-1 font-medium">${t.profSource}</span>${Icon("lucide:arrow-up-right", "opacity-50")}</div>
    </a>
  </div>`;
}

function AppBar() {
  const t = useStore(messages), tab = useStore($tab);
  const title = tab === "convert" ? t.convTitle : tab === "me" ? t.tabMe : t.title;
  return html`<header class="navbar bg-base-100 sticky top-0 z-20 border-b border-base-300 px-4 min-h-14 gap-1" style="padding-top:env(safe-area-inset-top)">
    <div class="flex-1"><span class="text-base font-bold tracking-tight">${title}</span></div>
    <button id="refresh" class="btn btn-ghost btn-sm btn-circle" aria-label=${t.refresh} onClick=${() => load()}>${Icon("lucide:rotate-cw", "text-xl")}</button>
  </header>`;
}

function SearchBar() {
  const t = useStore(messages), rates = useStore($rates), q = useStore($query);
  const status = rates.loading ? t.statusLoading : rates.error ? t.statusError : t.statusDate({ date: rates.date });
  return html`<div class="sticky top-14 z-10 bg-base-200 border-b border-base-300/50 px-4 pt-3 pb-2">
    <label class="input input-bordered flex items-center gap-2 h-11 rounded-2xl">
      ${Icon("lucide:search", "text-lg opacity-50")}
      <input id="filter" type="search" class="grow" placeholder=${t.search} autocomplete="off" value=${q} onInput=${(e) => $query.set(e.target.value)} />
    </label>
    <div id="status" class="text-xs text-base-content/70 mt-1 min-h-4 px-1">${status}</div>
  </div>`;
}

function InstallModal() {
  const t = useStore(messages), open = useStore($installOpen), ev = useStore($installEvent);
  const ref = useRef(null);
  useEffect(() => { const d = ref.current; if (!d) return; if (open && !d.open) d.showModal(); if (!open && d.open) d.close(); }, [open]);
  const doInstall = async () => { if (!ev) return; ev.prompt(); try { await ev.userChoice; } catch (e) { /* */ } $installEvent.set(null); $installOpen.set(false); };
  return html`<dialog id="install" ref=${ref} class="modal modal-bottom" onClose=${() => $installOpen.set(false)}>
    <div class="modal-box rounded-t-3xl pb-8">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-bold text-lg flex items-center gap-2">${Icon("lucide:download", "text-primary")} ${t.installTitle}</h3>
        <button class="btn btn-ghost btn-sm btn-circle" aria-label=${t.close} onClick=${() => $installOpen.set(false)}>${Icon("lucide:x", "text-xl")}</button>
      </div>
      <div class="flex items-center gap-3 mb-4"><img src="icons/icon-192.png" width="56" height="56" class="rounded-2xl" alt="" />
        <div><div class="font-semibold">${t.title}</div><div class="text-sm text-base-content/70">${t.installDesc}</div></div></div>
      ${ev
        ? html`<button id="install-go" class="btn btn-primary rounded-2xl w-full gap-2" onClick=${doInstall}>${Icon("lucide:download")} ${t.installBtn}</button>`
        : html`<div class="flex items-start gap-2 bg-base-200 rounded-2xl px-3 py-3 text-sm">${Icon(isIOS() ? "lucide:share" : "lucide:menu", "text-lg mt-0.5")}<span>${isIOS() ? t.installIosHint : t.installGenericHint}</span></div>`}
    </div>
    <form method="dialog" class="modal-backdrop"><button>close</button></form>
  </dialog>`;
}

const TABS = [["rates", "lucide:trending-up", "tabRates"], ["convert", "lucide:arrow-right-left", "tabConvert"], ["me", "lucide:user", "tabMe"]];
function Dock() {
  const t = useStore(messages), tab = useStore($tab);
  return html`<nav class="dock bg-base-100 border-t border-base-300" style="padding-bottom:env(safe-area-inset-bottom)">
    ${TABS.map(([tb, ic, key]) => {
      const active = tab === tb;
      return html`<button data-tab=${tb} key=${tb} aria-current=${active ? "page" : null} onClick=${() => $tab.set(tb)}>
        <span class=${`flex items-center justify-center h-7 px-5 rounded-full transition-colors ${active ? "bg-primary/20" : ""}`}>${Icon(ic, `text-xl ${active ? "text-primary" : "opacity-70"}`)}</span>
        <span class=${`dock-label ${active ? "text-primary font-semibold" : "opacity-70"}`}>${t[key]}</span>
      </button>`;
    })}
  </nav>`;
}

function Toast() {
  const t = useStore(messages), key = useStore($toast);
  const text = key === "saved" ? t.toastSaved : key === "removed" ? t.toastRemoved : key;
  return html`<div data-toast class="pointer-events-none" style="position:fixed;left:0;right:0;bottom:0;z-index:50;display:flex;justify-content:center;padding-bottom:5.5rem">
    <div class=${`alert bg-neutral text-neutral-content border-0 rounded-2xl shadow-xl py-3 px-5 font-medium flex items-center gap-2 w-max transition-opacity duration-200 ${key ? "opacity-100" : "opacity-0"}`}>
      ${Icon("lucide:check-circle", "text-success text-lg")}${text || ""}
    </div></div>`;
}

export function App() {
  const tab = useStore($tab);
  const View = tab === "convert" ? ConverterView : tab === "me" ? Profile : RatesView;
  return html`<${Fragment}>
    <${AppBar} />
    ${tab === "rates" ? html`<${SearchBar} />` : null}
    <main id="view" class="px-4 pt-2 pb-28 flex flex-col gap-3"><${View} /></main>
    <${InstallModal} />
    <${Dock} />
    <${Toast} />
  </${Fragment}>`;
}
