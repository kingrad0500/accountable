# Mockups

**Chosen: direction B** (2026-11-19). `docs/spec.md` describes it in the Screens section. A and C are kept for reference.

Three design directions for the MVP's dashboard and pipeline, following `docs/spec.md` and the brand. Each HTML file has a full-page screenshot beside it, taken with Playwright at 1440px wide. The data is the same sample data in all six, with "today" fixed at 18 Nov 2026.

| Direction | Dashboard | Pipeline |
|---|---|---|
| **A · Midnight sidebar.** The layout in the spec: dark sidebar, four figure tiles, a 12-column grid. Pipeline shows a card mid-drag over Negotiation with its drop gap. | [dashboard-a.html](dashboard-a.html) · [png](dashboard-a.png) | [pipeline-a.html](pipeline-a.html) · [png](pipeline-a.png) |
| **B · Top bar and dark summary.** Tabs in a floating top bar, a Midnight panel for the headline figures and revenue chart, follow-ups as a table. Pipeline has colored column headers with totals and a share-of-pipeline meter, and shows a deal being added in Qualified. | [dashboard-b.html](dashboard-b.html) · [png](dashboard-b.png) | [pipeline-b.html](pipeline-b.html) · [png](pipeline-b.png) |
| **C · Calm and editorial.** Floating white sidebar with a serif wordmark, a real funnel shape, revenue and won/lost charts sharing one panel, follow-ups in three columns. Pipeline cards show a probability bar, one card has keyboard focus and its "Move to" menu open, and a toast confirms a move with Undo. | [dashboard-c.html](dashboard-c.html) · [png](dashboard-c.png) | [pipeline-c.html](pipeline-c.html) · [png](pipeline-c.png) |

`shared/` holds the brand tokens, sample data, chart helpers and each direction's shell. To view the HTML, serve this folder, for example `python3 -m http.server` from here, and open `http://localhost:8000`. The mockups load fonts from Google Fonts for convenience. The app itself bundles them.
