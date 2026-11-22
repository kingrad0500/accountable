// Field rules that match the backend's (V1 to V3), with the same messages.
import { z } from "zod";

export const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$/;
export const WEBSITE_RE =
  /^(https?:\/\/)?([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}(:\d+)?(\/\S*)?$/i;

export const requiredText = () => z.string().trim().min(1, "Required");

/** Optional text: blank becomes null. */
export const optionalText = () =>
  z
    .string()
    .trim()
    .transform((v) => v || null);

export const optionalEmail = () =>
  optionalText().refine(
    (v) => v === null || EMAIL_RE.test(v),
    "Enter an email such as name@company.com",
  );

export const optionalWebsite = () =>
  optionalText().refine(
    (v) => v === null || WEBSITE_RE.test(v),
    "Enter a website such as acme.com",
  );

/** A whole number typed into a text box ("$12,500" is fine), 0 or more, up to `max`. */
export const wholeNumber = (max?: number) =>
  z
    .string()
    .transform((v) => v.replace(/[,$\s]/g, ""))
    .superRefine((v, ctx) => {
      if (!v) ctx.addIssue({ code: "custom", message: "Required" });
      else if (!/^-?\d+$/.test(v))
        ctx.addIssue({ code: "custom", message: "Enter a whole number" });
      else if (Number(v) < 0) ctx.addIssue({ code: "custom", message: "Must be 0 or more" });
      else if (max !== undefined && Number(v) > max)
        ctx.addIssue({ code: "custom", message: `Must be ${max} or less` });
    })
    .transform(Number);

/** An id chosen in a select: "" means none. */
export const optionalId = () => z.string().transform((v) => (v ? Number(v) : null));
export const requiredId = () =>
  z
    .string()
    .min(1, "Required")
    .transform((v) => Number(v));

export const optionalDate = () => z.string().transform((v) => v || null);
