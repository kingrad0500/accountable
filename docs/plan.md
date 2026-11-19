# Plan: building the Accountable MVP

This plan builds what `docs/intent.md` asks for, as designed in `docs/spec.md` (direction B in `docs/mockups/`). Requirement IDs such as DL5 and P2 refer to the spec, and SC1 to SC10 are the intent's success criteria.

## Files that change

### Repo root

| File | Change |
|---|---|
| `package.json` | New. npm workspace `frontend`. Scripts `dev`, `test`, `seed`, plus `test:backend`, `test:frontend` and `test:e2e`, which `test` runs in order. Dev dependencies: `concurrently`, `@playwright/test` |
| `package-lock.json` | New, generated |
| `pyproject.toml`, `uv.lock` | New. Python 3.12 project with its package in `backend/`. Depends on FastAPI, uvicorn, SQLAlchemy and Pydantic. Dev dependencies: pytest, httpx |
| `playwright.config.ts` | New. Uses the installed Chrome (`channel: "chrome"`). Starts a backend on `:8100` and a frontend on `:5174` against a fresh test database |
| `.gitignore` | Add `data/`. `*.db` is already ignored |
| `.github/workflows/ci.yml` | New. Runs `npm install` and `npm test` on Mac, Linux and Windows with Chrome |

### Backend: `backend/accountable/`

One module per area. Each holds that area's routes, request and response models, and rules. Shared things live in `db.py` and `config.py`. When an area outgrows one file, for example when the ERP arrives, it becomes a package with the same name and nothing else has to change.

| File | Purpose |
|---|---|
| `__init__.py` | Package marker |
| `main.py` | FastAPI app, mounts each area's router under `/api`, startup that creates and seeds a new database |
| `config.py` | Settings read from the environment: database path (`ACCOUNTABLE_DB`) and `today()`, which tests can fix with `ACCOUNTABLE_TODAY`. Later the Supabase URL and keys go here |
| `db.py` | Engine, SQLite pragmas (foreign keys, WAL), all five tables with their indexes and check constraint, and the per-request connection. All tables live here, in one metadata, so a later migration tool sees the whole schema |
| `organizations.py` | Routes, models and validation for organizations. Delete-impact counts. Organization timeline |
| `contacts.py` | Routes, models and validation for contacts. Delete-impact counts. Contact timeline |
| `deals.py` | Routes, models and validation for deals. Stage rules (`change_stage()`, default probabilities, `is_late()`), board ordering (`move()`), deal timeline |
| `activities.py` | Routes, models and validation for activities, and the shared timeline query the three record areas call |
| `dashboard.py` | The `/api/dashboard` route and its figures, charts, funnel, recent activity and follow-ups |
| `seed.py` | Sample data. `python -m accountable.seed` resets the database. `--large` loads the large dataset for speed checks |

Not needed now, and left out on purpose: a service or repository layer, a `routers/` package, a separate `schemas.py`, a migration tool, and dependency-injection containers. The database is created from `db.py` on first start. Alembic comes in with Supabase, when there is a live database to migrate.

### Backend tests: `backend/tests/`

`conftest.py` and one `test_*.py` per area, matching the modules. Each is listed under [Proof](#proof).

### Frontend: `frontend/`

The frontend uses the same idea: one folder per area, holding its pages, components, form schema and query hooks. Only what's truly shared lives outside the feature folders.

| File | Purpose |
|---|---|
| `package.json`, `vite.config.ts`, `tsconfig*.json`, `index.html` | Vite + React + TypeScript app. The `/api` proxy port comes from an environment variable |
| `src/main.tsx`, `src/App.tsx` | Providers, router, routes |
| `src/styles/tokens.css`, `src/styles/global.css` | Brand tokens, Tailwind v4 theme, font imports (`@fontsource`) |
| `src/api/client.ts`, `src/api/types.ts` | Typed fetch wrapper and the API's types |
| `src/lib/format.ts`, `src/lib/dates.ts` | Money and date formatting. Late, overdue and "today" helpers |
| `src/lib/stages.ts` | Stage names, order, colors and default probabilities |
| `src/components/TopBar.tsx`, `QuickSearch.tsx` | Top bar, tabs, quick search (G10) |
| `src/components/DataTable.tsx`, `FormDialog.tsx`, `ConfirmDelete.tsx`, `Pill.tsx`, `Money.tsx` | Shared pieces. One `Pill` covers stage, status and Late |
| `src/features/organizations/`, `contacts/`, `deals/` | Each has its table page, record page, form with its Zod schema, and `api.ts` with its query hooks |
| `src/features/activities/` | Timeline, activity form and its schema, `api.ts` |
| `src/features/pipeline/` | Board, column, card, in-column add form, closed-deals filter, "Move to" menu. Uses the deal hooks and adds the optimistic move |
| `src/features/dashboard/` | Summary panel, revenue chart, funnel, won/lost chart, follow-ups table, recent activity, `api.ts` |
| `src/**/*.test.ts(x)` | Vitest tests, next to the code they test |

### End-to-end tests: `e2e/`

`fixtures.ts` holds the console-error guard, the fixed clock and the database reset. Then one `*.spec.ts` per area, listed under [Proof](#proof).

### Docs

| File | Change |
|---|---|
| `docs/STATUS.md` | How to install and run. Updated as each phase finishes |
| `docs/spec.md` | Only if building shows a gap, and then with a note |
| `README.md` | Not touched; it's the course's guide |

## Order of work

The order puts the riskiest work early and builds shared pieces alongside their first real use.

**Every phase ends with:**
- `npm test` passing, and the CI check passing on Mac, Linux and Windows
- the phase's own tests written, including a keyboard-only test of its screens
- its screens checked against the large dataset
- a short entry in `docs/STATUS.md`

A phase isn't done until all of that is in.

### Phase 1: Skeleton, commands and test setup

The goal is three commands that work on Mac, Linux and Windows, and a test setup every later phase relies on, before any features exist.

1. Root `package.json` with workspaces and scripts, `pyproject.toml` and `uv sync`.
2. A FastAPI app with `GET /api/health`, and a Vite React app that calls it.
3. `npm run dev` runs `uv sync`, then backend and frontend together with `concurrently`.
4. Tailwind v4, brand tokens and bundled fonts, so the first page already looks on-brand. The contrast test over the token pairs goes in now.
5. One trivial test in each of pytest, Vitest and Playwright, so `npm test` runs all three and fails if any fails.
6. Test setup: `playwright.config.ts` starts its own servers on test ports against a temporary database. `e2e/fixtures.ts` provides the fixed clock and the console-error guard. Tests can set "today" with `ACCOUNTABLE_TODAY`. A pytest guard refuses to touch `data/accountable.db`.
7. CI (`.github/workflows/ci.yml`) runs `npm install` and `npm test` on Mac, Linux and Windows, so a Windows-only problem shows up on the first day rather than the last.

### Phase 2: Backend data, rules and sample data

The goal is a complete, tested API, with data to look at, before any screens.

1. Tables, constraints and indexes in `db.py`. Startup creates and seeds a new database.
2. CRUD for organizations, contacts, deals and activities, with validation (V1 to V4).
3. `change_stage()` (DL5): probability, close date on Won and Lost, the stage-change entry, and the user's value winning when an edit sets both.
4. `move()` with renumbering (P2), and position 0 for new deals.
5. Delete behavior (D1) and `delete-impact` counts.
6. Timelines for contact, deal and organization (C3, DL3, O2).
7. `/api/dashboard` with every figure defined in the spec (DB1 to DB7).
8. Sample data (S1 to S5) and `npm run seed`.
9. The large dataset (3,000 deals, 3,000 contacts and 10,000 activities), loaded with `npm run seed -- --large`. It's used for the backend speed test now, and for checking each screen in later phases.

### Phase 3: Shell and the first slice, Deals

The goal is the top bar, the shared components built with their first real use, and one complete table.

1. Top bar and tabs, with routes for every screen. The pages are empty for now.
2. API client and query hooks, and which lists each change refreshes.
3. Formatting and date helpers, stage metadata and Zod schemas, with their unit tests.
4. The Deals table, built with the shared `DataTable`: search, sort, count line, empty search (T1 to T7), the Deals filter (DL1a) and the Late label (DL2).
5. The deal form in `FormDialog`, with field errors from both browser and server (V5).
6. Deleting a deal with `ConfirmDelete` (D1 to D3). Pills, `Money` and toasts.

### Phase 4: Pipeline

This is the riskiest part, so it comes as soon as it can. It needs only the deal hooks and the deal form from Phase 3.

1. Board with six colored column headers, totals, expected revenue and share meters (P1, P3).
2. Drag between and within columns with dnd-kit, with an optimistic update and rollback (P2, P7).
3. Keyboard drag and the "Move to" menu, with screen-reader announcements (P6).
4. The add form inside a column, with "More details" opening the deal form (P4).
5. The "Closed deals" filter, remembered in the browser, and the "more closed earlier" link (P1a).
6. Late cards (DL2, P5).
7. Dragging on the large dataset with the filter set to All. If it's slow, this is when to deal with it.

### Phase 5: Contacts and Organizations tables

This mostly reuses what Phase 3 built.

1. Contacts and Organizations tables, with the contact status filter (C2).
2. Add and edit forms, and delete dialogs with their counts and wording (D1).

### Phase 6: Record pages and activities

1. Organization, contact and deal pages: details, linked records, timeline.
2. Log, edit and delete activities. Mark follow-ups done and not done (A1 to A3).
3. Stage-change entries in the timelines, read-only.

### Phase 7: Dashboard

This comes after activities because it shows follow-ups and stage changes.

1. The Midnight summary panel with five figures and the revenue line chart (DB1, DB2).
2. Funnel with "carried on" percentages (DB4) and the won/lost bar chart (DB3).
3. Follow-ups table with mark-done (DB6) and recent activity (DB5).
4. Check every figure against `/api/dashboard` and the database (DB7).

### Phase 8: Quick search

Top-bar search over the loaded lists, results grouped by type, keyboard navigation, `/` to focus (G10). It comes last so it can be dropped without touching anything else.

### Phase 9: Sign-off

Speed and keyboard access have been checked in every phase, so this phase is a final check, not the first look.

1. The full end-to-end suite on all three systems, with no console errors (G9).
2. The speed tests on the large dataset (G7) and the keyboard-only walk through every action (G8).
3. A by-hand walkthrough in Chrome, the way a salesperson would use it, checked against the spec and the mockup (SC10).
4. `docs/STATUS.md`: how to run, what's done, anything known to be missing.

### Working in parallel

After Phase 3, phases 4, 5 and 6 don't depend on each other. If two people or two agents are working, they can run side by side in separate git worktrees. The dashboard waits for activities (Phase 6), and quick search can go anywhere after Phase 5.

## Risks

| Risk | Why it matters | How we handle it |
|---|---|---|
| Drag and drop across and within columns, with exact drop positions | It's the hardest UI in the app, and SC4 checks the order survives a refresh | Use dnd-kit's documented multi-container sortable pattern. The server owns the order through `move` and renumbering, and the client only does the optimistic step. Built early, in Phase 4, with e2e tests for every kind of move, including a move within a column |
| Keyboard drag on the board | SC8 needs every action from the keyboard | dnd-kit's keyboard sensor, plus the "Move to" menu as a simpler path for the same moves. Both are tested end to end |
| Stage rules applied in more than one place | Drag, edit form and in-column add could drift apart | One function, `change_stage()` in `deals.py`, used by every path. The edit form uses `model_fields_set` to tell a value the user typed from one left unchanged. Backend tests cover each rule |
| "Today" in tests | Late deals, overdue follow-ups and the sample data all depend on the date, so tests could break on a different day | Backend reads `ACCOUNTABLE_TODAY` in tests. Playwright fixes the browser clock with `page.clock`. The sample data is relative to "today" |
| `npm run dev` on Windows | Process handling, paths and `uv` differ between systems | `concurrently` with `--kill-others`, no shell-specific syntax in the scripts, `uv run` for Python. CI runs on Windows from Phase 1, so problems show up on the first day |
| Playwright needs installed Chrome | `npm test` fails on a machine without it | Documented as a prerequisite in `docs/STATUS.md`. The config gives a clear error if Chrome is missing |
| Tables with thousands of rows | Smooth scrolling and sorting is SC9 / G7 | TanStack Virtual from the start. The large dataset exists from Phase 2, and each phase checks its screens against it |
| Board with hundreds of closed cards | Dragging could get sluggish | The "Closed deals" filter, 90 days by default. The performance test drags with the filter set to All |
| Charts in unit tests | Recharts needs `ResizeObserver`, which jsdom doesn't have | Stub it in the Vitest setup. Test the chart data in unit tests and the drawn charts in e2e |
| Tests touching real data | Running the tests must never change the user's data | Tests always use a temporary database path. A pytest guard in `conftest.py` refuses to run against `data/accountable.db` |
| Scope creep | Quick search (G10) and the in-column form go slightly beyond the intent | Both are small and kept to the spec. Quick search is its own late phase (8), so it can be dropped without touching the rest |
| Shared components built before they're used | Guessing at a generic table or form wastes time and gets reworked | `DataTable`, `FormDialog` and `ConfirmDelete` are built with the Deals table in Phase 3, then reused |
| Structure that doesn't scale, or scales too early | Too many layers slow every change. Too few make the ERP painful | One module per area in the backend and one folder per area in the frontend. No extra layers until an area needs them. All tables in one metadata, ready for Alembic and Postgres later |
| Contrast slipping as colors get used | SC8 asks for readable contrast | Only token pairs listed in the spec are allowed, and a unit test checks each one |

## Proof

`npm test` runs the three suites in order and fails if any test fails. Each test is listed with the requirement it proves.

### Backend unit tests (pytest, `backend/tests/`)

**`test_organizations.py`**
- An organization needs a name. A website, when given, must look like one; `acme.com` and `https://acme.com` are accepted (V1, V2).
- Add, read, edit and delete round trip, and `404` for a missing record.
- The list includes contact count, open deal count and open value (O1).
- Deleting keeps the organization's contacts and deals, with no organization. Delete-impact counts are right (D1).
- The timeline includes its contacts' and deals' activities and stage changes, newest first (O2).

**`test_contacts.py`**
- A contact needs a name. An email, when given, must look like one (V1, V2).
- Add, read, edit and delete round trip. The list includes the organization name (C1).
- Deleting a contact deletes their activities. Their deals stay, with no main contact. Delete-impact counts are right (D1).
- The timeline includes the contact's own activities and activities on deals they're the main contact of, newest first (C3).
- When a deal's main contact changes, its activities move to the new contact's timeline (concern 5).

**`test_deals.py`**
- A deal needs a name, organization, stage and value. A negative value is refused, and so is a probability outside 0–100. Each refusal returns `422` with per-field errors (V1, V3, V5).
- Stage rules (DL5, DL6):
  - each stage change sets that stage's usual probability
  - a hand-set probability is kept until the next stage change
  - a move to Won or Lost sets today's close date
  - a deal moved out of Won or Lost keeps its close date
  - when an edit changes the stage and the probability (or close date) together, the user's values win
  - every change writes one "Moved from X to Y" entry
  - a new deal starts at its stage's usual probability
- `is_late` is true only for open deals past their close date (DL2).
- Board ordering (P2, P4):
  - move to another column at the top, middle and end
  - move within a column, up and down
  - move into an empty column
  - positions are 0 to n−1 in both columns after every move
  - new deals take position 0
- Deleting a deal deletes its activities and stage history. Delete-impact counts are right (D1).
- A deal left without an organization can still be moved on the board, but saving it from the edit form asks for an organization (concern 3).
- The timeline includes the deal's activities and stage changes (DL3).

**`test_activities.py`**
- An activity needs a type, description and date, and belongs to exactly one contact or one deal (V1, V4).
- Add, edit and delete an activity. Mark a follow-up done and not done (A1, A2).

**`test_dashboard.py`**
- On hand-built data, each figure is checked (DB1 to DB7):
  - revenue won by month
  - won and lost counts
  - open value and expected revenue
  - win rate and "Needs attention"
  - the funnel's reached values, using stage history
  - recent activity order
  - follow-ups grouped into Overdue, Today and Upcoming
- Winning a deal and adding a follow-up change the figures straight away (SC6).

**`test_seed.py`**
- Counts are about 15 organizations, 40 contacts and 30 deals, with every status and stage present (S1).
- Every one of the 12 months has won deals. 3 or 4 deals are late (S2).
- Overdue, today and upcoming follow-ups are all present (S3).
- Stage history fits each deal's stage (S4).
- Seeding twice gives the same data, and reseeding resets changes (S5, G3).

**`test_persistence.py`**
- A change survives closing and reopening the database (G4).
- A new database is created and seeded on startup (G2).
- Tests never touch `data/accountable.db`.

**`test_performance.py`**
- With the large dataset, the list, timeline and dashboard endpoints each answer in under 200 ms (G7).

### Frontend unit tests (Vitest, `frontend/src/`)

**`lib/format.test.ts`**
- Money always shows its currency.
- Short money reads "$59k" and "$1.2M".
- Dates read "18 Nov 2026".
- Relative dates read "3 days ago".

**`lib/dates.test.ts`**
- A deal is late only when open and past its close date (DL2).
- Follow-ups are grouped as Overdue, Today and Upcoming (DB6).

**`lib/stages.test.ts`**
- Stage order, colors and default probabilities match the spec.

**`features/*/schema.test.ts`**
- Each form's Zod rules match the backend's (V1 to V3).

**`styles/contrast.test.ts`**
- Every text and background token pair in use meets WCAG AA (G8, concern 2).

**`components/DataTable.test.tsx`**
- Search ignores case and covers every text column (T1).
- Sort toggles direction and sets `aria-sort` (T2).
- The count line is right (T6).
- Empty search shows its message and a clear button (T7).
- Filters combine with search (C2, DL1a).

**`components/ConfirmDelete.test.tsx`**
- Each record type gets its wording and counts (D1).
- Cancel has focus when the dialog opens (D2).

**`features/pipeline/move.test.ts`**
- The optimistic update moves the card and recomputes column and board totals at once (P3).
- A failed request restores the previous state (P7).
- The closed-deals filter hides only Won and Lost cards and doesn't change the open totals (P1a).

**`features/dashboard/*.test.tsx`**
- Each panel renders the figures it's given.
- "Needs attention" adds late deals and overdue follow-ups (DB1).

**`components/QuickSearch.test.tsx`**
- Matches are grouped by type, capped at 8, and work with the keyboard (G10).

### End-to-end tests (Playwright, `e2e/`)

Every test starts from freshly seeded test data, with the clock fixed and a guard that fails the test on any console error or warning (G9).

**`start.spec.ts`**
- The app opens on the dashboard.
- Every screen shows sample data (SC1).

**`organizations.spec.ts`**
- Add, search, sort, edit and delete an organization (SC2).
- The delete dialog wording is right.
- After reloading, the change is still there.
- The organization page shows its contacts, deals and timeline (SC3).

**`contacts.spec.ts`**
- Add a lead, a qualified contact and a customer.
- Filter by status (SC3).
- Search, sort, edit and delete. Deleting removes their activities and leaves their deals with no main contact (SC2).
- After reloading, the changes are still there.

**`deals.spec.ts`**
- Add, search, sort, edit and delete a deal (SC2).
- Late deals show the Late label (DL2).
- The "No organization" filter finds deals whose organization was deleted.
- Changing the stage in the edit form updates the probability and adds a timeline entry.

**`pipeline.spec.ts`**
- Drag a card to another column: the stage and probability change, and the Deals table shows both (SC4).
- Drop a card higher and lower in its own column, and in the middle of another column. Each stays in place after a reload (SC4).
- Column and board totals change before the server replies (SC4).
- Dragging to Won sets today's close date, and the card stays visible under the 90-day filter.
- Add a deal in a column: it starts at that stage (SC4).
- Late cards stand out (SC4).
- The closed-deals filter changes Won and Lost and is remembered after a reload.

**`pipeline-keyboard.spec.ts`**
- Move a card with Space and the arrow keys.
- Move a card with the "Move to" menu.
- Focus is visible throughout (SC8).

**`activities.spec.ts`**
- Log a note, call and email on a contact and on a deal. Each appears newest first in the right timelines, including the main contact's (SC5).
- A stage change adds an entry to the deal's timeline and to the dashboard's recent activity (SC5).
- Edit and delete an activity.

**`dashboard.spec.ts`**
- The figures match the API and the database (SC6).
- Marking a deal won changes revenue, win rate and the charts (SC6).
- A new follow-up appears under Upcoming. Marking it done removes it (SC5, SC6).
- The line chart, bar chart and funnel are present (SC7).

**`persistence.spec.ts`**
- After making changes, restart the backend and reload: everything is still there (SC2, G4).
- `npm run seed` brings back the sample data (SC2, G3).

**`keyboard.spec.ts`**
- Every action in the intent can be done with the keyboard only: tabs, tables, forms, dialogs, timelines, follow-ups and quick search.
- Each focused element has a visible focus style (SC8).

**`performance.spec.ts`**
- On the large dataset, each screen loads in under a second.
- Table sorts respond in under 500 ms.
- Scrolling is smooth (virtualized row count stays small).
- A drag on the board with the filter set to All responds in under 500 ms (SC9, G7).

**`search.spec.ts`**
- Quick search finds a deal, a contact and an organization.
- `/` focuses the box (G10).

### By hand (SC10)

Before calling the MVP done, someone uses every section and action in Chrome the way a salesperson would. They compare each screen by eye with the spec and `docs/mockups/dashboard-b.png` and `pipeline-b.png`, and check that the console is clean. The result, with any problems found, goes into `docs/STATUS.md`.
