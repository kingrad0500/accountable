import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { afterEach, expect, it, vi } from "vitest";
import {
  aContact,
  aDeal,
  anActivity,
  anOrganization,
  anOrganizationDetail,
  aStageChange,
} from "../../test/fixtures";
import { fakeBackend, renderScreen } from "../../test/render";
import { OrganizationPage } from "./OrganizationPage";

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

const CEDAR = anOrganizationDetail({
  id: 7,
  name: "Cedar Health",
  website: "cedar.com",
  industry: "Healthcare",
  notes: "Prefers email.",
  contact_count: 1,
  open_deal_count: 1,
  open_value: 12500,
  contacts: [aContact({ id: 3, name: "Ana Ruiz", job_title: "CTO", organization_id: 7 })],
  deals: [aDeal({ id: 11, name: "Clinic portal", organization_id: 7 })],
  timeline: [
    anActivity({ id: 21, description: "Called Ana", contact_id: 3, contact_name: "Ana Ruiz" }),
    aStageChange({ id: 22, deal_id: 11, deal_name: "Clinic portal" }),
  ],
});

const open = () =>
  renderScreen(<OrganizationPage />, { path: "/organizations/7", pattern: "/organizations/:id" });

it("shows the organization's details, contacts, deals and one timeline (O2)", async () => {
  fakeBackend({ "GET /organizations/7": CEDAR });
  open();

  expect(screen.getByText("Loading…")).toBeInTheDocument();
  expect(
    await screen.findByRole("heading", { level: 1, name: "Cedar Health" }),
  ).toBeInTheDocument();
  expect(screen.getByText("Healthcare")).toBeInTheDocument();
  expect(screen.getByText("Prefers email.")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "cedar.com" })).toHaveAttribute(
    "href",
    "https://cedar.com",
  );
  expect(screen.getByText(/12,500/)).toBeInTheDocument();

  const contacts = screen.getByRole("region", { name: "Contacts" });
  expect(within(contacts).getByRole("link", { name: "Ana Ruiz" })).toHaveAttribute(
    "href",
    "/contacts/3",
  );
  expect(within(contacts).getByText("CTO")).toBeInTheDocument();
  const deals = screen.getByRole("region", { name: "Deals" });
  expect(within(deals).getByRole("link", { name: "Clinic portal" })).toHaveAttribute(
    "href",
    "/deals/11",
  );

  const timeline = screen.getByRole("list", { name: "Timeline" });
  expect(within(timeline).getByText("Called Ana")).toBeInTheDocument();
  expect(within(timeline).getByRole("link", { name: "Clinic portal" })).toBeInTheDocument();
  // An organization's timeline has no composer: activities belong to a contact or deal.
  expect(screen.queryByRole("button", { name: "Log activity" })).not.toBeInTheDocument();
});

it("says when the organization has nothing linked", async () => {
  fakeBackend({ "GET /organizations/7": anOrganizationDetail({ id: 7, name: "Atlas Freight" }) });
  open();

  expect(await screen.findByText("No contacts.")).toBeInTheDocument();
  expect(screen.getByText("No deals.")).toBeInTheDocument();
  // Only the website is missing from the header's facts.
  expect(screen.getAllByText("None")).toHaveLength(1);
});

it("says when the organization doesn't exist", async () => {
  fakeBackend({});
  open();
  expect(
    await screen.findByRole("heading", { name: "This organization doesn't exist" }),
  ).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Organizations" })).toHaveAttribute(
    "href",
    "/organizations",
  );
});

it("adds a contact already linked to the organization", async () => {
  fakeBackend({
    "GET /organizations/7": CEDAR,
    "GET /organizations": [anOrganization({ id: 7, name: "Cedar Health" })],
  });
  open();

  await userEvent.click(await screen.findByRole("button", { name: "Add contact" }));
  const dialog = screen.getByRole("dialog", { name: "Add contact" });
  expect(await within(dialog).findByLabelText("Organization")).toHaveDisplayValue("Cedar Health");

  await userEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
});

it("adds a deal already linked to the organization", async () => {
  fakeBackend({
    "GET /organizations/7": CEDAR,
    "GET /organizations": [anOrganization({ id: 7, name: "Cedar Health" })],
    "GET /contacts": [],
  });
  open();

  await userEvent.click(await screen.findByRole("button", { name: "Add deal" }));
  const dialog = screen.getByRole("dialog", { name: "Add deal" });
  expect(await within(dialog).findByLabelText("Organization")).toHaveDisplayValue("Cedar Health");

  await userEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
});

it("opens the edit form from Edit", async () => {
  fakeBackend({ "GET /organizations/7": CEDAR });
  open();

  await userEvent.click(await screen.findByRole("button", { name: "Edit" }));
  const dialog = screen.getByRole("dialog", { name: "Edit Cedar Health" });
  expect(within(dialog).getByLabelText("Notes")).toHaveValue("Prefers email.");
});

it("deletes the organization and goes back to the list (D1)", async () => {
  const remove = vi.fn(() => undefined);
  fakeBackend({
    "GET /organizations/7": CEDAR,
    "GET /organizations/7/delete-impact": { contacts: 1, deals: 1 },
    "DELETE /organizations/7": remove,
  });
  const { router } = open();

  await userEvent.click(await screen.findByRole("button", { name: "Delete" }));
  const dialog = screen.getByRole("alertdialog", { name: "Delete Cedar Health?" });
  await within(dialog).findByText("Its 1 contact and 1 deal will be kept, with no organization.");
  await userEvent.click(within(dialog).getByRole("button", { name: "Delete" }));

  await waitFor(() => expect(router.state.location.pathname).toBe("/organizations"));
  expect(remove).toHaveBeenCalled();
  expect(toast.success).toHaveBeenCalledWith("Organization deleted");
});
