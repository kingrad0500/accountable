# Status

The app hasn't been built yet.

## Done

- **Intent clarified (2026-11-18):** an interview filled the gaps in `docs/intent.md`. It now covers what deletes do, which fields are required, how activities link to records, the organization timeline, the stage probabilities, close dates on Won/Lost, Won and Lost columns on the board, the dashboard's 12-month range, the size and kind of sample data and the target user. It also adds success criteria for keyboard access and speed.
- **Spec written (2026-11-18):** `docs/spec.md` sets out the MVP's requirements (with IDs), architecture, data model, API, screens, brand tokens and test plan. It opens with 12 concerns and the decision taken for each, such as stage colors, contrast fixes, orphaned deals, the funnel definition and offline fonts.
- **Concerns settled (2026-11-18):** stage colors, contrast rules, deals left without an organization (flag + filter), a Closed deals filter on the board for Won and Lost, and bundled offline fonts with system fallbacks. Recorded in `docs/spec.md` and `docs/TECH_STACK.md`.
- **Mockups (2026-11-18):** three design directions for the dashboard and pipeline in `docs/mockups/`, as HTML with a Playwright screenshot of each.
- **Design chosen (2026-11-19):** direction B (floating top bar, Midnight summary panel, color-filled pipeline headers). The Screens section of `docs/spec.md` now describes it, and adds a quick search in the top bar (G10) and the in-column add form (P4).
- **Plan written (2026-11-19):** `docs/plan.md` lists the files that will change, the work in 9 phases (reordered the same day: pipeline moved up to Phase 4, CI on Mac, Linux and Windows from Phase 1, shared table built with Deals), the risks, and the unit and end-to-end tests that prove each requirement. No code yet.
- **Structure simplified (2026-11-19):** the backend is one module per area (organizations, contacts, deals, activities, dashboard) plus `main`, `config`, `db` and `seed`: 10 files instead of 15. The frontend keeps each area's hooks and form schema in its feature folder. `docs/plan.md` and `docs/spec.md` updated.
