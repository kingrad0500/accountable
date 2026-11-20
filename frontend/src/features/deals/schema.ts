import { z } from "zod";
import { STAGE_KEYS } from "../../lib/stages";
import { optionalDate, optionalId, requiredId, requiredText, wholeNumber } from "../../lib/validation";

/** The deal form's rules: the same as the backend's (V1, V3). */
export const dealSchema = z.object({
  name: requiredText(),
  organization_id: requiredId(),
  main_contact_id: optionalId(),
  stage: z.enum(STAGE_KEYS as [string, ...string[]], { error: "Required" }),
  value: wholeNumber(),
  probability: wholeNumber(100),
  close_date: optionalDate(),
});

export type DealInput = z.input<typeof dealSchema>;
export type DealValues = z.output<typeof dealSchema>;
