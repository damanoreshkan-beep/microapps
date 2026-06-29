export default [
  { name: "екран шумоміра (gate мікрофона)", run: async (h) => { await h.wait(400); h.expect((await h.count("#noise-enable")) === 1 || /Мікрофон недоступний|Microphone/.test(await h.bodyText()), "немає gate мікрофона"); h.expect((await h.count("#noise-calib-btn")) === 1, "немає кнопки калібрування"); } },
  {
    name: "калібрування: повзунок зберігає", run: async (h) => {
      await h.click("#noise-calib-btn"); await h.wait(200);
      h.expect((await h.count("#noise-calib")) === 1, "калібрування не відкрилось");
      await h.type("#calib-range", "10"); await h.wait(120);
      h.expect((await h.storage("noise:cal")) === "10", "зсув не зберігся");
      await h.click("#calib-save"); await h.wait(200);
      h.expect((await h.count("#noise-calib")) === 0, "не закрилось після збереження");
    },
  },
  {
    name: "роутинг: системний Back закриває калібрування", run: async (h) => {
      await h.click("#noise-calib-btn"); await h.wait(200);
      h.expect((await h.count("#noise-calib")) === 1, "не відкрилось");
      await h.back(); await h.wait(250);
      h.expect((await h.count("#noise-calib")) === 0, "Back не закрив калібрування");
      h.expect((await h.count("#noise-calib-btn")) === 1, "Back вийшов з екрана");
    },
  },
  { name: "i18n EN/UA", run: async (h) => { await h.click('[data-tab="me"]'); await h.wait(150); await h.click('[data-loc="en"]'); await h.wait(250); h.expect(/Language|Sound level|Level/.test(await h.bodyText()), "не EN"); await h.click('[data-loc="uk"]'); await h.wait(200); await h.click('[data-tab="meter"]'); await h.wait(150); } },
  { name: "PWA модалка", run: async (h) => { await h.click('[data-tab="me"]'); await h.wait(150); await h.click("#p-install"); await h.wait(150); h.expect((await h.prop("#install", "open")) === true, "не відкрилось"); } },
];
