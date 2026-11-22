import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { afterEach, expect, it, vi } from "vitest";
import { aContact, anOrganization } from "../../test/fixtures";
import { fakeBackend, renderScreen } from "../../test/render";
import { ContactFormDialog } from "./ContactForm";

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

const ORGANIZATIONS = [
  anOrganization({ id: 1, name: "Cedar Health" }),
  anOrganization({ id: 2, name: "Lumen Retail" }),
];

it("adds a contact with what the user typed and picked (C1)", async () => {
  const create = vi.fn((body: unknown) => aContact({ id: 9, ...(body as object) }));
  fakeBackend({ "GET /organizations": ORGANIZATIONS, "POST /contacts": create });
  const onOpenChange = vi.fn();
  const onSaved = vi.fn();
  renderScreen(<ContactFormDialog open onOpenChange={onOpenChange} onSaved={onSaved} />);

  expect(screen.getByRole("dialog", { name: "Add contact" })).toBeInTheDocument();
  await userEvent.type(await screen.findByLabelText("Name"), "Ben Fletcher");
  await userEvent.type(screen.getByLabelText("Email"), "ben@lumen.com");
  await userEvent.type(screen.getByLabelText("Job title"), "Buyer");
  await userEvent.selectOptions(screen.getByLabelText("Organization"), "Lumen Retail");
  await userEvent.selectOptions(screen.getByLabelText("Status"), "Qualified");
  await userEvent.click(screen.getByRole("button", { name: "Add contact" }));

  await waitFor(() => expect(onSaved).toHaveBeenCalled());
  expect(create.mock.calls[0][0]).toEqual({
    name: "Ben Fletcher",
    email: "ben@lumen.com",
    phone: null,
    job_title: "Buyer",
    organization_id: 2,
    status: "qualified",
  });
  expect(onSaved.mock.calls[0][0]).toMatchObject({ id: 9, name: "Ben Fletcher" });
  expect(onOpenChange).toHaveBeenCalledWith(false);
  expect(toast.success).toHaveBeenCalledWith("Contact added");
});

it("starts a new contact with the given organization", async () => {
  fakeBackend({ "GET /organizations": ORGANIZATIONS });
  renderScreen(
    <ContactFormDialog open onOpenChange={() => {}} initial={{ organization_id: "2" }} />,
  );
  expect(await screen.findByLabelText("Organization")).toHaveDisplayValue("Lumen Retail");
  expect(screen.getByLabelText("Status")).toHaveDisplayValue("Lead");
});

it("shows what's wrong and sends nothing when the form is invalid (V1, V2)", async () => {
  const create = vi.fn();
  fakeBackend({ "GET /organizations": ORGANIZATIONS, "POST /contacts": create });
  renderScreen(<ContactFormDialog open onOpenChange={() => {}} />);

  await userEvent.type(await screen.findByLabelText("Email"), "ana@acme");
  await userEvent.click(screen.getByRole("button", { name: "Add contact" }));

  expect(await screen.findByText("Required")).toBeInTheDocument();
  expect(screen.getByLabelText("Name")).toHaveAttribute("aria-invalid", "true");
  expect(screen.getByText("Enter an email such as name@company.com")).toBeInTheDocument();
  expect(create).not.toHaveBeenCalled();
});

it("edits a contact, sending only the fields that changed", async () => {
  const contact = aContact({
    id: 4,
    name: "Ana Ruiz",
    email: "ana@cedar.com",
    phone: "555 0100",
    job_title: "CTO",
    organization_id: 1,
    organization_name: "Cedar Health",
    status: "customer",
  });
  const update = vi.fn((body: unknown) => ({ ...contact, ...(body as object) }));
  fakeBackend({ "GET /organizations": ORGANIZATIONS, "PATCH /contacts/4": update });
  const onOpenChange = vi.fn();
  renderScreen(<ContactFormDialog open onOpenChange={onOpenChange} contact={contact} />);

  expect(screen.getByRole("dialog", { name: "Edit Ana Ruiz" })).toBeInTheDocument();
  const phone = await screen.findByLabelText("Phone");
  expect(phone).toHaveValue("555 0100");
  expect(screen.getByLabelText("Organization")).toHaveDisplayValue("Cedar Health");
  expect(screen.getByLabelText("Status")).toHaveDisplayValue("Customer");
  await userEvent.clear(phone);
  await userEvent.type(phone, "555 0199");
  await userEvent.click(screen.getByRole("button", { name: "Save contact" }));

  await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  expect(update.mock.calls[0][0]).toEqual({ phone: "555 0199" });
  expect(toast.success).toHaveBeenCalledWith("Contact saved");
});

it("closes without calling the server when nothing changed", async () => {
  const contact = aContact({ id: 4 });
  const fetchMock = fakeBackend({ "GET /organizations": ORGANIZATIONS });
  const onSaved = vi.fn();
  renderScreen(
    <ContactFormDialog open onOpenChange={() => {}} contact={contact} onSaved={onSaved} />,
  );

  await userEvent.click(await screen.findByRole("button", { name: "Save contact" }));

  await waitFor(() => expect(onSaved).toHaveBeenCalledWith(contact));
  const methods = fetchMock.mock.calls.map(([, init]) => init?.method ?? "GET");
  expect(methods.filter((m) => m !== "GET")).toEqual([]);
});

it("shows the server's message next to the field it is about (V5)", async () => {
  fakeBackend({
    "GET /organizations": ORGANIZATIONS,
    "POST /contacts": {
      status: 422,
      detail: [{ loc: ["body", "email"], msg: "That email is already in use" }],
    },
  });
  renderScreen(<ContactFormDialog open onOpenChange={() => {}} />);

  await userEvent.type(await screen.findByLabelText("Name"), "Ana");
  await userEvent.type(screen.getByLabelText("Email"), "ana@cedar.com");
  await userEvent.click(screen.getByRole("button", { name: "Add contact" }));

  expect(await screen.findByText("That email is already in use")).toBeInTheDocument();
  expect(screen.getByLabelText("Email")).toHaveAttribute("aria-invalid", "true");
});

it("shows any other server error as a toast", async () => {
  fakeBackend({
    "GET /organizations": ORGANIZATIONS,
    "POST /contacts": { status: 500, detail: "Database is down" },
  });
  const onOpenChange = vi.fn();
  renderScreen(<ContactFormDialog open onOpenChange={onOpenChange} />);

  await userEvent.type(await screen.findByLabelText("Name"), "Ana");
  await userEvent.click(screen.getByRole("button", { name: "Add contact" }));

  await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Database is down"));
  expect(onOpenChange).not.toHaveBeenCalled();
});

it("closes on Cancel", async () => {
  fakeBackend({ "GET /organizations": ORGANIZATIONS });
  const onOpenChange = vi.fn();
  renderScreen(<ContactFormDialog open onOpenChange={onOpenChange} />);

  await userEvent.click(await screen.findByRole("button", { name: "Cancel" }));
  expect(onOpenChange).toHaveBeenCalledWith(false);
});

it("waits for the organizations before showing the form", async () => {
  fakeBackend({ "GET /organizations": ORGANIZATIONS });
  renderScreen(<ContactFormDialog open onOpenChange={() => {}} />);
  expect(screen.getByText("Loading…")).toBeInTheDocument();
  expect(await screen.findByLabelText("Name")).toBeInTheDocument();
});
