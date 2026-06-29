export default [
  { name: "екран навігатора рендериться (gate без цілі)", run: async (h) => { await h.wait(400); h.expect((await h.count("#nav-change")) === 1, "немає кнопки цілі"); h.expect(/ціль|target/i.test(await h.bodyText()), "немає підказки про ціль"); } },
  {
    name: "додавання цілі координатами зберігає й активує", run: async (h) => {
      await h.click("#nav-change"); await h.wait(200);
      h.expect((await h.count("#nav-chooser")) === 1, "вибір цілі не відкрився");
      await h.type("#nav-input", "50.4501, 30.5234"); await h.wait(100);
      await h.click("#nav-add"); await h.wait(250);
      const saved = JSON.parse((await h.storage("navigator:targets")) || "[]");
      h.expect(saved.length >= 1 && Math.abs(saved[0].lat - 50.4501) < 0.001, "ціль не збереглась");
      h.expect((await h.storage("navigator:active")) === saved[0].id, "ціль не активувалась");
      h.expect((await h.count("#nav-chooser")) === 0, "вибір не закрився після додавання");
    },
  },
  {
    name: "короткий maps-лінк розрезолвлюється (proxy+геокодинг)", run: async (h) => {
      const before = JSON.parse((await h.storage("navigator:targets")) || "[]").length;
      await h.click("#nav-change"); await h.wait(200);
      await h.type("#nav-input", "https://maps.app.goo.gl/VXs8aioLz7zF12VL8"); await h.click("#nav-add");
      let after = before;
      for (let i = 0; i < 24; i++) { after = JSON.parse((await h.storage("navigator:targets")) || "[]").length; if (after > before) break; await h.wait(500); }
      const t0 = JSON.parse((await h.storage("navigator:targets")) || "[]")[0];
      h.expect(after > before, "лінк не додав ціль");
      h.expect(t0 && Math.abs(t0.lat - 50.85) < 0.5 && Math.abs(t0.lng - 31.04) < 0.6, "розрезолвлені координати не схожі на правильні");
    },
  },
  { name: "погані координати → тост помилки", run: async (h) => { await h.click("#nav-change"); await h.wait(150); await h.type("#nav-input", "отакої"); await h.click("#nav-add"); await h.wait(200); h.expect(/розпізнав|read coord/i.test(await h.text("[data-toast]")), "немає тосту помилки"); await h.back(); await h.wait(200); } },
  {
    name: "роутинг: системний Back закриває вибір цілі", run: async (h) => {
      await h.click("#nav-change"); await h.wait(200);
      h.expect((await h.count("#nav-chooser")) === 1, "вибір не відкрився");
      await h.back(); await h.wait(250);
      h.expect((await h.count("#nav-chooser")) === 0, "Back не закрив вибір");
      h.expect((await h.count("#nav-change")) === 1, "Back вийшов з екрана навігатора");
    },
  },
  { name: "збережена ціль у списку", run: async (h) => { await h.click("#nav-change"); await h.wait(200); h.expect((await h.count("#nav-saved .card")) >= 1, "збереженої цілі немає у списку"); await h.back(); await h.wait(200); } },
  { name: "i18n EN/UA", run: async (h) => { await h.click('[data-tab="me"]'); await h.wait(150); await h.click('[data-loc="en"]'); await h.wait(250); h.expect(/Language|Navigator|Heading|Target/.test(await h.bodyText()), "не EN"); await h.click('[data-loc="uk"]'); await h.wait(200); await h.click('[data-tab="nav"]'); await h.wait(150); } },
  { name: "PWA модалка", run: async (h) => { await h.click('[data-tab="me"]'); await h.wait(150); await h.click("#p-install"); await h.wait(150); h.expect((await h.prop("#install", "open")) === true, "не відкрилось"); } },
];
