import { expect, it } from "vitest";
import { activitySchema } from "./schema";

const valid = {
  type: "call",
  description: "Spoke to Ana",
  occurred_at: "2026-11-18T14:30",
  follow_up_date: "",
};
const errors = (input: Partial<typeof valid>) => {
  const r = activitySchema.safeParse({ ...valid, ...input });
  return r.success ? {} : Object.fromEntries(r.error.issues.map((i) => [i.path[0], i.message]));
};

it("needs a type, description and date (V1)", () => {
  expect(errors({ type: "" as never, description: " ", occurred_at: "" })).toEqual({
    type: "Required",
    description: "Required",
    occurred_at: "Required",
  });
});

it("sends the time as UTC and a blank follow-up as none", () => {
  const out = activitySchema.parse(valid);
  expect(out.occurred_at).toBe(new Date("2026-11-18T14:30").toISOString());
  expect(out.follow_up_date).toBeNull();
});
