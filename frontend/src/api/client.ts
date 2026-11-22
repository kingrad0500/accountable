// Typed fetch wrapper. Errors carry the backend's per-field messages (V5).
import type { QueryClient } from "@tanstack/react-query";

export class ApiError extends Error {
  status: number;
  fieldErrors: Record<string, string>;

  constructor(status: number, message: string, fieldErrors: Record<string, string> = {}) {
    super(message);
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

type FastApiDetail = string | { loc: (string | number)[]; msg: string }[];

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, "Can't reach Accountable's server. Is it running?");
  }
  if (response.status === 204) return undefined as T;
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const detail: FastApiDetail | undefined = data?.detail;
    if (Array.isArray(detail)) {
      const fields: Record<string, string> = {};
      for (const e of detail) fields[String(e.loc[e.loc.length - 1])] = e.msg;
      throw new ApiError(response.status, detail.map((e) => e.msg).join(". "), fields);
    }
    throw new ApiError(
      response.status,
      typeof detail === "string" ? detail : `Request failed (${response.status})`,
    );
  }
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body ?? {}),
  patch: <T>(path: string, body: unknown) => request<T>("PATCH", path, body),
  del: (path: string) => request<void>("DELETE", path),
};

/** Query keys: one per list and one per record. */
export const keys = {
  organizations: ["organizations"] as const,
  organization: (id: number) => ["organization", id] as const,
  contacts: ["contacts"] as const,
  contact: (id: number) => ["contact", id] as const,
  deals: ["deals"] as const,
  deal: (id: number) => ["deal", id] as const,
  dashboard: ["dashboard"] as const,
};

type Area = "organization" | "contact" | "deal" | "activity";

/**
 * Which cached data a change touches. Lists show names and counts from other areas
 * (a deal row shows its organization's name; an organization row counts its deals),
 * and every record page shows a timeline.
 */
const TOUCHES: Record<Area, string[]> = {
  organization: [
    "organizations",
    "organization",
    "contacts",
    "contact",
    "deals",
    "deal",
    "dashboard",
  ],
  contact: ["contacts", "contact", "organizations", "organization", "deals", "deal", "dashboard"],
  deal: ["deals", "deal", "organizations", "organization", "contact", "dashboard"],
  activity: ["organization", "contact", "deal", "dashboard"],
};

export function refreshAfter(qc: QueryClient, area: Area, deleted?: readonly unknown[]) {
  for (const key of TOUCHES[area]) {
    void qc.invalidateQueries({
      queryKey: [key],
      // Don't refetch a record that was just deleted: its page is on its way out (D3).
      predicate: deleted
        ? (q) => !(q.queryKey[0] === deleted[0] && q.queryKey[1] === deleted[1])
        : undefined,
    });
  }
}
