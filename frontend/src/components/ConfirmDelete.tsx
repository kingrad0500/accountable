import { useState } from "react";
import { AlertDialog } from "radix-ui";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import type { ActivityType, DeleteImpact } from "../api/types";
import { formatDate, plural } from "../lib/format";
import { useReturnFocus } from "./useReturnFocus";

type Target =
  | { kind: "organization" | "contact" | "deal"; id: number; name: string }
  | { kind: "activity"; id: number; type: ActivityType; occurredAt: string };

const TYPE_NAMES: Record<ActivityType, string> = { note: "note", call: "call", email: "email" };

function activities(n: number): string {
  return n === 1 ? "1 activity or follow-up" : `${n} activities and follow-ups`;
}

/** The dialog's title and what happens to linked records, with counts (D1). */
export function deleteMessage(target: Target, impact: DeleteImpact | undefined): { title: string; body: string } {
  if (target.kind === "activity") {
    return {
      title: `Delete this ${TYPE_NAMES[target.type]} from ${formatDate(target.occurredAt)}?`,
      body: "It will be removed from every timeline, with its follow-up.",
    };
  }
  const title = `Delete ${target.name}?`;
  if (!impact) return { title, body: "Checking linked records…" };
  if (target.kind === "organization") {
    const c = impact.contacts ?? 0;
    const d = impact.deals ?? 0;
    if (!c && !d) return { title, body: "It has no contacts or deals." };
    const parts = [c && plural(c, "contact"), d && plural(d, "deal")].filter(Boolean).join(" and ");
    return { title, body: `Its ${parts} will be kept, with no organization.` };
  }
  if (target.kind === "contact") {
    const a = impact.activities ?? 0;
    const d = impact.deals ?? 0;
    const first = a ? `${target.name}'s ${activities(a)} will be deleted.` : `${target.name} has no activities.`;
    const second = d ? ` Their ${plural(d, "deal")} ${d === 1 ? "stays" : "stay"}, with no main contact.` : "";
    return { title, body: first + second };
  }
  const a = impact.activities ?? 0;
  return {
    title,
    body: a ? `Its ${activities(a)} and its stage history will be deleted.` : "Its stage history will be deleted.",
  };
}

type Props = {
  target: Target | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<unknown>;
};

/** Asks before deleting. Cancel has focus; the delete button is Raspberry (D2). */
export function ConfirmDelete({ target, onOpenChange, onConfirm }: Props) {
  const [busy, setBusy] = useState(false);
  const returnFocus = useReturnFocus(!!target);
  const needsImpact = !!target && target.kind !== "activity";
  const impact = useQuery({
    queryKey: ["delete-impact", target?.kind, target?.id],
    queryFn: () => api.get<DeleteImpact>(`/${target!.kind === "organization" ? "organizations" : `${target!.kind}s`}/${target!.id}/delete-impact`),
    enabled: needsImpact,
    staleTime: 0,
    gcTime: 0,
  });
  const message = target ? deleteMessage(target, impact.data) : { title: "", body: "" };

  return (
    <AlertDialog.Root open={!!target} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-40 bg-[rgb(7_59_76/0.35)]" />
        <AlertDialog.Content
          className="panel fixed top-[20vh] left-1/2 z-50 w-[460px] -translate-x-1/2 p-6 shadow-lift"
          onCloseAutoFocus={returnFocus}
        >
          <AlertDialog.Title className="text-lg">{message.title}</AlertDialog.Title>
          <AlertDialog.Description className="muted mt-2">{message.body}</AlertDialog.Description>
          <div className="mt-6 flex justify-end gap-2">
            <AlertDialog.Cancel className="btn btn-quiet">Cancel</AlertDialog.Cancel>
            <button
              type="button"
              className="btn btn-danger"
              disabled={busy || (needsImpact && !impact.data)}
              onClick={async () => {
                setBusy(true);
                try {
                  await onConfirm();
                  onOpenChange(false);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Delete
            </button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

export type DeleteTarget = Target;
