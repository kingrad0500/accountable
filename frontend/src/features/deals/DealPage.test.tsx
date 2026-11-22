import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { CONTACTS, ORGANIZATIONS, daysFromToday, aDealDetail } from "../../test/fixtures";
import { fakeBackend, renderScreen, type FakeRoutes } from "../../test/render";
import { DealPage } from "./DealPage";

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

const DEAL = aDealDetail({
  id: 7,
  name: "Website rebuild",
  organization_id: 1,
  organization_name: "Acme",
  main_contact_id: 10,
  main_contact_name: "Ana Ruiz",
  stage: "proposal",
  value: 12500,
  probability: 50,
  close_date: daysFromToday(-3),
});

function showDeal(routes: FakeRoutes) {
  const fetchMock = fakeBackend({
    "GET /organizations": ORGANIZATIONS,
    "GET /contacts": CONTACTS,
    ...routes,
  });
  const screenResult = renderScreen(<DealPage />, { path: "/deals/7", pattern: "/deals/:id" });
  return { fetchMock, ...screenResult };
}

const fact = (label: string) => screen.getByText(label, { selector: "dt" }).nextElementSibling;

describe("DealPage", () => {
  it("shows Loading while the deal is on its way", async () => {
    showDeal({ "GET /deals/7": DEAL });
    expect(screen.getByText("Loading…")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Website rebuild" })).toBeInTheDocument();
  });

  it("says when the deal doesn't exist", async () => {
    showDeal({});
    expect(
      await screen.findByRole("heading", { name: "This deal doesn't exist" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Deals" })).toHaveAttribute("href", "/deals");
  });

  it("shows the deal's figures and links (DL3)", async () => {
    showDeal({ "GET /deals/7": DEAL });
    await screen.findByRole("heading", { name: "Website rebuild" });

    expect(screen.getByText("Proposal")).toBeInTheDocument();
    expect(screen.getByText("Late")).toBeInTheDocument();
    expect(fact("Value (USD)")).toHaveTextContent("$12,500");
    expect(fact("Probability")).toHaveTextContent("50%");
    expect(fact("Expected (USD)")).toHaveTextContent("$6,250");
    expect(fact("Close date")).toHaveTextContent(/\d{1,2} \w{3} \d{4}/);
    for (const link of screen.getAllByRole("link", { name: "Acme" }))
      expect(link).toHaveAttribute("href", "/organizations/1");
    for (const link of screen.getAllByRole("link", { name: "Ana Ruiz" }))
      expect(link).toHaveAttribute("href", "/contacts/10");
    expect(screen.getByText("Nothing has happened here yet.")).toBeInTheDocument();
  });

  it("shows a close date still to come without the Late label", async () => {
    showDeal({ "GET /deals/7": { ...DEAL, close_date: daysFromToday(30), is_late: false } });
    await screen.findByRole("heading", { name: "Website rebuild" });

    expect(screen.queryByText("Late")).not.toBeInTheDocument();
    expect(fact("Close date")).toHaveTextContent(/\d{1,2} \w{3} \d{4}/);
  });

  it("says what's missing on a deal with no organization, contact or close date", async () => {
    showDeal({
      "GET /deals/7": aDealDetail({
        id: 7,
        name: "Loose end",
        organization_id: null,
        organization_name: null,
      }),
    });
    await screen.findByRole("heading", { name: "Loose end" });

    expect(screen.queryByText("Late")).not.toBeInTheDocument();
    expect(fact("Organization")).toHaveTextContent("No organization");
    expect(fact("Main contact")).toHaveTextContent("None");
    expect(fact("Close date")).toHaveTextContent("None");
    const linked = screen.getByRole("region", { name: "Linked records" });
    expect(
      within(linked).getByText("No organization. Edit the deal to choose one."),
    ).toBeInTheDocument();
    expect(within(linked).getByText("None")).toBeInTheDocument();
  });

  it("opens the edit form with the deal in it", async () => {
    showDeal({ "GET /deals/7": DEAL });
    await userEvent.click(await screen.findByRole("button", { name: "Edit" }));

    const dialog = await screen.findByRole("dialog", { name: "Edit Website rebuild" });
    expect(await within(dialog).findByLabelText("Deal name")).toHaveValue("Website rebuild");
  });

  it("deletes the deal after asking, then goes back to Deals (D1)", async () => {
    const { fetchMock, router } = showDeal({
      "GET /deals/7": DEAL,
      "GET /deals/7/delete-impact": { activities: 2 },
      "DELETE /deals/7": undefined,
    });
    await userEvent.click(await screen.findByRole("button", { name: "Delete" }));

    const confirm = await screen.findByRole("alertdialog", { name: "Delete Website rebuild?" });
    expect(
      await within(confirm).findByText(
        "Its 2 activities and follow-ups and its stage history will be deleted.",
      ),
    ).toBeInTheDocument();
    await userEvent.click(within(confirm).getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(router.state.location.pathname).toBe("/deals"));
    expect(
      fetchMock.mock.calls.some(
        ([url, init]) => url === "/api/deals/7" && init?.method === "DELETE",
      ),
    ).toBe(true);
    expect(toast.success).toHaveBeenCalledWith("Deal deleted");
  });
});
