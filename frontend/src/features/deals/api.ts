import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, keys, refreshAfter } from "../../api/client";
import type { Deal, DealDetail } from "../../api/types";
import type { DealValues } from "./schema";

export const useDeals = (enabled = true) =>
  useQuery({ queryKey: keys.deals, queryFn: () => api.get<Deal[]>("/deals"), enabled });

export const useDeal = (id: number) =>
  useQuery({ queryKey: keys.deal(id), queryFn: () => api.get<DealDetail>(`/deals/${id}`) });

export function useSaveDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, values }: { id?: number; values: Partial<DealValues> }) =>
      id ? api.patch<Deal>(`/deals/${id}`, values) : api.post<Deal>("/deals", values),
    onSuccess: () => refreshAfter(qc, "deal"),
  });
}

export function useDeleteDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.del(`/deals/${id}`),
    onSuccess: (_r, id) => refreshAfter(qc, "deal", keys.deal(id)),
  });
}
