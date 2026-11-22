import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import type { Deal } from "../../api/types";
import { CONTACTS, ORGANIZATIONS, aDeal } from "../../test/fixtures";
import { fakeBackend, renderScreen, type FakeRoutes } from "../../test/render";
import { AddDealInColumn } from "./AddDealInColumn";

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

function showColumn(routes: FakeRoutes = {}) {
  const fetchMock = fakeBackend({
    "GET /organizations": ORGANIZATIONS,
    "GET /contacts": CONTACTS,
    "POST /deals": (body: unknown) => aDeal({ id: 50, ...(body as Partial<Deal>) }),
    ...routes,
  });
  renderScreen(<AddDealInColumn stage="proposal" />);
  return fetchMock;
}

const posted = (fetchMock: ReturnType<typeof fakeBackend>) =>
  fetchMock.mock.calls
    .filter(([, init]) => init?.method === "POST")
    .map(([, init]) => JSON.parse(String(init?.body)));

async function openQuickForm() {
  await userEvent.click(screen.getByRole("button", { name: "Add deal to Proposal" }));
  const form = screen.getByRole("group", { name: "New deal in Proposal" });
  await within(form).findByRole("option", { name: "Acme" });
  return form;
}

describe("Add deal in a column (P4)", () => {
  it("adds a deal at the column's stage, with its usual probability", async () => {
    const fetchMock = showColumn();
    const form = await openQuickForm();
    expect(within(form).getByLabelText("Deal name")).toHaveFocus();

    await userEvent.type(within(form).getByLabelText("Deal name"), "Quick win");
    await userEvent.selectOptions(within(form).getByLabelText("Organization"), "Globex");
    await userEvent.type(within(form).getByLabelText("Value (USD)"), "8000");
    await userEvent.type(within(form).getByLabelText("Close date"), "2026-12-01");
    await userEvent.click(within(form).getByRole("button", { name: "Add to Proposal" }));

    await waitFor(() =>
      expect(screen.queryByRole("group", { name: "New deal in Proposal" })).not.toBeInTheDocument(),
    );
    expect(posted(fetchMock)).toEqual([
      {
        name: "Quick win",
        organization_id: 2,
        value: 8000,
        close_date: "2026-12-01",
        stage: "proposal",
        probability: 50,
        main_contact_id: null,
      },
    ]);
    expect(toast.success).toHaveBeenCalledWith("Deal added to Proposal");
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Add deal to Proposal" })).toHaveFocus(),
    );
  });

  it("shows what's missing and sends nothing", async () => {
    const fetchMock = showColumn();
    const form = await openQuickForm();
    await userEvent.click(within(form).getByRole("button", { name: "Add to Proposal" }));

    expect(await within(form).findAllByText("Required")).toHaveLength(3);
    expect(posted(fetchMock)).toEqual([]);
  });

  it("shows the server's field errors in the short form", async () => {
    showColumn({
      "POST /deals": {
        status: 422,
        detail: [{ loc: ["body", "value"], msg: "Too big" }],
      },
    });
    const form = await openQuickForm();
    await userEvent.type(within(form).getByLabelText("Deal name"), "Huge");
    await userEvent.selectOptions(within(form).getByLabelText("Organization"), "Acme");
    await userEvent.type(within(form).getByLabelText("Value (USD)"), "1");
    await userEvent.click(within(form).getByRole("button", { name: "Add to Proposal" }));

    expect(await within(form).findByText("Too big")).toBeInTheDocument();
  });

  it("closes on Cancel and on Escape", async () => {
    showColumn();
    let form = await openQuickForm();
    await userEvent.click(within(form).getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("group")).not.toBeInTheDocument();

    form = await openQuickForm();
    await userEvent.type(within(form).getByLabelText("Deal name"), "x{Escape}");
    expect(screen.queryByRole("group")).not.toBeInTheDocument();
  });

  it("carries what was typed into the full form with More details", async () => {
    const fetchMock = showColumn();
    const form = await openQuickForm();
    await userEvent.type(within(form).getByLabelText("Deal name"), "Bigger deal");
    await userEvent.selectOptions(within(form).getByLabelText("Organization"), "Acme");
    await userEvent.type(within(form).getByLabelText("Value (USD)"), "9000");
    await userEvent.click(within(form).getByRole("button", { name: "More details" }));

    const dialog = await screen.findByRole("dialog", { name: "Add deal" });
    expect(screen.queryByRole("group", { name: "New deal in Proposal" })).not.toBeInTheDocument();
    expect(await within(dialog).findByLabelText("Deal name")).toHaveValue("Bigger deal");
    expect(within(dialog).getByLabelText("Organization")).toHaveValue("1");
    expect(within(dialog).getByLabelText("Stage")).toHaveValue("proposal");
    expect(within(dialog).getByLabelText("Value (USD)")).toHaveValue("9000");
    expect(within(dialog).getByLabelText("Probability of close (%)")).toHaveValue("50");

    await userEvent.click(within(dialog).getByRole("button", { name: "Add deal" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(posted(fetchMock)).toEqual([
      expect.objectContaining({ name: "Bigger deal", stage: "proposal", probability: 50 }),
    ]);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Add deal to Proposal" })).toHaveFocus(),
    );
  });
});
