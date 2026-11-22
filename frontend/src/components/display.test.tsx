import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Field } from "./Field";
import { Money } from "./Money";
import { FilterSelect, PageTitle } from "./PageTitle";
import { Pill } from "./Pill";

describe("Pill", () => {
  it("names a stage", () => {
    render(<Pill kind="stage" value="negotiation" />);
    expect(screen.getByText("Negotiation")).toBeInTheDocument();
  });

  it("names a contact status", () => {
    render(<Pill kind="status" value="customer" />);
    expect(screen.getByText("Customer")).toBeInTheDocument();
  });

  it("labels a late deal", () => {
    render(<Pill kind="late" />);
    expect(screen.getByText("Late")).toBeInTheDocument();
  });
});

describe("Money", () => {
  it("shows the full amount", () => {
    render(<Money value={12500} />);
    expect(screen.getByText("$12,500")).not.toHaveAttribute("title");
  });

  it("shows a short amount, with the full one on hover", () => {
    render(<Money value={1_250_000} short />);
    expect(screen.getByText("$1.25M")).toHaveAttribute("title", "$1,250,000 USD");
  });
});

describe("Field", () => {
  it("labels its control", () => {
    render(
      <Field id="name" label="Name">
        <input />
      </Field>,
    );
    const input = screen.getByLabelText("Name");
    expect(input).toBeValid();
    expect(input).not.toHaveAccessibleDescription();
  });

  it("shows its error and marks the control invalid", () => {
    render(
      <Field id="name" label="Name" error="Name is required">
        <input />
      </Field>,
    );
    const input = screen.getByLabelText("Name");
    expect(input).toBeInvalid();
    expect(input).toHaveAccessibleDescription("Name is required");
  });
});

describe("PageTitle", () => {
  it("shows the heading, its controls and sets the tab title", () => {
    render(
      <PageTitle title="Deals">
        <button type="button">Export</button>
      </PageTitle>,
    );
    expect(screen.getByRole("heading", { level: 1, name: "Deals" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Export" })).toBeInTheDocument();
    expect(document.title).toBe("Deals · Accountable");
  });

  it("can be there for screen readers only", () => {
    render(
      <PageTitle title="Pipeline" hidden>
        <button type="button">Export</button>
      </PageTitle>,
    );
    expect(screen.getByRole("heading", { level: 1, name: "Pipeline" })).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(document.title).toBe("Pipeline · Accountable");
  });
});

describe("FilterSelect", () => {
  const options = [
    { value: "all", label: "All stages" },
    { value: "won", label: "Won", count: 4 },
  ] as const;

  it("lists its options, with counts, and reports a choice", async () => {
    const onChange = vi.fn();
    render(
      <FilterSelect label="Stage" value="all" onChange={onChange} options={[...options]} onPage />,
    );
    const select = screen.getByRole("combobox", { name: /Stage/ });
    expect(screen.getByRole("option", { name: "Won (4)" })).toBeInTheDocument();
    await userEvent.selectOptions(select, "won");
    expect(onChange).toHaveBeenCalledWith("won");
  });

  it("shows the current value", () => {
    render(<FilterSelect label="Stage" value="won" onChange={vi.fn()} options={[...options]} />);
    expect(screen.getByRole("combobox", { name: /Stage/ })).toHaveValue("won");
  });
});
