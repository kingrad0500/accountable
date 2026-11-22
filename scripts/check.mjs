// `npm run check`: formatting, linting, complexity, types, secrets, then every test suite with
// coverage. `--quick` leaves out the end-to-end tests. Every step runs even after one fails.
import { E2E_SUITE, runSteps, TEST_SUITES } from "./steps.mjs";

const quick = process.argv.includes("--quick");

const STATIC_CHECKS = [
  ["Formatting (Prettier)", "npx prettier --check ."],
  ["Lint and complexity (ESLint)", "npx eslint . --max-warnings 0"],
  ["Python formatting (ruff format)", "uv run ruff format --check"],
  ["Python lint and complexity (ruff check)", "uv run ruff check"],
  ["Python types (ty)", "uv run ty check"],
  [
    "Secrets in git history (gitleaks)",
    "gitleaks git --no-banner --redact --config .gitleaks.toml .",
  ],
  [
    "Secrets in the working tree (gitleaks)",
    "gitleaks dir --no-banner --redact --config .gitleaks.toml .",
  ],
];

const suites = quick ? TEST_SUITES.filter(([name]) => name !== E2E_SUITE) : TEST_SUITES;

process.exit(runSteps([...STATIC_CHECKS, ...suites]));
