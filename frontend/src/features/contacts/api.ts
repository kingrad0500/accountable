import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, keys, refreshAfter } from "../../api/client";
import type { Contact, ContactDetail } from "../../api/types";
import type { ContactValues } from "./schema";

export const useContacts = (enabled = true) =>
  useQuery({ queryKey: keys.contacts, queryFn: () => api.get<Contact[]>("/contacts"), enabled });

export const useContact = (id: number) =>
  useQuery({
    queryKey: keys.contact(id),
    queryFn: () => api.get<ContactDetail>(`/contacts/${id}`),
  });

export function useSaveContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, values }: { id?: number; values: Partial<ContactValues> }) =>
      id ? api.patch<Contact>(`/contacts/${id}`, values) : api.post<Contact>("/contacts", values),
    onSuccess: () => refreshAfter(qc, "contact"),
  });
}

export function useDeleteContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.del(`/contacts/${id}`),
    onSuccess: (_r, id) => refreshAfter(qc, "contact", keys.contact(id)),
  });
}
