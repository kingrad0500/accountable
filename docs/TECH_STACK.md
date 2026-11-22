This project will use the following high level technical stack:

1. Node.js 26, the current LTS (24 or later works) / TypeScript for the frontend, using React and Vite, in `frontend/`
2. Python 3.12 for the backend using uv, with FastAPI, in `backend/`, with `pyproject.toml` and `uv.lock` at the repo root

The frontend gets its data from the backend's JSON API. The backend keeps the data in a local SQLite database file, using SQLAlchemy Core with no raw SQL, and fills it with the sample data when the database is new.

Prefer popular, well-supported libraries to custom code, such as for the data tables, the charts and the drag-and-drop pipeline. Don't hand-roll what a mature library does well.

For now it runs locally. Later, Supabase will provide sign-in and the database, and the app will be deployed to Render.

Commands are npm scripts in a `package.json` at the repo root, with `frontend/` as an npm workspace, so they work the same on Mac, Linux and Windows:

- `npm run dev` starts the backend and the frontend together
- `npm test` runs all the tests and fails if any test fails
- `npm run check` runs the formatters' checks, linters, type checkers, a secrets scan and all the tests, and fails if any of them fails (`npm run check:quick` leaves out the end-to-end tests)
- `npm run format` fixes the formatting
- `npm run seed` resets the database to the sample data

`docs/STATUS.md` says how to run the app. `README.md` is the course's own guide, so leave it as it is.

Testing will cover:

1. Unit tests for the frontend, using Vitest
2. Unit tests for the backend, using pytest
3. End-to-end tests of the whole app in a browser, in `e2e/`, using Playwright Test (`@playwright/test`) with the installed Google Chrome. They start the app themselves, so `npm test` needs nothing else running.

The tests use a database of their own, so running them never changes your data.

## Decisions for the MVP

These were agreed while writing `docs/spec.md` (2026-11-18). The spec has the detail.

### Fonts work offline

The brand fonts are bundled with the app from npm, never loaded from Google Fonts, so the app looks right with no internet connection:

- `@fontsource-variable/instrument-sans` for headings and body
- `@fontsource/instrument-serif` for accents
- `@fontsource-variable/jetbrains-mono` for numbers, money and identifiers

Each font has system fallbacks behind it, in case a font file fails to load:

```css
--font-sans:  "Instrument Sans Variable", "Instrument Sans", system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
--font-serif: "Instrument Serif", Georgia, "Times New Roman", serif;
--font-mono:  "JetBrains Mono Variable", "JetBrains Mono", ui-monospace, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;
```

Only the Latin subsets and the weights in use are imported, to keep the bundle small.

### Color contrast

Brand colors are defined once as CSS variables in `frontend/src/styles/tokens.css` and mapped into Tailwind. Every pairing meets WCAG AA. Normal text needs 4.5:1; large or bold text, icons and chart lines need 3:1.

- The bright brand colors (Sea Green, Marigold, Coral) are used as fills with Midnight text on top. All three pass with Midnight (6.4, 7.5 and 5.1 to 1).
- Each brand color has a darker "ink" shade for text, icons and chart lines on white or the page background: Sea Green `#04805F`, Marigold `#9A6700`, Coral `#B4432A`, Cerulean `#0E7CA0`, Raspberry `#D63A60`. Muted text is `#4F6E78`.
- White text sits on the brand Cerulean and Raspberry only at 14px bold or larger. Smaller white text, such as stage pills and the Late label, uses the darker Cerulean and Raspberry shades.
- Focus is a 2px Cerulean outline with a 2px offset.
- A frontend unit test checks the contrast of every text/background token pair used, so a later color change can't quietly break it.

### Libraries

React Router, TanStack Query, TanStack Table with TanStack Virtual, dnd-kit, Recharts, React Hook Form with Zod, Radix UI primitives, Tailwind CSS v4, lucide-react, date-fns and sonner on the frontend. FastAPI, Pydantic v2, SQLAlchemy Core and uvicorn on the backend. `concurrently` runs both for `npm run dev`.

### Code checks

Prettier and ESLint for the TypeScript; ruff (format and lint) and ty for the Python; gitleaks for secrets. Functions stay at a cyclomatic complexity of 15 or less, and the unit tests cover at least 80% of the code on each side.

ESLint lives at the repo root with TypeScript 6 beside it, because typescript-eslint needs TypeScript's JavaScript API, which TypeScript 7 doesn't have yet. The frontend's `tsc` is TypeScript 7. When typescript-eslint supports TypeScript 7, the root copy can go.

### Installing and running

`npm install` once, then `npm run dev`. `npm run dev` runs `uv sync` first, so Python needs no separate step. Node, uv, Google Chrome (for the tests) and [gitleaks](https://github.com/gitleaks/gitleaks) (for `npm run check`) must already be installed. After that, nothing needs the internet.
