# Intent: dark mode

## Problem

Accountable only has a light mode, and some people prefer a dark screen.

## Proposed outcome

A dark mode with a toggle on every page, across every section.

## Constraints

- Light mode stays the default, and the app remembers the choice.
- Light mode looks exactly as it does today, apart from the toggle.
- Colors stay in one place, as tokens, with no scattered overrides.
- Text in dark mode meets the same contrast rules as spec.md.
- Charts, dialogs and messages follow the mode too.
- No new dependencies unless the plan makes the case for one.

## Decisions

- **Palette.** Dark mode is built on deep shades of Midnight, not neutral charcoal, so it still feels like the brand. Things that are Midnight fills today (the dashboard's hero panel, the Negotiation column, the open-value chip, the wordmark's mark) become a slightly lighter Midnight, or get a subtle outline, so they still stand out from the page.
- **Toggle.** A sun/moon icon button on the right of the top bar, between quick search and the page's main action, with an accessible label that says what it does ("Switch to dark mode" / "Switch to light mode").
- **Remembering.** The choice is stored in the browser, like the pipeline's "Closed deals" filter, with no backend change. It's applied before the first paint, so a reload in dark mode never flashes light.

## Not in this change

- Following the device's own dark mode setting.
- A layout for phones.

## Success criteria

1. npm run check passes.
2. A new end-to-end test proves that the toggle works and is remembered after a reload.
3. Screenshots of the dashboard and the pipeline in both modes are saved in docs/changes/dark-mode/.
