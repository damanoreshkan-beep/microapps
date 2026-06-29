export default [
  { name: "дашборд: герой з індексом і смугою якості", run: async (h) => { let t = ""; for (let i = 0; i < 24; i++) { t = await h.bodyText(); if (/Добре|Прийнятно|Помірно|Погано|Небезпечно/.test(t)) break; await h.wait(500); } h.expect(/Добре|Прийнятно|Помірно|Погано|Небезпечно/.test(t), "немає смуги якості"); h.expect(/Київ/.test(t), "немає міста за замовчуванням"); } },
  { name: "погодинна стрічка має години", run: async (h) => { const t = await h.bodyText(); h.expect(/\d{1,2}:\d{2}/.test(t), "немає погодинних позначок часу"); } },
  { name: "прогноз на дні (Сьогодні + картки)", run: async (h) => { const t = await h.bodyText(); h.expect(/Сьогодні/.test(t), "немає «Сьогодні»"); h.expect((await h.count(".card")) >= 3, "замало карток на дні"); } },
  {
    name: "зміна міста рефетчить дашборд", run: async (h) => {
      await h.click("#filter-btn"); await h.wait(200);
      h.expect((await h.prop("#sheet", "open")) === true, "лист фільтра не відкрився");
      await h.click('#f-city button[data-val="lviv"]'); await h.wait(120);
      await h.click("#f-apply"); await h.wait(3000);
      h.expect(/Львів/.test(await h.bodyText()), "місто не змінилось на Львів");
      h.expect((await h.count(".badge-outline")) >= 1, "немає чипа активного фільтра");
      await h.click(".badge-outline"); await h.wait(3000);            // tap chip → reset to Kyiv + refetch
      h.expect(/Київ/.test(await h.bodyText()), "чип не скинув місто на Київ");
    },
  },
  { name: "i18n EN/UA міняє текст", run: async (h) => { await h.click('[data-tab="me"]'); await h.wait(150); await h.click('[data-loc="en"]'); await h.wait(250); h.expect(/Language|Settings|Hourly|Air quality/.test(await h.bodyText()), "не EN"); await h.click('[data-loc="uk"]'); await h.wait(250); h.expect(/Мова|Налаштування|Зараз/.test(await h.bodyText()), "не UA"); await h.click('[data-tab="now"]'); await h.wait(120); } },
  { name: "вкладки перемикаються (Зараз ⇄ Налаштування)", run: async (h) => { await h.click('[data-tab="me"]'); await h.wait(150); h.expect((await h.attr('[data-tab="me"]', "aria-current")) === "page", "вкладка не активна"); await h.click('[data-tab="now"]'); await h.wait(150); h.expect((await h.attr('[data-tab="now"]', "aria-current")) === "page", "не повернулись"); } },
  { name: "оновлення зберігає дашборд", run: async (h) => { await h.click("#refresh"); await h.wait(2800); h.expect(/Київ/.test(await h.bodyText()), "після оновлення немає даних"); } },
  { name: "PWA: профіль → модалка встановлення", run: async (h) => { await h.click('[data-tab="me"]'); await h.wait(150); h.expect((await h.count("#p-install")) === 1, "немає кнопки"); await h.click("#p-install"); await h.wait(150); h.expect((await h.prop("#install", "open")) === true, "не відкрилось"); await h.click('[data-tab="now"]'); await h.wait(120); } },
];
