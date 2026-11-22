import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { keys } from "../../api/client";
import type { Deal } from "../../api/types";
import { useMoveDeal } from "./api";

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const base = {
  organization_id: 1,
  organization_name: "Acme",
  main_contact_id: null,
  main_contact_name: null,
  value: 1000,
  close_date: null,
  is_late: false,
  created_at: "",
  updated_at: "",
};
const DEALS: Deal[] = [
  { ...base, id: 1, name: "A", stage: "proposal", probability: 50, position: 0 },
  { ...base, id: 2, name: "B", stage: "negotiation", probability: 75, position: 0 },
];

afterEach(() => vi.unstubAllGlobals());

function setup(fetchImpl: () => Promise<unknown>) {
  vi.stubGlobal("fetch", vi.fn(fetchImpl));
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  qc.setQueryData(keys.deals, DEALS);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(() => useMoveDeal(), { wrapper });
  return { qc, result };
}

it("updates the cached list before the server replies (P3)", async () => {
  let reply!: (v: unknown) => void;
  const { qc, result } = setup(() => new Promise((r) => (reply = r)));
  act(() => result.current.mutate({ id: 1, stage: "negotiation", index: 1 }));
  await waitFor(() =>
    expect(qc.getQueryData<Deal[]>(keys.deals)!.find((d) => d.id === 1)!.stage).toBe("negotiation"),
  );
  expect(qc.getQueryData<Deal[]>(keys.deals)!.find((d) => d.id === 1)!.probability).toBe(75);
  reply({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ ...DEALS[0], stage: "negotiation" }),
  });
});

it("restores the previous state when the server refuses the move (P7)", async () => {
  const { toast } = await import("sonner");
  const { qc, result } = setup(() =>
    Promise.resolve({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ detail: "Deal not found" }),
    }),
  );
  await act(() => result.current.mutateAsync({ id: 1, stage: "won", index: 0 }).catch(() => {}));
  expect(qc.getQueryData<Deal[]>(keys.deals)).toEqual(DEALS);
  expect(toast.error).toHaveBeenCalledWith("A couldn't move to Won. Deal not found");
});

it("names the deal generically when the board's list isn't loaded (P7)", async () => {
  const { toast } = await import("sonner");
  vi.stubGlobal(
    "fetch",
    vi.fn(() =>
      Promise.resolve({
        ok: false,
        status: 409,
        json: () => Promise.resolve({ detail: "Deal is locked" }),
      }),
    ),
  );
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(() => useMoveDeal(), { wrapper });
  await act(() => result.current.mutateAsync({ id: 1, stage: "won", index: 0 }).catch(() => {}));
  expect(qc.getQueryData(keys.deals)).toBeUndefined();
  expect(toast.error).toHaveBeenCalledWith("The deal couldn't move to Won. Deal is locked");
});
