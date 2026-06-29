export default [
  { name: "ліхтар idle", run: async (h) => { await h.wait(400); h.expect((await h.count("#fl-power")) === 1, "немає кнопки живлення"); h.expect(/Вимкнено|Off/.test(await h.bodyText()), "немає стану off"); } },
  {
    name: "увімкнення → on, вимкнення → off", run: async (h) => {
      await h.click("#fl-power"); await h.wait(600);
      h.expect((await h.count("#fl-sos")) === 1, "не увімкнулось (немає SOS)");
      h.expect(/Увімкнено|On/.test(await h.bodyText()), "немає стану on");
      await h.click("#fl-power"); await h.wait(250);
      h.expect((await h.count("#fl-sos")) === 0, "не вимкнулось");
    },
  },
  { name: "i18n EN/UA", run: async (h) => { await h.click('[data-tab="me"]'); await h.wait(150); await h.click('[data-loc="en"]'); await h.wait(250); h.expect(/Language|Flashlight|Light/.test(await h.bodyText()), "не EN"); await h.click('[data-loc="uk"]'); await h.wait(200); await h.click('[data-tab="light"]'); await h.wait(150); } },
  { name: "PWA модалка", run: async (h) => { await h.click('[data-tab="me"]'); await h.wait(150); await h.click("#p-install"); await h.wait(150); h.expect((await h.prop("#install", "open")) === true, "не відкрилось"); } },
];
