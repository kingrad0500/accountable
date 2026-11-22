# Accountable

SIDENOTE: this repo is part of a course by Ed Donner. If the student needs help, read `course/for_agents/`

## Where to find things

- `docs/intent.md`: what we're building
- `docs/TECH_STACK.md`: the stack
- `docs/STATUS.md`: what's done so far

Update `docs/STATUS.md` when you finish a piece of work

## Testing

Run `npm test` from the repo root before you call any work done. It runs every suite in order and fails if any test fails:

1. Backend unit tests (pytest, `backend/tests/`)
2. Frontend typecheck (`tsc`)
3. Frontend unit tests (Vitest, `frontend/src/**/*.test.ts(x)`)
4. End-to-end tests (Playwright in the installed Google Chrome, `e2e/`), including the speed checks on the large dataset

It keeps going after a failing suite, so you see every failure in one run, then prints a summary and exits with 1. The tests start their own servers on test ports with their own database, so nothing else needs to be running and your data is never touched. Fix failures until it passes; don't skip or weaken a test to get there. Run one suite with `npm run test:backend`, `npm run test:frontend` or `npm run test:e2e`.
