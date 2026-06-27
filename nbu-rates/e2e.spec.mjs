// Unique e2e for the NBU rates app.
export default [
  {
    name: "курси завантажуються з НБУ",
    run: async (h) => { h.expect((await h.count("[data-fav]")) > 5, `замало валют: ${await h.count("[data-fav]")}`); },
  },
  {
    name: "статус показує дату офіційного курсу",
    run: async (h) => { h.expect(/\d{2}\.\d{2}\.\d{4}/.test(await h.text("#status")), `статус: "${await h.text("#status")}"`); },
  },
  {
    name: "пошук валюти звужує і відновлює",
    run: async (h) => {
      const before = await h.count("[data-fav]");
      await h.type("#filter", "zzz"); await h.wait(150);
      h.expect((await h.count("[data-fav]")) === 0, "очікував 0 рядків");
      h.expect(/не знайдено|not found/i.test(await h.bodyText()), "немає порожнього стану");
      await h.type("#filter", ""); await h.wait(150);
      h.expect((await h.count("[data-fav]")) === before, "не відновилось");
    },
  },
  {
    name: "обране: зірка → тост + секція «Обрані»",
    run: async (h) => {
      await h.click("[data-fav]"); await h.wait(150);
      h.expect(/обрані|favorites/i.test(await h.text("[data-toast]")), "немає тосту обраного");
      h.expect(/Обрані|Favorites/.test(await h.bodyText()), "немає секції «Обрані»");
    },
  },
  {
    name: "конвертер двобічний і рахує",
    run: async (h) => {
      await h.click('[data-tab="convert"]'); await h.wait(150);
      h.expect((await h.count("#conv-amount")) === 1, "немає поля суми");
      h.expect((await h.count("#conv-from")) === 1 && (await h.count("#conv-to")) === 1, "немає двох валют");
      h.expect((await h.count("#conv-swap")) === 1, "немає кнопки swap");
      await h.type("#conv-amount", "10"); await h.wait(120);
      const res = (await h.text("#conv-result")).replace(/\s/g, "");
      h.expect(/\d/.test(res), `результат порожній: "${res}"`);
    },
  },
  {
    name: "i18n: перемикач EN/UA міняє текст",
    run: async (h) => {
      await h.click('[data-tab="me"]'); await h.wait(150);
      await h.click('[data-loc="en"]'); await h.wait(250);
      h.expect(/Language|Dark theme|Source/.test(await h.bodyText()), "не перемкнулось на EN");
      await h.click('[data-loc="uk"]'); await h.wait(250);
      h.expect(/Мова|Джерело/.test(await h.bodyText()), "не повернулось на UA");
    },
  },
  {
    name: "PWA: профіль → модалка встановлення",
    run: async (h) => {
      h.expect((await h.count("#p-install")) === 1, "немає кнопки встановлення");
      await h.click("#p-install"); await h.wait(150);
      h.expect((await h.prop("#install", "open")) === true, "модалка не відкрилась");
    },
  },
];
