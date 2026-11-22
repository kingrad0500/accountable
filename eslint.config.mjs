// ESLint for the TypeScript in the repo: the frontend app, the end-to-end tests and the scripts.
// typescript-eslint parses with the TypeScript 6 at the repo root, because TypeScript 7 (used by
// the frontend's `tsc`) has no JavaScript API yet.
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import jsxA11y from "eslint-plugin-jsx-a11y";
import prettier from "eslint-config-prettier";
import globals from "globals";

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/",
      "**/dist/",
      "**/coverage/",
      "playwright-report/",
      "test-results/",
      "data/",
      "course/",
      "community_contributions/",
      ".impeccable/",
      ".playwright-mcp/",
      ".claude/",
      ".venv/",
      // Static HTML mockups from the design phase, not part of the app.
      "docs/",
    ],
  },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: {
      complexity: ["error", 15],
    },
  },
  {
    files: ["frontend/src/**/*.{ts,tsx}"],
    extends: [reactHooks.configs.flat.recommended, jsxA11y.flatConfigs.recommended],
  },
  {
    // TanStack Table and Virtual's hooks are on the React Compiler's list of incompatible
    // libraries, and no TanStack API avoids them. The app doesn't use the React Compiler, so the
    // warning has no effect here. Agreed with the project owner, 2026-11-22.
    files: ["frontend/src/components/DataTable.tsx"],
    rules: { "react-hooks/incompatible-library": "off" },
  },
  prettier,
);
