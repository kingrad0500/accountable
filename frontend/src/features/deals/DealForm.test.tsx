import { useState } from "react";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import type { Deal } from "../../api/types";
import { CONTACTS, ORGANIZATIONS, aDeal } from "../../test/fixtures";
import { fakeBackend, renderScreen, type FakeRoutes } from "../../test/render";
import { DealFormDialog } from "./DealForm";
import type { DealInput } from "./schema";

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

const LOOKUPS: FakeRoutes = { "GET /organizations": ORGANIZATIONS, "GET /contacts": CONTACTS };

function Harness({
  deal,
  initial,
  onSaved,
}: {
  deal?: Deal;
  initial?: Partial<DealInput>;
  onSaved?: (deal: Deal) => void;
}) {
  const [open, setOpen] = useState(true);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open form
      </button>
      <DealFormDialog
        open={open}
        onOpenChange={setOpen}
        deal={deal}
        initial={initial}
        onSaved={onSaved}
      />
    </>
  );
}

const sentTo = (fetchMock: ReturnType<typeof fakeBackend>, method: string) =>
  fetchMock.mock.calls
    .filter(([, init]) => (init?.method ?? "GET") === method)
    .map(([url, init]) => ({ url, body: init?.body ? JSON.parse(String(init.body)) : undefined }));

async function openForm(props: Parameters<typeof Harness>[0] = {}, routes: FakeRoutes = {}) {
  const fetchMock = fakeBackend({ ...LOOKUPS, ...routes });
  renderScreen(<Harness {...props} />);
  const dialog = await screen.findByRole("dialog");
  await within(dialog).findByLabelText("Deal name");
  return { fetchMock, dialog };
}

describe("adding a deal", () => {
  it("shows a loading state until the organizations and contacts arrive", async () => {
    fakeBackend(LOOKUPS);
    renderScreen(<Harness />);
    expect(screen.getByText("Loading…")).toBeInTheDocument();
    expect(await screen.findByLabelText("Deal name")).toBeInTheDocument();
  });

  it("sends the new deal and closes the dialog", async () => {
    const onSaved = vi.fn();
    const { fetchMock, dialog } = await openForm(
      { onSaved },
      { "POST /deals": (body: unknown) => aDeal({ id: 99, ...(body as Partial<Deal>) }) },
    );
    expect(within(dialog).getByRole("heading", { name: "Add deal" })).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("Deal name"), "Website rebuild");
    await userEvent.selectOptions(screen.getByLabelText("Organization"), "Acme");
    await userEvent.selectOptions(screen.getByLabelText("Main contact (optional)"), "Ben Fletcher");
    await userEvent.selectOptions(screen.getByLabelText("Stage"), "Proposal");
    await userEvent.type(screen.getByLabelText("Value (USD)"), "12500");
    await userEvent.type(screen.getByLabelText("Close date"), "2026-12-31");
    await userEvent.click(within(dialog).getByRole("button", { name: "Add deal" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(sentTo(fetchMock, "POST")).toEqual([
      {
        url: "/api/deals",
        body: {
          name: "Website rebuild",
          organization_id: 1,
          main_contact_id: 11,
          stage: "proposal",
          value: 12500,
          probability: 50,
          close_date: "2026-12-31",
        },
      },
    ]);
    expect(toast.success).toHaveBeenCalledWith("Deal added");
    expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ id: 99 }));
  });

  it("lists only contacts at the chosen organization (DL7)", async () => {
    await openForm();
    const contact = screen.getByLabelText("Main contact (optional)");
    expect(contact).toBeDisabled();
    expect(within(contact).getByRole("option")).toHaveTextContent("Choose an organization first");

    await userEvent.selectOptions(screen.getByLabelText("Organization"), "Globex");
    expect(contact).toBeEnabled();
    expect(
      within(contact)
        .getAllByRole("option")
        .map((o) => o.textContent),
    ).toEqual(["No main contact", "Gina Gold"]);
  });

  it("keeps a probability the user typed when the stage changes (DL5, DL6)", async () => {
    await openForm();
    const probability = screen.getByLabelText("Probability of close (%)");
    expect(probability).toHaveValue("10");

    await userEvent.selectOptions(screen.getByLabelText("Stage"), "Negotiation");
    expect(probability).toHaveValue("75");

    await userEvent.clear(probability);
    await userEvent.type(probability, "40");
    await userEvent.selectOptions(screen.getByLabelText("Stage"), "Qualified");
    expect(probability).toHaveValue("40");
  });

  it("starts from the values it's given, with that stage's probability", async () => {
    await openForm({ initial: { name: "From the board", stage: "qualified", value: "500" } });
    expect(screen.getByLabelText("Deal name")).toHaveValue("From the board");
    expect(screen.getByLabelText("Stage")).toHaveValue("qualified");
    expect(screen.getByLabelText("Value (USD)")).toHaveValue("500");
    expect(screen.getByLabelText("Probability of close (%)")).toHaveValue("25");
  });

  it("shows what's missing and sends nothing (V1)", async () => {
    const { fetchMock, dialog } = await openForm();
    await userEvent.click(within(dialog).getByRole("button", { name: "Add deal" }));

    expect(await screen.findAllByText("Required")).toHaveLength(3);
    expect(screen.getByLabelText("Deal name")).toHaveAttribute("aria-invalid", "true");
    expect(sentTo(fetchMock, "POST")).toEqual([]);
  });

  it("shows the server's field errors next to the field (V5)", async () => {
    const { dialog } = await openForm(
      {},
      {
        "POST /deals": {
          status: 422,
          detail: [{ loc: ["body", "name"], msg: "A deal with this name exists" }],
        },
      },
    );
    await userEvent.type(screen.getByLabelText("Deal name"), "Twin");
    await userEvent.selectOptions(screen.getByLabelText("Organization"), "Acme");
    await userEvent.type(screen.getByLabelText("Value (USD)"), "10");
    await userEvent.click(within(dialog).getByRole("button", { name: "Add deal" }));

    expect(await screen.findByText("A deal with this name exists")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("tells the user when the server refuses for another reason", async () => {
    const { dialog } = await openForm({}, { "POST /deals": { status: 500, detail: "Boom" } });
    await userEvent.type(screen.getByLabelText("Deal name"), "Doomed");
    await userEvent.selectOptions(screen.getByLabelText("Organization"), "Acme");
    await userEvent.type(screen.getByLabelText("Value (USD)"), "10");
    await userEvent.click(within(dialog).getByRole("button", { name: "Add deal" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Boom"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("closes on Cancel without saving", async () => {
    const { fetchMock } = await openForm();
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(sentTo(fetchMock, "POST")).toEqual([]);
  });
});

describe("editing a deal", () => {
  const deal = aDeal({
    id: 7,
    name: "Website rebuild",
    organization_id: 1,
    main_contact_id: 10,
    main_contact_name: "Ana Ruiz",
    stage: "proposal",
    value: 12500,
    probability: 50,
    close_date: "2026-12-31",
  });

  it("starts from the deal and sends only what changed", async () => {
    const { fetchMock, dialog } = await openForm(
      { deal },
      { "PATCH /deals/7": (body: unknown) => ({ ...deal, ...(body as Partial<Deal>) }) },
    );
    expect(within(dialog).getByRole("heading", { name: "Edit Website rebuild" })).toBeVisible();
    expect(screen.getByLabelText("Deal name")).toHaveValue("Website rebuild");
    expect(screen.getByLabelText("Organization")).toHaveValue("1");
    expect(screen.getByLabelText("Main contact (optional)")).toHaveValue("10");
    expect(screen.getByLabelText("Close date")).toHaveValue("2026-12-31");

    await userEvent.clear(screen.getByLabelText("Value (USD)"));
    await userEvent.type(screen.getByLabelText("Value (USD)"), "20000");
    await userEvent.click(within(dialog).getByRole("button", { name: "Save deal" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(sentTo(fetchMock, "PATCH")).toEqual([{ url: "/api/deals/7", body: { value: 20000 } }]);
    expect(toast.success).toHaveBeenCalledWith("Deal saved");
  });

  it("clears the main contact when the organization changes to one they're not at", async () => {
    const { fetchMock, dialog } = await openForm({ deal }, { "PATCH /deals/7": deal });
    await userEvent.selectOptions(screen.getByLabelText("Organization"), "Globex");
    expect(screen.getByLabelText("Main contact (optional)")).toHaveValue("");
    await userEvent.click(within(dialog).getByRole("button", { name: "Save deal" }));

    await waitFor(() => expect(sentTo(fetchMock, "PATCH")).toHaveLength(1));
    expect(sentTo(fetchMock, "PATCH")[0].body).toEqual({
      organization_id: 2,
      main_contact_id: null,
    });
  });

  it("keeps the main contact when the organization changes to theirs", async () => {
    const unlinked = aDeal({
      id: 9,
      organization_id: null,
      organization_name: null,
      main_contact_id: 12,
      main_contact_name: "Gina Gold",
    });
    const { fetchMock, dialog } = await openForm(
      { deal: unlinked },
      { "PATCH /deals/9": unlinked },
    );
    await userEvent.selectOptions(screen.getByLabelText("Organization"), "Globex");
    expect(screen.getByLabelText("Main contact (optional)")).toHaveValue("12");
    await userEvent.click(within(dialog).getByRole("button", { name: "Save deal" }));

    await waitFor(() => expect(sentTo(fetchMock, "PATCH")).toHaveLength(1));
    expect(sentTo(fetchMock, "PATCH")[0].body).toEqual({ organization_id: 2 });
  });

  it("saves without a request when nothing changed", async () => {
    const { fetchMock, dialog } = await openForm({ deal });
    await userEvent.click(within(dialog).getByRole("button", { name: "Save deal" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(sentTo(fetchMock, "PATCH")).toEqual([]);
    expect(toast.success).toHaveBeenCalledWith("Deal saved");
  });

  it("shows an unlinked deal with empty choices", async () => {
    await openForm({
      deal: aDeal({ id: 8, organization_id: null, organization_name: null }),
    });
    expect(screen.getByLabelText("Organization")).toHaveValue("");
    expect(screen.getByLabelText("Main contact (optional)")).toBeDisabled();
    expect(screen.getByLabelText("Close date")).toHaveValue("");
  });
});
