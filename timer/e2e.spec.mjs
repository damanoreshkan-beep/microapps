export default [
  { name: "секундомір idle (00:00 + старт)", run: async (h) => { await h.wait(300); h.expect((await h.count("#sw-start")) === 1, "немає кнопки старт"); h.expect(/00:00\.00/.test(await h.bodyText()), "не з нуля"); } },
  {
    name: "секундомір рахує + коло + пауза", run: async (h) => {
      await h.click("#sw-start"); await h.wait(700);
      h.expect((await h.count("#sw-stop")) === 1, "не запустився");
      h.expect(!/00:00\.00/.test(await h.bodyText()), "час не йде");
      await h.click("#sw-lap"); await h.wait(150);
      h.expect(/Коло|Lap/.test(await h.bodyText()), "немає кола");
      await h.click("#sw-stop"); await h.wait(150);
      h.expect((await h.count("#sw-start")) === 1, "не стало на паузу");
    },
  },
  { name: "секундомір скидання → нуль", run: async (h) => { await h.click("#sw-reset"); await h.wait(150); h.expect(/00:00\.00/.test(await h.bodyText()), "не скинувся"); } },
  {
    name: "таймер: вкладка, пресети, старт", run: async (h) => {
      await h.click('[data-tab="timer"]'); await h.wait(200);
      h.expect((await h.count("#tm-time")) === 1, "немає таймера");
      await h.click("#tm-start"); await h.wait(600);
      h.expect((await h.count("#tm-stop")) === 1, "таймер не стартував");
      await h.click("#tm-stop"); await h.wait(150);
      h.expect((await h.count("#tm-start")) === 1, "не на паузі");
    },
  },
  { name: "i18n EN/UA міняє текст", run: async (h) => { await h.click('[data-tab="me"]'); await h.wait(150); await h.click('[data-loc="en"]'); await h.wait(250); h.expect(/Language|Stopwatch|Timer|Settings/.test(await h.bodyText()), "не EN"); await h.click('[data-loc="uk"]'); await h.wait(200); await h.click('[data-tab="stopwatch"]'); await h.wait(150); } },
  { name: "вкладки перемикаються", run: async (h) => { await h.click('[data-tab="timer"]'); await h.wait(150); h.expect((await h.attr('[data-tab="timer"]', "aria-current")) === "page", "вкладка не активна"); await h.click('[data-tab="stopwatch"]'); await h.wait(150); h.expect((await h.attr('[data-tab="stopwatch"]', "aria-current")) === "page", "не повернулись"); } },
  { name: "PWA: профіль → модалка встановлення", run: async (h) => { await h.click('[data-tab="me"]'); await h.wait(150); h.expect((await h.count("#p-install")) === 1, "немає кнопки"); await h.click("#p-install"); await h.wait(150); h.expect((await h.prop("#install", "open")) === true, "не відкрилось"); await h.click('[data-tab="stopwatch"]'); await h.wait(120); } },
];
