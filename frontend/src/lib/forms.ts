import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { toast } from "sonner";
import { ApiError } from "../api/client";

/** Show the server's field errors next to each field, the same way as the browser's (V5). */
export function showServerErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: string[],
) {
  if (error instanceof ApiError) {
    const known = Object.entries(error.fieldErrors).filter(([f]) => fields.includes(f));
    for (const [field, message] of known) setError(field as Path<T>, { type: "server", message });
    if (known.length) return;
  }
  toast.error(error instanceof Error ? error.message : "Something went wrong");
}

/** Only the fields the user changed, for an edit. */
export function changedOnly<T extends Record<string, unknown>>(
  values: T,
  dirty: Partial<Record<keyof T, unknown>>,
): Partial<T> {
  return Object.fromEntries(
    Object.entries(values).filter(([k]) => dirty[k as keyof T]),
  ) as Partial<T>;
}
