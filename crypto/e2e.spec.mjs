export default [
  { name: "монети завантажуються з CoinGecko", run: async (h) => { h.expect((await h.count("[data-fav]")) > 5, "немає монет"); } },
  { name: "монети показують зміну за 24г (% + тренд)", run: async (h) => { h.expect(/%/.test(await h.bodyText()), "немає %"); h.expect((await h.count('iconify-icon[icon^="lucide:trending"]')) >= 3, "немає тренд-іконок"); } },
  { name: "статус показує «Ціни в USD»", run: async (h) => { const s = await h.text("#status"); h.expect(/USD|капіталіза/i.test(s), `статус: "${s}"`); } },
  {
    name: "пошук монети звужує і відновлює", run: async (h) => {
      const b = await h.count("[data-fav]");
      await h.type("#filter", "zzz-нема"); await h.wait(150);
      h.expect((await h.count("[data-fav]")) === 0, "очікував 0"); h.expect(/не знайдено/i.test(await h.bodyText()), "немає empty");
      await h.type("#filter", ""); await h.wait(150);
      h.expect((await h.count("[data-fav]")) === b, "не відновилось");
    },
  },
  {
    name: "обране: зірка → тост + секція «Обрані»", run: async (h) => {
      await h.click("[data-fav]"); await h.wait(150);
      h.expect(/Додано|Added/.test(await h.text("[data-toast]")), "немає тосту");
      h.expect(/Обрані|Favorites/.test(await h.bodyText()), "немає секції Обрані");
    },
  },
  {
    name: "конвертер двобічний і рахує (BTC→USD)", run: async (h) => {
      await h.click('[data-tab="convert"]'); await h.wait(200);
      await h.type("#conv-amount", "2"); await h.wait(150);
      const r1 = await h.text("#conv-result"); h.expect(/[1-9]/.test(r1), `порожній результат: "${r1}"`);
      await h.click("#conv-swap"); await h.wait(150);
      const r2 = await h.text("#conv-result"); h.expect(/[0-9]/.test(r2), `swap не порахував: "${r2}"`);
      await h.click('[data-tab="coins"]'); await h.wait(120);
    },
  },
  { name: "конвертер: крипто-швидкі суми (0.1/1/10/100)", run: async (h) => { await h.click('[data-tab="convert"]'); await h.wait(150); h.expect(/0\.1/.test(await h.bodyText()), "немає 0.1"); await h.click('[data-tab="coins"]'); await h.wait(100); } },
  { name: "i18n EN/UA міняє текст", run: async (h) => { await h.click('[data-tab="me"]'); await h.wait(150); await h.click('[data-loc="en"]'); await h.wait(250); h.expect(/Language|Coins|Converter/.test(await h.bodyText()), "не EN"); await h.click('[data-loc="uk"]'); await h.wait(250); h.expect(/Мова|Монети/.test(await h.bodyText()), "не UA"); await h.click('[data-tab="coins"]'); await h.wait(120); } },
  { name: "PWA: профіль → модалка встановлення", run: async (h) => { await h.click('[data-tab="me"]'); await h.wait(150); h.expect((await h.count("#p-install")) === 1, "немає кнопки"); await h.click("#p-install"); await h.wait(150); h.expect((await h.prop("#install", "open")) === true, "не відкрилось"); } },
];
