import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fakeBackend, renderScreen } from "../test/render";
import { TopBar } from "./TopBar";

afterEach(() => vi.unstubAllGlobals());

function renderTopBar(path: string) {
  fakeBackend({ "GET /organizations": [], "GET /contacts": [], "GET /deals": [] });
  return renderScreen(<TopBar />, { path, pattern: "*" });
}

const tab = (name: string) =>
  within(screen.getByRole("navigation", { name: "Main" })).getByRole("link", { name });

describe("TopBar", () => {
  it("links to every area and home", () => {
    renderTopBar("/");
    expect(screen.getByRole("link", { name: /Accountable/ })).toHaveAttribute("href", "/");
    for (const [name, href] of [
      ["Dashboard", "/"],
      ["Pipeline", "/pipeline"],
      ["Deals", "/deals"],
      ["Contacts", "/contacts"],
      ["Organizations", "/organizations"],
    ]) {
      expect(tab(name)).toHaveAttribute("href", href);
    }
  });

  it("marks the tab for the page you're on", () => {
    renderTopBar("/deals/3");
    expect(tab("Deals")).toHaveAttribute("aria-current", "page");
    expect(tab("Dashboard")).not.toHaveAttribute("aria-current");
  });

  it("moves to the tab that's clicked", async () => {
    const { router } = renderTopBar("/");
    await userEvent.click(tab("Pipeline"));
    expect(router.state.location.pathname).toBe("/pipeline");
    expect(tab("Pipeline")).toHaveAttribute("aria-current", "page");
  });

  it.each([
    ["/", "Add deal"],
    ["/pipeline", "Add deal"],
    ["/contacts/4", "Add contact"],
    ["/organizations", "Add organization"],
  ])("on %s, the main action is %s and opens its form", async (path, action) => {
    renderTopBar(path);
    await userEvent.click(screen.getByRole("button", { name: action }));
    const dialog = await screen.findByRole("dialog", { name: action });
    await userEvent.click(within(dialog).getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("puts the mode toggle between quick search and the page's action", () => {
    renderTopBar("/");
    const search = screen.getByRole("combobox", {
      name: "Search deals, contacts and organizations",
    });
    const toggle = screen.getByRole("button", { name: "Switch to dark mode" });
    const action = screen.getByRole("button", { name: "Add deal" });
    expect(search.compareDocumentPosition(toggle)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(toggle.compareDocumentPosition(action)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it("has the quick search", () => {
    renderTopBar("/");
    expect(
      screen.getByRole("combobox", { name: "Search deals, contacts and organizations" }),
    ).toBeInTheDocument();
  });
});
