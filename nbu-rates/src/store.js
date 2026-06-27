// State — nanostores. Single source of truth.
import { atom, map } from "nanostores";
import { persistentAtom } from "@nanostores/persistent";
import { fetchRates } from "./services/nbu.js";

const J = { encode: JSON.stringify, decode: JSON.parse };

export const $fav = persistentAtom("fav", {}, J);          // cc -> true
export const $theme = persistentAtom("theme", "dim");
export const $amount = persistentAtom("amount", "100");    // converter "from" amount
export const $from = persistentAtom("from", "USD");
export const $to = persistentAtom("to", "UAH");
export function swap() { const f = $from.get(); $from.set($to.get()); $to.set(f); }

export const $tab = atom("rates");                         // rates | convert | me
export const $query = atom("");
export const $rates = map({ list: [], date: "", loading: true, error: false });
export const $toast = atom("");
export const $installEvent = atom(null);
export const $installOpen = atom(false);

export const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
export const isStandalone = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;

let tt;
export function toast(key) { $toast.set(key); clearTimeout(tt); tt = setTimeout(() => $toast.set(""), 2200); }

export async function load() {
  $rates.set({ ...$rates.get(), loading: true, error: false });
  try { const { rates, date } = await fetchRates(); $rates.set({ list: rates, date, loading: false, error: false }); }
  catch (e) { $rates.set({ list: [], date: "", loading: false, error: true }); }
}
export function toggleFav(cc) {
  const f = { ...$fav.get() };
  if (f[cc]) { delete f[cc]; toast("removed"); } else { f[cc] = true; toast("saved"); }
  $fav.set(f);
}
