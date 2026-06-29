// Morse encoder → flat [level(0|1), ms] strobe steps. Pure & dependency-free so it's unit-testable
// under `deno test` (no browser). Timing: dot = U, dash = 3U, intra-letter gap = U, letter gap = 3U,
// trailing word gap = 7U (standard Morse ratios).
const U = 220;
const CODE = { S: "...", O: "---" }; // extend as more signals are needed

export function morse(text) {
  const steps = [];
  const letters = [...text.toUpperCase()].filter((c) => CODE[c]);
  letters.forEach((c, li) => {
    const sym = CODE[c];
    [...sym].forEach((d, si) => {
      steps.push([1, d === "-" ? 3 * U : U]);
      if (si < sym.length - 1) steps.push([0, U]); // gap between symbols of a letter
    });
    steps.push([0, li < letters.length - 1 ? 3 * U : 7 * U]); // letter gap, or trailing word gap
  });
  return steps;
}

export const SOS = morse("SOS"); // ···———···
