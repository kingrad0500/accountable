// `npm test`: runs every test suite in order, even after one fails, then prints a
// summary and exits with 1 if any suite failed. Works the same on Mac, Linux and Windows.
import { spawnSync } from "node:child_process";

const SUITES = [
  ["Backend unit tests (pytest)", "npm run test:backend"],
  ["Frontend typecheck (tsc)", "npm run typecheck --workspace frontend"],
  ["Frontend unit tests (Vitest)", "npm run test:unit --workspace frontend"],
  ["End-to-end tests (Playwright, Chrome)", "npm run test:e2e"],
];

const results = [];
for (const [name, command] of SUITES) {
  console.log(`\n=== ${name} ===\n$ ${command}\n`);
  const started = Date.now();
  const { status, error } = spawnSync(command, { stdio: "inherit", shell: true });
  const ok = status === 0 && !error;
  results.push({ name, ok, seconds: Math.round((Date.now() - started) / 1000) });
}

console.log("\n=== Summary ===");
for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name} (${r.seconds}s)`);
const failed = results.filter((r) => !r.ok).length;
console.log(failed ? `\n${failed} of ${results.length} suites failed.` : `\nAll ${results.length} suites passed.`);
process.exit(failed ? 1 : 0);
