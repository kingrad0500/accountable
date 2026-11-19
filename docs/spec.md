# Spec: the Accountable MVP

This spec turns `docs/intent.md` into requirements and a design for the MVP. Where the intent is silent, the spec makes a decision and marks it **Decision**. The concerns below are the decisions worth a second look before building.

## Concerns

1. **The brand has five colors and the board has six stages.** The brand also uses Raspberry for alerts, and the board needs one for late deals. Using Raspberry for a stage would muddle that. **Decision:** New = Cerulean, Qualified = Marigold, Proposal = Coral, Negotiation = Midnight, Won = Sea Green, Lost = Sea Mist. Raspberry is used only for late, overdue and delete. This breaks the brand's "Sea Green, Marigold and Coral first" order for stages, because Won reads most naturally as green.
2. **Two brand pairings fail normal-text contrast.** White on Cerulean is 3.96:1 and white on Raspberry is 3.62:1. Both are under the 4.5:1 that success criterion 8 needs for small text. Sea Green on white is 1.89:1, so it fails even for chart lines (3:1 for graphics). **Agreed:** bright colors are fills with Midnight text on top. Each color has a darker "ink" shade for text, icons and chart lines. White text sits on brand Cerulean and Raspberry only at 14px bold and up; smaller white text uses the darker shades. A unit test checks every pairing. See [Colors](#colors) and `docs/TECH_STACK.md`.
3. **An organization is required on a deal, but deleting an organization leaves its deals with none.** **Agreed:** these deals show a "No organization" label. The Deals table has a "No organization" filter so they're easy to find. Saving one of them from the edit form asks for an organization, the same as a new deal. Moving the deal on the board still works without one.
4. **The Won and Lost columns grow without limit.** After a year of use they could hold hundreds of cards. **Agreed:** a filter above the board, "Closed deals: Last 30 days / Last 90 days / Last 12 months / All", set to 90 days by default. It applies only to Won and Lost, by close date. Open columns always show every deal, and the open totals don't depend on it. The board remembers the choice in the browser. A deal dragged to Won or Lost gets today as its close date, so it always stays in view.
5. **An activity on a deal shows on its main contact's timeline. What if the main contact changes?** **Decision:** the link is worked out when the timeline is read, so the activity follows the deal's current main contact. The organization timeline works the same way: it shows activity for the contacts and deals that belong to the organization now.
6. **The sales funnel needs a definition.** "How much value reaches each stage" could mean the value at each stage now, or the value that has ever got that far. **Decision:** a deal counts toward every stage up to the furthest one it reached, using its stage history. A Lost deal counts toward the stages it reached before it was lost. A deal created at Proposal counts as having passed New and Qualified. The sample data includes stage history so the funnel is meaningful from the start.
7. **Several stage rules apply to more than drag and drop.** Stage changes can also come from the edit form. **Decision:** every stage change goes through one backend function, whatever its source. That function writes the timeline entry, resets the probability and sets the close date on Won or Lost. If a single edit changes both the stage and the probability (or the close date), the user's value wins over the default. A deal moved out of Won or Lost keeps its close date, which may make it late straight away.
8. **"One command, no internet" needs care.** The first install has to download npm and Python packages. Google Fonts would also need the internet on every load. **Agreed:** the brand fonts are bundled with `@fontsource` packages, not loaded from Google, with system fallback fonts behind each (see `docs/TECH_STACK.md`). The documented start is `npm install` once, then `npm run dev`. `npm run dev` runs `uv sync` itself, so Python needs no separate step. Node, uv and Google Chrome (for the tests) must already be installed. `docs/STATUS.md` says so in plain words.
9. **Stage-change entries aren't activities.** Activities are notes, calls and emails that the user writes and can edit. **Decision:** stage changes live in their own table. They're read-only, they appear in the deal and organization timelines and in the dashboard's recent activity, and they're deleted with their deal. They don't appear on the contact timeline, because the intent doesn't ask for that.
10. **"Today" needs one meaning.** Late deals, overdue follow-ups and the Won/Lost close date all depend on it. **Decision:** the computer's local date is used. Backend and browser run on the same machine, so they agree. Dates without a time (close date, follow-up date) are stored as `YYYY-MM-DD`. Activity times are stored in UTC and shown in local time.
11. **Winning a deal doesn't change the contact's status.** The intent doesn't ask for it, so the status stays manual. Upgrading a lead to customer when a deal is won is a likely early request.
12. **Sample dates age.** The sample data is placed relative to the day it's seeded. A week later, more follow-ups are overdue and more deals are late. That's expected, and `npm run seed` refreshes everything.

## Requirements

Each requirement has an ID so tests and reviews can point to it.

### General

- **G1** `npm run dev` starts the backend and frontend together on Mac, Linux and Windows. The terminal shows the address to open (`http://localhost:5173`). The app opens on the dashboard.
- **G2** If the database file doesn't exist, the backend creates it and fills it with the sample data.
- **G3** `npm run seed` deletes all data and reloads the sample data.
- **G4** Every change is saved to SQLite before the UI confirms it. Changes survive a refresh and a restart.
- **G5** The app works with no internet connection once installed.
- **G6** Light mode only, designed for screens 1280px wide and up. At 1280px nothing is cut off. The pipeline board scrolls sideways inside its own panel, not the page.
- **G7** Every screen loads, and responds to every action, in under 500 ms on an ordinary laptop with 3,000 deals, 3,000 contacts and 10,000 activities.
- **G8** Every action works from the keyboard. Focus is always visible. Text meets WCAG AA contrast.
- **G9** The browser console shows no errors or warnings during normal use.

### Tables (Organizations, Contacts, Deals)

- **T1** A search box filters rows as you type, matching any text column, ignoring case.
- **T2** Clicking a column heading sorts by it. A second click reverses the order. The heading shows the direction and sets `aria-sort`. Headings are buttons, so they work from the keyboard.
- **T3** An "Add" button opens the form for a new record.
- **T4** Each row has Edit and Delete. Clicking a row's name opens its page.
- **T5** Tables stay smooth with a few thousand rows (rows are virtualized).
- **T6** A line under the table gives the count, for example "Showing 12 of 40 contacts".
- **T7** An empty search shows "No contacts match "acme"" and a button to clear the search.

### Deleting

- **D1** Every delete asks first, in a dialog that names the record and says what happens to linked records, with counts:
  - Organization: "Delete Northwind Partners? Its 3 contacts and 2 deals will be kept, with no organization."
  - Contact: "Delete Ana Ruiz? Ana Ruiz's 5 activities and follow-ups will be deleted. Their 2 deals stay, with no main contact."
  - Deal: "Delete Website rebuild? Its 4 activities and follow-ups and its stage history will be deleted."
  - Activity: "Delete this call from 12 Nov 2026?"
- **D2** Cancel is the default focus in the dialog. The delete button is Raspberry.
- **D3** After deleting from a record's own page, the app goes back to that record's table.

### Validation

- **V1** Required fields: organization name; contact name; deal name, organization, stage and value; activity type, description and date.
- **V2** An email, when given, must look like `name@domain.tld`. A website, when given, must look like a domain, with or without `http://` or `https://` (`acme.com` is fine).
- **V3** Deal value is a whole number of US dollars, 0 or more. Probability is a whole number from 0 to 100.
- **V4** An activity belongs to exactly one contact or one deal.
- **V5** The form shows errors next to each field when you try to save. The backend checks the same rules and returns `422` with field errors, which the form shows the same way.

### Dashboard

- **DB1** Four headline figures: revenue won in the last 12 months, open pipeline value, expected revenue, and win rate over the last 12 months.
- **DB2** A line chart of revenue won per month, over the last 12 months including this one.
- **DB3** A bar chart of deals won and deals lost per month, over the same 12 months.
- **DB4** A sales funnel showing the value that reached each stage, New to Won (see concern 6). Lost value is given beside it.
- **DB5** Recent activity: the 10 newest activities and stage changes, each linked to its record.
- **DB6** Follow-ups: every follow-up not yet done, grouped as Overdue, Today and Upcoming, soonest first. Each can be marked done from here. A done follow-up leaves the list.
- **DB7** Every figure comes from the same backend endpoint, computed from the database at request time, so it matches the data.

Definitions:

| Figure | Definition |
|---|---|
| Open deal | Stage is New, Qualified, Proposal or Negotiation |
| Open pipeline value | Sum of value of open deals |
| Expected revenue | Sum of value × probability ÷ 100 of open deals |
| Revenue won (month) | Sum of value of Won deals whose close date falls in that month |
| Win rate | Won ÷ (Won + Lost), counting deals closed in the last 12 months |
| Late deal | Open deal whose close date is before today |
| Overdue follow-up | Not done, follow-up date before today |

### Organizations

- **O1** Table columns: Name, Industry, Website, Contacts, Open deals, Open value.
- **O2** Organization page: its details, its contacts, its deals, and one timeline (newest first) of every activity for its contacts and deals, plus its deals' stage changes.

### Contacts

- **C1** Table columns: Name, Organization, Job title, Email, Phone, Status.
- **C2** Status filter above the table: All, Lead, Qualified, Customer, each with its count. The filter combines with search.
- **C3** Contact page: details, a link to the organization, their deals, and a timeline (newest first) of activities on the contact plus activities on deals where they're the main contact.
- **C4** "Log activity" on the contact page.

### Deals

- **DL1** Table columns: Name, Organization, Main contact, Stage, Value, Probability, Expected revenue, Close date.
- **DL1a** Filter above the Deals table: All stages, each stage, Open, Late, and No organization. The filter combines with search.
- **DL2** A late deal shows a Raspberry "Late" label next to its close date, in the table and on its card.
- **DL3** Deal page: details, links to organization and main contact, and a timeline (newest first) of its activities and stage changes.
- **DL4** "Log activity" on the deal page.
- **DL5** Stage rules (apply to every stage change, from anywhere):
  - Probability becomes the stage's usual one: New 10, Qualified 25, Proposal 50, Negotiation 75, Won 100, Lost 0. A probability set by hand stays until the next stage change.
  - Moving to Won or Lost sets the close date to today. The deal can still be edited afterwards.
  - A timeline entry "Moved from Proposal to Negotiation" is recorded with the time.
- **DL6** A new deal's probability starts at its stage's usual one and can be changed in the form.
- **DL7** The main contact list shows contacts at the chosen organization. It's optional.

### Pipeline

- **P1** Six columns: New, Qualified, Proposal, Negotiation, Won, Lost.
- **P1a** A "Closed deals" filter (Last 30 days, Last 90 days, Last 12 months, All; default Last 90 days) limits Won and Lost to deals closed in that period. The open columns and the open totals ignore it. The choice is remembered in the browser. Each of Won and Lost shows "12 more closed earlier" with a link to the Deals table filtered by that stage.
- **P2** Dragging a card to another column changes its stage (DL5 applies). Dragging within a column changes its place. A card can be dropped anywhere in a column, and it stays exactly there after a refresh.
- **P3** Each column header shows the stage, the number of deals, their total value and expected revenue. A header strip above the board shows the open total value and expected revenue. All figures update the moment a card drops, before the server replies.
- **P4** Each column has an "Add deal" button. The new deal starts at that stage and goes to the top of the column.
- **P5** Cards show name, organization, value, close date, probability and the main contact's initials. Late cards show the Late label.
- **P6** Keyboard: Space picks up a focused card, arrow keys move it, Space drops it, Escape cancels. Each card also has a "Move to" menu listing the stages. A screen reader hears each step.
- **P7** If the server rejects a move, the card goes back and a message says why.

### Activities

- **A1** Log activity form: type (Note, Call, Email; Note is the default), description, date and time (now by default), optional follow-up date.
- **A2** Activities in a timeline can be edited, deleted and, if they have a follow-up, marked done or not done.
- **A3** Timelines are newest first by the activity's date. Stage changes sit in the same list, styled as system entries with no edit or delete.

### Sample data

- **S1** About 15 organizations across at least 5 industries (software, healthcare, logistics, retail, finance, manufacturing). About 40 contacts at every status. About 30 deals at every stage, valued $5,000 to $150,000.
- **S2** Won and Lost deals spread across the past 11 months, so every month of the charts has data. Open deals expected to close over the next 4 months. 3 to 4 open deals late.
- **S3** About 80 activities across contacts and deals over the past months. About 6 follow-ups overdue, 2 due today and 8 due in the next 2 weeks.
- **S4** Stage history for each deal that fits its stage, for example a Won deal moved New → Qualified → Proposal → Negotiation → Won over several weeks.
- **S5** The data is generated by code with a fixed random seed, with dates relative to the day of seeding. Names are hand-written so they read as real businesses.

## Design

### Architecture

```
Browser (React app, Vite dev server :5173)
   │  /api/* proxied by Vite
   ▼
FastAPI (uvicorn :8000) ── SQLAlchemy Core ── SQLite file data/accountable.db
```

The frontend loads whole lists (a few thousand rows is a few hundred KB of JSON). It searches, sorts and filters them in the browser. This keeps tables instant and the API simple. The dashboard is the exception: its figures are computed on the backend (DB7).

### Repository layout

```
package.json            npm scripts; workspaces: ["frontend"]; dev deps: concurrently, @playwright/test
pyproject.toml, uv.lock Python project, package in backend/
playwright.config.ts    e2e config: starts its own backend + frontend on test ports
backend/
  accountable/
    main.py             FastAPI app, routers, startup (create + seed if new)
    db.py               engine, metadata, tables, connection helper
    schemas.py          Pydantic request/response models and validation
    stages.py           stage list, default probabilities, change_stage()
    routers/            organizations.py, contacts.py, deals.py, activities.py, dashboard.py
    dashboard.py        dashboard queries
    seed.py             sample data; `python -m accountable.seed` resets
  tests/                pytest
frontend/
  src/
    main.tsx, App.tsx   router + providers
    api/                typed fetch client, TanStack Query hooks per resource
    components/         DataTable, ConfirmDelete, Timeline, ActivityForm, StageBadge, Money, ...
    features/           dashboard/, organizations/, contacts/, deals/, pipeline/
    lib/                format (money, dates), stages, late/overdue helpers
    styles/             tokens.css, global styles
  vite.config.ts
e2e/                    Playwright tests
data/                   SQLite file (git-ignored)
```

### Libraries

| Need | Choice |
|---|---|
| Routing | React Router |
| Server data, caching, optimistic updates | TanStack Query |
| Tables | TanStack Table + TanStack Virtual |
| Drag and drop | dnd-kit (`@dnd-kit/core`, `@dnd-kit/sortable`), which has keyboard support and screen-reader announcements |
| Charts | Recharts |
| Forms and validation | React Hook Form + Zod |
| Dialogs, menus, selects | Radix UI primitives |
| Styling | Tailwind CSS v4, with brand tokens as CSS variables |
| Icons | lucide-react |
| Dates | date-fns |
| Toasts | sonner |
| Fonts | `@fontsource-variable/instrument-sans`, `@fontsource/instrument-serif`, `@fontsource-variable/jetbrains-mono`, bundled for offline use, with system fallbacks |
| Backend | FastAPI, Pydantic v2, SQLAlchemy Core, uvicorn |
| Running two processes | concurrently |

### Data model

All ids are integers. `created_at` and `updated_at` (UTC) are on every table. Foreign keys are on, with indexes on every foreign key. SQLite runs in WAL mode.

**organizations**: `id`, `name` (required), `website`, `industry`, `notes`

**contacts**: `id`, `name` (required), `email`, `phone`, `job_title`, `organization_id` → organizations (on delete set null), `status` (`lead` | `qualified` | `customer`, default `lead`)

**deals**: `id`, `name` (required), `organization_id` → organizations (nullable, on delete set null; required by the API on create), `main_contact_id` → contacts (on delete set null), `stage` (`new` | `qualified` | `proposal` | `negotiation` | `won` | `lost`), `value` (integer dollars), `probability` (0–100), `close_date` (date), `position` (integer, order within its stage column)

**activities**: `id`, `type` (`note` | `call` | `email`), `description` (required), `occurred_at` (datetime), `contact_id` → contacts (on delete cascade), `deal_id` → deals (on delete cascade), `follow_up_date` (date, nullable), `follow_up_done` (boolean, default false). A check constraint makes exactly one of `contact_id` and `deal_id` set.

**stage_changes**: `id`, `deal_id` → deals (on delete cascade), `from_stage`, `to_stage`, `changed_at`

### API

All under `/api`. JSON in and out. Errors use FastAPI's standard shape. Validation errors return `422` with per-field details.

| Method and path | Purpose |
|---|---|
| `GET /organizations` | All, with contact count, open deal count and open value |
| `POST /organizations`, `GET/PATCH/DELETE /organizations/{id}` | CRUD. `GET` includes contacts, deals and timeline |
| `GET /organizations/{id}/delete-impact` | Counts for the delete dialog |
| `GET /contacts` | All, with organization name |
| `POST /contacts`, `GET/PATCH/DELETE /contacts/{id}` | CRUD. `GET` includes organization, deals, timeline |
| `GET /contacts/{id}/delete-impact` | Counts for the delete dialog |
| `GET /deals` | All, with organization and contact names |
| `POST /deals`, `GET/PATCH/DELETE /deals/{id}` | CRUD. `PATCH` with a new stage runs `change_stage()`. `GET` includes timeline |
| `GET /deals/{id}/delete-impact` | Counts for the delete dialog |
| `POST /deals/{id}/move` | Body `{stage, index}`. Changes stage if needed, then places the deal at `index` in that column. Returns the deal |
| `POST /activities`, `PATCH/DELETE /activities/{id}` | Create, edit (including marking a follow-up done), delete |
| `GET /dashboard` | Everything the dashboard shows, in one response |

**Ordering on the board.** `move` runs in one transaction. It takes the deal out of its old column and puts it at `index` in the new one. It then renumbers the positions in both columns as 0, 1, 2 and so on. With a few hundred cards per column at most, this is fast, and positions never drift. New deals get position 0, and the rest of the column shifts down.

**Timeline entries** come back as one list, newest first. Each entry is `{kind: "activity" | "stage_change", ...}` with the record it belongs to, so the UI can link to it.

### Frontend behavior

- **Data.** One TanStack Query key per list (`deals`, `contacts`, `organizations`) and per record. Mutations invalidate the lists and records they touch, plus `dashboard`.
- **Pipeline optimism.** On drop, the board updates the cached `deals` list at once (stage, probability, position, close date), so column figures update straight away (P3). The server's reply then replaces it. On failure, the old list comes back (P7).
- **Forms** open in a dialog from tables and record pages. The same form handles add and edit. Saving shows a toast ("Deal saved") and closes the dialog. Focus goes back to the button that opened it.
- **Search** waits 150 ms after typing stops, then filters with TanStack Table's global filter.
- **Late and overdue** use the browser's local date, via shared helpers in `lib/`, which have unit tests.

### Screens

**Shell.** A Midnight sidebar on the left, 232px wide. It has the Accountable wordmark at the top and five links with icons: Dashboard, Pipeline, Deals, Contacts, Organizations. The active link has a Sea Green pill behind it, with Midnight text. Text is Sea Mist. The main area has the `#F0F4F5` background. Each page starts with its title (28px, semibold) and its main action on the right, such as "Add deal".

**Dashboard.** It's a 12-column grid.
- Row 1: four figure tiles. Each has a label, a large number in JetBrains Mono and a small comparison line (for example "+$18,000 on last month").
- Row 2: the revenue won line chart (8 columns) and the funnel (4 columns).
- Row 3: the won/lost bar chart (6 columns), recent activity (3 columns) and follow-ups (3 columns).

The line chart is a smooth line in dark Sea Green over a soft Sea Green area fill. Its y-axis uses short money ("$40k"), and the tooltip shows the full amount and the number of deals. The bar chart groups Won (Sea Green) and Lost (Coral) bars by month. The funnel is a stack of centered horizontal bars, one per stage, each in its stage color. Bar widths are proportional to value. The value and deal count are written on or beside each bar. A small line underneath gives the lost value. Follow-ups show Overdue in dark Raspberry, with a checkbox to mark each one done.

**Tables.** A white panel holds a toolbar (search box on the left, filters, "Add" button) and the table. Headings are 13px, medium weight and muted Midnight. Rows are 48px tall with a light hover tint. Money and numbers are right-aligned in JetBrains Mono. Stage and status show as colored pills. The Edit and Delete icon buttons appear on row hover and on focus, and always have accessible labels.

**Record pages.** A header panel with the name, key fields and Edit and Delete. Below that, two columns:
- Left (wider): the timeline, with the "Log activity" composer at its top. Each entry has a type icon in a colored circle (note Marigold, call Cerulean, email Coral, stage change Sea Mist), the description, the related record and a relative date ("3 days ago", with the full date on hover). Follow-ups show their date and a done checkbox.
- Right: panels with the linked records, for example the organization's contacts and deals.

**Pipeline.** A strip at the top gives the open value and expected revenue. Below it, six columns, each 272px wide, on a light Sea Mist tint. Each column header has a stage color dot, the name, the count, the total and the expected revenue. Cards are white, rounded 12px, with a soft shadow. While dragging, the card lifts with a larger shadow and the drop position shows as a gap. A late card has a Raspberry "Late" pill and its date in dark Raspberry. It doesn't get a colored edge.

### Visual design

#### Fonts

- Instrument Sans for all UI text: 14px body, 13px secondary text, and headings from 18 to 28px, semibold.
- JetBrains Mono for money, numbers, dates in tables and figures, with tabular figures.
- Instrument Serif only as an accent: the dashboard's date line ("Wednesday, 18 November") under the page title.

#### Colors

Defined once in `tokens.css` as CSS variables and mapped into Tailwind.

| Token | Value | Use |
|---|---|---|
| `--bg` | `#F0F4F5` | Page background |
| `--panel` | `#FFFFFF` | Panels and cards |
| `--ink` | `#073B4C` | Text, Negotiation stage |
| `--ink-muted` | `#4F6E78` | Secondary text (4.95:1 on page background) |
| `--sea-green` | `#06D6A0` | Primary buttons (Midnight text), Won, fills |
| `--sea-green-ink` | `#04805F` | Sea Green text and chart lines on white |
| `--marigold` | `#FFC145` | Qualified, fills (Midnight text) |
| `--marigold-ink` | `#9A6700` | Marigold text on white |
| `--coral` | `#F78C6B` | Proposal, Lost bars (Midnight text) |
| `--coral-ink` | `#B4432A` | Coral text on white |
| `--cerulean` | `#118AB2` | New, info, focus ring |
| `--cerulean-ink` | `#0E7CA0` | Cerulean behind small white text |
| `--raspberry` | `#EF476F` | Late, overdue, delete |
| `--raspberry-ink` | `#D63A60` | Raspberry behind small white text, Raspberry text on white |
| `--sea-mist` | `#CDD8DB` | Lost stage, sidebar text, column tint |

#### Shape and depth

Panels are rounded 16px and cards 12px. Neither has an outline. Depth comes from a very soft shadow (`0 1px 2px rgb(7 59 76 / 0.06), 0 4px 16px rgb(7 59 76 / 0.05)`). There are no one-edge borders, no rules across the top of the page and no gradients except the line chart's area fill.

#### Focus and motion

Focus is a 2px Cerulean outline with a 2px offset, on every focusable element. Animations are short (150–200 ms) and turned off under `prefers-reduced-motion`.

#### Text and money

Labels are short and plain: "Add deal", "Log activity", "Mark done". There are no exclamation marks. Money always shows its currency: tables and cards use `$12,500` under headings marked "(USD)", and figure tiles and charts say "USD" in their label or axis. Dates read "18 Nov 2026".

### Commands

| Command | What it does |
|---|---|
| `npm install` | Once: installs frontend and test packages |
| `npm run dev` | Runs `uv sync`, then starts uvicorn (`:8000`, reload) and Vite (`:5173`) with `concurrently` |
| `npm run seed` | `uv run python -m accountable.seed`: wipes the database and loads the sample data |
| `npm test` | Runs pytest, then Vitest, then Playwright. Fails if any step fails |

The database path comes from `ACCOUNTABLE_DB`, which defaults to `data/accountable.db`. Tests set it to a temporary file. Playwright starts its own backend (`:8100`) and frontend (`:5174`) against a fresh seeded test database, so your data is never touched.

## Testing

- **Backend (pytest)**: stage rules (DL5), including a hand-set probability kept until the stage changes and both values set in one edit. Also `move` ordering, including moves within a column, to an empty column and to the end. Delete behavior for each record type (D1). Validation (V1–V4). Every dashboard figure against hand-built data (DB7). Seed counts and spread (S1–S4). Timelines for contact, deal and organization.
- **Frontend (Vitest)**: money and date formatting, late and overdue helpers, Zod form schemas, table search and sort, and the pipeline's optimistic update and rollback.
- **End to end (Playwright, installed Chrome)**: one test per success criterion. Land on the dashboard with sample data. Add, search, sort, edit and delete in each table, then reload. Filter contacts. Drag a card across columns and within a column, then reload. Use keyboard drag. Add a deal in a column. Log an activity and a follow-up, see them in timelines and on the dashboard, and mark the follow-up done. Win a deal and see the dashboard change. Every test fails on any console error.
- **Performance**: a backend test seeds 3,000 deals, 3,000 contacts and 10,000 activities and checks list and dashboard endpoints return in under 200 ms. An e2e check scrolls and sorts the large tables and drags on the large board with the Closed deals filter set to All.
- **Contrast**: a Vitest test checks every text/background token pair used meets WCAG AA.
- **By hand (success criterion 10)**: before calling it done, someone uses every section and action in Chrome, checks each screen by eye against this spec and the brand, and confirms the console is clean.

## Not in the MVP

As listed in the intent: sign-in, accounts and several users; dark mode and phone layouts; AI features; email, calendar and phone integrations; currencies other than US dollars; reports beyond the dashboard; tags and custom fields; changing pipeline stages; import and export.
