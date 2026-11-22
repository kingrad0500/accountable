// Runs a list of named shell steps in order, even after one fails, then prints a summary.
// Shared by `npm test` and `npm run check`, which take turns: a second run waits for the first.
// Works the same on Mac, Linux and Windows.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { closeSync, openSync, readFileSync, rmSync, writeSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/** The test suites `npm test` runs. Unit tests fail below 80% coverage. */
export const TEST_SUITES = [
  ["Backend unit tests (pytest, coverage)", "npm run test:backend"],
  ["Frontend typecheck (tsc)", "npm run typecheck --workspace frontend"],
  ["Frontend unit tests (Vitest, coverage)", "npm run test:unit --workspace frontend"],
  ["End-to-end tests (Playwright, Chrome)", "npm run test:e2e"],
];

export const E2E_SUITE = TEST_SUITES[3][0];

// One run at a time per checkout: two runs at once (say the Stop hook's check:quick while a full
// check runs in the background) slow each other down until the speed tests fail.
const LOCK = join(
  tmpdir(),
  `accountable-checks-${createHash("sha1").update(process.cwd()).digest("hex").slice(0, 12)}.lock`,
);

function isRunning(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code === "EPERM";
  }
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/** Takes the lock, waiting for another run to finish, or taking over from one that died. */
function lockRuns() {
  let announced = false;
  for (;;) {
    try {
      const fd = openSync(LOCK, "wx");
      writeSync(fd, String(process.pid));
      closeSync(fd);
      process.on("exit", () => rmSync(LOCK, { force: true }));
      return;
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
    }
    let holder;
    try {
      holder = Number(readFileSync(LOCK, "utf8"));
    } catch {
      continue; // The other run just finished.
    }
    // An empty file is a run still writing its pid.
    if (holder && !isRunning(holder)) {
      rmSync(LOCK, { force: true });
      continue;
    }
    if (!announced) console.log(`Waiting for another check or test run (pid ${holder}) to finish…`);
    announced = true;
    sleep(2000);
  }
}

/** Runs each [name, command] step and returns the exit code: 1 if any step failed. */
export function runSteps(steps) {
  lockRuns();
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
