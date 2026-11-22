# Status

The MVP is built, following `docs/plan.md`. All tests pass locally (macOS). CI and a person's by-hand walkthrough are still to do; see "Known gaps" below.

## How to run

You need [Node.js](https://nodejs.org) 24 or later, [uv](https://docs.astral.sh/uv/) and, for the tests, Google Chrome.

```
npm install      # once
npm run dev      # starts the app; open http://localhost:5173
```

`npm run dev` sets up Python by itself the first time (`uv sync`), then starts the backend (:8000) and the frontend (:5173) together. The first start creates `data/accountable.db` with the sample data. After installing, nothing needs the internet.

| Command | What it does |
|---|---|
| `npm run seed` | Deletes all data and loads the sample data again |
| `npm run seed -- --large` | The sample data plus thousands of records (3,000 deals, 3,000 contacts, 10,000 activities), for speed checks |
| `npm test` | Backend tests (pytest), the frontend typecheck, the frontend unit tests (Vitest), then the end-to-end tests (Playwright, in Chrome). Every suite runs even if an earlier one fails, then a summary prints and the command fails if any test failed. The tests use their own database, so your data is never touched |

If the end-to-end tests say Chrome can't be found, install Google Chrome, or run `npx playwright install chrome`.

## Test results (2026-11-19, macOS)

- Backend: 91 tests, including every endpoint under 200 ms on the large dataset.
- Frontend: typecheck clean, 89 unit tests.
- End to end: 48 tests in Chrome, each failing on any console error or warning. The speed checks run on the large dataset against a production build: every screen loads in under a second, sorts and drags answer in under 500 ms.

## Known gaps

- **CI hasn't run yet.** `.github/workflows/ci.yml` runs `npm test` on Mac, Linux and Windows, but nothing has been pushed, so it has only been run on macOS. Windows is the one most likely to need a fix.
- **By-hand walkthrough (SC10).** While building, every screen was checked in Chrome against `docs/mockups/dashboard-b.png` and `pipeline-b.png`, with the console clean. The intent asks for a person to use it end to end the way a salesperson would before calling it done; that hasn't happened yet.
- **Speed in the development build.** `npm run dev` serves React's development build, which is slower. On the large dataset there: tables sort in about 140 ms and render about 25 of 3,000 rows; a full page reload takes 1 to 1.7 s; a drag step on the board with Closed deals set to All takes 400 to 570 ms. With the sample data everything is instant.
- **The board shows 50 cards per column**, with "Show more" for the rest. Only reachable with thousands of deals; drops still land in the right place in the whole column.
- **Quick search loads its lists when the box is first used**, so pressing Enter in the first moment, before they've loaded, does nothing.
- **Dates in forms** use the browser's own date picker, so they show in the computer's local format (for example 11/18/2026 in the US). Everywhere else dates read "18 Nov 2026".
- **The won/lost bar chart is fairly flat with the sample data** (mostly one win a month). It reflects the data; more won deals in the sample would make it livelier.

## Done

- **Intent clarified (2026-11-18):** an interview filled the gaps in `docs/intent.md`. It now covers what deletes do, which fields are required, how activities link to records, the organization timeline, the stage probabilities, close dates on Won/Lost, Won and Lost columns on the board, the dashboard's 12-month range, the size and kind of sample data and the target user. It also adds success criteria for keyboard access and speed.
- **Spec written (2026-11-18):** `docs/spec.md` sets out the MVP's requirements (with IDs), architecture, data model, API, screens, brand tokens and test plan. It opens with 12 concerns and the decision taken for each, such as stage colors, contrast fixes, orphaned deals, the funnel definition and offline fonts.
- **Concerns settled (2026-11-18):** stage colors, contrast rules, deals left without an organization (flag + filter), a Closed deals filter on the board for Won and Lost, and bundled offline fonts with system fallbacks. Recorded in `docs/spec.md` and `docs/TECH_STACK.md`.
- **Mockups (2026-11-18):** three design directions for the dashboard and pipeline in `docs/mockups/`, as HTML with a Playwright screenshot of each.
- **Design chosen (2026-11-19):** direction B (floating top bar, Midnight summary panel, color-filled pipeline headers). The Screens section of `docs/spec.md` now describes it, and adds a quick search in the top bar (G10) and the in-column add form (P4).
- **Plan written (2026-11-19):** `docs/plan.md` lists the files that will change, the work in 9 phases (reordered the same day: pipeline moved up to Phase 4, CI on Mac, Linux and Windows from Phase 1, shared table built with Deals), the risks, and the unit and end-to-end tests that prove each requirement. No code yet.
- **Structure simplified (2026-11-19):** the backend is one module per area (organizations, contacts, deals, activities, dashboard) plus `main`, `config`, `db` and `seed`: 10 files instead of 15. The frontend keeps each area's hooks and form schema in its feature folder. `docs/plan.md` and `docs/spec.md` updated.
- **Phase 1, skeleton (2026-11-19):** root `package.json` with `dev`, `seed` and `test`; `pyproject.toml` with uv; FastAPI `/api/health`; Vite + React + Tailwind v4 with brand tokens and bundled fonts; pytest, Vitest and Playwright all run from `npm test`; Playwright starts its own servers on :8100/:5174 with a test database and fixed "today"; CI on Mac, Linux and Windows. The contrast test found the late date on a late card failed AA, so `--raspberry-deep` was added (noted in `docs/spec.md`).
- **Phase 2, backend (2026-11-19):** all five tables, CRUD with validation for organizations, contacts, deals and activities, `change_stage()` and `move()`, delete impact, the three timelines, `/api/dashboard`, sample data (15 organizations, 40 contacts, 34 deals, 85 activities) and the large dataset (`npm run seed -- --large`). 91 backend tests, including endpoints under 200 ms on the large dataset.
- **Phase 3, shell and Deals (2026-11-19):** top bar with tabs and routes; API client with the lists each change refreshes; format, date and stage helpers; the shared `DataTable` (search, sort, count line, empty search, virtualized rows), `FormDialog`, `ConfirmDelete`, `Pill`, `Money`; the Deals table with its filter and Late label, the deal form with field errors, and delete with counts. Checked on the large dataset (3,000 deals). Found and fixed while checking by hand: the edit form's selects showed blank before their options loaded, and focus didn't return to the Edit button after closing a dialog.
- **Phase 4, pipeline (2026-11-19):** six colored columns with totals, expected revenue and share meters; drag between and within columns with an optimistic update and rollback; keyboard dragging (Space, arrows, Escape, Enter opens the deal) with screen-reader announcements, and a "Move to" menu; the in-column add form with "More details"; the Closed deals filter, remembered in the browser; late cards. Found while building: dnd-kit's default arrow-key helper moved cards down instead of across columns, so the board has its own; and with 3,000 deals on the board, rendering every card was too slow (10 s to load, seconds per drag). Columns now show 50 cards at a time with "Show more", and cards don't re-render while dragging. On the large dataset in a production build: 0.8 s to load, about 40 ms per drag step, 250 ms to drop.
- **Phase 5, Contacts and Organizations (2026-11-19):** both tables on the shared `DataTable`, the contact status filter with counts, add and edit forms, and delete dialogs with their counts and wording. The top bar's main action follows the page ("Add contact", "Add organization").
- **Phase 6, record pages and activities (2026-11-19):** organization, contact and deal pages with their details, linked records and one timeline each; "Log activity" on contacts and deals (note, call or email, with an optional follow-up); edit and delete activities; mark follow-ups done and not done; stage changes in the timelines as read-only entries. Deleting from a record's page goes back to its table without refetching the deleted record. Found while testing: the follow-up checkbox didn't tick until the server replied; it now shows the new state at once.
- **Phase 7, dashboard (2026-11-19):** greeting and date; the Midnight summary panel with five figures and the revenue line chart (best month labelled, tooltip with amount and deals won); the funnel with "carried on" shares and lost value; the won/lost bar chart; follow-ups grouped Overdue, Today and Upcoming with mark-done; recent activity linked to each record. End-to-end tests check every figure against the API and the raw deals, and that winning a deal and adding a follow-up change the dashboard.
- **Phase 8, quick search (2026-11-19):** the top-bar search finds deals, contacts and organizations by name, up to 8 grouped by type, with arrow keys and Enter; "/" focuses it unless you're typing elsewhere.
- **Phase 9, sign-off checks (2026-11-19):** the start, persistence (restart the backend, and `npm run seed`), keyboard-only walk and speed suites. Found and fixed: the quick search downloaded every list on every page, which pushed the dashboard past a second on the large dataset, so it now loads them when first used; and a field that focuses itself as a dialog opens was being remembered as "what opened it", so focus didn't return to the Add button. The speed suite runs against a production build.
- **`npm test` runs every suite (2026-11-19):** `scripts/test.mjs` runs all four suites in order, even after a failure, prints a summary and exits with 1 if any failed. Checked with a deliberately failing test (exit code 1, the other suites still ran), then removed it. Documented in `AGENTS.md`.
- **Compared with the mockups (2026-11-19):** the running app (`npm run dev`), screenshotted with Playwright at 1440 px, against `docs/mockups/dashboard-b.png` and `pipeline-b.png`. Fixed to match: the tab and quick-search icons (the mockup's Lucide set), the note icon, the card calendar icon; the "Move to" button now shows only on hover or keyboard focus; the filter dropdowns have the mockup's filter icon and chevron; the separator spacing in recent activity; this month's point is larger on the revenue chart; the revenue tile says how many deals were won when there's no earlier year to compare with. Also found: the won/lost chart's tooltip was Recharts' default, with Coral text failing contrast, so it now matches the brand. Kept on purpose, because the spec wins: follow-ups grouped Overdue, Today and Upcoming; "(USD)" in chart titles; darker checkbox outlines for contrast; the "/" hint in the search box. Left out: the mockup's "All" link on recent activity, which has no page to go to. The sample data is lighter than the mockup's (14 won in 12 months against 29), as the spec asks for about 30 deals.
- **Two fixes from the full test run:** `/api/deals` took about 155 ms on the large dataset, too close to its 200 ms limit, and failed when the machine was busy. The three big lists now encode their JSON in one pass: deals about 65 ms, contacts 50 ms, organizations 12 ms, with the same output. And quick search closed its list 120 ms after losing focus, so typing straight after opening a result could hide the new results; it now closes at once.
- **Review policy (2026-11-21):** `docs/REVIEW.md`, from the course's policy, with changes: two more passes (data safety, and tests that prove the change with `npm test` passing), a security pass written for a local app with no sign-in (localhost only, no data leaving the machine, test routes off by default), the spec pass naming keyboard, contrast and speed, each finding backed by a file, line and way to reproduce it, pre-existing bugs listed apart, and Important widened to data loss, a failing or weakened test and a broken success criterion.
