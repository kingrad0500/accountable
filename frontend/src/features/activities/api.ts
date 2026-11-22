import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, refreshAfter } from "../../api/client";
import type { ActivityEntry } from "../../api/types";
import type { ActivityValues } from "./schema";

type Parent = { contact_id: number } | { deal_id: number };

export function useSaveActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      values,
      parent,
    }: {
      id?: number;
      values: Partial<ActivityValues>;
      parent?: Parent;
    }) =>
      id
        ? api.patch<ActivityEntry>(`/activities/${id}`, values)
        : api.post<ActivityEntry>("/activities", { ...values, ...parent }),
    onSuccess: () => refreshAfter(qc, "activity"),
  });
}

/** Mark a follow-up done or not done (A2, DB6). */
export function useSetFollowUpDone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, done }: { id: number; done: boolean }) =>
      api.patch<ActivityEntry>(`/activities/${id}`, { follow_up_done: done }),
    onSuccess: () => refreshAfter(qc, "activity"),
  });
}

export function useDeleteActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.del(`/activities/${id}`),
    onSuccess: () => refreshAfter(qc, "activity"),
  });
}
