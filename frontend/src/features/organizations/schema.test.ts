import { expect, it } from "vitest";
import { organizationSchema } from "./schema";

const errors = (input: Record<string, string>) => {
  const r = organizationSchema.safeParse({
    name: "Acme",
    website: "",
    industry: "",
    notes: "",
    ...input,
  });
  return r.success ? {} : Object.fromEntries(r.error.issues.map((i) => [i.path[0], i.message]));
};

it("needs a name (V1)", () => {
  expect(errors({ name: "  " })).toEqual({ name: "Required" });
});

it("accepts a website with or without http (V2)", () => {
  for (const website of ["acme.com", "https://acme.com", "http://www.acme.co.uk/about"])
    expect(errors({ website })).toEqual({});
  for (const website of ["acme", "not a site", "https://", "acme.c"])
    expect(errors({ website })).toEqual({ website: "Enter a website such as acme.com" });
});
