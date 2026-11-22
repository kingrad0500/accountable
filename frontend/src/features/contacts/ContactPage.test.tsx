import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { afterEach, expect, it, vi } from "vitest";
import { aContactDetail, aDeal, anActivity } from "../../test/fixtures";
import { fakeBackend, renderScreen } from "../../test/render";
import { ContactPage } from "./ContactPage";

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

const ANA = aContactDetail({
  id: 3,
  name: "Ana Ruiz",
  email: "ana@cedar.com",
  phone: "555 0100",
  job_title: "CTO",
  organization_id: 7,
  organization_name: "Cedar Health",
  status: "customer",
  deals: [aDeal({ id: 11, name: "Clinic portal", organization_name: "Cedar Health" })],
  timeline: [anActivity({ id: 21, description: "Called about the renewal", contact_id: 3 })],
});

const open = (contact = ANA) =>
  renderScreen(<ContactPage />, { path: `/contacts/${contact.id}`, pattern: "/contacts/:id" });

it("shows the contact's details, organization, deals and timeline (C3)", async () => {
  fakeBackend({ "GET /contacts/3": ANA });
  open();

  expect(screen.getByText("Loading…")).toBeInTheDocument();
  expect(await screen.findByRole("heading", { level: 1, name: "Ana Ruiz" })).toBeInTheDocument();
  expect(document.title).toBe("Ana Ruiz · Accountable");
  expect(screen.getByText("CTO")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "ana@cedar.com" })).toHaveAttribute(
    "href",
    "mailto:ana@cedar.com",
  );
  expect(screen.getByText("555 0100")).toBeInTheDocument();
  for (const link of screen.getAllByRole("link", { name: "Cedar Health" }))
    expect(link).toHaveAttribute("href", "/organizations/7");

  const deals = screen.getByRole("region", { name: "Deals" });
  expect(within(deals).getByRole("link", { name: "Clinic portal" })).toHaveAttribute(
    "href",
    "/deals/11",
  );
  expect(screen.getByText("Called about the renewal")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Contacts" })).toHaveAttribute("href", "/contacts");
});

it("says when the contact has no organization or details", async () => {
  fakeBackend({ "GET /contacts/4": aContactDetail({ id: 4, name: "Ben Fletcher" }) });
  renderScreen(<ContactPage />, { path: "/contacts/4", pattern: "/contacts/:id" });

  const organization = await screen.findByRole("region", { name: "Organization" });
  expect(within(organization).getByText("Not linked to an organization.")).toBeInTheDocument();
  expect(screen.getAllByText("None")).toHaveLength(4);
  expect(screen.getByText("No deals.")).toBeInTheDocument();
  expect(screen.getByText("Nothing has happened here yet.")).toBeInTheDocument();
});

it("says when the contact doesn't exist", async () => {
  fakeBackend({});
  renderScreen(<ContactPage />, { path: "/contacts/99", pattern: "/contacts/:id" });
  expect(
    await screen.findByRole("heading", { name: "This contact doesn't exist" }),
  ).toBeInTheDocument();
});

it("logs an activity against the contact (C4)", async () => {
  const log = vi.fn((body: unknown) => anActivity({ id: 30, ...(body as object) }));
  fakeBackend({ "GET /contacts/3": ANA, "POST /activities": log });
  open();

  await userEvent.type(await screen.findByLabelText("What happened"), "Lunch meeting");
  await userEvent.click(screen.getByRole("button", { name: "Log activity" }));

  await waitFor(() => expect(log).toHaveBeenCalled());
  expect(log.mock.calls[0][0]).toMatchObject({ description: "Lunch meeting", contact_id: 3 });
});

it("keeps a follow-up's tick in step with the server (A2)", async () => {
  let done = false;
  const contact = () =>
    aContactDetail({
      id: 3,
      timeline: [
        anActivity({ id: 21, contact_id: 3, follow_up_date: "2026-01-05", follow_up_done: done }),
      ],
    });
  fakeBackend({
    "GET /contacts/3": contact,
    "PATCH /activities/21": (body: unknown) => {
      done = (body as { follow_up_done: boolean }).follow_up_done;
      return contact().timeline[0];
    },
  });
  open();

  const box = await screen.findByRole("checkbox", { name: /Follow-up on .* done/ });
  await userEvent.click(box);
  await waitFor(() => expect(done).toBe(true));
  expect(box).toBeChecked();

  await userEvent.click(box);
  await waitFor(() => expect(done).toBe(false));
  await waitFor(() => expect(box).not.toBeChecked());
});

it("opens the edit form from Edit", async () => {
  fakeBackend({ "GET /contacts/3": ANA, "GET /organizations": [] });
  open();

  await userEvent.click(await screen.findByRole("button", { name: "Edit" }));
  const dialog = screen.getByRole("dialog", { name: "Edit Ana Ruiz" });
  expect(await within(dialog).findByLabelText("Name")).toHaveValue("Ana Ruiz");
});

it("deletes the contact and goes back to the list (D1)", async () => {
  const remove = vi.fn(() => undefined);
  fakeBackend({
    "GET /contacts/3": ANA,
    "GET /contacts/3/delete-impact": { activities: 1, deals: 1 },
    "DELETE /contacts/3": remove,
  });
  const { router } = open();

  await userEvent.click(await screen.findByRole("button", { name: "Delete" }));
  const dialog = screen.getByRole("alertdialog", { name: "Delete Ana Ruiz?" });
  await within(dialog).findByText(/1 activity or follow-up will be deleted/);
  await userEvent.click(within(dialog).getByRole("button", { name: "Delete" }));

  await waitFor(() => expect(router.state.location.pathname).toBe("/contacts"));
  expect(remove).toHaveBeenCalled();
  expect(toast.success).toHaveBeenCalledWith("Contact deleted");
});
