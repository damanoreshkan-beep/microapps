export default [
  { name: "галерея завантажується", run: async (h) => { h.expect((await h.count(".card")) > 3, "немає карток"); } },
  { name: "картки мають зображення", run: async (h) => { h.expect((await h.count('img[loading="lazy"]')) >= 3, "немає зображень"); } },
  { name: "картка веде на повний розмір (https)", run: async (h) => { h.expect(/^https:\/\//.test(await h.attr(".card", "href")), "поганий href"); } },
  { name: "є дата і афорданс «Повний розмір»", run: async (h) => { const t = await h.bodyText(); h.expect(/\d{4}/.test(t), "немає дати/року"); h.expect(/Повний розмір/.test(t), "немає афордансу"); } },
  {
    name: "пошук звужує до порожнього і відновлює", run: async (h) => {
      const b = await h.count(".card");
      await h.type("#filter", "zzzzz-нема"); await h.wait(150);
      h.expect((await h.count(".card")) === 0, "очікував 0"); h.expect(/Нічого не знайдено/.test(await h.bodyText()), "немає empty");
      await h.type("#filter", ""); await h.wait(150);
      h.expect((await h.count(".card")) === b, "не відновилось");
    },
  },
  {
    name: "збереження: bookmark → тост + «Збережені»", run: async (h) => {
      await h.click("[data-fav]"); await h.wait(150);
      h.expect(/Збережено|Saved/.test(await h.text("[data-toast]")), "немає тосту");
      await h.click('[data-tab="saved"]'); await h.wait(150);
      h.expect((await h.attr('[data-tab="saved"]', "aria-current")) === "page", "вкладка не активна");
      h.expect((await h.count(".card")) >= 1, "у «Збережені» порожньо");
      await h.click('[data-tab="feed"]'); await h.wait(120);
    },
  },
  { name: "i18n EN/UA міняє текст", run: async (h) => { await h.click('[data-tab="me"]'); await h.wait(150); await h.click('[data-loc="en"]'); await h.wait(250); h.expect(/Language|Saved|Gallery/.test(await h.bodyText()), "не EN"); await h.click('[data-loc="uk"]'); await h.wait(250); h.expect(/Мова|Збережені/.test(await h.bodyText()), "не UA"); await h.click('[data-tab="feed"]'); await h.wait(120); } },
  { name: "PWA: профіль → модалка встановлення", run: async (h) => { await h.click('[data-tab="me"]'); await h.wait(150); h.expect((await h.count("#p-install")) === 1, "немає кнопки"); await h.click("#p-install"); await h.wait(150); h.expect((await h.prop("#install", "open")) === true, "не відкрилось"); } },
];
