import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { aContact, aDeal, anOrganization } from "../test/fixtures";
import { fakeBackend, renderScreen } from "../test/render";
import { QuickSearch } from "./QuickSearch";
import { quickSearch, type SearchItem } from "./searchMatches";

const items: SearchItem[] = [
  ...Array.from({ length: 10 }, (_, i) => ({
    kind: "deal" as const,
    id: i,
    name: `Data project ${i}`,
  })),
  { kind: "contact", id: 1, name: "Dana Lee" },
  { kind: "contact", id: 2, name: "Ada Data" },
  { kind: "organization", id: 1, name: "Datawise" },
  { kind: "organization", id: 2, name: "Acme" },
];

describe("quick search (G10)", () => {
  it("groups matches by type and caps them at 8", () => {
    const groups = quickSearch("DATA", items);
    expect(groups.map((g) => g.label)).toEqual(["Deals", "Contacts", "Organizations"]);
    expect(groups.flatMap((g) => g.items)).toHaveLength(8);
    expect(groups[1].items.map((i) => i.name)).toEqual(["Ada Data"]);
    expect(groups[2].items.map((i) => i.name)).toEqual(["Datawise"]);
  });
  it("puts names that start with the query first", () => {
    const groups = quickSearch("da", items);
    expect(groups[1].items.map((i) => i.name)).toEqual(["Dana Lee", "Ada Data"]);
  });
  it("sorts names that start with the query, then the rest, alphabetically", () => {
    const deals = ["Rebranding", "Brand refresh", "Brand audit", "Rebrand site"].map(
      (name, id) => ({ kind: "deal" as const, id, name }),
    );
    expect(quickSearch("brand", deals)[0].items.map((i) => i.name)).toEqual([
      "Brand audit",
      "Brand refresh",
      "Rebrand site",
      "Rebranding",
    ]);
  });
  it("finds nothing for an empty query", () => {
    expect(quickSearch("  ", items)).toEqual([]);
  });
});

describe("the quick search box (G10)", () => {
  afterEach(() => vi.unstubAllGlobals());

  function renderSearch() {
    const fetchMock = fakeBackend({
      "GET /deals": [aDeal({ id: 4, name: "Data platform", organization_name: "Datawise" })],
      "GET /contacts": [aContact({ id: 5, name: "Dana Lee", organization_name: null })],
      "GET /organizations": [anOrganization({ id: 6, name: "Datawise", industry: "Software" })],
    });
    const screenResult = renderScreen(
      <>
        <QuickSearch />
        <input aria-label="Somewhere else" />
      </>,
    );
    const box = screen.getByRole("combobox", { name: "Search deals, contacts and organizations" });
    return { ...screenResult, fetchMock, box };
  }

  const selected = () => screen.getByRole("option", { selected: true });

  it("loads the lists only once the box is used", async () => {
    const { fetchMock, box } = renderSearch();
    expect(fetchMock).not.toHaveBeenCalled();
    await userEvent.click(box);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("shows matches grouped by type, with their details", async () => {
    const { box } = renderSearch();
    await userEvent.type(box, "da");
    const deals = await screen.findByRole("group", { name: "Deals" });
    expect(within(deals).getByRole("option")).toHaveTextContent("Data platformDatawise");
    expect(
      within(screen.getByRole("group", { name: "Contacts" })).getByRole("option"),
    ).toHaveTextContent(/^Dana Lee$/);
    expect(
      within(screen.getByRole("group", { name: "Organizations" })).getByRole("option"),
    ).toHaveTextContent("DatawiseSoftware");
    expect(box).toHaveAttribute("aria-expanded", "true");
  });

  it("says when nothing matches", async () => {
    const { box } = renderSearch();
    await userEvent.type(box, "zebra ");
    expect(await screen.findByText('Nothing matches "zebra"')).toBeInTheDocument();
    await userEvent.keyboard("{ArrowDown}{ArrowUp}{Enter}");
    expect(box).toHaveValue("zebra ");
  });

  it("moves through the matches with the arrow keys, wrapping round", async () => {
    const { box } = renderSearch();
    await userEvent.type(box, "da");
    await screen.findByRole("group", { name: "Organizations" });
    expect(selected()).toHaveTextContent("Data platform");
    expect(box).toHaveAttribute("aria-activedescendant", selected().id);
    await userEvent.keyboard("{ArrowDown}");
    expect(selected()).toHaveTextContent("Dana Lee");
    await userEvent.keyboard("{ArrowUp}{ArrowUp}");
    expect(selected()).toHaveTextContent("DatawiseSoftware");
    await userEvent.keyboard("{ArrowDown}");
    expect(selected()).toHaveTextContent("Data platform");
  });

  it("opens the chosen match with Enter and clears the box", async () => {
    const { box, router } = renderSearch();
    await userEvent.type(box, "dana");
    await screen.findByRole("option", { name: /Dana Lee/ });
    await userEvent.keyboard("{Enter}");
    expect(router.state.location.pathname).toBe("/contacts/5");
  });

  it("opens a match that's clicked", async () => {
    const { box, router } = renderSearch();
    await userEvent.type(box, "data");
    const option = await screen.findByRole("option", { name: /Datawise/, selected: false });
    await userEvent.hover(option);
    expect(option).toHaveAttribute("aria-selected", "true");
    await userEvent.click(option);
    expect(router.state.location.pathname).toBe("/organizations/6");
  });

  it("clears and closes with Escape", async () => {
    const { box } = renderSearch();
    await userEvent.type(box, "da");
    await screen.findByRole("listbox");
    await userEvent.keyboard("{Escape}");
    expect(box).toHaveValue("");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("closes when focus leaves the box", async () => {
    const { box } = renderSearch();
    await userEvent.type(box, "da");
    await screen.findByRole("listbox");
    await userEvent.tab();
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(box).toHaveValue("da");
  });

  it("is focused by pressing /, unless you're typing somewhere else", async () => {
    const { box } = renderSearch();
    await userEvent.keyboard("/");
    expect(box).toHaveFocus();
    expect(box).toHaveValue("");

    const other = screen.getByRole("textbox", { name: "Somewhere else" });
    await userEvent.click(other);
    await userEvent.keyboard("/");
    expect(other).toHaveFocus();
    expect(other).toHaveValue("/");

    other.blur();
    await userEvent.keyboard("{Control>}/{/Control}");
    expect(box).not.toHaveFocus();
  });
});
