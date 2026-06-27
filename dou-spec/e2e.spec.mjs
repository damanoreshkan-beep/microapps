export default [
  { name: "стрічка завантажує реальні вакансії", run: async (h) => { h.expect((await h.count(".card")) > 0, "немає карток"); } },
  { name: "дві секції: з бронюванням + усі", run: async (h) => { const t = await h.bodyText(); h.expect(/З бронюванням/.test(t) && /Усі:/.test(t), "немає двох секцій"); } },
  { name: "статус показує лічильники", run: async (h) => { const s = await h.text("#status"); h.expect(/з бронюванням/.test(s) && /інших/.test(s), `статус: "${s}"`); } },
  { name: "бронювання-картка має primary-бейдж зі щитом", run: async (h) => { h.expect((await h.count(".badge-primary")) >= 1, "немає primary"); h.expect((await h.count('iconify-icon[icon="lucide:shield-check"]')) >= 1, "немає щита"); } },
  { name: "картка веде на jobs.dou.ua", run: async (h) => { h.expect(/jobs\.dou\.ua/.test(await h.attr(".card", "href")), "поганий href"); } },
  { name: "є метадані-бейджі", run: async (h) => { h.expect((await h.count(".badge")) >= 2, "замало бейджів"); } },
  { name: "картка показує афорданс «Детальніше»", run: async (h) => { h.expect(/Детальніше/.test(await h.bodyText()), "немає афордансу"); } },
  {
    name: "пошук звужує до порожнього і відновлює", run: async (h) => {
      const b = await h.count(".card");
      await h.type("#filter", "zzz-нема"); await h.wait(150);
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
  { name: "категорії підтягуються з DOU (не хардкод)", run: async (h) => { await h.click("#filter-btn"); await h.wait(200); for (let i = 0; i < 15 && (await h.count("#f-category option")) <= 1; i++) await h.wait(300); h.expect((await h.count("#f-category option")) > 10, "мало категорій"); h.expect((await h.count('#f-category option[value="Java"]')) === 1, "немає Java"); } },
  { name: "«Фільтр» відкриває bottom-sheet", run: async (h) => { await h.click("#filter-btn"); await h.wait(150); h.expect((await h.prop("#sheet", "open")) === true, "не відкрилось"); } },
  { name: "скрол скидається при зміні вкладки", run: async (h) => { await h.scrollTo(700); await h.wait(100); h.expect((await h.scrollY()) > 100, "не проскролилось"); await h.click('[data-tab="me"]'); await h.wait(180); h.expect((await h.scrollY()) <= 1, "скрол не скинувся"); } },
  { name: "пошук прихований у профілі", run: async (h) => { await h.click('[data-tab="me"]'); await h.wait(120); h.expect((await h.count("#filter")) === 0, "пошук видно"); await h.click('[data-tab="feed"]'); await h.wait(150); } },
  { name: "i18n EN/UA міняє текст", run: async (h) => { await h.click('[data-tab="me"]'); await h.wait(150); await h.click('[data-loc="en"]'); await h.wait(250); h.expect(/Language|Saved|Profile/.test(await h.bodyText()), "не EN"); await h.click('[data-loc="uk"]'); await h.wait(250); h.expect(/Мова|Збережені/.test(await h.bodyText()), "не UA"); await h.click('[data-tab="feed"]'); await h.wait(120); } },
  { name: "PWA: профіль → модалка встановлення", run: async (h) => { await h.click('[data-tab="me"]'); await h.wait(150); h.expect((await h.count("#p-install")) === 1, "немає кнопки"); await h.click("#p-install"); await h.wait(150); h.expect((await h.prop("#install", "open")) === true, "не відкрилось"); } },
];
