// Claude Code Stop hook: runs `npm run check:quick` when Claude finishes a turn. If it fails,
// exit code 2 blocks the stop and sends the end of the output back to Claude to fix.
// It blocks only once: when Claude is already continuing because of this hook
// (`stop_hook_active`), it lets the stop through, so it can never loop.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const input = JSON.parse(readFileSync(0, "utf8") || "{}");
if (input.stop_hook_active) process.exit(0);

const { status, stdout, stderr } = spawnSync("npm run check:quick", {
  cwd: process.env.CLAUDE_PROJECT_DIR || process.cwd(),
  shell: true,
  encoding: "utf8",
  maxBuffer: 64 * 1024 * 1024,
});
if (status === 0) process.exit(0);

const tail = `${stdout}${stderr}`.split("\n").slice(-120).join("\n");
process.stderr.write(
  `npm run check:quick failed. Fix what it found, then stop again (this hook won't block twice).\n\n${tail}\n`,
);
process.exit(2);
