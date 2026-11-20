import { z } from "zod";
import { optionalDate, requiredText } from "../../lib/validation";

/** The activity form's rules: the same as the backend's (V1, A1). */
export const activitySchema = z.object({
  type: z.enum(["note", "call", "email"], { error: "Required" }),
  description: requiredText(),
  // A local date and time from <input type="datetime-local">, sent as UTC.
  occurred_at: z
    .string()
    .min(1, "Required")
    .refine((v) => !v || !Number.isNaN(new Date(v).getTime()), "Enter a date and time")
    .transform((v) => new Date(v).toISOString()),
  follow_up_date: optionalDate(),
});

export type ActivityInput = z.input<typeof activitySchema>;
export type ActivityValues = z.output<typeof activitySchema>;

/** "2026-11-18T14:30" in local time, for a datetime-local input. */
export function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
