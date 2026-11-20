import { z } from "zod";
import { optionalEmail, optionalId, optionalText, requiredText } from "../../lib/validation";

/** The contact form's rules: the same as the backend's (V1, V2). */
export const contactSchema = z.object({
  name: requiredText(),
  email: optionalEmail(),
  phone: optionalText(),
  job_title: optionalText(),
  organization_id: optionalId(),
  status: z.enum(["lead", "qualified", "customer"], { error: "Required" }),
});

export type ContactInput = z.input<typeof contactSchema>;
export type ContactValues = z.output<typeof contactSchema>;
