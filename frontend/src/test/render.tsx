// Test helpers: render a screen with the app's providers, against a fake backend.
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { vi } from "vitest";

type Reply = unknown | ((body: unknown, url: URL) => unknown);

/** Fake backend routes, keyed by "METHOD /path" without the /api prefix, e.g. "GET /deals". */
export type FakeRoutes = Record<string, Reply>;

/**
 * Replaces `fetch` with a fake backend. A route's reply is the JSON body, or a function of the
 * request body that returns one. A reply of `{ status, detail }` with a status of 400 or more is
 * sent as an error. Unknown routes answer 404. Returns the mock so tests can check what was sent.
 */
export function fakeBackend(routes: FakeRoutes) {
  const fetchMock = vi.fn(async (input: string, init?: RequestInit) => {
    const url = new URL(input, "http://localhost");
    const method = init?.method ?? "GET";
    const key = `${method} ${url.pathname.replace(/^\/api/, "")}`;
    if (!(key in routes)) return jsonResponse(404, { detail: `No fake route for ${key}` });
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    const route = routes[key];
    const reply = typeof route === "function" ? route(body, url) : route;
    if (isErrorReply(reply)) return jsonResponse(reply.status, { detail: reply.detail });
    return reply === undefined ? new Response(null, { status: 204 }) : jsonResponse(200, reply);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function isErrorReply(reply: unknown): reply is { status: number; detail: unknown } {
  return (
    typeof reply === "object" &&
    reply !== null &&
    "status" in reply &&
    typeof reply.status === "number" &&
    reply.status >= 400
  );
}

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function testQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

/**
 * Renders `ui` at `path` (matching `pattern`, e.g. "/deals/:id") inside a fresh query client and
 * an in-memory router. Any other path renders a stand-in, and `router.state.location` says where
 * a link or redirect went.
 */
export function renderScreen(
  ui: ReactElement,
  { path = "/", pattern = path }: { path?: string; pattern?: string } = {},
) {
  const queryClient = testQueryClient();
  const router = createMemoryRouter(
    [
      { path: pattern, element: ui },
      { path: "*", element: <p data-testid="location">elsewhere</p> },
    ],
    { initialEntries: [path] },
  );
  const result = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { ...result, router, queryClient };
}
