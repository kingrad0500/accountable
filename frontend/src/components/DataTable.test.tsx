import { useState } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ColumnDef } from "@tanstack/react-table";
import { describe, expect, it, vi } from "vitest";
import { DataTable } from "./DataTable";

type Person = { id: number; name: string; org: string; status: string; value: number };

const PEOPLE: Person[] = [
  { id: 1, name: "Ana Ruiz", org: "Cedar Health", status: "lead", value: 300 },
  { id: 2, name: "Ben Fletcher", org: "Tallow & Finch", status: "customer", value: 100 },
  { id: 3, name: "Chloe Nguyen", org: "Lumen Retail", status: "lead", value: 200 },
];

const columns: ColumnDef<Person, any>[] = [
  { id: "name", accessorKey: "name", header: "Name" },
  { id: "org", accessorKey: "org", header: "Organization" },
  { id: "value", accessorKey: "value", header: "Value", meta: { align: "right" } },
];

function Harness({ onAdd = () => {} }: { onAdd?: () => void }) {
  const [status, setStatus] = useState("all");
  const data = PEOPLE.filter((p) => status === "all" || p.status === status);
  return (
    <DataTable
      data={data}
      columns={columns}
      noun="contacts"
      totalCount={PEOPLE.length}
      getRowId={(p) => String(p.id)}
      addLabel="Add contact"
      onAdd={onAdd}
      filterActive={status !== "all"}
      filters={
        <select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">All</option>
          <option value="lead">Lead</option>
          <option value="customer">Customer</option>
        </select>
      }
    />
  );
}

const names = () => screen.getAllByTestId("table-row").map((r) => within(r).getAllByRole("cell")[0].textContent);

describe("DataTable", () => {
  it("searches every text column, ignoring case (T1)", async () => {
    render(<Harness />);
    await userEvent.type(screen.getByRole("searchbox", { name: "Search contacts" }), "LUMEN");
    await screen.findByText("Showing 1 of 3 contacts");
    expect(names()).toEqual(["Chloe Nguyen"]);
  });

  it("sorts on a heading click, reverses on the second, and sets aria-sort (T2)", async () => {
    render(<Harness />);
    const header = screen.getByRole("columnheader", { name: /Value/ });
    expect(header).toHaveAttribute("aria-sort", "none");
    await userEvent.click(within(header).getByRole("button"));
    expect(header).toHaveAttribute("aria-sort", "descending");
    expect(names()).toEqual(["Ana Ruiz", "Chloe Nguyen", "Ben Fletcher"]);
    await userEvent.click(within(header).getByRole("button"));
    expect(header).toHaveAttribute("aria-sort", "ascending");
    expect(names()).toEqual(["Ben Fletcher", "Chloe Nguyen", "Ana Ruiz"]);
  });

  it("shows the count line (T6)", () => {
    render(<Harness />);
    expect(screen.getByText("Showing 3 of 3 contacts")).toBeInTheDocument();
  });

  it("shows a message and a clear button for an empty search (T7)", async () => {
    render(<Harness />);
    const box = screen.getByRole("searchbox");
    await userEvent.type(box, "acme");
    expect(await screen.findByText('No contacts match "acme"')).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Clear search" }));
    expect(box).toHaveValue("");
    expect(box).toHaveFocus();
    await screen.findByText("Showing 3 of 3 contacts");
  });

  it("combines filters with search (C2, DL1a)", async () => {
    render(<Harness />);
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Status" }), "lead");
    expect(screen.getByText("Showing 2 of 3 contacts")).toBeInTheDocument();
    await userEvent.type(screen.getByRole("searchbox"), "ana");
    await screen.findByText("Showing 1 of 3 contacts");
    expect(names()).toEqual(["Ana Ruiz"]);
  });

  it("has an add button (T3)", async () => {
    const onAdd = vi.fn();
    render(<Harness onAdd={onAdd} />);
    await userEvent.click(screen.getByRole("button", { name: "Add contact" }));
    expect(onAdd).toHaveBeenCalled();
  });
});
