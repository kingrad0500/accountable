import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { afterEach, expect, it, vi } from "vitest";
import { anOrganization } from "../../test/fixtures";
import { fakeBackend, renderScreen } from "../../test/render";
import { OrganizationsPage, websiteHref } from "./OrganizationsPage";

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

const ORGANIZATIONS = [
  anOrganization({
    id: 1,
    name: "Cedar Health",
    website: "cedar.com",
    industry: "Healthcare",
    contact_count: 4,
    open_deal_count: 2,
    open_value: 12500,
  }),
  anOrganization({ id: 2, name: "Lumen Retail", website: "https://lumen.com" }),
  anOrganization({ id: 3, name: "Atlas Freight" }),
];

const names = () =>
  screen.getAllByTestId("table-row").map((r) => within(r).getAllByRole("cell")[0].textContent);

it("links a website whether or not it starts with http", () => {
  expect(websiteHref("acme.com")).toBe("https://acme.com");
  expect(websiteHref("http://acme.com")).toBe("http://acme.com");
  expect(websiteHref("HTTPS://acme.com")).toBe("HTTPS://acme.com");
});

it("lists organizations by name with their figures (O1)", async () => {
  fakeBackend({ "GET /organizations": ORGANIZATIONS });
  renderScreen(<OrganizationsPage />, { path: "/organizations" });

  expect(await screen.findByRole("link", { name: "Cedar Health" })).toHaveAttribute(
    "href",
    "/organizations/1",
  );
  expect(names()).toEqual(["Atlas Freight", "Cedar Health", "Lumen Retail"]);
  const cedar = screen.getAllByTestId("table-row")[1];
  expect(within(cedar).getByText("Healthcare")).toBeInTheDocument();
  expect(within(cedar).getByRole("link", { name: "cedar.com" })).toHaveAttribute(
    "href",
    "https://cedar.com",
  );
  expect(within(cedar).getByText("4")).toBeInTheDocument();
  expect(within(cedar).getByText("2")).toBeInTheDocument();
  expect(within(cedar).getByText(/12,500/)).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "https://lumen.com" })).toHaveAttribute(
    "href",
    "https://lumen.com",
  );
  expect(document.title).toBe("Organizations · Accountable");
});

it("searches by industry and website (T1)", async () => {
  fakeBackend({ "GET /organizations": ORGANIZATIONS });
  renderScreen(<OrganizationsPage />, { path: "/organizations" });
  await screen.findByRole("link", { name: "Cedar Health" });

  const search = screen.getByRole("searchbox", { name: "Search organizations" });
  await userEvent.type(search, "health");
  await screen.findByText("Showing 1 of 3 organizations");
  expect(names()).toEqual(["Cedar Health"]);
  await userEvent.clear(search);
  await userEvent.type(search, "lumen.com");
  await waitFor(() => expect(names()).toEqual(["Lumen Retail"]));
});

it("says when there are no organizations yet", async () => {
  fakeBackend({ "GET /organizations": [] });
  renderScreen(<OrganizationsPage />, { path: "/organizations" });
  expect(await screen.findByText("No organizations yet")).toBeInTheDocument();
});

it("opens an empty form from Add organization", async () => {
  fakeBackend({ "GET /organizations": ORGANIZATIONS });
  renderScreen(<OrganizationsPage />, { path: "/organizations" });
  await screen.findByRole("link", { name: "Cedar Health" });

  await userEvent.click(screen.getByRole("button", { name: "Add organization" }));
  const dialog = screen.getByRole("dialog", { name: "Add organization" });
  expect(within(dialog).getByLabelText("Name")).toHaveValue("");

  await userEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
});

it("edits an organization from its row", async () => {
  fakeBackend({ "GET /organizations": ORGANIZATIONS });
  renderScreen(<OrganizationsPage />, { path: "/organizations" });

  await userEvent.click(await screen.findByRole("button", { name: "Edit Cedar Health" }));
  const dialog = screen.getByRole("dialog", { name: "Edit Cedar Health" });
  expect(within(dialog).getByLabelText("Website")).toHaveValue("cedar.com");
});

it("deletes an organization from its row after asking (D1)", async () => {
  const remove = vi.fn(() => undefined);
  fakeBackend({
    "GET /organizations": ORGANIZATIONS,
    "GET /organizations/3/delete-impact": { contacts: 0, deals: 0 },
    "DELETE /organizations/3": remove,
  });
  renderScreen(<OrganizationsPage />, { path: "/organizations" });

  await userEvent.click(await screen.findByRole("button", { name: "Delete Atlas Freight" }));
  const dialog = screen.getByRole("alertdialog", { name: "Delete Atlas Freight?" });
  expect(await within(dialog).findByText("It has no contacts or deals.")).toBeInTheDocument();
  await userEvent.click(within(dialog).getByRole("button", { name: "Delete" }));

  await waitFor(() => expect(remove).toHaveBeenCalled());
  expect(toast.success).toHaveBeenCalledWith("Organization deleted");
});
