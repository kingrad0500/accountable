import { describe, expect, it } from "vitest";
import { formatDate, formatDateShort, initials, relativeTime, usd, usdShort } from "./format";

describe("money", () => {
  it("always shows its currency", () => {
    expect(usd(12500)).toBe("$12,500");
    expect(usd(0)).toBe("$0");
    expect(usd(1014000)).toBe("$1,014,000");
  });
  it("reads short", () => {
    expect(usdShort(59000)).toBe("$59k");
    expect(usdShort(58500)).toBe("$59k");
    expect(usdShort(1_200_000)).toBe("$1.2M");
    expect(usdShort(2_170_000)).toBe("$2.17M");
    expect(usdShort(800)).toBe("$800");
    expect(usdShort(999_999)).toBe("$1M");
  });
});

describe("dates", () => {
  it("read like 18 Nov 2026", () => {
    expect(formatDate("2026-11-18")).toBe("18 Nov 2026");
    expect(formatDate("2027-01-05")).toBe("5 Jan 2027");
  });
  it("drop the year when it's this year", () => {
    const now = new Date(2026, 10, 18);
    expect(formatDateShort("2026-11-12", now)).toBe("12 Nov");
    expect(formatDateShort("2027-02-12", now)).toBe("12 Feb 2027");
  });
  it("read relative", () => {
    const now = new Date(2026, 10, 18, 14, 0);
    expect(relativeTime(new Date(2026, 10, 15, 9, 0).toISOString(), now)).toBe("3 days ago");
    expect(relativeTime(new Date(2026, 10, 17, 20, 0).toISOString(), now)).toBe("Yesterday");
    expect(relativeTime(new Date(2026, 10, 18, 12, 0).toISOString(), now)).toBe("2 hours ago");
    expect(relativeTime(new Date(2026, 10, 18, 13, 55).toISOString(), now)).toBe("5 minutes ago");
    expect(relativeTime(new Date(2026, 10, 18, 14, 0).toISOString(), now)).toBe("Just now");
    expect(relativeTime(new Date(2026, 10, 1, 9, 0).toISOString(), now)).toBe("1 Nov");
  });
});

it("makes initials", () => {
  expect(initials("Ana Ruiz")).toBe("AR");
  expect(initials("Cher")).toBe("C");
  expect(initials(null)).toBe("");
});
