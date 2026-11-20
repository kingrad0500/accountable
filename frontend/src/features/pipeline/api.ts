import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, keys, refreshAfter } from "../../api/client";
import type { Deal } from "../../api/types";
import { todayISO } from "../../lib/dates";
import { stageLabel, type StageKey } from "../../lib/stages";
import { applyMove } from "./move";

type MoveVars = { id: number; stage: StageKey; index: number };

/**
 * Move a deal on the board. The cached deals list changes at once, so every total
 * updates before the server replies (P3); a refused move puts it back (P7).
 */
export function useMoveDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, stage, index }: MoveVars) => api.post<Deal>(`/deals/${id}/move`, { stage, index }),
    onMutate: async ({ id, stage, index }) => {
      await qc.cancelQueries({ queryKey: keys.deals });
      const previous = qc.getQueryData<Deal[]>(keys.deals);
      if (previous) qc.setQueryData(keys.deals, applyMove(previous, id, stage, index, todayISO()));
      return { previous };
    },
    onError: (error, { id, stage }, context) => {
      if (context?.previous) qc.setQueryData(keys.deals, context.previous);
      const name = context?.previous?.find((d) => d.id === id)?.name ?? "The deal";
      toast.error(`${name} couldn't move to ${stageLabel(stage)}. ${error.message}`);
    },
    onSettled: () => refreshAfter(qc, "deal"),
  });
}
