import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import type { Deal } from "../../api/types";
import type { StageKey } from "../../lib/stages";
import { daysFromToday, aDeal } from "../../test/fixtures";
import { fakeBackend, renderScreen, type FakeRoutes } from "../../test/render";
import { PipelinePage } from "./PipelinePage";

// The deals here belong to Acme unless a test says otherwise.
const deal = (overrides: Partial<Deal> = {}) =>
  aDeal({
    organization_id: 1,
    organization_name: "Acme",
    stage: "new",
    probability: 10,
    ...overrides,
  });

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const BOARD: Deal[] = [
  deal({ id: 1, name: "Alpha", stage: "new", value: 1000, close_date: daysFromToday(-5) }),
  deal({
    id: 2,
    name: "Bravo",
    stage: "new",
    position: 1,
    value: 3000,
    main_contact_id: 10,
    main_contact_name: "Ana Ruiz",
  }),
  deal({ id: 3, name: "Charlie", stage: "proposal", value: 5000, probability: 50 }),
  deal({
    id: 4,
    name: "Won recent",
    stage: "won",
    value: 20000,
    probability: 100,
    close_date: daysFromToday(-10),
  }),
  deal({
    id: 5,
    name: "Won old",
    stage: "won",
    position: 1,
    value: 7000,
    probability: 100,
    close_date: daysFromToday(-200),
  }),
  deal({
    id: 6,
    name: "Lost recent",
    stage: "lost",
    value: 1500,
    probability: 0,
    organization_id: null,
    organization_name: null,
    close_date: daysFromToday(-5),
  }),
];

/** A small stateful backend: the deals list, and moves that change it. */
function showBoard(deals: Deal[] = BOARD, routes: FakeRoutes = {}) {
  let server = deals.map((d) => ({ ...d }));
  const moves: FakeRoutes = Object.fromEntries(
    deals.map((deal) => [
      `POST /deals/${deal.id}/move`,
      (body: unknown) => {
        const { stage } = body as { stage: StageKey; index: number };
        server = server.map((d) => (d.id === deal.id ? { ...d, stage, position: -1 } : d));
        return server.find((d) => d.id === deal.id);
      },
    ]),
  );
  const fetchMock = fakeBackend({ "GET /deals": () => server, ...moves, ...routes });
  const result = renderScreen(<PipelinePage />, { path: "/pipeline" });
  return { fetchMock, ...result };
}

const columnOf = (label: string) => screen.getByRole("region", { name: `${label} column` });
const cardNames = (label: string) =>
  within(columnOf(label))
    .queryAllByTestId("deal-card")
    .map((c) => within(c).getAllByRole("link", { hidden: true })[0].textContent);
const card = (name: string) => screen.getByRole("button", { name: new RegExp(`^${name},`) });

const moveCalls = (fetchMock: ReturnType<typeof fakeBackend>) =>
  fetchMock.mock.calls
    .filter(([url, init]) => init?.method === "POST" && String(url).endsWith("/move"))
    .map(([url, init]) => ({ url, body: JSON.parse(String(init?.body)) }));

beforeEach(() => localStorage.clear());
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("the board", () => {
  it("shows the open pipeline's figures (P3)", async () => {
    showBoard();
    await screen.findByText("Alpha");
    const summary = screen.getByRole("group", { name: "Open pipeline" });
    expect(within(summary).getByText("Open value (USD)").nextElementSibling).toHaveTextContent(
      "$9,000",
    );
    expect(
      within(summary).getByText("Expected revenue (USD)").nextElementSibling,
    ).toHaveTextContent("$2,900");
    expect(within(summary).getByText("Open deals").nextElementSibling).toHaveTextContent("3");
    expect(within(summary).getByText("Late").nextElementSibling).toHaveTextContent("1");
  });

  it("shows each column's deals in order, with its figures (P1)", async () => {
    showBoard();
    await screen.findByText("Alpha");

    const newColumn = columnOf("New");
    expect(cardNames("New")).toEqual(["Alpha", "Bravo"]);
    expect(within(newColumn).getByText("2 deals")).toBeInTheDocument();
    expect(within(newColumn).getByText("$4,000")).toBeInTheDocument();
    expect(within(newColumn).getByText("Expected")).toHaveTextContent("Expected $400");
    expect(
      within(newColumn).getByRole("meter", { name: "New share of open value" }),
    ).toHaveAttribute("aria-valuenow", "44");
    expect(cardNames("Qualified")).toEqual([]);
    expect(within(columnOf("Qualified")).getByText("0 deals")).toBeInTheDocument();
  });

  it("shows what matters on each card (P5)", async () => {
    showBoard();
    await screen.findByText("Alpha");

    expect(card("Alpha")).toHaveAccessibleName("Alpha, $1,000, Acme, late");
    expect(within(card("Alpha")).getByText("Late")).toBeInTheDocument();
    expect(within(card("Bravo")).getByTitle("Ana Ruiz")).toHaveTextContent("AR");
    expect(within(card("Bravo")).getByText("No close date")).toBeInTheDocument();
    expect(within(card("Bravo")).getByText(/Acme · 10%/)).toBeInTheDocument();
    expect(within(card("Won recent")).getByText("$20k")).toBeInTheDocument();
    expect(card("Lost recent")).toHaveAccessibleName("Lost recent, $1,500, no organization");
    expect(within(card("Lost recent")).getByText("No organization")).toBeInTheDocument();
  });

  it("opens a deal from the name on its card", async () => {
    const { router } = showBoard();
    await userEvent.click(await screen.findByRole("link", { name: "Charlie" }));
    expect(router.state.location.pathname).toBe("/deals/3");
  });

  it("opens a deal when Enter is pressed on its card", async () => {
    const { router } = showBoard();
    await screen.findByText("Alpha");
    card("Bravo").focus();
    await userEvent.keyboard("{Enter}");
    expect(router.state.location.pathname).toBe("/deals/2");
  });
});

describe("closed deals (P1a)", () => {
  it("shows Won and Lost from the last 90 days, with a link to the rest", async () => {
    showBoard();
    await screen.findByText("Alpha");

    const won = columnOf("Won");
    expect(cardNames("Won")).toEqual(["Won recent"]);
    expect(within(won).getByText("Closed in the last 90 days")).toBeInTheDocument();
    expect(within(won).getByText(/1 more closed earlier/)).toBeInTheDocument();
    expect(within(won).getByRole("link", { name: "See in Deals" })).toHaveAttribute(
      "href",
      "/deals?filter=won",
    );
    expect(within(won).getByText("$20,000")).toBeInTheDocument();
    expect(within(columnOf("Lost")).queryByText(/closed earlier/)).not.toBeInTheDocument();
  });

  it("shows every closed deal when asked, and remembers the choice", async () => {
    showBoard();
    await screen.findByText("Alpha");
    await userEvent.selectOptions(screen.getByLabelText("Closed deals:"), "All");

    expect(cardNames("Won")).toEqual(["Won recent", "Won old"]);
    expect(within(columnOf("Won")).getByText("All closed deals")).toBeInTheDocument();
    expect(within(columnOf("Won")).queryByText(/closed earlier/)).not.toBeInTheDocument();
    expect(localStorage.getItem("accountable.pipeline.closedDeals")).toBe("all");
  });

  it("starts from the remembered choice", async () => {
    localStorage.setItem("accountable.pipeline.closedDeals", "365");
    showBoard();
    await screen.findByText("Alpha");
    expect(screen.getByLabelText("Closed deals:")).toHaveValue("365");
    expect(cardNames("Won")).toEqual(["Won recent", "Won old"]);
  });

  it("falls back to 90 days when the remembered choice is unknown", async () => {
    localStorage.setItem("accountable.pipeline.closedDeals", "forever");
    showBoard();
    await screen.findByText("Alpha");
    expect(screen.getByLabelText("Closed deals:")).toHaveValue("90");
  });

  it("still works when the browser blocks storage", async () => {
    const getItem = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    try {
      showBoard();
      await screen.findByText("Alpha");
      expect(screen.getByLabelText("Closed deals:")).toHaveValue("90");
      await userEvent.selectOptions(screen.getByLabelText("Closed deals:"), "All");
      expect(cardNames("Won")).toEqual(["Won recent", "Won old"]);
    } finally {
      getItem.mockRestore();
      setItem.mockRestore();
    }
  });
});

describe("a long column (G7)", () => {
  it("shows 50 cards, then more on request", async () => {
    const many = Array.from({ length: 53 }, (_, i) =>
      deal({ id: 100 + i, name: `Lead ${i}`, stage: "qualified", position: i }),
    );
    showBoard(many);
    await screen.findByText("Lead 0");

    expect(cardNames("Qualified")).toHaveLength(50);
    expect(within(columnOf("Qualified")).getByText("53 deals")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Show 3 more (3 not shown)" }));
    expect(cardNames("Qualified")).toHaveLength(53);
    expect(screen.queryByRole("button", { name: /more \(/ })).not.toBeInTheDocument();
  });
});

describe("moving a deal with the Move to menu (P6)", () => {
  it("lists the other stages and moves the deal to the top of the chosen one", async () => {
    const { fetchMock } = showBoard();
    await screen.findByText("Alpha");

    await userEvent.click(screen.getByRole("button", { name: "Move Alpha to" }));
    const menu = await screen.findByRole("menu");
    expect(
      within(menu)
        .getAllByRole("menuitem")
        .map((i) => i.textContent),
    ).toEqual(["Qualified", "Proposal", "Negotiation", "Won", "Lost"]);
    await userEvent.click(within(menu).getByRole("menuitem", { name: "Proposal" }));

    await waitFor(() => expect(cardNames("Proposal")).toEqual(["Alpha", "Charlie"]));
    expect(cardNames("New")).toEqual(["Bravo"]);
    expect(moveCalls(fetchMock)).toEqual([
      { url: "/api/deals/1/move", body: { stage: "proposal", index: 0 } },
    ]);
    expect(within(columnOf("Proposal")).getByText("2 deals")).toBeInTheDocument();
  });

  it("puts the card back and says why when the server refuses", async () => {
    showBoard(BOARD, { "POST /deals/1/move": { status: 409, detail: "Deal is locked" } });
    await screen.findByText("Alpha");

    await userEvent.click(screen.getByRole("button", { name: "Move Alpha to" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Won" }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Alpha couldn't move to Won. Deal is locked"),
    );
    await waitFor(() => expect(cardNames("New")).toEqual(["Alpha", "Bravo"]));
    expect(cardNames("Won")).toEqual(["Won recent"]);
  });
});

describe("moving a deal with the keyboard (P6)", () => {
  // jsdom has no layout, so give the board one: columns side by side, cards stacked in each.
  const COLUMN_WIDTH = 300;
  const CARD_HEIGHT = 80;
  function layOut(el: Element): DOMRect {
    const columnEl = el.closest("[data-testid^='column-']");
    const columns = Array.from(document.querySelectorAll("[data-testid^='column-']"));
    const left = columns.indexOf(columnEl as Element) * COLUMN_WIDTH;
    if (el.matches("[data-testid^='column-']")) {
      const cards = el.querySelectorAll("[data-testid='deal-card']").length;
      return new DOMRect(left, 90, COLUMN_WIDTH - 20, Math.max(96, cards * CARD_HEIGHT + 20));
    }
    if (el.matches("[data-testid='deal-card']") && columnEl) {
      const index = Array.from(columnEl.querySelectorAll("[data-testid='deal-card']")).indexOf(el);
      return new DOMRect(left, 100 + index * CARD_HEIGHT, COLUMN_WIDTH - 20, CARD_HEIGHT - 10);
    }
    // The lifted card floats over the board where its card was, at the same size.
    const lifted = el.querySelector("a[href^='/deals/']");
    if (lifted && !columnEl) {
      const original = document
        .querySelector(`[data-testid^='column-'] a[href='${lifted.getAttribute("href")}']`)
        ?.closest("[data-testid='deal-card']");
      if (original) return layOut(original);
    }
    return new DOMRect(0, 0, 0, 0);
  }

  beforeEach(() => {
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (
      this: Element,
    ) {
      return layOut(this);
    });
  });
  afterEach(() => vi.restoreAllMocks());

  const announced = () =>
    screen
      .getAllByRole("status")
      .map((s) => s.textContent)
      .join(" ");

  async function pickUp(name: string) {
    card(name).focus();
    fireEvent.keyDown(card(name), { key: " ", code: "Space" });
    await waitFor(() => expect(announced()).toMatch(`Picked up ${name}`));
    // The keyboard sensor starts listening for arrow keys on the next tick.
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  const press = (code: string) =>
    fireEvent.keyDown(document.activeElement ?? document.body, { key: code, code });

  it("moves a card to the next column with the arrow keys and Space", async () => {
    const { fetchMock } = showBoard();
    await screen.findByText("Alpha");

    await pickUp("Alpha");
    expect(announced()).toMatch("Picked up Alpha. New, position 1 of 2.");
    press("ArrowRight");
    await waitFor(() => expect(announced()).toMatch("Alpha is over Qualified"));
    press("Space");

    await waitFor(() => expect(announced()).toMatch("Dropped Alpha in Qualified."));
    await waitFor(() =>
      expect(moveCalls(fetchMock)).toEqual([
        { url: "/api/deals/1/move", body: { stage: "qualified", index: 0 } },
      ]),
    );
    await waitFor(() => expect(cardNames("Qualified")).toEqual(["Alpha"]));
  });

  it("puts the card back on Escape", async () => {
    const { fetchMock } = showBoard();
    await screen.findByText("Alpha");

    await pickUp("Alpha");
    press("ArrowRight");
    await waitFor(() => expect(announced()).toMatch("Alpha is over Qualified"));
    press("Escape");

    await waitFor(() => expect(announced()).toMatch("Cancelled. Alpha went back to New."));
    expect(cardNames("New")).toEqual(["Alpha", "Bravo"]);
    expect(moveCalls(fetchMock)).toEqual([]);
  });

  it("reorders a card within its column with Up", async () => {
    const { fetchMock } = showBoard();
    await screen.findByText("Bravo");

    await pickUp("Bravo");
    press("ArrowUp");
    await waitFor(() => expect(announced()).toMatch("Bravo is over New, position 1 of 2."));
    press("Space");

    await waitFor(() =>
      expect(moveCalls(fetchMock)).toEqual([
        { url: "/api/deals/2/move", body: { stage: "new", index: 0 } },
      ]),
    );
  });

  it("moves a card down and back to the previous column", async () => {
    const { fetchMock } = showBoard();
    await screen.findByText("Charlie");

    await pickUp("Charlie");
    press("ArrowLeft");
    await waitFor(() => expect(announced()).toMatch("Charlie is over Qualified"));
    press("ArrowLeft");
    await waitFor(() => expect(announced()).toMatch("Charlie is over New"));
    press("ArrowDown");
    await waitFor(() => expect(announced()).toMatch("Charlie is over New, position 2"));
    press("Enter");

    await waitFor(() => expect(announced()).toMatch("Dropped Charlie in New."));
    await waitFor(() => expect(moveCalls(fetchMock)).toHaveLength(1));
    expect(moveCalls(fetchMock)[0].body.stage).toBe("new");
  });

  it("stays put at the edge of the board or on other keys, and sends nothing when dropped where it was", async () => {
    const { fetchMock } = showBoard();
    await screen.findByText("Alpha");

    await pickUp("Alpha");
    press("ArrowLeft");
    press("ArrowUp");
    press("KeyA");
    press("Space");

    await waitFor(() => expect(announced()).toMatch("Dropped Alpha in New."));
    expect(cardNames("New")).toEqual(["Alpha", "Bravo"]);
    expect(moveCalls(fetchMock)).toEqual([]);
  });
});
