import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { api, ApiError, keys, refreshAfter } from "./client";

afterEach(() => vi.unstubAllGlobals());

function replyWith(response: () => Response) {
  const fetchMock = vi.fn<typeof fetch>(async () => response());
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function failure(promise: Promise<unknown>): Promise<ApiError> {
  const error = await promise.then(
    () => null,
    (e: unknown) => e,
  );
  if (!(error instanceof ApiError)) throw new Error("Expected the request to fail");
  return error;
}

describe("api client", () => {
  it("returns the server's JSON", async () => {
    replyWith(() => json(200, [{ id: 1 }]));
    await expect(api.get("/deals")).resolves.toEqual([{ id: 1 }]);
  });

  it("sends a JSON body with writes, and an empty one for a bare post", async () => {
    const fetchMock = replyWith(() => json(200, {}));
    await api.post("/deals");
    await api.patch("/deals/3", { name: "Renamed" });
    const [, post] = fetchMock.mock.calls[0];
    const [patchUrl, patch] = fetchMock.mock.calls[1];
    expect(post?.body).toBe("{}");
    expect(patchUrl).toBe("/api/deals/3");
    expect(patch).toMatchObject({ method: "PATCH", body: '{"name":"Renamed"}' });
  });

  it("resolves a delete with no content", async () => {
    replyWith(() => new Response(null, { status: 204 }));
    await expect(api.del("/deals/3")).resolves.toBeUndefined();
  });

  it("explains when the server can't be reached", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      }),
    );
    const error = await failure(api.get("/deals"));
    expect(error.status).toBe(0);
    expect(error.message).toMatch(/Can't reach Accountable's server/);
  });

  it("carries the server's message", async () => {
    replyWith(() => json(409, { detail: "That name is taken" }));
    const error = await failure(api.post("/organizations", { name: "Acme" }));
    expect(error.status).toBe(409);
    expect(error.message).toBe("That name is taken");
  });

  it("carries per-field messages from a validation error", async () => {
    replyWith(() =>
      json(422, {
        detail: [
          { loc: ["body", "name"], msg: "Name is required" },
          { loc: ["body", "value"], msg: "Value can't be negative" },
        ],
      }),
    );
    const error = await failure(api.post("/deals", {}));
    expect(error.message).toBe("Name is required. Value can't be negative");
    expect(error.fieldErrors).toEqual({
      name: "Name is required",
      value: "Value can't be negative",
    });
  });

  it("falls back to the status when the error has no message", async () => {
    replyWith(() => new Response("Bad gateway", { status: 502 }));
    const error = await failure(api.get("/deals"));
    expect(error.message).toBe("Request failed (502)");
    expect(error.fieldErrors).toEqual({});
  });
});

describe("refreshAfter", () => {
  function cachedClient() {
    const qc = new QueryClient();
    for (const key of [keys.deals, keys.deal(1), keys.deal(2), keys.dashboard, keys.contacts]) {
      qc.setQueryData(key, {});
    }
    return qc;
  }
  const stale = (qc: QueryClient, key: readonly unknown[]) => qc.getQueryState(key)?.isInvalidated;

  it("marks every list and record a change touches as stale", () => {
    const qc = cachedClient();
    refreshAfter(qc, "activity");
    expect(stale(qc, keys.deal(1))).toBe(true);
    expect(stale(qc, keys.dashboard)).toBe(true);
    expect(stale(qc, keys.deals)).toBe(false);
    expect(stale(qc, keys.contacts)).toBe(false);
  });

  it("leaves a just-deleted record alone", () => {
    const qc = cachedClient();
    refreshAfter(qc, "deal", keys.deal(1));
    expect(stale(qc, keys.deal(1))).toBe(false);
    expect(stale(qc, keys.deal(2))).toBe(true);
    expect(stale(qc, keys.deals)).toBe(true);
  });
});
