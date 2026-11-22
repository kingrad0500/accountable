// Runs a list of named shell steps in order, even after one fails, then prints a summary.
// Shared by `npm test` and `npm run check`. Works the same on Mac, Linux and Windows.
import { spawnSync } from "node:child_process";

/** The test suites `npm test` runs. Unit tests fail below 80% coverage. */
export const TEST_SUITES = [
  ["Backend unit tests (pytest, coverage)", "npm run test:backend"],
  ["Frontend typecheck (tsc)", "npm run typecheck --workspace frontend"],
  ["Frontend unit tests (Vitest, coverage)", "npm run test:unit --workspace frontend"],
  ["End-to-end tests (Playwright, Chrome)", "npm run test:e2e"],
];

export const E2E_SUITE = TEST_SUITES[3][0];

/** Runs each [name, command] step and returns the exit code: 1 if any step failed. */
export function runSteps(steps) {
  const results = [];
  for (const [name, command] of steps) {
    console.log(`\n=== ${name} ===\n$ ${command}\n`);
    const started = Date.now();
    const { status, error } = spawnSync(command, { stdio: "inherit", shell: true });
    const ok = status === 0 && !error;
    results.push({ name, ok, seconds: Math.round((Date.now() - started) / 1000) });
  }

  console.log("\n=== Summary ===");
  for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name} (${r.seconds}s)`);
  const failed = results.filter((r) => !r.ok).length;
  console.log(
    failed
      ? `\n${failed} of ${results.length} steps failed.`
      : `\nAll ${results.length} steps passed.`,
  );
  return failed ? 1 : 0;
}
