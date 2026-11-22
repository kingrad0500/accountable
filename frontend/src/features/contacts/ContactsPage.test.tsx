import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { afterEach, expect, it, vi } from "vitest";
import { aContact, anOrganization } from "../../test/fixtures";
import { fakeBackend, renderScreen } from "../../test/render";
import { ContactsPage } from "./ContactsPage";

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

const CONTACTS = [
  aContact({
    id: 1,
    name: "Ana Ruiz",
    email: "ana@cedar.com",
    phone: "555 0100",
    job_title: "CTO",
    organization_id: 7,
    organization_name: "Cedar Health",
    status: "customer",
  }),
  aContact({ id: 2, name: "Ben Fletcher", status: "lead" }),
  aContact({ id: 3, name: "Chloe Nguyen", status: "qualified" }),
];

const names = () =>
  screen.getAllByTestId("table-row").map((r) => within(r).getAllByRole("cell")[0].textContent);

it("lists contacts with their organization, details and status (C2)", async () => {
  fakeBackend({ "GET /contacts": CONTACTS });
  renderScreen(<ContactsPage />, { path: "/contacts" });

  expect(await screen.findByRole("link", { name: "Ana Ruiz" })).toHaveAttribute(
    "href",
    "/contacts/1",
  );
  expect(names()).toEqual(["Ana Ruiz", "Ben Fletcher", "Chloe Nguyen"]);
  expect(screen.getByRole("link", { name: "Cedar Health" })).toHaveAttribute(
    "href",
    "/organizations/7",
  );
  expect(screen.getByRole("link", { name: "ana@cedar.com" })).toHaveAttribute(
    "href",
    "mailto:ana@cedar.com",
  );
  expect(screen.getByText("555 0100")).toBeInTheDocument();
  const ben = screen.getAllByTestId("table-row")[1];
  expect(within(ben).getByText("None")).toBeInTheDocument();
  expect(document.title).toBe("Contacts · Accountable");
});

it("searches by organization, job title, email and phone (T1)", async () => {
  fakeBackend({ "GET /contacts": CONTACTS });
  renderScreen(<ContactsPage />, { path: "/contacts" });
  await screen.findByRole("link", { name: "Ana Ruiz" });

  const search = screen.getByRole("searchbox", { name: "Search contacts" });
  for (const query of ["cedar", "cto", "ana@", "0100"]) {
    await userEvent.clear(search);
    await userEvent.type(search, query);
    await screen.findByText("Showing 1 of 3 contacts");
    expect(names()).toEqual(["Ana Ruiz"]);
  }
});

it("sorts the status column in pipeline order, not alphabetically", async () => {
  fakeBackend({ "GET /contacts": CONTACTS });
  renderScreen(<ContactsPage />, { path: "/contacts" });
  await screen.findByRole("link", { name: "Ana Ruiz" });

  const header = screen.getByRole("columnheader", { name: /Status/ });
  await userEvent.click(within(header).getByRole("button"));
  expect(names()).toEqual(["Ben Fletcher", "Chloe Nguyen", "Ana Ruiz"]);
  await userEvent.click(within(header).getByRole("button"));
  expect(names()).toEqual(["Ana Ruiz", "Chloe Nguyen", "Ben Fletcher"]);
});

it("filters by status, with a count for each (C2)", async () => {
  fakeBackend({ "GET /contacts": CONTACTS });
  const { router } = renderScreen(<ContactsPage />, { path: "/contacts" });
  await screen.findByRole("link", { name: "Ana Ruiz" });

  const filter = screen.getByRole("combobox", { name: "Status" });
  expect(
    within(filter)
      .getAllByRole("option")
      .map((o) => o.textContent),
  ).toEqual(["All (3)", "Lead (1)", "Qualified (1)", "Customer (1)"]);
  await userEvent.selectOptions(filter, "qualified");
  expect(names()).toEqual(["Chloe Nguyen"]);
  expect(router.state.location.search).toBe("?status=qualified");

  await userEvent.selectOptions(filter, "all");
  expect(names()).toHaveLength(3);
  expect(router.state.location.search).toBe("");
});

it("reads the status filter from the address", async () => {
  fakeBackend({ "GET /contacts": CONTACTS });
  renderScreen(<ContactsPage />, { path: "/contacts?status=customer", pattern: "/contacts" });
  await screen.findByRole("link", { name: "Ana Ruiz" });
  expect(names()).toEqual(["Ana Ruiz"]);
});

it("shows every contact for a status it doesn't know", async () => {
  fakeBackend({ "GET /contacts": CONTACTS });
  renderScreen(<ContactsPage />, { path: "/contacts?status=vip", pattern: "/contacts" });
  await screen.findByRole("link", { name: "Ana Ruiz" });
  expect(names()).toHaveLength(3);
  expect(screen.getByRole("combobox", { name: "Status" })).toHaveValue("all");
});

it("says when a filter matches nothing", async () => {
  fakeBackend({ "GET /contacts": [CONTACTS[1]] });
  renderScreen(<ContactsPage />, { path: "/contacts?status=customer", pattern: "/contacts" });
  expect(await screen.findByText("No contacts match this filter")).toBeInTheDocument();
});

it("opens an empty form from Add contact", async () => {
  fakeBackend({ "GET /contacts": CONTACTS, "GET /organizations": [] });
  renderScreen(<ContactsPage />, { path: "/contacts" });
  await screen.findByRole("link", { name: "Ana Ruiz" });

  await userEvent.click(screen.getByRole("button", { name: "Add contact" }));
  const dialog = screen.getByRole("dialog", { name: "Add contact" });
  expect(await within(dialog).findByLabelText("Name")).toHaveValue("");

  await userEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
});

it("edits a contact from its row", async () => {
  fakeBackend({
    "GET /contacts": CONTACTS,
    "GET /organizations": [anOrganization({ id: 7, name: "Cedar Health" })],
  });
  renderScreen(<ContactsPage />, { path: "/contacts" });

  await userEvent.click(await screen.findByRole("button", { name: "Edit Ana Ruiz" }));
  const dialog = screen.getByRole("dialog", { name: "Edit Ana Ruiz" });
  expect(await within(dialog).findByLabelText("Job title")).toHaveValue("CTO");
});

it("deletes a contact from its row after asking (D1)", async () => {
  const remove = vi.fn(() => undefined);
  fakeBackend({
    "GET /contacts": CONTACTS,
    "GET /contacts/2/delete-impact": { activities: 0, deals: 0 },
    "DELETE /contacts/2": remove,
  });
  renderScreen(<ContactsPage />, { path: "/contacts" });

  await userEvent.click(await screen.findByRole("button", { name: "Delete Ben Fletcher" }));
  const dialog = screen.getByRole("alertdialog", { name: "Delete Ben Fletcher?" });
  expect(await within(dialog).findByText("Ben Fletcher has no activities.")).toBeInTheDocument();
  await userEvent.click(within(dialog).getByRole("button", { name: "Delete" }));

  await waitFor(() => expect(remove).toHaveBeenCalled());
  expect(toast.success).toHaveBeenCalledWith("Contact deleted");
  await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
});
