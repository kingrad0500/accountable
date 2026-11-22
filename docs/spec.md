# Spec: Accountable

This spec describes Accountable as it stands today: what it does, the rules it follows and how it's built. It's the authority for the product. A change starts from its own intent in `docs/changes/<branch>/`, and updates this spec so it describes the product as it will be once the change is merged. Code that this spec doesn't describe shouldn't exist.

## The product

### Problem

A small business keeps track of its customers and sales in spreadsheets, inboxes and people's heads. Nobody can see at a glance which companies we deal with, who our contacts are, what's in the sales pipeline, what happened last with a customer or what needs doing next.

### What Accountable is

Accountable is a business management system: a sales CRM that will grow into a full Business OS, including ERP. Today it's a complete sales CRM for one person, running on their own computer: a private Salesforce that does the everyday CRM essentials really well. It feels sharp, modern and professional, and is a pleasure to use.

It has five sections:

- **Dashboard**, the landing page: how sales are going at a glance.
- **Pipeline**: the deals as cards on a board, one column per stage.
- **Deals**, **Contacts** and **Organizations**: a table of each kind of record, and a page for each record.

It holds four kinds of record:

- **Organization**: a company we do business with. Name, website, industry and notes. An organization has many contacts and many deals.
- **Contact**: a person we deal with. Name, email, phone, job title, the organization they belong to, and a status (lead, qualified or customer). A lead is a contact with the lead status, so there's no separate list of leads.
- **Deal**: a potential sale. Name, the organization and the main contact it's with, its stage (New, Qualified, Proposal, Negotiation, Won or Lost), its value in US dollars, its probability of close, and its expected or actual close date.
- **Activity**: something that happened, or needs to happen, with a contact or a deal (one or the other). Type (note, call or email), a description, when it happened, and optionally a follow-up date and whether it's done.

### Who uses it

One salesperson at a business-to-business services company, using Accountable on their own computer every day to manage a few dozen active deals worth $5,000 to $150,000 each. No other systems are involved.

### Constraints

- The technology in `docs/TECH_STACK.md`.
- It runs locally with one documented command that works on Mac, Linux and Windows, and needs no internet connection to use.
- Every change is kept: it's still there after a browser refresh, and every time the app starts it shows every change made before.
- One documented command resets the data to the sample data.
- Tables and the board stay smooth with a few thousand records.
- There's no sign-in. The computer itself is the boundary that keeps the data private, so the servers listen on localhost only and nothing calls an outside service.
- The look follows Accountable's brand guidelines (the `brand` skill), which take priority over any general design guidance. Light mode by default, with a dark mode the user can switch to. Designed for a laptop or desktop screen.

### Not in the product

Sign-in, user accounts or several users; following the device's own dark mode setting; a layout for phones; AI features; email, calendar or phone integrations; currencies other than US dollars; reports beyond the dashboard; tags or custom fields; changing the pipeline stages; importing or exporting data.

## Decisions

These rules settle questions the requirements below depend on. Each was chosen on purpose, so a change that alters one should say so.

1. **Stage colors.** The brand has five colors and the board has six stages, and Raspberry is kept for alerts. New = Cerulean, Qualified = Marigold, Proposal = Coral, Negotiation = Midnight, Won = Sea Green, Lost = Sea Mist. Raspberry is used only for late, overdue and delete. This breaks the brand's "Sea Green, Marigold and Coral first" order for stages, because Won reads most naturally as green.
2. **Contrast.** White on Cerulean (3.96:1) and white on Raspberry (3.62:1) fail normal-text contrast, and Sea Green on white (1.89:1) fails even for chart lines. So bright colors are fills with Midnight text on top. Each color has a darker "ink" shade for text, icons and chart lines. White text sits on brand Cerulean and Raspberry only at 14px bold and up; smaller white text uses the darker shades. Dark mode points the text roles at the bright brand colors or lighter shades instead, since text sits on black; the fills and their Midnight text don't change. A unit test checks every pairing, in both modes for roles. See [Colors](#colors) and `docs/TECH_STACK.md`.
3. **Deals with no organization.** An organization is required on a deal, but deleting an organization leaves its deals with none. These deals show a "No organization" label. The Deals table has a "No organization" filter so they're easy to find. Saving one of them from the edit form asks for an organization, the same as a new deal. Moving the deal on the board still works without one.
4. **Won and Lost columns don't grow without limit.** A filter above the board, "Closed deals: Last 30 days / Last 90 days / Last 12 months / All", set to 90 days by default, applies only to Won and Lost, by close date. Open columns always show every deal, and the open totals don't depend on it. The board remembers the choice in the browser. A deal dragged to Won or Lost gets today as its close date, so it always stays in view.
5. **Timelines follow the current links.** An activity on a deal shows on the timeline of the deal's current main contact, worked out when the timeline is read. The organization timeline works the same way: it shows activity for the contacts and deals that belong to the organization now.
6. **The sales funnel.** A deal counts toward every stage up to the furthest one it reached, using its stage history. A Lost deal counts toward the stages it reached before it was lost. A deal created at Proposal counts as having passed New and Qualified. The sample data includes stage history so the funnel is meaningful from the start.
7. **One place for stage changes.** Stage changes come from the board and from the edit form. Every stage change goes through one backend function, whatever its source. That function writes the timeline entry, resets the probability and sets the close date on Won or Lost. If a single edit changes both the stage and the probability (or the close date), the user's value wins over the default. A deal moved out of Won or Lost keeps its close date, which may make it late straight away.
8. **One command, no internet.** The brand fonts are bundled with `@fontsource` packages, not loaded from Google, with system fallback fonts behind each. The documented start is `npm install` once, then `npm run dev`, which runs `uv sync` itself. Node, uv and Google Chrome (for the tests) must already be installed. `docs/STATUS.md` says so in plain words.
9. **Stage changes aren't activities.** Activities are notes, calls and emails that the user writes and can edit. Stage changes live in their own table. They're read-only, they appear in the deal and organization timelines and in the dashboard's recent activity, and they're deleted with their deal. They don't appear on the contact timeline.
10. **"Today" is the computer's local date.** Late deals, overdue follow-ups and the Won/Lost close date all depend on it. Backend and browser run on the same machine, so they agree. Dates without a time (close date, follow-up date) are stored as `YYYY-MM-DD`. Activity times are stored in UTC and shown in local time.
11. **Winning a deal doesn't change the contact's status.** The status stays manual. Upgrading a lead to customer when a deal is won is a likely early request.
12. **Sample dates age.** The sample data is placed relative to the day it's seeded. A week later, more follow-ups are overdue and more deals are late. That's expected, and `npm run seed` refreshes everything.
13. **Dark mode remaps roles, not colors.** Light mode is the default and looks exactly as it did before dark mode existed. Colors live in two layers in `tokens.css` (see [Colors](#colors)): a fixed **palette**, where every hex value appears once and never changes with the mode, and a small set of **roles** (page, surface, text, tints, lines, shadows), each an alias to a palette color. Dark mode only points the roles at different palette colors, under `[data-theme="dark"]` on `<html>`. Fills (stage colors, Sea Green buttons, pills, the Midnight summary panel) use the palette directly with fixed text on top, so they don't change; anything that sits on a surface uses a role. Components, charts included, never use a color value, so nothing else needs to know which mode is on. The mode doesn't follow the device setting: it changes only when the user clicks the toggle.
14. **Dark surfaces get depth from tone, not shadow.** The brand sets a deep Midnight page (`#04232E`) and black panels and cards. Black panels sit below the page, like wells cut into it, so content reads as set into the frame. Anything that floats above the page (the top bar, dialogs, menus, popovers, tooltips, toasts and a card being dragged) uses a lighter **raised** surface (`#0F3644`) plus a deep black shadow, because in the dark a higher layer is a lighter one. The stack runs well (black), page, raised, with tints for hover and selection on top. In light mode surface and raised are both white and the soft shadows do the work, as before. No outlines are added in either mode.

## Requirements

Each requirement has an ID so tests and reviews can point to it.

### General

- **G1** `npm run dev` starts the backend and frontend together on Mac, Linux and Windows. The terminal shows the address to open (`http://localhost:5173`). The app opens on the dashboard.
- **G2** If the database file doesn't exist, the backend creates it and fills it with the sample data.
- **G3** `npm run seed` deletes all data and reloads the sample data.
- **G4** Every change is saved to SQLite before the UI confirms it. Changes survive a refresh and a restart.
- **G5** The app works with no internet connection once installed.
- **G6** Designed for screens 1280px wide and up. At 1280px nothing is cut off. The pipeline board scrolls sideways inside its own panel, not the page.
- **G7** Every screen loads, and responds to every action, in under 500 ms on an ordinary laptop with 3,000 deals, 3,000 contacts and 10,000 activities.
- **G8** Every action works from the keyboard. Focus is always visible. Text meets WCAG AA contrast.
- **G9** The browser console shows no errors or warnings during normal use.
- **G10** A quick search box in the top bar finds deals, contacts and organizations by name as you type, and lists up to 8 matches grouped by type. Arrow keys move through the matches; Enter or a click opens the record. `/` focuses the box unless you're typing elsewhere. It searches the lists in the browser, which it loads the first time the box is used, so other pages don't pay for them.
- **G11** A sun/moon icon button in the top bar switches between light and dark mode on every page, straight away and without a reload. Its accessible label says what it does: "Switch to dark mode" or "Switch to light mode". Light mode is the default. The choice is remembered in the browser (`localStorage`, key `accountable.theme`, alongside the board's `accountable.pipeline.closedDeals`) and applied by a small script in `index.html` before the first paint, so a reload in dark mode never flashes light. If the stored value is missing or unreadable, the app opens in light mode. Every section, dialog, menu, chart, tooltip and toast follows the mode.

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

- **DB1** Five headline figures: revenue won in the last 12 months, open pipeline value, expected revenue, win rate over the last 12 months, and "Needs attention" (late deals plus overdue follow-ups). The revenue tile compares with the 12 months before ("+18% on the 12 months before"), or, when there's no earlier revenue, says how many deals were won.
- **DB2** A line chart of revenue won per month, over the last 12 months including this one.
- **DB3** A bar chart of deals won and deals lost per month, over the same 12 months.
- **DB4** A sales funnel showing the value that reached each stage, New to Won (see decision 6). Lost value is given beside it.
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
- **DL6** A new deal's probability starts at its stage's usual one and can be changed in the form. A new deal created at Won or Lost with no close date gets today.
- **DL7** The main contact list shows contacts at the chosen organization. It's optional.

### Pipeline

- **P1** Six columns: New, Qualified, Proposal, Negotiation, Won, Lost.
- **P1a** A "Closed deals" filter (Last 30 days, Last 90 days, Last 12 months, All; default Last 90 days) limits Won and Lost to deals closed in that period. The open columns and the open totals ignore it. The choice is remembered in the browser. Each of Won and Lost shows "12 more closed earlier" with a link to the Deals table filtered by that stage.
- **P1b** A column shows its first 50 cards, then a "Show 50 more" button, so a board with thousands of deals stays quick (G7).
- **P2** Dragging a card to another column changes its stage (DL5 applies). Dragging within a column changes its place. A card can be dropped anywhere in a column, and it stays exactly there after a refresh. When older closed deals are hidden, a card dropped between two visible cards lands between them.
- **P3** Each column header shows the stage, the number of deals, their total value and expected revenue. A header strip above the board shows the open total value and expected revenue. All figures update the moment a card drops, before the server replies.
- **P4** Each column has an "Add deal" button that opens a short form in the column (name, organization, value, close date), with a link to the full form. The new deal starts at that stage and goes to the top of the column.
- **P5** Cards show name, organization, value, close date, probability and the main contact's initials. Late cards show the Late label.
- **P6** Keyboard: Space picks up a focused card, arrow keys move it, Space drops it, Escape cancels. Each card also has a "Move to" menu listing the stages, which moves the deal to the top of that column. A screen reader hears each step.
- **P7** If the server rejects a move, the card goes back and a message says why.

### Activities

- **A1** Log activity form: type (Note, Call, Email; Note is the default), description, date and time (now by default), optional follow-up date.
- **A2** Activities in a timeline can be edited, deleted and, if they have a follow-up, marked done or not done. Removing a follow-up date clears its done mark.
- **A3** Timelines are newest first by the activity's date. Stage changes sit in the same list, styled as system entries with no edit or delete.

### Sample data

Realistic data for a business that sells services and software to other businesses, so every screen looks alive the first time the app starts.

- **S1** About 15 organizations across at least 5 industries (software, healthcare, logistics, retail, finance, manufacturing). About 40 contacts at every status. About 30 deals at every stage, valued $5,000 to $150,000.
- **S2** Won and Lost deals spread across the past 11 months, so every month of the charts has data. Open deals expected to close over the next 4 months. 3 to 4 open deals late.
- **S3** About 80 activities across contacts and deals over the past months. About 6 follow-ups overdue, 2 due today and 8 due in the next 2 weeks.
- **S4** Stage history for each deal that fits its stage, for example a Won deal moved New → Qualified → Proposal → Negotiation → Won over several weeks.
- **S5** The data is generated by code with a fixed random seed, with dates relative to the day of seeding. Names are hand-written so they read as real businesses.
- **S6** `npm run seed -- --large` adds thousands of generated records (3,000 deals, 3,000 contacts, 10,000 activities) for speed checks.

## Design

### Architecture

```
Browser (React app, Vite dev server :5173)
   │  /api/* proxied by Vite
   ▼
FastAPI (uvicorn :8000) ── SQLAlchemy Core ── SQLite file data/accountable.db
```

Both servers listen on localhost only. The frontend loads whole lists (a few thousand rows is a few hundred KB of JSON). It searches, sorts and filters them in the browser. This keeps tables instant and the API simple. The three list endpoints encode their JSON in one pass, rather than through FastAPI's per-field conversion, to stay well inside G7; the output is the same (ISO dates, UTC times ending in `Z`). The dashboard is the exception to browser-side work: its figures are computed on the backend (DB7).

### Repository layout

```
package.json            npm scripts; workspaces: ["frontend"]; dev deps: concurrently, @playwright/test
pyproject.toml, uv.lock Python project, package in backend/
playwright.config.ts    e2e config: starts its own backend + frontend on test ports
scripts/test.mjs        `npm test`: runs every suite, then a summary
backend/
  accountable/
    main.py             FastAPI app, mounts each area's router, startup (create + seed if new)
    config.py           settings from the environment: database path, today(), test mode
    db.py               engine, pragmas, all tables, connection per request, JSON for big lists
    organizations.py    routes, models, rules, timeline for organizations
    contacts.py         the same for contacts
    deals.py            the same for deals, plus stage rules and board ordering
    activities.py       the same for activities, plus the shared timeline query
    dashboard.py        dashboard route and figures
    seed.py             sample data; `python -m accountable.seed` resets
  tests/                pytest, one file per area
frontend/
  src/
    main.tsx, App.tsx   router + providers
    api/                typed fetch client and API types
    components/         TopBar, QuickSearch, ThemeToggle, DataTable, FormDialog, ConfirmDelete, Pill, Money
    features/           organizations/, contacts/, deals/, activities/, pipeline/, dashboard/
                        each with its pages, components, form schema and query hooks
    lib/                format, dates, stages, theme (read, apply and remember the mode)
    styles/             tokens.css (light and dark values), global styles
  index.html            sets the stored mode on <html> before the first paint (G11)
  vite.config.ts
e2e/                    Playwright tests
docs/                   this spec, the tech stack, status, review policy, mockups,
                        and changes/<branch>/ with each change's intent and plan
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

All under `/api`. JSON in and out. Errors use FastAPI's standard shape. Validation errors return `422` with per-field details and short, plain messages.

| Method and path | Purpose |
|---|---|
| `GET /health` | `{status: "ok"}`, for the tests to know the server is up |
| `GET /organizations` | All, with contact count, open deal count and open value |
| `POST /organizations`, `GET/PATCH/DELETE /organizations/{id}` | CRUD. `GET` includes contacts, deals and timeline |
| `GET /organizations/{id}/delete-impact` | Counts for the delete dialog |
| `GET /contacts` | All, with organization name |
| `POST /contacts`, `GET/PATCH/DELETE /contacts/{id}` | CRUD. `GET` includes organization, deals, timeline |
| `GET /contacts/{id}/delete-impact` | Counts for the delete dialog |
| `GET /deals` | All, with organization and contact names and whether each is late |
| `POST /deals`, `GET/PATCH/DELETE /deals/{id}` | CRUD. `PATCH` with a new stage runs `change_stage()` and puts the deal at the top of its new column. `GET` includes timeline |
| `GET /deals/{id}/delete-impact` | Counts for the delete dialog |
| `POST /deals/{id}/move` | Body `{stage, index}`. Changes stage if needed, then places the deal at `index` in that column. Returns the deal |
| `POST /activities`, `PATCH/DELETE /activities/{id}` | Create, edit (including marking a follow-up done), delete |
| `GET /dashboard` | Everything the dashboard shows, in one response |
| `POST /test/reset` | Reloads the sample data (`?large=true` for the large set). Exists only when `ACCOUNTABLE_TEST=1`, for the end-to-end tests |

**Ordering on the board.** `move` runs in one transaction. It takes the deal out of its old column and puts it at `index` in the new one. It then renumbers the positions in both columns as 0, 1, 2 and so on, writing only the rows that changed. Positions never drift. New deals get position 0, and the rest of the column shifts down. Deleting a deal renumbers its column.

**Timeline entries** come back as one list, newest first. Each entry is `{kind: "activity" | "stage_change", ...}` with the record it belongs to, so the UI can link to it.

### Frontend behavior

- **Data.** One TanStack Query key per list (`deals`, `contacts`, `organizations`) and per record. Mutations invalidate the lists and records they touch, plus `dashboard`. A record that was just deleted isn't refetched.
- **Pipeline optimism.** On drop, the board updates the cached `deals` list at once (stage, probability, position, close date), so column figures update straight away (P3). The server's reply then replaces it. On failure, the old list comes back (P7).
- **Forms** open in a dialog from tables and record pages. The same form handles add and edit, and an edit sends only the fields that changed. Saving shows a toast ("Deal saved") and closes the dialog. Focus goes back to the button that opened it.
- **Search** waits 150 ms after typing stops, then filters with TanStack Table's global filter.
- **Late and overdue** use the browser's local date, via shared helpers in `lib/`, which have unit tests.
- **Errors.** If the server can't be reached, the message says so ("Can't reach Accountable's server. Is it running?"). A record page for a record that no longer exists says it may have been deleted.

### Screens

The design follows direction B in `docs/mockups/` (`dashboard-b.html` and `pipeline-b.html`, with screenshots). Where this text and the mockups differ, this text wins. The mockups show light mode only; dark mode follows Decisions 13 and 14 and the dark column of the roles in [Colors](#colors).

**Shell.** No sidebar. A floating top bar on the raised surface (Decision 14), rounded 16px, sits 16px from the top of the page. On the left is the Accountable wordmark with its mark: a Midnight rounded square holding a Sea Green "A" in Instrument Serif. In the middle are five tabs with icons, in a light tray: Dashboard, Pipeline, Deals, Contacts, Organizations. The active tab is a pill on the surface color (white, or black in dark mode) with a soft shadow. On the right are the quick search box (G10), with a "/" hint, the mode toggle (G11), and the page's main action as a Sea Green button, such as "Add deal". Content is centered, at most 1400px wide, on the page background (`--bg`). Each page sets the browser tab's title.

**Dashboard.** The title is a greeting for the time of day ("Good afternoon"), with the date and "all figures in USD" on the right. Below it, a 12-column grid:
- Row 1, full width: a Midnight panel, rounded 20px, with Sea Mist text. On the left, the figures (DB1): revenue won over 12 months as a large Sea Green tile, then open pipeline, expected revenue, win rate, and "Needs attention" (late deals plus overdue follow-ups, its number in light Raspberry `#FF8FA8`). On the right, the revenue won line chart, drawn for a dark background: a bright Sea Green line and soft area fill, faint dashed gridlines, the best month labelled and this month's point drawn larger. Its tooltip shows the full amount and the number of deals won that month.
- Row 2: the funnel (5 columns) and the won/lost bar chart (7 columns). The funnel is one row per stage: a stage dot and name, a bar on a light track in the stage color, and the value on the right. Between rows, a small line says what share carried on ("↓ 86% carried on"). The lost value is given underneath. The bar chart groups Won (Sea Green) and Lost (Coral) bars by month. Its tooltip is a raised surface with `--text` and colored keys, not colored words. Gridlines, axis text and tooltips use roles, so the chart follows the mode. The summary panel's line chart looks the same in both modes, because the Midnight panel is a fill and doesn't change; its colors still come from the palette, not from values in the chart code.
- Row 3: follow-ups (7 columns) and recent activity (5 columns). Follow-ups are a table with a done checkbox, due date, task, the related contact or deal with a type icon, and the organization. Overdue dates are `--text-raspberry` and today's say "Today". Recent activity shows when on the left and the entry on the right. A stage change shows the new stage as a pill.

**Tables.** A panel holds a toolbar (search box on the left, filters, "Add" button) and the table. Filter dropdowns on the page have a filter icon and a chevron. Headings are 13px, medium weight and muted Midnight; money columns say "(USD)". Rows are 48px tall with a light hover tint. Money and numbers are right-aligned in JetBrains Mono. Stage and status show as colored pills. The Edit and Delete icon buttons appear on row hover and on focus, and always have accessible labels.

**Record pages.** A header panel with the name, key fields and Edit and Delete. Below that, two columns:
- Left (wider): the timeline, with the "Log activity" composer at its top. Each entry has a type icon in a colored circle (note Marigold, call Cerulean, email Coral, stage change Sea Mist), the description, the related record and a relative date ("3 days ago", with the full date on hover). Follow-ups show their date and a done checkbox.
- Right: panels with the linked records, for example the organization's contacts and deals.

**Pipeline.**
- **Toolbar.** A summary strip on the left: open value (on a Midnight chip), expected revenue, open deals and late count. On the right, the "Closed deals: Last 90 days" dropdown (P1a).
- **Columns.** Six of them. The four open ones share the width equally and Won and Lost are a little narrower. Each column starts with a header block filled in its stage color:
  - New: dark Cerulean, white text
  - Qualified: Marigold, Midnight text
  - Proposal: Coral, Midnight text
  - Negotiation: Midnight, white text
  - Won: Sea Green, Midnight text
  - Lost: Sea Mist, Midnight text

  The header shows the name, the deal count, the total in large JetBrains Mono and the expected revenue. Open columns also get a thin meter for their share of open value. Won and Lost say "Closed in the last 90 days" instead.
- **Add deal.** A quiet "Add deal" button sits under each header. It opens a small form in place, inside the column: deal name, organization, value and close date, with "Add to Qualified" (for example) and Cancel. "More details" opens the full form.
- **Cards.** On the surface color (white, or black in dark mode), rounded 12px, with a soft shadow:
  - Open cards show the name with the value on the right, then the organization and probability, then the close date with a calendar icon and the main contact's initials.
  - Won and Lost cards are shorter, with the value in short form ("$59k").
  - A late card has a Raspberry tint (`--late-tint`), a "Late" pill in place of the initials, and its date in `--text-late`. It has no outline or colored edge.
  - The "Move to" button shows on hover and when the card or the button has keyboard focus. It's always in the Tab order.
- **Dragging.** The card lifts with a larger shadow, on the raised surface, and the drop position shows as a gap.

### Visual design

#### Fonts

- Instrument Sans for all UI text: 14px body, 13px secondary text, and headings from 18 to 28px, semibold.
- JetBrains Mono for money, numbers, dates in tables and figures, with tabular figures.
- Instrument Serif only as an accent: the "A" in the wordmark's mark.

#### Colors

Defined once in `tokens.css`, in two layers (Decision 13), and both layers are mapped into Tailwind. No component, chart or library theme uses a color value directly.

**Palette.** Every hex value, once. These never change with the mode. Fills use them directly, with the text shown.

| Token | Value | Use |
|---|---|---|
| `--midnight` | `#073B4C` | Brand ink. Negotiation, the summary panel, the open-value chip, the wordmark's mark (white or Sea Mist text). Text on every bright fill |
| `--midnight-deep` | `#04232E` | Dark page |
| `--black` | `#000000` | Dark surface |
| `--white` | `#FFFFFF` | Light surface. Text on Midnight and the `-ink` fills |
| `--deep-raised` | `#0F3644` | Dark raised surface |
| `--deep-tint` | `#164556` | Dark hover and selected tint |
| `--deep-line` | `#16404E` | Dark gridlines and meter tracks |
| `--mist-50` | `#F0F4F5` | Light page |
| `--mist-100` | `#E6EDEF` | Light hover and selected tint, light tracks, the tab tray |
| `--mist-200` | `#DCE5E8` | Light gridlines |
| `--sea-mist` | `#CDD8DB` | Brand ink on dark. Lost stage (Midnight text), text on the Midnight panel |
| `--sea-mist-dark` | `#9FB3B9` | Lost stage dot, which needs more weight than Sea Mist on a light track |
| `--hero-muted` | `#A9BEC4` | Chart axis text on the Midnight panel |
| `--slate` | `#4F6E78` | Light secondary text |
| `--slate-light` | `#9DB4BB` | Dark secondary text |
| `--sea-green` | `#06D6A0` | Primary buttons, Won, fills (Midnight text) |
| `--sea-green-hover` | `#05C493` | Primary button hover |
| `--sea-green-ink` | `#04805F` | Sea Green text and chart lines on white |
| `--marigold` | `#FFC145` | Qualified, fills (Midnight text) |
| `--marigold-ink` | `#9A6700` | Marigold text on white |
| `--coral` | `#F78C6B` | Proposal, Lost bars (Midnight text) |
| `--coral-ink` | `#B4432A` | Coral text on white |
| `--coral-light` | `#FA9A7C` | Coral text on dark |
| `--cerulean` | `#118AB2` | New, info, focus ring |
| `--cerulean-ink` | `#0E7CA0` | New pills and headers (white text), Cerulean text on white |
| `--cerulean-light` | `#5CC0E2` | Cerulean text on dark |
| `--raspberry` | `#EF476F` | Late, overdue, delete |
| `--raspberry-ink` | `#D63A60` | Late pill and delete button (white text), Raspberry text on white |
| `--raspberry-ink-hover` | `#C22F53` | Delete button hover |
| `--raspberry-deep` | `#B8294F` | Late date on the light late tint (4.9:1; `--raspberry-ink` is only 4.19:1 there) |
| `--raspberry-light` | `#FF8FA8` | Raspberry text on dark, and the "Needs attention" number on the Midnight panel |
| `--rose-50` | `#FFF3F5` | Light late tint |
| `--rose-900` | `#2B0F19` | Dark late tint |

**Roles.** Aliases to the palette. Only these change with the mode.

| Role | Light | Dark | Use |
|---|---|---|---|
| `--bg` | `--mist-50` | `--midnight-deep` | Page background |
| `--surface` | `--white` | `--black` | Panels, cards, the active tab |
| `--raised` | `--white` | `--deep-raised` | Top bar, dialogs, menus, popovers, tooltips, toasts, a dragged card |
| `--tint` | `--mist-100` | `--deep-tint` | Hover and selected tints, tracks, the tab tray |
| `--line` | `--mist-200` | `--deep-line` | Chart gridlines, meter tracks |
| `--overlay` | `rgb(7 59 76 / 0.35)` | `rgb(0 0 0 / 0.6)` | Backdrop behind dialogs |
| `--text` | `--midnight` | `--sea-mist` | Text |
| `--text-muted` | `--slate` | `--slate-light` | Secondary text, axis text, checkbox outlines |
| `--text-green` | `--sea-green-ink` | `--sea-green` | Sea Green text and chart lines |
| `--text-marigold` | `--marigold-ink` | `--marigold` | Marigold text |
| `--text-coral` | `--coral-ink` | `--coral-light` | Coral text |
| `--text-cerulean` | `--cerulean-ink` | `--cerulean-light` | Links and Cerulean text |
| `--text-raspberry` | `--raspberry-ink` | `--raspberry-light` | Overdue dates and Raspberry text |
| `--late-tint` | `--rose-50` | `--rose-900` | Late card background |
| `--text-late` | `--raspberry-deep` | `--raspberry-light` | Late date on a late card |
| `--shadow` | soft Midnight shadow | `0 1px 2px rgb(0 0 0 / 0.4)` | Panels and cards |
| `--shadow-lift` | larger Midnight shadow | `0 16px 40px rgb(0 0 0 / 0.55), 0 2px 6px rgb(0 0 0 / 0.4)` | A dragged card, and in dark mode every raised surface. In light mode each raised element keeps the shadow it has today |

The rule is: on a fill, text is a palette color; on a surface, text is a role. So a hue like Cerulean has one fill token and one text role, and there's never a second token holding the same value. Overlay and shadows hold their own `rgb()` values because they are transparent. Any other translucent color is a `color-mix()` of a token (for example the faint Sea Mist tiles on the Midnight panel), never a written-out `rgb()` value.

Dark text on every surface (lowest pair first): `--text-muted` on `--tint` 4.79:1, `--text-raspberry` on `--tint` 4.83:1, `--text-coral` on `--tint` 4.94:1, `--text-cerulean` on `--tint` 5.0:1; every pair on `--surface`, `--bg` and `--raised` is above 5.2:1. The focus ring (Cerulean) is 4.13:1 on the dark page, 5.3:1 on black and 3.25:1 on the raised surface.

#### Shape and depth

Panels are rounded 16px and cards 12px. Neither has an outline. Depth comes from a very soft shadow (`--shadow`: `0 1px 2px rgb(7 59 76 / 0.06), 0 4px 16px rgb(7 59 76 / 0.05)`). In dark mode depth comes from tone (Decision 14): black wells, the Midnight page, and lighter raised layers with a deep black `--shadow-lift`. There are no one-edge borders, no rules across the top of the page and no gradients except the line chart's area fill.

#### Focus and motion

Focus is a 2px Cerulean outline with a 2px offset, on every focusable element. Animations are short (150–200 ms) and turned off under `prefers-reduced-motion`. Switching mode is instant, with no color transition. In dark mode the page also sets `color-scheme: dark`, so scrollbars, date pickers and other native controls match.

#### Text and money

Labels are short and plain: "Add deal", "Log activity", "Mark done". There are no exclamation marks. Money always shows its currency: tables and cards use `$12,500` under headings marked "(USD)", and figure tiles and charts say "USD" in their label or axis. Dates read "18 Nov 2026".

### Commands

| Command | What it does |
|---|---|
| `npm install` | Once: installs frontend and test packages |
| `npm run dev` | Runs `uv sync`, then starts uvicorn (`:8000`, reload) and Vite (`:5173`) with `concurrently` |
| `npm run seed` | `uv run python -m accountable.seed`: wipes the database and loads the sample data. `-- --large` adds the large dataset |
| `npm test` | Runs pytest, the frontend typecheck, Vitest and Playwright, in that order. Every suite runs even if an earlier one fails, then a summary prints and the command fails if any test failed |

Settings come from the environment:

- `ACCOUNTABLE_DB`: the SQLite file, default `data/accountable.db`. Tests set it to a file of their own.
- `ACCOUNTABLE_TODAY`: fixes "today" as `YYYY-MM-DD`, for tests. The clock shifts by whole days so times of day stay realistic.
- `ACCOUNTABLE_TEST=1`: turns on `POST /api/test/reset`. Nothing else sets it.

Playwright starts its own backend (`:8100`), frontend (`:5174`) and a production build (`:5176`, for the speed checks) against a freshly seeded test database, so your data is never touched.

## Testing

- **Backend (pytest)**: stage rules (DL5), including a hand-set probability kept until the stage changes and both values set in one edit. Also `move` ordering, including moves within a column, to an empty column and to the end. Delete behavior for each record type (D1). Validation (V1–V4). Every dashboard figure against hand-built data (DB7). Seed counts and spread (S1–S4). Timelines for contact, deal and organization. Data surviving a restart. The list endpoints' JSON format.
- **Frontend (Vitest)**: money and date formatting, late and overdue helpers, Zod form schemas, table search and sort, the delete dialog, quick search, dashboard figures and panels, and the pipeline's optimistic update and rollback.
- **End to end (Playwright, installed Chrome)**: the browser clock is fixed to the same "today" as the backend, and every test starts from freshly seeded data. Land on the dashboard with sample data. Add, search, sort, edit and delete in each table, then reload. Filter contacts. Drag a card across columns and within a column, then reload. Use keyboard drag and the "Move to" menu. Add a deal in a column. Log an activity and a follow-up, see them in timelines and on the dashboard, and mark the follow-up done. Win a deal and see the dashboard change. Quick search. Switch to dark mode from the top bar, see the page change, reload and still be in dark mode, then switch back and reload in light mode (G11). A keyboard-only walk through every section. Persistence across a backend restart and `npm run seed`. Every test fails on any console error or warning.
- **Performance**: a backend test seeds 3,000 deals, 3,000 contacts and 10,000 activities and checks list, timeline and dashboard endpoints return in under 200 ms. An e2e check, against a production build, loads each screen, scrolls and sorts the large tables, and drags on the large board with the Closed deals filter set to All.
- **Contrast**: a Vitest test resolves the role aliases for each mode and checks every text/background pair in use meets WCAG AA: role pairs in both modes, fill pairs once. It also fails if a hex value appears twice in the palette or anywhere outside it in `tokens.css`.
- **By hand**: before a change is called done, someone uses every section and action it touches in Chrome, checks each screen by eye against this spec and the brand, and confirms the console is clean.
