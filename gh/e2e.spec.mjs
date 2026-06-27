export default [
  { name: "тренди GitHub завантажуються", run: async (h) => { h.expect((await h.count(".card")) > 5, "немає карток"); } },
  { name: "картка веде на github.com", run: async (h) => { h.expect(/github\.com/.test(await h.attr(".card", "href")), "поганий href"); } },
  { name: "бейджі: зірки + форки (іконки)", run: async (h) => { h.expect((await h.count('iconify-icon[icon="lucide:star"]')) >= 3, "немає зірок"); h.expect((await h.count('iconify-icon[icon="lucide:git-fork"]')) >= 3, "немає форків"); } },
  { name: "є відносний час і афорданс «Відкрити»", run: async (h) => { const t = await h.bodyText(); h.expect(/сьогодні|вчора|тому/.test(t), "немає часу"); h.expect(/Відкрити/.test(t), "немає афордансу"); } },
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
  { name: "фільтр: сегменти періоду + мови", run: async (h) => { await h.click("#filter-btn"); await h.wait(150); h.expect((await h.prop("#sheet", "open")) === true, "шторка не відкрилась"); h.expect((await h.count("#f-since")) === 1, "немає сегмента періоду"); h.expect((await h.count("#f-lang")) === 1, "немає сегмента мови"); h.expect(/Rust|Python/.test(await h.bodyText()), "немає мов"); } },
  { name: "i18n EN/UA міняє текст", run: async (h) => { await h.click('[data-tab="me"]'); await h.wait(150); await h.click('[data-loc="en"]'); await h.wait(250); h.expect(/Language|Saved|Trending/.test(await h.bodyText()), "не EN"); await h.click('[data-loc="uk"]'); await h.wait(250); h.expect(/Мова|Збережені/.test(await h.bodyText()), "не UA"); await h.click('[data-tab="feed"]'); await h.wait(120); } },
  { name: "PWA: профіль → модалка встановлення", run: async (h) => { await h.click('[data-tab="me"]'); await h.wait(150); h.expect((await h.count("#p-install")) === 1, "немає кнопки"); await h.click("#p-install"); await h.wait(150); h.expect((await h.prop("#install", "open")) === true, "не відкрилось"); } },
];
