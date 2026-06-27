import { persistentAtom } from "@nanostores/persistent";
import { createI18n, localeFrom, params } from "@nanostores/i18n";

export const $locale = persistentAtom("locale", "uk");
export const locale = localeFrom($locale);
export const LOCALES = [["uk", "UA"], ["en", "EN"]];

const UK = {
  app: {
    title: "Курси НБУ",
    tabRates: "Курси", tabConvert: "Конвертер", tabMe: "Я",
    search: "Пошук валюти…",
    statusDate: "Офіційний курс · {date}", statusLoading: "Оновлення…", statusError: "Курси недоступні",
    favSection: "Обрані", allSection: "Усі валюти",
    perUnit: "1 {cc} = {rate} ₴",
    noResults: "Валюту не знайдено", noResultsHint: "Спробуй інший код або назву",
    errorHint: "Перевір зʼєднання та онови",
    convTitle: "Конвертер", swap: "Поміняти місцями", perUnit2: "1 {a} = {rate} {b}",
    favAria: "Додати в обрані", unfavAria: "Прибрати з обраних",
    profTheme: "Темна тема", profLang: "Мова", profTagline: "Офіційні курси валют НБУ",
    profSource: "Джерело — bank.gov.ua",
    install: "Встановити застосунок", installTitle: "Встановлення", installBtn: "Встановити",
    installDesc: "Працює офлайн, відкривається як застосунок",
    installIosHint: "У Safari: натисни «Поділитися», далі «На початковий екран».",
    installGenericHint: "У меню браузера обери «Встановити» або «Додати на головний екран».",
    close: "Закрити", refresh: "Оновити",
    toastSaved: "Додано в обрані", toastRemoved: "Прибрано з обраних",
  },
};

export const i18n = createI18n(locale, { get: (code) => (code === "uk" ? UK : {}) });

export const messages = i18n("app", {
  title: "NBU rates",
  tabRates: "Rates", tabConvert: "Converter", tabMe: "Me",
  search: "Search currency…",
  statusDate: params("Official rate · {date}"), statusLoading: "Updating…", statusError: "Rates unavailable",
  favSection: "Favorites", allSection: "All currencies",
  perUnit: params("1 {cc} = {rate} ₴"),
  noResults: "Currency not found", noResultsHint: "Try another code or name",
  errorHint: "Check connection and refresh",
  convTitle: "Converter", swap: "Swap", perUnit2: params("1 {a} = {rate} {b}"),
  favAria: "Add to favorites", unfavAria: "Remove from favorites",
  profTheme: "Dark theme", profLang: "Language", profTagline: "Official NBU exchange rates",
  profSource: "Source — bank.gov.ua",
  install: "Install app", installTitle: "Install", installBtn: "Install",
  installDesc: "Works offline, opens like an app",
  installIosHint: "In Safari: tap Share, then 'Add to Home Screen'.",
  installGenericHint: "In your browser menu choose 'Install' or 'Add to Home Screen'.",
  close: "Close", refresh: "Refresh",
  toastSaved: "Added to favorites", toastRemoved: "Removed from favorites",
});
