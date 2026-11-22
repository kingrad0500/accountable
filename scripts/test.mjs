// `npm test`: runs every test suite in order, even after one fails, then prints a summary and
// exits with 1 if any suite failed.
import { runSteps, TEST_SUITES } from "./steps.mjs";

process.exit(runSteps(TEST_SUITES));
