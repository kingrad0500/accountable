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
3. End-to-end tests of the whole app in a browser, in `e2e/`, using Playwright Test (`@playwright/test`) with the installed Google Chrome. They start the app themselves, so `npm test` needs nothing else running. `npm test` and `npm run check` take turns: a second run, such as the Stop hook's `check:quick`, waits for the first, because two at once slow each other down until the speed tests fail.

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

Colors are defined once, in `frontend/src/styles/tokens.css`, in two layers, and both are mapped into Tailwind in `global.css` (`docs/spec.md`, Decision 13 and Colors):

- The **palette** holds every hex value once and never changes with the mode. Fills use it directly (`bg-sea-green`, `bg-midnight`, `text-midnight`, `text-white`).
- The **roles** are aliases to the palette (`--bg`, `--surface`, `--raised`, `--tint`, `--text`, `--text-muted`, the colored text roles and so on), mapped to short Tailwind names (`bg-page`, `bg-surface`, `bg-raised`, `text-fg`, `text-fg-muted`, `text-fg-cerulean` …). `:root[data-theme="dark"]` points them at other palette colors. Anything that sits on a surface uses a role.

Every pairing meets WCAG AA. Normal text needs 4.5:1; large or bold text, icons, chart lines and the focus ring need 3:1.

- The bright brand colors (Sea Green, Marigold, Coral) are used as fills with Midnight text on top. All three pass with Midnight (6.4, 7.5 and 5.1 to 1). Fills look the same in both modes.
- In light mode each brand color has a darker "ink" shade for text, icons and chart lines on white: Sea Green `#04805F`, Marigold `#9A6700`, Coral `#B4432A`, Cerulean `#0B6E8F`, Raspberry `#B8294F`. Cerulean and Raspberry text also sits on the page and on tints (links, overdue and late dates), so they use deeper shades than the `-ink` fills (`#0E7CA0`, `#D63A60`), which only pass on white. Muted text is `#4F6E78`.
- In dark mode the same text roles point at the bright brand colors or lighter shades instead (Sea Green, Marigold, Coral `#FA9A7C`, Cerulean `#5CC0E2`, Raspberry `#FF8FA8`), with Sea Mist text and `#9DB4BB` muted text, since they sit on black or deep Midnight.
- White text sits on the brand Cerulean and Raspberry only at 14px bold or larger. Smaller white text, such as stage pills and the Late label, uses the darker Cerulean and Raspberry shades.
- Focus is a 2px Cerulean outline with a 2px offset.
- Two Midnight marks get dark-mode roles so they don't vanish: the Negotiation dot and funnel bar (`--dot-negotiation`, Steel `#6E97A5`) and the wordmark's mark (`--brand-mark`, `#1A5063`).
- `styles/contrast.test.ts` parses `tokens.css`, resolves the roles for each mode and checks every role pair in use in both modes, and every fill pair once. It also fails if a hex value appears twice, or anywhere outside the palette, and if light mode's values drift from what they were before dark mode.
- `styles/colors.test.ts` fails if any file in `frontend/src` other than `tokens.css`, or `index.html`, holds a color value: hex, `rgb()`, `hsl()`, a named CSS color or a Tailwind default palette class. `global.css` switches Tailwind's default palette off (`--color-*: initial`), so only token classes exist.
- `e2e/contrast.spec.ts` checks every piece of visible text on every section and a record page of each kind, in both modes, with a hand-written checker (`e2e/contrast.ts`, no dependency). It reads the computed colors and composites each element's background and opacity from `<html>` down, so dimmed text, translucent fills and `color-mix()` tints are measured as drawn, which the token-pair test can't see. Two more tests prove the checker catches failures and passes good text. It doesn't check SVG chart text, dots, bars or other marks; reviews do (`docs/REVIEW.md`).

### Libraries

React Router, TanStack Query, TanStack Table with TanStack Virtual, dnd-kit, Recharts, React Hook Form with Zod, Radix UI primitives, Tailwind CSS v4, lucide-react, date-fns and sonner on the frontend. FastAPI, Pydantic v2, SQLAlchemy Core and uvicorn on the backend. `concurrently` runs both for `npm run dev`.

### Code checks

Prettier and ESLint for the TypeScript; ruff (format and lint) and ty for the Python; gitleaks for secrets. Functions stay at a cyclomatic complexity of 15 or less, and the unit tests cover at least 80% of the code on each side.

ESLint lives at the repo root with TypeScript 6 beside it, because typescript-eslint needs TypeScript's JavaScript API, which TypeScript 7 doesn't have yet. The frontend's `tsc` is TypeScript 7. When typescript-eslint supports TypeScript 7, the root copy can go.

### Installing and running

`npm install` once, then `npm run dev`. `npm run dev` runs `uv sync` first, so Python needs no separate step. Node, uv, Google Chrome (for the tests) and [gitleaks](https://github.com/gitleaks/gitleaks) (for `npm run check`) must already be installed. After that, nothing needs the internet.
