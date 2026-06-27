import { render } from "preact";
import { html } from "htm/preact";
import { App } from "./components.js";
import { $theme, $tab, $installEvent, $installOpen, load } from "./store.js";

const applyTheme = (t) => document.documentElement.setAttribute("data-theme", t);
applyTheme($theme.get());
$theme.listen(applyTheme);

render(html`<${App} />`, document.getElementById("app"));

$tab.listen(() => window.scrollTo({ top: 0 }));
addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); $installEvent.set(e); });
addEventListener("appinstalled", () => { $installEvent.set(null); $installOpen.set(false); });
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});

load();
