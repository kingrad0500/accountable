import { act, fireEvent, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { aDashboard } from "../../test/fixtures";
import { fakeBackend, renderScreen } from "../../test/render";
import { DashboardPage } from "./DashboardPage";
import { SummaryPanel } from "./SummaryPanel";
import { WonLostChart } from "./WonLostChart";

afterEach(() => vi.unstubAllGlobals());

describe("DashboardPage", () => {
  it("greets you, dates the figures and sets the tab title", async () => {
    fakeBackend({ "GET /dashboard": aDashboard() });
    renderScreen(<DashboardPage />);
    expect(
      screen.getByRole("heading", { level: 1, name: /^Good (morning|afternoon|evening)$/ }),
    ).toBeInTheDocument();
    expect(screen.getByText(/· all figures in USD$/)).toBeInTheDocument();
    expect(document.title).toBe("Dashboard · Accountable");
    await screen.findByRole("region", { name: "How sales are going" });
  });

  it("says it's loading until the figures arrive, then shows every panel", async () => {
    fakeBackend({ "GET /dashboard": aDashboard() });
    renderScreen(<DashboardPage />);
    expect(screen.getByText("Loading…")).toBeInTheDocument();
    expect(await screen.findByRole("region", { name: "How sales are going" })).toBeVisible();
    for (const panel of [
      "Sales funnel",
      "Deals won and lost by month",
      "Follow-ups",
      "Recent activity",
    ]) {
      expect(screen.getByRole("region", { name: panel })).toBeInTheDocument();
    }
    expect(screen.queryByText("Loading…")).not.toBeInTheDocument();
  });

  it("says when the dashboard can't load", async () => {
    fakeBackend({ "GET /dashboard": { status: 500, detail: "Boom" } });
    renderScreen(<DashboardPage />);
    expect(
      await screen.findByText("The dashboard couldn't load. Is the server running?"),
    ).toBeInTheDocument();
  });
});

// jsdom has no layout, so the charts would draw at zero size. Give every element the size
// test-setup.ts gives it, so the charts draw and can be hovered.
function layOutCharts() {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (
    this: HTMLElement,
  ) {
    return new DOMRect(0, 0, this.offsetWidth, this.offsetHeight);
  });
}

/** Hover a chart at a share of its width, and wait for its tooltip to follow. */
async function hover(chart: HTMLElement, across: number) {
  const plot = chart.querySelector("svg")!;
  await act(async () => {
    fireEvent.mouseMove(plot, { clientX: across * plot.parentElement!.offsetWidth, clientY: 200 });
    await new Promise((resolve) => requestAnimationFrame(resolve));
  });
}

describe("charts", () => {
  beforeEach(layOutCharts);
  afterEach(() => vi.restoreAllMocks());

  it("shows a month's wins and losses on hover", async () => {
    renderScreen(<WonLostChart months={aDashboard().months} />);
    await hover(screen.getByRole("img"), 0.85);
    expect(screen.getByText("November 2026")).toBeInTheDocument();
    expect(screen.getByText("1 won")).toBeInTheDocument();
    expect(screen.getByText("1 lost")).toBeInTheDocument();
  });

  it("labels the best month and shows a month's revenue on hover", async () => {
    renderScreen(<SummaryPanel data={aDashboard()} />);
    const chart = screen.getByRole("img", { name: /^Revenue won by month/ });
    expect(within(chart).getByTestId("best-month")).toHaveTextContent("$120,000");
    await hover(chart, 0.95);
    expect(screen.getByText("November 2026")).toBeInTheDocument();
    expect(screen.getByText("$58,500 USD")).toBeInTheDocument();
    expect(screen.getByText("1 deal won")).toBeInTheDocument();
    await hover(chart, 0.05);
    expect(screen.getByText("October 2026")).toBeInTheDocument();
    expect(screen.getByText("2 deals won")).toBeInTheDocument();
  });

  it("labels no best month when nothing was won", () => {
    const months = [
      { month: "2026-10", revenue: 0, won: 0, lost: 1 },
      { month: "2026-11", revenue: 0, won: 0, lost: 0 },
    ];
    renderScreen(<SummaryPanel data={aDashboard({ months })} />);
    expect(screen.queryByTestId("best-month")).not.toBeInTheDocument();
  });
});

describe("WonLostChart (DB3)", () => {
  it("describes each month's wins and losses for screen readers", () => {
    renderScreen(<WonLostChart months={aDashboard().months} />);
    expect(
      screen.getByRole("img", {
        name: "Deals won and lost by month. Oct: 2 won, 0 lost, Nov: 1 won, 1 lost",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Won")).toBeInTheDocument();
    expect(screen.getByText("Lost")).toBeInTheDocument();
  });
});
