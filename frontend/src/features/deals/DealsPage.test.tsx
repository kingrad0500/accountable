import type { Deal } from "../../api/types";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { CONTACTS, ORGANIZATIONS, daysFromToday, aDeal } from "../../test/fixtures";
import { fakeBackend, renderScreen, type FakeRoutes } from "../../test/render";
import { DealsPage, dealMatches } from "./DealsPage";

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

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

const DEALS = [
  deal({
    id: 1,
    name: "Website rebuild",
    stage: "proposal",
    value: 12500,
    probability: 50,
    main_contact_id: 10,
    main_contact_name: "Ana Ruiz",
    close_date: daysFromToday(-2),
  }),
  deal({ id: 2, name: "Annual support", stage: "won", value: 4000, probability: 100 }),
  deal({
    id: 3,
    name: "Orphan audit",
    stage: "new",
    organization_id: null,
    organization_name: null,
    close_date: daysFromToday(30),
  }),
];

function showDeals(path = "/deals", routes: FakeRoutes = {}) {
  const fetchMock = fakeBackend({
    "GET /deals": DEALS,
    "GET /organizations": ORGANIZATIONS,
    "GET /contacts": CONTACTS,
    ...routes,
  });
  const result = renderScreen(<DealsPage />, { path, pattern: "/deals" });
  return { fetchMock, ...result };
}

const names = () =>
  screen.getAllByTestId("table-row").map((r) => within(r).getAllByRole("cell")[0].textContent);

const row = (name: string) =>
  screen.getAllByTestId("table-row").find((r) => within(r).queryByText(name))!;

describe("DealsPage", () => {
  it("lists every deal with its links and figures", async () => {
    showDeals();
    await screen.findByText("Website rebuild");

    expect(names()).toHaveLength(3);
    expect(screen.getByText("Showing 3 of 3 deals")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Website rebuild" })).toHaveAttribute(
      "href",
      "/deals/1",
    );
    const late = row("Website rebuild");
    expect(within(late).getByRole("link", { name: "Acme" })).toHaveAttribute(
      "href",
      "/organizations/1",
    );
    expect(within(late).getByRole("link", { name: "Ana Ruiz" })).toHaveAttribute(
      "href",
      "/contacts/10",
    );
    expect(within(late).getByText("$6,250")).toBeInTheDocument();
    expect(within(late).getByText("50%")).toBeInTheDocument();
    expect(within(late).getByText("Late")).toBeInTheDocument();

    const orphan = row("Orphan audit");
    expect(within(orphan).getByText("No organization")).toBeInTheDocument();
    expect(within(orphan).getByText("None")).toBeInTheDocument();
    expect(within(orphan).queryByText("Late")).not.toBeInTheDocument();
    expect(within(row("Annual support")).getAllByText("None")).toHaveLength(2);
  });

  it("filters by the Show choice, with a count on each (DL1a)", async () => {
    const { router } = showDeals();
    await screen.findByText("Website rebuild");
    const show = screen.getByLabelText("Show");
    expect(within(show).getByRole("option", { name: "Open (2)" })).toBeInTheDocument();
    expect(within(show).getByRole("option", { name: "No organization (1)" })).toBeInTheDocument();

    await userEvent.selectOptions(show, "late");
    expect(names()).toEqual(["Website rebuild"]);
    expect(router.state.location.search).toBe("?filter=late");

    await userEvent.selectOptions(show, "all");
    expect(names()).toHaveLength(3);
    expect(router.state.location.search).toBe("");
  });

  it("opens filtered by the link it came from", async () => {
    showDeals("/deals?filter=won");
    await screen.findByText("Annual support");
    expect(names()).toEqual(["Annual support"]);
    expect(screen.getByLabelText("Show")).toHaveValue("won");
  });

  it("ignores a filter it doesn't know", async () => {
    showDeals("/deals?filter=nonsense");
    await screen.findByText("Website rebuild");
    expect(names()).toHaveLength(3);
    expect(screen.getByLabelText("Show")).toHaveValue("all");
  });

  it("sorts by stage in pipeline order", async () => {
    showDeals();
    await screen.findByText("Website rebuild");
    await userEvent.click(screen.getByRole("button", { name: /^Stage/ }));
    expect(names()).toEqual(["Orphan audit", "Website rebuild", "Annual support"]);
  });

  it("puts deals without an organization, contact or close date last when sorting", async () => {
    showDeals();
    await screen.findByText("Website rebuild");

    await userEvent.click(screen.getByRole("button", { name: /^Organization/ }));
    expect(names().at(-1)).toBe("Orphan audit");
    await userEvent.click(screen.getByRole("button", { name: /^Main contact/ }));
    expect(names()[0]).toBe("Website rebuild");
    await userEvent.click(screen.getByRole("button", { name: /^Close date/ }));
    expect(names()).toEqual(["Website rebuild", "Orphan audit", "Annual support"]);
  });

  it("opens the add form from Add deal", async () => {
    showDeals();
    await screen.findByText("Website rebuild");
    await userEvent.click(screen.getByRole("button", { name: "Add deal" }));
    expect(await screen.findByRole("dialog", { name: "Add deal" })).toBeInTheDocument();

    await userEvent.click(await screen.findByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("opens the edit form from a row", async () => {
    showDeals();
    await userEvent.click(await screen.findByRole("button", { name: "Edit Annual support" }));
    const dialog = await screen.findByRole("dialog", { name: "Edit Annual support" });
    expect(await within(dialog).findByLabelText("Deal name")).toHaveValue("Annual support");
  });

  it("deletes a deal from its row after asking (D1)", async () => {
    const { fetchMock } = showDeals("/deals", {
      "GET /deals/2/delete-impact": {},
      "DELETE /deals/2": undefined,
    });
    await userEvent.click(await screen.findByRole("button", { name: "Delete Annual support" }));
    const confirm = await screen.findByRole("alertdialog", { name: "Delete Annual support?" });
    expect(
      await within(confirm).findByText("Its stage history will be deleted."),
    ).toBeInTheDocument();
    await userEvent.click(within(confirm).getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Deal deleted"));
    expect(
      fetchMock.mock.calls.some(
        ([url, init]) => url === "/api/deals/2" && init?.method === "DELETE",
      ),
    ).toBe(true);
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
  });
});

describe("dealMatches", () => {
  const today = daysFromToday(0);
  it("matches each filter", () => {
    const [late, won, orphan] = DEALS;
    expect(dealMatches("all", won, today)).toBe(true);
    expect(dealMatches("open", won, today)).toBe(false);
    expect(dealMatches("late", late, today)).toBe(true);
    expect(dealMatches("late", orphan, today)).toBe(false);
    expect(dealMatches("no-org", orphan, today)).toBe(true);
    expect(dealMatches("proposal", late, today)).toBe(true);
    expect(dealMatches("proposal", won, today)).toBe(false);
  });
});
