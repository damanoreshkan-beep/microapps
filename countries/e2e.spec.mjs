export default [
  { name: "список країн завантажується", run: async (h) => { for (let i = 0; i < 24 && (await h.count(".card")) === 0; i++) await h.wait(500); h.expect((await h.count(".card")) > 30, "замало країн"); h.expect(/Ukraine|Україна/.test(await h.bodyText()), "немає України у списку"); } },
  { name: "картки мають прапори", run: async (h) => { for (let i = 0; i < 20 && (await h.count('img[loading="lazy"]')) < 5; i++) await h.wait(500); h.expect((await h.count('img[loading="lazy"]')) >= 5, "немає прапорів"); } },
  { name: "пошук українською звужує і відновлює", run: async (h) => { const b = await h.count(".card"); await h.type("#filter", "Україна"); await h.wait(200); const n = await h.count(".card"); h.expect(n >= 1 && n < b, "укр. пошук не звузив"); h.expect(/Україна/.test(await h.bodyText()), "немає України у результатах"); await h.type("#filter", ""); await h.wait(200); h.expect((await h.count(".card")) === b, "не відновилось"); } },
  {
    name: "фільтр регіону рефетчить (Європа)", run: async (h) => {
      const all = await h.count(".card");
      await h.click("#filter-btn"); await h.wait(200);
      h.expect((await h.prop("#sheet", "open")) === true, "лист не відкрився");
      await h.click('#f-region button[data-val="Europe"]'); await h.wait(120);
      await h.click("#f-apply"); await h.wait(800);
      const eu = await h.count(".card");
      h.expect(eu > 0 && eu < all, "Європа не звузила список");
      h.expect((await h.count(".badge-outline")) >= 1, "немає чипа активного фільтра");
      await h.click(".badge-outline"); await h.wait(800);                 // chip → reset to all
      h.expect((await h.count(".card")) === all, "чип не скинув регіон");
    },
  },
  { name: "збереження → «Збережені»", run: async (h) => { await h.click("[data-fav]"); await h.wait(150); h.expect(/Збережено|Saved/.test(await h.text("[data-toast]")), "немає тосту"); await h.click('[data-tab="saved"]'); await h.wait(150); h.expect((await h.count(".card")) >= 1, "порожньо у збережених"); await h.click('[data-tab="feed"]'); await h.wait(120); } },
  { name: "картка веде на карту (https)", run: async (h) => { h.expect(/^https:\/\//.test(await h.attr(".card", "href")), "поганий href"); } },
  { name: "i18n EN/UA", run: async (h) => { await h.click('[data-tab="me"]'); await h.wait(150); await h.click('[data-loc="en"]'); await h.wait(250); h.expect(/Language|Countries|Region/.test(await h.bodyText()), "не EN"); await h.click('[data-loc="uk"]'); await h.wait(200); await h.click('[data-tab="feed"]'); await h.wait(120); } },
  { name: "PWA модалка", run: async (h) => { await h.click('[data-tab="me"]'); await h.wait(150); await h.click("#p-install"); await h.wait(150); h.expect((await h.prop("#install", "open")) === true, "не відкрилось"); } },
];
