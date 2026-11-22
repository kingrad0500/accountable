import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { aContact, aDashboard, aDeal, anOrganization } from "./test/fixtures";
import { fakeBackend } from "./test/render";

// Loading the whole app the first time is slow, so do it before the timed tests.
beforeAll(() => import("./App"), 30_000);

const deal = aDeal({ name: "Fleet tracking rollout" });
const contact = aContact({ name: "Emma Walsh" });
const organization = anOrganization({ name: "Bluefin Logistics" });

beforeEach(() => {
  fakeBackend({
    "GET /dashboard": aDashboard(),
    "GET /deals": [deal],
    "GET /deals/1": { ...deal, timeline: [] },
    "GET /contacts": [contact],
    "GET /contacts/1": { ...contact, deals: [], timeline: [] },
    "GET /organizations": [organization],
    "GET /organizations/1": { ...organization, contacts: [], deals: [], timeline: [] },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  window.history.replaceState(null, "", "/");
});

/** Opens the app at `path`, as if typed in the address bar. */
async function openApp(path: string) {
  window.history.replaceState(null, "", path);
  // The app's router reads the address when it's created, so load the app afresh each time.
  vi.resetModules();
  const { default: App } = await import("./App");
  render(<App />);
}

const pageHeading = (name: string | RegExp) =>
  screen.findByRole("heading", { level: 1, name }, { timeout: 3000 });

describe("App", () => {
  it.each([
    ["/", /^Good (morning|afternoon|evening)$/],
    ["/pipeline", "Pipeline"],
    ["/deals", "Deals"],
    ["/deals/1", "Fleet tracking rollout"],
    ["/contacts", "Contacts"],
    ["/contacts/1", "Emma Walsh"],
    ["/organizations", "Organizations"],
    ["/organizations/1", "Bluefin Logistics"],
  ])("shows the page for %s", async (path, heading) => {
    await openApp(path);
    expect(await pageHeading(heading)).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Main" })).toBeInTheDocument();
  });

  it("says when a page doesn't exist", async () => {
    await openApp("/no-such-page");
    expect(await pageHeading("Page not found")).toBeInTheDocument();
    expect(document.title).toBe("Page not found · Accountable");
  });

  it("moves between pages from the top bar", async () => {
    await openApp("/");
    const nav = screen.getByRole("navigation", { name: "Main" });
    await userEvent.click(within(nav).getByRole("link", { name: "Organizations" }));
    expect(await pageHeading("Organizations")).toBeInTheDocument();
    expect(window.location.pathname).toBe("/organizations");
  });
});
