export default [
  { name: "екран сигналізації (idle)", run: async (h) => { await h.wait(400); h.expect((await h.count("#arm-btn")) === 1, "немає кнопки озброєння"); h.expect(/Вимкнено|Off/.test(await h.bodyText()), "немає стану idle"); } },
  {
    name: "озброєння змінює стан, скасування повертає", run: async (h) => {
      await h.click("#arm-btn"); await h.wait(600);
      h.expect((await h.count("#guard-disarm")) === 1, "не перейшло в озброєння");
      h.expect((await h.count("#arm-btn")) === 0, "кнопка arm лишилась");
      await h.click("#guard-disarm"); await h.wait(300);
      h.expect((await h.count("#arm-btn")) === 1, "скасування не повернуло в idle");
    },
  },
  {
    name: "чутливість: повзунок зберігає поріг", run: async (h) => {
      await h.click("#guard-sens-btn"); await h.wait(200);
      h.expect((await h.count("#guard-sens")) === 1, "не відкрилось");
      await h.type("#sens-range", "3"); await h.wait(120);
      h.expect((await h.storage("alarm:thr")) === "2.0", "поріг не зберігся (" + (await h.storage("alarm:thr")) + ")");
      await h.click("#sens-save"); await h.wait(200);
      h.expect((await h.count("#guard-sens")) === 0, "не закрилось");
    },
  },
  {
    name: "роутинг: системний Back закриває чутливість", run: async (h) => {
      await h.click("#guard-sens-btn"); await h.wait(200);
      h.expect((await h.count("#guard-sens")) === 1, "не відкрилось");
      await h.back(); await h.wait(250);
      h.expect((await h.count("#guard-sens")) === 0, "Back не закрив");
      h.expect((await h.count("#guard-sens-btn")) === 1, "Back вийшов з екрана");
    },
  },
  { name: "i18n EN/UA", run: async (h) => { await h.click('[data-tab="me"]'); await h.wait(150); await h.click('[data-loc="en"]'); await h.wait(250); h.expect(/Language|Motion alarm|Guard/.test(await h.bodyText()), "не EN"); await h.click('[data-loc="uk"]'); await h.wait(200); await h.click('[data-tab="guard"]'); await h.wait(150); } },
  { name: "PWA модалка", run: async (h) => { await h.click('[data-tab="me"]'); await h.wait(150); await h.click("#p-install"); await h.wait(150); h.expect((await h.prop("#install", "open")) === true, "не відкрилось"); } },
];
