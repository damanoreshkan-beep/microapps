// Browser-free unit tests for the Morse encoder. `deno test` locally (no Chromium) and in CI.
import { assertEquals } from "jsr:@std/assert@^1";
import { morse, SOS } from "./morse.js";

const U = 220;

Deno.test("SOS on-pulses are short-short-short long-long-long short-short-short (···———···)", () => {
  const ons = SOS.filter(([lvl]) => lvl === 1).map(([, ms]) => ms);
  assertEquals(ons, [U, U, U, 3 * U, 3 * U, 3 * U, U, U, U]);
});

Deno.test("SOS has 9 on-pulses", () => {
  assertEquals(SOS.filter(([lvl]) => lvl === 1).length, 9);
});

Deno.test("SOS ends with a 7U word gap", () => {
  assertEquals(SOS[SOS.length - 1], [0, 7 * U]);
});

Deno.test("morse ignores unknown characters", () => {
  assertEquals(morse("S!").filter(([lvl]) => lvl === 1).length, 3);
});

Deno.test("morse: a dash is 3× a dot", () => {
  const dot = morse("S")[0][1];
  const dash = morse("O")[0][1];
  assertEquals(dash, 3 * dot);
});
