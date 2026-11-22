# Plan: dark mode

How the change in `intent.md` gets built. `docs/spec.md` already describes the result: Decisions 13 and 14, G11, the Screens section and the two-layer [Colors](../../spec.md#colors). No new dependencies: the toggle is a button, the mode is a `data-theme` attribute, and the icons come from lucide-react, which the app already uses.

## Files that change

### Tokens and global styles

- `frontend/src/styles/tokens.css`: split into the **palette** (every hex value once, on `:root`) and the **roles** (aliases to the palette, on `:root`, redefined under `:root[data-theme="dark"]`). The roles also include `--overlay`, `--shadow` and `--shadow-lift`, the only values written as `rgb()`. Adds `color-scheme: dark` to the dark block.
- `frontend/src/styles/global.css`:
  - Maps both layers into Tailwind in `@theme inline`. Palette colors keep their names (`bg-sea-green`, `bg-midnight`, `bg-cerulean-ink`). Roles get short names so classes read well: `bg-page`, `bg-surface`, `bg-raised`, `bg-tint`, `bg-line`, `text-fg`, `text-fg-muted`, `text-fg-green`, `text-fg-marigold`, `text-fg-coral`, `text-fg-cerulean`, `text-fg-raspberry`, `text-fg-late`, `bg-late`.
  - Moves the component classes (`.panel`, `.btn-*`, `.icon-btn`, `.input`, `.field`, `.avatar`, `.muted`) onto roles and palette colors.
  - Switches off Tailwind's default color palette (`--color-*: initial`), so only token classes exist.
  - Moves the four hard-coded colors onto tokens: the hover shades `#05c493` and `#c22f53` become palette tokens `--sea-green-hover` and `--raspberry-ink-hover`, `#fff` on a focused input becomes `--surface`, and `#fff` on the danger button becomes `--white`.
  - Removes `--color-ink` and the other old names once nothing uses them.

### New files

- `frontend/src/lib/theme.ts`:
  - `readTheme()`: returns `"light"` or `"dark"`, and `"light"` if storage is empty, unreadable or throws.
  - `applyTheme(mode)`: sets or removes `data-theme` on `<html>`.
  - `saveTheme(mode)`: stores the mode under `accountable.theme`, the same prefix as the pipeline's `accountable.pipeline.closedDeals`. A failed write is ignored.
  - `useTheme()`: a small hook returning the mode and a `toggle`.
- `frontend/src/components/ThemeToggle.tsx`: the sun/moon icon button, as specified in G11.
- `frontend/src/lib/theme.test.ts`, `frontend/src/components/ThemeToggle.test.tsx`, `frontend/src/styles/colors.test.ts`, `e2e/theme.spec.ts`: see Proof.

### Shell and app

- `frontend/index.html`: a few lines of inline script in `<head>` that read `accountable.theme` (inside `try`) and set `data-theme="dark"` before the stylesheet paints.
- `frontend/src/components/TopBar.tsx`:
  - Moves the bar onto `bg-raised`.
  - Puts `ThemeToggle` between quick search and the page's action.
  - Keeps the tab tray on `bg-page` (as today) and puts the active tab on `bg-surface`.
  - Gives the wordmark's mark `bg-brand-mark` (Midnight in light mode, a lighter Midnight in dark mode, so it stands out from the raised bar).
- `frontend/src/App.tsx`: the sonner `Toaster` gets its background, text, border and shadow from `--raised`, `--text`, `--toast-line` and `--shadow-toast` through `toastOptions.style`, in place of `var(--ink)` and sonner's own white. The two toast roles keep sonner's own border and shadow in light mode.

### Every file with colors in it (roles for text on surfaces, palette for fills)

- Components:
  - `components/ConfirmDelete.tsx`, `components/FormDialog.tsx`: dialog on `bg-raised`, backdrop on `--overlay`.
  - `components/QuickSearch.tsx`, `features/pipeline/MoveToMenu.tsx`: dropdowns and menus on `bg-raised`.
  - `components/DataTable.tsx`, `components/PageTitle.tsx`, `components/RecordPage.tsx`: text and hover colors.
  - `components/Pill.tsx`: Late pill text `#ffffff` → `var(--white)`.
- Activities:
  - `features/activities/TypeIcon.tsx`: `#ffffff` → `var(--white)`.
  - `features/activities/ActivityForm.tsx`: the selected type is `bg-midnight text-white`.
  - `features/activities/Timeline.tsx`: text and hover colors.
- Dashboard:
  - `features/dashboard/SummaryPanel.tsx`:
    - The summary panel moves to `bg-midnight`.
    - Every hex value in the chart moves to `var(--sea-green)`, `var(--midnight)` or `var(--hero-muted)`.
    - The tooltip moves to `bg-raised text-fg`.
    - The translucent Sea Mist tiles and gridlines become `color-mix(in srgb, var(--sea-mist) 7%, transparent)` (and 16% and 35%), so no `rgb()` value is left.
  - `features/dashboard/WonLostChart.tsx`:
    - Gridlines → `var(--line)` and axis text → `var(--text-muted)`.
    - Bars → `var(--sea-green)` and `var(--coral)`.
    - The cursor becomes a `color-mix` of `--text`, and the tooltip moves to `bg-raised text-fg`.
  - `features/dashboard/DashboardPage.tsx`, `Funnel.tsx` (track stays on `bg-page`), `FollowUps.tsx` (overdue on `text-fg-raspberry`), `RecentActivity.tsx`: text and tint colors.
- Pipeline:
  - `features/pipeline/PipelinePage.tsx`: the open-value chip moves to `bg-midnight`.
  - `features/pipeline/Column.tsx`: the meter track `rgb(7 59 76 / 0.15)` becomes a `color-mix` of `--midnight` at 15%, and Negotiation's (`meterTrack` in `stages.ts`) white at 20%, since Midnight doesn't show on its Midnight header.
  - `features/pipeline/Card.tsx`:
    - The card moves to `bg-surface`, or `bg-late` when late.
    - The date moves to `text-fg-late`.
    - The drag gap `rgb(7 59 76 / 0.07)` becomes a `color-mix` of `--text`.
    - A dragged card moves to `bg-raised` with `shadow-lift`.
  - `features/pipeline/AddDealInColumn.tsx`: the form moves to `bg-surface`.
- Record pages: `features/contacts/ContactPage.tsx`, `ContactsPage.tsx`, `features/deals/DealPage.tsx`, `DealsPage.tsx`, `features/organizations/OrganizationPage.tsx`, `OrganizationsPage.tsx`: `text-ink` → `text-fg`, `text-cerulean-ink` (links) → `text-fg-cerulean`, and the like.
- `frontend/src/lib/stages.ts`:
  - Stage text `var(--ink)` → `var(--midnight)` and `#ffffff` → `var(--white)`.
  - Negotiation fill → `var(--midnight)`, and its dot → `var(--dot-negotiation)` (Midnight in light mode, Steel in dark mode, where Midnight vanishes on black and raised layers).
  - The Lost dot `#9fb3b9` → `var(--sea-mist-dark)`.

### Tests changed

- `frontend/src/styles/contrast.test.ts`: rewritten for the two layers (see Proof).
- `frontend/src/lib/stages.test.ts`: the expected values follow `stages.ts`.
- `frontend/src/components/TopBar.test.tsx`: the toggle is in the bar.
- `e2e/keyboard.spec.ts`: the keyboard walk tabs through the toggle.

### Docs

- `docs/spec.md`:
  - The storage key becomes `accountable.theme`, to match the existing key.
  - The palette gains `--sea-green-hover` (`#05C493`) and `--raspberry-ink-hover` (`#C22F53`), the two hover shades that are in the code today.
  - The palette notes that translucent colors come from `color-mix()` with a token, never from a written-out `rgb()` value.
- `docs/TECH_STACK.md`, Color contrast: describes the palette and roles, the dark text shades and the two-mode contrast test.
- `docs/STATUS.md`: one entry once the change is done.
- `docs/changes/dark-mode/`: `dashboard-light.png`, `dashboard-dark.png`, `pipeline-light.png`, `pipeline-dark.png`.

## Order of work

Each phase ends with `npm run check:quick` passing, so nothing is left half-done between phases.

**Phase 0: baseline.** Before touching any code, run the app on this branch (it's still identical to `main`) and use Playwright to screenshot every section at 1440px in light mode:
- dashboard, pipeline, the three tables and a record page of each kind;
- a form dialog, the delete dialog, the quick search dropdown, the Move to menu and a toast.

Keep these in the scratchpad. They aren't committed; they're the reference for Phase 3.

**Phase 1: tokens without changing anything.**
- Rewrite `tokens.css` as palette and roles with light values only.
- Rewrite the contrast test, and add the light-values and no-stray-colors tests (see Proof). The no-stray-colors test fails at this point, listing every file still to move.
- Add the new Tailwind names in `global.css`, keeping the old ones (`--ink`, `--panel` and the rest) as temporary aliases so the app still builds.

**Phase 2: move every file onto tokens, in light mode.** Go through the file list above, one area at a time: shell and shared components, then dashboard, then pipeline, then tables and record pages. For every use of `text-ink`, `bg-panel` and the like, choose between:
- a **role**, for text and backgrounds sitting on a surface;
- a **palette** color, for fills and the text on them.

When the list is done:
- the no-stray-colors test passes;
- the temporary aliases are deleted;
- `npm run check` passes with no test weakened.

**Phase 3: light mode is unchanged.** Screenshot the same screens as Phase 0 and compare them pixel by pixel with the baseline. Any difference is a bug in Phase 2, to fix before going on. This is the proof for the "looks exactly as it does today" constraint.

**Phase 4: dark mode.**
- Add the `:root[data-theme="dark"]` block to `tokens.css` and the dark pairs to the contrast test.
- Write `lib/theme.ts` and `ThemeToggle`, with their unit tests, and put the toggle in the top bar.
- Add the inline script to `index.html`.
- Theme the toaster.
- Check every section by eye in dark mode against Decisions 13 and 14: wells, page, raised layers, the Midnight summary panel, the late card and a dragged card.

**Phase 5: proof and docs.**
- Write `e2e/theme.spec.ts` and add the toggle to the keyboard walk.
- Save the four screenshots in `docs/changes/dark-mode/`.
- Update `TECH_STACK.md` and `STATUS.md`.
- Run `npm run check`.

## Risks

- **Light mode changes by accident.** Phase 2 touches about 30 files, and `text-ink` means two different things today: text on a surface, and Midnight text on a fill. Choosing the wrong one changes nothing in light mode, because the values are the same, but it breaks dark mode. The Phase 3 pixel comparison catches changes to light mode. The by-eye check in dark mode, the contrast test and the screenshots catch the wrong role.
- **SVG presentation attributes and `var()`.** Recharts passes `fill`, `stroke` and `stopColor` as SVG attributes. Chrome reads `var()` in them, but if a gradient stop or tick ignores it, the fix is to pass it through `style` instead. The Phase 4 dark check covers both charts and their tooltips.
- **Sonner has its own theme.** Its default CSS sets a white background and border. Setting `style` on `toastOptions` covers the toast itself. If its close button or icons stay light, use `toastOptions.classNames` with role classes; don't set sonner's own `theme` prop, which would follow the device setting.
- **Flash of light mode on reload.** If the mode were applied from React, the page would paint light first. The inline script runs before the stylesheet paints. The end-to-end test proves it by loading the page with the app's script blocked.
- **Storage that throws** (private windows, blocked storage). Every read and write is inside `try`, and a failure falls back to light. A unit test covers it.
- **`color-mix()` and translucency.** It's supported in Chrome, which is the browser the spec targets. It turns the remaining `rgb()` values into token mixes, so the no-stray-colors test can be strict.
- **Contrast on the raised surface and hover tint.** The numbers in the spec have been checked once by hand; the rewritten contrast test makes them permanent. The tightest pairs are muted text on the tint (4.79:1) and the focus ring on the raised surface (3.25:1).
- **The stop hook and pre-commit run partway through.** Phases 1 and 2 keep temporary aliases so every intermediate state builds and passes `check:quick`.

## Proof

### Unit tests (Vitest)

- **`styles/contrast.test.ts`** (rewritten): parses `tokens.css` into the palette and the two sets of role values, and resolves every alias.
  - Every pair in use is checked in both modes: text and muted on page, surface, raised, tint and late tint; the five colored text roles on surface and raised; Cerulean and Raspberry text (the only colored text off a panel: links, overdue and late dates) also on page and tint; the late date on the late tint; the Negotiation dot on surface, raised and page; the wordmark's A on its mark. AA is 4.5:1 for text and 3:1 for the focus ring, dots and chart lines.
  - Light `--text-cerulean` and `--text-raspberry` point at the deep shades (`--cerulean-deep`, `--raspberry-deep`): the `-ink` shades fail on the page and tints (4.30:1 and 4.09:1 on the page). This is the one deliberate change to light mode.
  - Fill pairs are checked once: Midnight on the five bright fills, white on Midnight and the `-ink` fills, and Sea Mist, hero-muted, Sea Green and raspberry-light on the Midnight panel.
  - Every hex value appears once in the palette, and every role points at a palette token that exists.
  - The light role values equal today's values (`--bg` `#F0F4F5`, surface `#FFFFFF`, text `#073B4C` and so on), so light mode can't drift.
- **`styles/colors.test.ts`** (new): no file in `frontend/src` except `tokens.css` contains a hex color, `rgb(`, `rgba(`, `hsl(`, a named CSS color or a Tailwind default palette class. This is the proof for "colors in one place, no scattered overrides".
- **`lib/theme.test.ts`** (new):
  - `readTheme` returns light for an empty store, an unknown value and a store that throws.
  - `saveTheme` then `readTheme` gives the saved mode back.
  - `applyTheme("dark")` sets `data-theme="dark"` on `<html>`, and `applyTheme("light")` removes it.
- **`components/ThemeToggle.test.tsx`** (new):
  - It starts labelled "Switch to dark mode".
  - A click sets dark mode, stores it and relabels the button "Switch to light mode".
  - A second click undoes all three.
  - It works with Enter and Space.
- **`components/TopBar.test.tsx`** (extended): the toggle sits between quick search and the page's action.
- **`lib/stages.test.ts`** (updated): stage fills and text use palette tokens.

### End-to-end tests (Playwright)

- **`e2e/theme.spec.ts`** (new):
  - **Default and toggle:**
    - A fresh browser opens in light mode: no `data-theme`, page background `rgb(240, 244, 245)`.
    - Clicking "Switch to dark mode" turns the page dark straight away (`data-theme="dark"`, background `rgb(4, 35, 46)`), and the button now reads "Switch to light mode".
  - **Remembered after a reload:** reload, and it's still dark.
  - **No flash:** reload with `src/main.tsx` answered by an empty script, so React never runs. `<html>` still has `data-theme="dark"`, which shows the inline script applies the mode before the app.
  - **Back to light:** switch back and reload; the page is light again.
  - **Every section and layer:** in dark mode, visit each of the five sections and a record page. On each, check that the top bar has the raised background and a panel has the black surface. Then:
    - open a form dialog and the quick search dropdown and check they're raised;
    - save a record and check the toast is raised.
    - The fixture already fails the test on any console error or warning.
  - **Keyboard:** the toggle can be reached with Tab and works with Enter.
- **`e2e/keyboard.spec.ts`** (extended): the keyboard-only walk includes the toggle.
- **Everything else:** the existing suites run unchanged in light mode, which shows the default behavior is intact.

### Other proof

- The Phase 3 pixel comparison of light mode against the Phase 0 baseline, with any differences reported.
- Four screenshots in `docs/changes/dark-mode/`: the dashboard and the pipeline, each in light and dark mode, at 1440px with the seeded data.
- `npm run check` passes.
