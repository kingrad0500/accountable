import { z } from "zod";
import { optionalText, optionalWebsite, requiredText } from "../../lib/validation";

/** The organization form's rules: the same as the backend's (V1, V2). */
export const organizationSchema = z.object({
  name: requiredText(),
  website: optionalWebsite(),
  industry: optionalText(),
  notes: optionalText(),
});

export type OrganizationInput = z.input<typeof organizationSchema>;
export type OrganizationValues = z.output<typeof organizationSchema>;
