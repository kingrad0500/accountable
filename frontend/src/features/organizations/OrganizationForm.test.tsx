import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { afterEach, expect, it, vi } from "vitest";
import { anOrganization } from "../../test/fixtures";
import { fakeBackend, renderScreen } from "../../test/render";
import { OrganizationFormDialog } from "./OrganizationForm";

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

it("adds an organization with what the user typed (O1)", async () => {
  const create = vi.fn((body: unknown) => anOrganization({ id: 5, ...(body as object) }));
  fakeBackend({ "POST /organizations": create });
  const onOpenChange = vi.fn();
  const onSaved = vi.fn();
  renderScreen(<OrganizationFormDialog open onOpenChange={onOpenChange} onSaved={onSaved} />);

  expect(screen.getByRole("dialog", { name: "Add organization" })).toBeInTheDocument();
  await userEvent.type(screen.getByLabelText("Name"), "Lumen Retail");
  await userEvent.type(screen.getByLabelText("Website"), "lumen.com");
  await userEvent.type(screen.getByLabelText("Industry"), "Retail");
  await userEvent.type(screen.getByLabelText("Notes"), "Met at the expo");
  await userEvent.click(screen.getByRole("button", { name: "Add organization" }));

  await waitFor(() => expect(onSaved).toHaveBeenCalled());
  expect(create.mock.calls[0][0]).toEqual({
    name: "Lumen Retail",
    website: "lumen.com",
    industry: "Retail",
    notes: "Met at the expo",
  });
  expect(onSaved.mock.calls[0][0]).toMatchObject({ id: 5, name: "Lumen Retail" });
  expect(onOpenChange).toHaveBeenCalledWith(false);
  expect(toast.success).toHaveBeenCalledWith("Organization added");
});

it("suggests the common industries", () => {
  fakeBackend({});
  renderScreen(<OrganizationFormDialog open onOpenChange={() => {}} />);
  const options = document.querySelectorAll("#industries option");
  expect([...options].map((o) => o.getAttribute("value"))).toContain("Healthcare");
  expect(screen.getByLabelText("Industry")).toHaveAttribute("list", "industries");
});

it("shows what's wrong and sends nothing when the form is invalid (V1, V2)", async () => {
  const create = vi.fn();
  fakeBackend({ "POST /organizations": create });
  renderScreen(<OrganizationFormDialog open onOpenChange={() => {}} />);

  await userEvent.type(screen.getByLabelText("Website"), "acme");
  await userEvent.click(screen.getByRole("button", { name: "Add organization" }));

  expect(await screen.findByText("Required")).toBeInTheDocument();
  expect(screen.getByText("Enter a website such as acme.com")).toBeInTheDocument();
  expect(create).not.toHaveBeenCalled();
});

it("edits an organization, sending only the fields that changed", async () => {
  const org = anOrganization({
    id: 2,
    name: "Cedar Health",
    website: "cedar.com",
    industry: "Healthcare",
    notes: "Old notes",
  });
  const update = vi.fn((body: unknown) => ({ ...org, ...(body as object) }));
  fakeBackend({ "PATCH /organizations/2": update });
  const onOpenChange = vi.fn();
  renderScreen(<OrganizationFormDialog open onOpenChange={onOpenChange} organization={org} />);

  expect(screen.getByRole("dialog", { name: "Edit Cedar Health" })).toBeInTheDocument();
  expect(screen.getByLabelText("Website")).toHaveValue("cedar.com");
  const notes = screen.getByLabelText("Notes");
  expect(notes).toHaveValue("Old notes");
  await userEvent.clear(notes);
  await userEvent.click(screen.getByRole("button", { name: "Save organization" }));

  await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  expect(update.mock.calls[0][0]).toEqual({ notes: null });
  expect(toast.success).toHaveBeenCalledWith("Organization saved");
});

it("closes without calling the server when nothing changed", async () => {
  const org = anOrganization({ id: 2 });
  const fetchMock = fakeBackend({});
  const onSaved = vi.fn();
  renderScreen(
    <OrganizationFormDialog open onOpenChange={() => {}} organization={org} onSaved={onSaved} />,
  );

  await userEvent.click(screen.getByRole("button", { name: "Save organization" }));

  await waitFor(() => expect(onSaved).toHaveBeenCalledWith(org));
  expect(fetchMock).not.toHaveBeenCalled();
});

it("shows the server's message next to the field it is about (V5)", async () => {
  fakeBackend({
    "POST /organizations": {
      status: 422,
      detail: [{ loc: ["body", "name"], msg: "An organization with this name exists" }],
    },
  });
  renderScreen(<OrganizationFormDialog open onOpenChange={() => {}} />);

  await userEvent.type(screen.getByLabelText("Name"), "Cedar Health");
  await userEvent.click(screen.getByRole("button", { name: "Add organization" }));

  expect(await screen.findByText("An organization with this name exists")).toBeInTheDocument();
  expect(screen.getByLabelText("Name")).toHaveAttribute("aria-invalid", "true");
});

it("shows any other server error as a toast", async () => {
  fakeBackend({ "POST /organizations": { status: 500, detail: "Database is down" } });
  renderScreen(<OrganizationFormDialog open onOpenChange={() => {}} />);

  await userEvent.type(screen.getByLabelText("Name"), "Cedar Health");
  await userEvent.click(screen.getByRole("button", { name: "Add organization" }));

  await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Database is down"));
});

it("closes on Cancel", async () => {
  fakeBackend({});
  const onOpenChange = vi.fn();
  renderScreen(<OrganizationFormDialog open onOpenChange={onOpenChange} />);

  await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(onOpenChange).toHaveBeenCalledWith(false);
});
