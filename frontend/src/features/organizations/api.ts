import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, keys, refreshAfter } from "../../api/client";
import type { Organization, OrganizationDetail } from "../../api/types";
import type { OrganizationValues } from "./schema";

export const useOrganizations = (enabled = true) =>
  useQuery({ queryKey: keys.organizations, queryFn: () => api.get<Organization[]>("/organizations"), enabled });

export const useOrganization = (id: number) =>
  useQuery({ queryKey: keys.organization(id), queryFn: () => api.get<OrganizationDetail>(`/organizations/${id}`) });

export function useSaveOrganization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, values }: { id?: number; values: Partial<OrganizationValues> }) =>
      id ? api.patch<Organization>(`/organizations/${id}`, values) : api.post<Organization>("/organizations", values),
    onSuccess: () => refreshAfter(qc, "organization"),
  });
}

export function useDeleteOrganization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.del(`/organizations/${id}`),
    onSuccess: (_r, id) => refreshAfter(qc, "organization", keys.organization(id)),
  });
}
