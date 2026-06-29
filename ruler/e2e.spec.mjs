export default [
  { name: "лінійка рендерить поділки", run: async (h) => { for (let i = 0; i < 20 && (await h.count(".aw-tick")) < 10; i++) await h.wait(200); h.expect((await h.count(".aw-tick")) >= 10, "немає поділок"); } },
  { name: "є показ у см", run: async (h) => { h.expect(/см|cm/.test(await h.text("#ruler-readout")), "немає показу см"); h.expect((await h.count("#ruler-box")) === 1, "немає області лінійки"); } },
  {
    name: "калібрування змінює й зберігає px/см", run: async (h) => {
      await h.click("#ruler-calib"); await h.wait(200);
      h.expect((await h.count("#calib")) === 1, "екран калібрування не відкрився");
      await h.type("#calib-range", "70"); await h.wait(150);
      h.expect((await h.storage("ruler:pxPerCm")) === "70", "px/см не збереглося");
      await h.click("#calib-save"); await h.wait(200);
      h.expect((await h.count("#calib")) === 0 && (await h.count("#ruler-box")) === 1, "не повернулись до лінійки");
    },
  },
  { name: "калібрування персистить (reload-стійке)", run: async (h) => { h.expect((await h.storage("ruler:pxPerCm")) === "70", "не персистнуло"); } },
  { name: "i18n EN/UA", run: async (h) => { await h.click('[data-tab="me"]'); await h.wait(150); await h.click('[data-loc="en"]'); await h.wait(250); h.expect(/Language|Ruler|Settings/.test(await h.bodyText()), "не EN"); await h.click('[data-loc="uk"]'); await h.wait(200); await h.click('[data-tab="ruler"]'); await h.wait(150); } },
  { name: "PWA модалка", run: async (h) => { await h.click('[data-tab="me"]'); await h.wait(150); await h.click("#p-install"); await h.wait(150); h.expect((await h.prop("#install", "open")) === true, "не відкрилось"); } },
];
