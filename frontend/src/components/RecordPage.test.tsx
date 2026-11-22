import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { addDays, todayISO } from "../lib/dates";
import { renderScreen } from "../test/render";
import { aDeal } from "../test/fixtures";
import { DealList } from "./DealList";
import { LinkedPanel, LinkedRow, Loading, RecordHeader, RecordMissing } from "./RecordPage";

describe("RecordHeader", () => {
  function renderHeader(onEdit = vi.fn(), onDelete = vi.fn()) {
    return renderScreen(
      <RecordHeader
        kind="Organization"
        back={{ to: "/organizations", label: "Organizations" }}
        title="Bluefin Logistics"
        badges={<span>Customer</span>}
        facts={[
          { label: "Industry", value: "Logistics" },
          { label: "Website", value: null },
        ]}
        onEdit={onEdit}
        onDelete={onDelete}
      >
        <p>Some notes</p>
      </RecordHeader>,
    );
  }

  it("shows the record's name, kind, facts and badges, and sets the tab title", () => {
    renderHeader();
    expect(screen.getByRole("heading", { level: 1, name: "Bluefin Logistics" })).toBeVisible();
    expect(screen.getByText("Organization")).toBeInTheDocument();
    expect(screen.getByText("Customer")).toBeInTheDocument();
    expect(screen.getByText("Logistics")).toBeInTheDocument();
    expect(screen.getByText("Some notes")).toBeInTheDocument();
    expect(document.title).toBe("Bluefin Logistics · Accountable");
  });

  it("says None for an empty fact", () => {
    renderHeader();
    const website = screen.getByText("Website").parentElement!;
    expect(within(website).getByText("None")).toBeInTheDocument();
  });

  it("offers Edit, Delete and a way back", async () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const { router } = renderHeader(onEdit, onDelete);
    await userEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect(onEdit).toHaveBeenCalledOnce();
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(onDelete).toHaveBeenCalledOnce();
    await userEvent.click(screen.getByRole("link", { name: "Organizations" }));
    expect(router.state.location.pathname).toBe("/organizations");
  });
});

describe("LinkedPanel", () => {
  it("shows its title, count, action and rows", () => {
    renderScreen(
      <LinkedPanel title="Contacts" count={2} action={<button type="button">Add</button>}>
        <ul>
          <LinkedRow to="/contacts/1" title="Emma Walsh" sub="Head of IT" right={<b>Lead</b>} />
          <LinkedRow to="/contacts/2" title="Liam Chen" />
        </ul>
      </LinkedPanel>,
    );
    const panel = screen.getByRole("region", { name: "Contacts" });
    expect(within(panel).getByRole("heading")).toHaveTextContent("Contacts2");
    expect(within(panel).getByRole("button", { name: "Add" })).toBeInTheDocument();
    expect(within(panel).getByRole("link", { name: "Emma Walsh" })).toHaveAttribute(
      "href",
      "/contacts/1",
    );
    expect(within(panel).getByText("Head of IT")).toBeInTheDocument();
    expect(within(panel).getAllByRole("listitem")).toHaveLength(2);
  });

  it("leaves the count out when it isn't given", () => {
    renderScreen(
      <LinkedPanel title="Notes">
        <p>Nothing</p>
      </LinkedPanel>,
    );
    expect(screen.getByRole("heading", { name: "Notes" })).toHaveTextContent(/^Notes$/);
  });
});

describe("RecordMissing and Loading", () => {
  it("explains a missing record and links back", () => {
    renderScreen(<RecordMissing what="deal" back={{ to: "/deals", label: "All deals" }} />);
    expect(screen.getByRole("heading", { name: "This deal doesn't exist" })).toBeVisible();
    expect(screen.getByRole("link", { name: "All deals" })).toHaveAttribute("href", "/deals");
  });

  it("says it's loading", () => {
    renderScreen(<Loading />);
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });
});

describe("DealList", () => {
  it("says when there are no deals", () => {
    renderScreen(<DealList deals={[]} />);
    expect(screen.getByText("No deals.")).toBeInTheDocument();
  });

  it("lists each deal with its close date, value and stage, flagging late ones", () => {
    const yesterday = addDays(todayISO(), -1);
    renderScreen(
      <DealList
        deals={[
          aDeal({ id: 1, name: "Overdue rollout", stage: "proposal", close_date: yesterday }),
          aDeal({ id: 2, name: "Open ended", value: 800, stage: "won" }),
        ]}
      />,
    );
    const [late, open] = screen.getAllByRole("listitem");
    expect(within(late).getByRole("link", { name: "Overdue rollout" })).toHaveAttribute(
      "href",
      "/deals/1",
    );
    expect(within(late).getByText(/^Close /)).toBeInTheDocument();
    expect(within(late).getByText("Late")).toBeInTheDocument();
    expect(within(late).getByText("Proposal")).toBeInTheDocument();
    expect(within(open).getByText("No close date")).toBeInTheDocument();
    expect(within(open).getByText("$800")).toBeInTheDocument();
    expect(within(open).queryByText("Late")).not.toBeInTheDocument();
    expect(screen.queryByText(/Bluefin Logistics/)).not.toBeInTheDocument();
  });

  it("can show each deal's organization", () => {
    renderScreen(
      <DealList
        showOrganization
        deals={[
          aDeal({ organization_id: 1, organization_name: "Bluefin Logistics" }),
          aDeal({ id: 2, name: "No org", organization_name: null }),
        ]}
      />,
    );
    expect(screen.getByText(/Bluefin Logistics ·/)).toBeInTheDocument();
  });
});
