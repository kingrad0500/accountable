import { describe, expect, it } from "vitest";
import { dealSchema } from "./schema";

const valid = { name: "Website rebuild", organization_id: "3", main_contact_id: "", stage: "new", value: "12500", probability: "10", close_date: "" };

function errors(input: Partial<typeof valid>) {
  const r = dealSchema.safeParse({ ...valid, ...input });
  return r.success ? {} : Object.fromEntries(r.error.issues.map((i) => [i.path[0], i.message]));
}

describe("deal form rules (V1, V3)", () => {
  it("accepts a valid deal and converts it", () => {
    expect(dealSchema.parse({ ...valid, value: "$12,500" })).toEqual({
      name: "Website rebuild",
      organization_id: 3,
      main_contact_id: null,
      stage: "new",
      value: 12500,
      probability: 10,
      close_date: null,
    });
  });
  it("needs a name, organization, stage and value", () => {
    expect(errors({ name: " ", organization_id: "", stage: "" as never, value: "" })).toEqual({
      name: "Required",
      organization_id: "Required",
      stage: "Required",
      value: "Required",
    });
  });
  it("refuses a negative or fractional value", () => {
    expect(errors({ value: "-1" })).toEqual({ value: "Must be 0 or more" });
    expect(errors({ value: "12.5" })).toEqual({ value: "Enter a whole number" });
  });
  it("keeps probability between 0 and 100", () => {
    expect(errors({ probability: "101" })).toEqual({ probability: "Must be 100 or less" });
    expect(errors({ probability: "-5" })).toEqual({ probability: "Must be 0 or more" });
    expect(errors({ probability: "0" })).toEqual({});
  });
});
