// Claude Code PreToolUse hook: blocks any edit to a `.env` file, which holds real keys.
// Covers the file tools (Edit, Write, MultiEdit, NotebookEdit) by path, and Bash commands that
// name a `.env` file, since a shell command could write one too. `.env.example` and the like
// are not blocked. Exit code 2 blocks the call and tells Claude why.
import { readFileSync } from "node:fs";
import { basename } from "node:path";

const { tool_name: tool, tool_input: args = {} } = JSON.parse(readFileSync(0, "utf8") || "{}");

const path = args.file_path ?? args.notebook_path ?? "";
const editsEnv = path !== "" && basename(path) === ".env";
const bashTouchesEnv =
  tool === "Bash" && /(^|[\s/'"=<>(])\.env(?=$|[\s'";|&)<>])/.test(args.command ?? "");

if (editsEnv || bashTouchesEnv) {
  process.stderr.write(
    "Blocked: .env holds real secrets and is off limits to Claude. Ask the user to change it.\n",
  );
  process.exit(2);
}
