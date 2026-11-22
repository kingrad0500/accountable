# Accountable

SIDENOTE: this repo is part of a course by Ed Donner. If the student needs help, read `course/for_agents/`

## Where to find things

Read `docs/spec.md` first. It describes the whole product as it stands today, and it's the authority for how Accountable behaves.

- `docs/spec.md`: the product: what it does, its rules and its design
- `docs/TECH_STACK.md`: the stack
- `docs/STANDARDS.md`: how code is written in this repo. Follow it in every change
- `docs/STATUS.md`: what's done so far
- `docs/REVIEW.md`: how changes are reviewed
- `docs/changes/<branch name>/`: one folder per change, named after its git branch, with its `intent.md` (what the change is for) and `plan.md` (how it gets built)

Only read the folder for the current change, the one named after the branch you're on (`git branch --show-current`). The other folders are history: they record past changes, and anything they say that still holds is already in `docs/spec.md`. A change updates `docs/spec.md` so it describes the product as it will be once the change is merged.

Update `docs/STATUS.md` when you finish a piece of work

## Checks

Run `npm run check` from the repo root before you call any work done. It runs every check in order, keeps going after a failure, then prints a summary and exits with 1 if any failed:

1. Prettier (`.prettierrc.json`) and ESLint (`eslint.config.mjs`: recommended TypeScript, React Hooks and accessibility rules) for the TypeScript
2. `ruff format` and `ruff check` for the Python (`pyproject.toml`)
3. A cyclomatic complexity of at most 15 per function: ESLint's `complexity` rule and ruff's `C901`
4. `ty` for the Python types (`tsc` runs in `npm test`)
5. gitleaks over the git history and the working tree (`.gitleaks.toml`; only the git-ignored `.env` files are allowed to hold secrets)
6. `npm test`, below, where the unit tests also fail under 80% coverage

`npm run check:quick` runs the same without the end-to-end tests, for a fast loop while working. `npm run format` fixes the formatting. Fix what the checks find; don't weaken a rule, skip a test or add a disable comment to get them passing. If a rule doesn't suit the project, ask first.

## Hooks

- **Git pre-commit** (lefthook, `lefthook.yml`, installed by `npm install`): formats the staged files and stages the fixes, then runs ESLint and ruff on them, `tsc` and `ty`, and gitleaks on the staged changes. No tests, so it stays quick (about 5 seconds). `git commit -n` skips it.
- **When Claude finishes a turn** (`.claude/hooks/check-on-stop.mjs`): runs `npm run check:quick` and, if it fails, sends the output back to fix. It blocks once per turn, then lets the stop through.
- **Before Claude edits a file** (`.claude/hooks/protect-env.mjs`): blocks any edit to a `.env` file, and any Bash command that names one. `.env.example` and similar files are allowed.

## Testing

`npm test` runs just the tests. It runs every suite in order and fails if any test fails:

1. Backend unit tests (pytest, `backend/tests/`)
2. Frontend typecheck (`tsc`)
3. Frontend unit tests (Vitest, `frontend/src/**/*.test.ts(x)`)
4. End-to-end tests (Playwright in the installed Google Chrome, `e2e/`), including the speed checks on the large dataset

It keeps going after a failing suite, so you see every failure in one run, then prints a summary and exits with 1. The tests start their own servers on test ports with their own database, so nothing else needs to be running and your data is never touched. Fix failures until it passes; don't skip or weaken a test to get there. Run one suite with `npm run test:backend`, `npm run test:frontend` or `npm run test:e2e`.
