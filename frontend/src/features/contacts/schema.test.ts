import { expect, it } from "vitest";
import { contactSchema } from "./schema";

const valid = { name: "Ana Ruiz", email: "", phone: "", job_title: "", organization_id: "", status: "lead" };
const errors = (input: Partial<typeof valid>) => {
  const r = contactSchema.safeParse({ ...valid, ...input });
  return r.success ? {} : Object.fromEntries(r.error.issues.map((i) => [i.path[0], i.message]));
};

it("needs a name (V1)", () => {
  expect(errors({ name: "" })).toEqual({ name: "Required" });
});

it("checks an email only when given (V2)", () => {
  expect(errors({ email: "ana@acme.com" })).toEqual({});
  expect(errors({ email: "ana@acme" })).toEqual({ email: "Enter an email such as name@company.com" });
  expect(errors({ email: "ana" })).toEqual({ email: "Enter an email such as name@company.com" });
  expect(contactSchema.parse(valid).email).toBeNull();
});

it("knows the statuses", () => {
  expect(errors({ status: "vip" })).toHaveProperty("status");
});
