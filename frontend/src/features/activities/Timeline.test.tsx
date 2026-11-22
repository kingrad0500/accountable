import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { afterEach, expect, it, vi } from "vitest";
import { addDays, todayISO } from "../../lib/dates";
import { formatDateShort } from "../../lib/format";
import { anActivity, aStageChange } from "../../test/fixtures";
import { fakeBackend, renderScreen } from "../../test/render";
import { Timeline } from "./Timeline";

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

const today = todayISO();

const entries = () => screen.getAllByTestId("timeline-entry");

it("says when nothing has happened yet, with no composer when there is no parent", () => {
  fakeBackend({});
  renderScreen(<Timeline entries={[]} hereKind="organization" />);
  expect(screen.getByRole("heading", { name: "Timeline" })).toBeInTheDocument();
  expect(screen.getByText("Nothing has happened here yet.")).toBeInTheDocument();
  expect(screen.queryByLabelText("What happened")).not.toBeInTheDocument();
});

it("offers a composer above the timeline when given a parent (A1)", () => {
  fakeBackend({});
  renderScreen(<Timeline entries={[]} parent={{ contact_id: 3 }} hereKind="contact" />);
  expect(screen.getByRole("heading", { name: "Log activity" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Timeline" })).toBeInTheDocument();
  expect(screen.getByLabelText("What happened")).toBeInTheDocument();
});

it("shows activities and stage changes in the order given, with their type (A3)", () => {
  fakeBackend({});
  renderScreen(
    <Timeline
      entries={[
        anActivity({ id: 1, type: "email", description: "Sent the proposal" }),
        aStageChange({ id: 2, deal_id: 11, deal_name: "Clinic portal" }),
        anActivity({ id: 3, type: "call", description: "Intro call" }),
      ]}
      hereKind="organization"
    />,
  );
  const [first, second, third] = entries();
  expect(first).toHaveTextContent("Sent the proposal");
  expect(within(first).getByText("Email")).toBeInTheDocument();
  expect(second).toHaveTextContent("Clinic portal moved from Proposal to Negotiation");
  expect(within(second).getByRole("link", { name: "Clinic portal" })).toHaveAttribute(
    "href",
    "/deals/11",
  );
  expect(second).toHaveTextContent("Stage change ·");
  expect(third).toHaveTextContent("Intro call");
  expect(within(third).getByText("Call")).toBeInTheDocument();
});

it("doesn't link a stage change back to the deal it is on", () => {
  fakeBackend({});
  renderScreen(<Timeline entries={[aStageChange({ id: 2 })]} hereKind="deal" />);
  const [entry] = entries();
  expect(entry).toHaveTextContent("Moved from Proposal to Negotiation");
  expect(within(entry).queryByRole("link")).not.toBeInTheDocument();
});

it("links each activity to its contact or deal, unless the timeline is on that record", () => {
  const forContact = anActivity({
    id: 1,
    description: "Called Ana",
    contact_id: 3,
    contact_name: "Ana Ruiz",
  });
  const forDeal = anActivity({
    id: 2,
    description: "Sent contract",
    deal_id: 11,
    deal_name: "Clinic portal",
  });
  fakeBackend({});
  const { unmount } = renderScreen(
    <Timeline entries={[forContact, forDeal]} hereKind="organization" />,
  );
  expect(screen.getByRole("link", { name: "Ana Ruiz" })).toHaveAttribute("href", "/contacts/3");
  expect(screen.getByRole("link", { name: "Clinic portal" })).toHaveAttribute("href", "/deals/11");
  unmount();

  renderScreen(<Timeline entries={[forContact]} hereKind="contact" />);
  expect(screen.queryByRole("link", { name: "Ana Ruiz" })).not.toBeInTheDocument();
});

it("shows when a follow-up is due, flagging overdue ones (A2)", () => {
  const upcoming = addDays(today, 30);
  fakeBackend({});
  renderScreen(
    <Timeline
      entries={[
        anActivity({ id: 1, description: "Overdue", follow_up_date: addDays(today, -2) }),
        anActivity({ id: 2, description: "Due today", follow_up_date: today }),
        anActivity({ id: 3, description: "Later", follow_up_date: upcoming }),
        anActivity({
          id: 4,
          description: "Done late",
          follow_up_date: addDays(today, -2),
          follow_up_done: true,
        }),
        anActivity({ id: 5, description: "No follow-up" }),
      ]}
      hereKind="contact"
    />,
  );
  const [overdue, dueToday, later, doneLate, none] = entries();
  expect(overdue).toHaveTextContent("(overdue)");
  expect(within(overdue).getByRole("checkbox")).not.toBeChecked();
  expect(dueToday).toHaveTextContent("Follow up today");
  expect(later).toHaveTextContent(`Follow up ${formatDateShort(upcoming)}`);
  expect(later).not.toHaveTextContent("(overdue)");
  expect(doneLate).not.toHaveTextContent("(overdue)");
  expect(within(doneLate).getByRole("checkbox")).toBeChecked();
  expect(within(none).queryByRole("checkbox")).not.toBeInTheDocument();
});

it("marks a follow-up done at once and saves it (A2)", async () => {
  const save = vi.fn((body: unknown) => anActivity({ id: 1, ...(body as object) }));
  fakeBackend({ "PATCH /activities/1": save });
  renderScreen(
    <Timeline
      entries={[anActivity({ id: 1, follow_up_date: addDays(today, -1) })]}
      hereKind="contact"
    />,
  );
  const box = screen.getByRole("checkbox");
  await userEvent.click(box);

  expect(box).toBeChecked();
  expect(entries()[0]).not.toHaveTextContent("(overdue)");
  await waitFor(() => expect(save).toHaveBeenCalled());
  expect(save.mock.calls[0][0]).toEqual({ follow_up_done: true });
});

it("puts the follow-up back when the server refuses", async () => {
  fakeBackend({ "PATCH /activities/1": { status: 500, detail: "Database is down" } });
  renderScreen(
    <Timeline entries={[anActivity({ id: 1, follow_up_date: today })]} hereKind="contact" />,
  );
  const box = screen.getByRole("checkbox");
  await userEvent.click(box);

  await waitFor(() => expect(box).not.toBeChecked());
});

it("edits an activity in a dialog", async () => {
  const update = vi.fn((body: unknown) => anActivity({ id: 1, ...(body as object) }));
  fakeBackend({ "PATCH /activities/1": update });
  renderScreen(
    <Timeline
      entries={[anActivity({ id: 1, type: "call", description: "Intro call" })]}
      hereKind="contact"
    />,
  );

  await userEvent.click(screen.getByRole("button", { name: "Edit call: Intro call" }));
  const dialog = screen.getByRole("dialog", { name: "Edit activity" });
  const description = within(dialog).getByLabelText("What happened");
  expect(description).toHaveValue("Intro call");
  await userEvent.type(description, " and demo");
  await userEvent.click(within(dialog).getByRole("button", { name: "Save activity" }));

  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(update.mock.calls[0][0]).toEqual({ description: "Intro call and demo" });
});

it("deletes an activity after asking (D1)", async () => {
  const remove = vi.fn(() => undefined);
  fakeBackend({ "DELETE /activities/1": remove });
  renderScreen(
    <Timeline
      entries={[
        anActivity({
          id: 1,
          type: "email",
          description: "Sent the proposal",
          occurred_at: "2026-11-12T10:00:00Z",
        }),
      ]}
      hereKind="contact"
    />,
  );

  await userEvent.click(screen.getByRole("button", { name: "Delete email: Sent the proposal" }));
  const dialog = screen.getByRole("alertdialog", { name: "Delete this email from 12 Nov 2026?" });
  await userEvent.click(within(dialog).getByRole("button", { name: "Delete" }));

  await waitFor(() => expect(remove).toHaveBeenCalled());
  expect(toast.success).toHaveBeenCalledWith("Activity deleted");
  await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
});
