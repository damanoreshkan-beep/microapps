export default [
  { name: "екран сканера (gate камери + історія)", run: async (h) => { await h.wait(400); h.expect((await h.count("#scan-enable")) === 1 || /Камера недоступна|unavailable/.test(await h.bodyText()), "немає gate камери"); h.expect((await h.count("#qr-history-btn")) === 1, "немає кнопки історії"); } },
  {
    name: "роутинг: системний Back закриває історію", run: async (h) => {
      await h.click("#qr-history-btn"); await h.wait(200);
      h.expect((await h.count("#qr-history")) === 1, "історія не відкрилась");
      await h.back(); await h.wait(250);
      h.expect((await h.count("#qr-history")) === 0, "Back не закрив історію");
      h.expect((await h.count("#qr-history-btn")) === 1, "Back вийшов з екрана");
    },
  },
  { name: "i18n EN/UA", run: async (h) => { await h.click('[data-tab="me"]'); await h.wait(150); await h.click('[data-loc="en"]'); await h.wait(250); h.expect(/Language|QR scanner|Scanner/.test(await h.bodyText()), "не EN"); await h.click('[data-loc="uk"]'); await h.wait(200); await h.click('[data-tab="scan"]'); await h.wait(150); } },
  { name: "PWA модалка", run: async (h) => { await h.click('[data-tab="me"]'); await h.wait(150); await h.click("#p-install"); await h.wait(150); h.expect((await h.prop("#install", "open")) === true, "не відкрилось"); } },
];
