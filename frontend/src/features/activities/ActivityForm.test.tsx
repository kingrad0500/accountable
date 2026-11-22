import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { afterEach, expect, it, vi } from "vitest";
import { anActivity } from "../../test/fixtures";
import { fakeBackend, renderScreen } from "../../test/render";
import { ActivityForm, ActivityFormDialog } from "./ActivityForm";

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

it("logs a note by default, timed now, against its parent, then clears (A1)", async () => {
  const log = vi.fn((body: Record<string, unknown>) => anActivity({ id: 5, ...body }));
  fakeBackend({ "POST /activities": log });
  const onDone = vi.fn();
  renderScreen(<ActivityForm parent={{ deal_id: 4 }} idPrefix="log" onDone={onDone} />);

  expect(screen.getByRole("radio", { name: "Note" })).toBeChecked();
  expect(screen.getByLabelText("When")).not.toHaveValue("");
  expect(screen.queryByRole("button", { name: "Cancel" })).not.toBeInTheDocument();
  const description = screen.getByLabelText("What happened");
  await userEvent.type(description, "Sent the contract");
  await userEvent.click(screen.getByRole("button", { name: "Log activity" }));

  await waitFor(() => expect(onDone).toHaveBeenCalled());
  const sent = log.mock.calls[0][0];
  expect(sent).toMatchObject({
    type: "note",
    description: "Sent the contract",
    follow_up_date: null,
    deal_id: 4,
  });
  expect(Math.abs(Date.parse(String(sent.occurred_at)) - Date.now())).toBeLessThan(120_000);
  expect(toast.success).toHaveBeenCalledWith("Activity logged");
  await waitFor(() => expect(description).toHaveValue(""));
});

it("logs a call with a chosen time and follow-up date", async () => {
  const log = vi.fn((body: unknown) => anActivity({ id: 5, ...(body as object) }));
  fakeBackend({ "POST /activities": log });
  renderScreen(<ActivityForm parent={{ contact_id: 3 }} idPrefix="log" />);

  await userEvent.click(screen.getByRole("radio", { name: "Call" }));
  expect(screen.getByRole("radio", { name: "Call" })).toBeChecked();
  await userEvent.type(screen.getByLabelText("What happened"), "Discussed pricing");
  fireEvent.change(screen.getByLabelText("When"), { target: { value: "2026-11-18T14:30" } });
  fireEvent.change(screen.getByLabelText("Follow-up date (optional)"), {
    target: { value: "2026-11-25" },
  });
  await userEvent.click(screen.getByRole("button", { name: "Log activity" }));

  await waitFor(() => expect(log).toHaveBeenCalled());
  expect(log.mock.calls[0][0]).toEqual({
    type: "call",
    description: "Discussed pricing",
    occurred_at: new Date("2026-11-18T14:30").toISOString(),
    follow_up_date: "2026-11-25",
    contact_id: 3,
  });
});

it("shows what's missing and sends nothing (V1)", async () => {
  const log = vi.fn();
  fakeBackend({ "POST /activities": log });
  renderScreen(<ActivityForm parent={{ contact_id: 3 }} idPrefix="log" />);

  fireEvent.change(screen.getByLabelText("When"), { target: { value: "" } });
  await userEvent.click(screen.getByRole("button", { name: "Log activity" }));

  expect(await screen.findAllByText("Required")).toHaveLength(2);
  expect(screen.getByLabelText("What happened")).toHaveAttribute("aria-invalid", "true");
  expect(screen.getByLabelText("When")).toHaveAttribute("aria-invalid", "true");
  expect(log).not.toHaveBeenCalled();
});

it("shows the server's message next to the field it is about (V5)", async () => {
  fakeBackend({
    "POST /activities": {
      status: 422,
      detail: [{ loc: ["body", "follow_up_date"], msg: "Follow-up can't be in the past" }],
    },
  });
  renderScreen(<ActivityForm parent={{ contact_id: 3 }} idPrefix="log" />);

  await userEvent.type(screen.getByLabelText("What happened"), "Call");
  await userEvent.click(screen.getByRole("button", { name: "Log activity" }));

  expect(await screen.findByText("Follow-up can't be in the past")).toBeInTheDocument();
  expect(screen.getByLabelText("What happened")).toHaveValue("Call");
});

it("shows any other server error as a toast and keeps what was typed", async () => {
  fakeBackend({ "POST /activities": { status: 500, detail: "Database is down" } });
  const onDone = vi.fn();
  renderScreen(<ActivityForm parent={{ contact_id: 3 }} idPrefix="log" onDone={onDone} />);

  await userEvent.type(screen.getByLabelText("What happened"), "Call");
  await userEvent.click(screen.getByRole("button", { name: "Log activity" }));

  await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Database is down"));
  expect(onDone).not.toHaveBeenCalled();
  expect(screen.getByLabelText("What happened")).toHaveValue("Call");
});

const CALL = anActivity({
  id: 8,
  type: "call",
  description: "Discussed pricing",
  occurred_at: new Date("2026-11-18T14:30").toISOString(),
  follow_up_date: "2026-11-25",
});

it("edits an activity in a dialog, sending only what changed", async () => {
  const update = vi.fn((body: unknown) => ({ ...CALL, ...(body as object) }));
  fakeBackend({ "PATCH /activities/8": update });
  const onClose = vi.fn();
  renderScreen(<ActivityFormDialog activity={CALL} onClose={onClose} />);

  expect(screen.getByRole("dialog", { name: "Edit activity" })).toBeInTheDocument();
  expect(screen.getByRole("radio", { name: "Call" })).toBeChecked();
  expect(screen.getByLabelText("When")).toHaveValue("2026-11-18T14:30");
  expect(screen.getByLabelText("Follow-up date (optional)")).toHaveValue("2026-11-25");
  const description = screen.getByLabelText("What happened");
  await userEvent.clear(description);
  await userEvent.type(description, "Agreed pricing");
  await userEvent.click(screen.getByRole("button", { name: "Save activity" }));

  await waitFor(() => expect(onClose).toHaveBeenCalled());
  expect(update.mock.calls[0][0]).toEqual({ description: "Agreed pricing" });
  expect(toast.success).toHaveBeenCalledWith("Activity saved");
});

it("closes the edit without calling the server when nothing changed", async () => {
  const fetchMock = fakeBackend({});
  const onClose = vi.fn();
  renderScreen(<ActivityFormDialog activity={CALL} onClose={onClose} />);

  await userEvent.click(screen.getByRole("button", { name: "Save activity" }));

  await waitFor(() => expect(onClose).toHaveBeenCalled());
  expect(fetchMock).not.toHaveBeenCalled();
  expect(toast.success).toHaveBeenCalledWith("Activity saved");
});

it("closes the edit on Cancel", async () => {
  fakeBackend({});
  const onClose = vi.fn();
  renderScreen(<ActivityFormDialog activity={CALL} onClose={onClose} />);

  await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(onClose).toHaveBeenCalled();
});

it("closes the edit with Escape", async () => {
  fakeBackend({});
  const onClose = vi.fn();
  renderScreen(<ActivityFormDialog activity={CALL} onClose={onClose} />);

  await userEvent.keyboard("{Escape}");
  expect(onClose).toHaveBeenCalled();
});

it("shows no dialog without an activity", () => {
  fakeBackend({});
  renderScreen(<ActivityFormDialog activity={null} onClose={() => {}} />);
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});
