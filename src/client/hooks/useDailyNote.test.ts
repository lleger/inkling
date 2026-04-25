import { describe, it, expect } from "vitest";
import { todayTitle } from "./useDailyNote";

describe("todayTitle", () => {
  it("formats as YYYY-MM-DD", () => {
    expect(todayTitle(new Date(2026, 0, 5))).toBe("2026-01-05");
    expect(todayTitle(new Date(2026, 11, 31))).toBe("2026-12-31");
    expect(todayTitle(new Date(2026, 3, 24))).toBe("2026-04-24");
  });

  it("zero-pads single-digit months and days", () => {
    expect(todayTitle(new Date(2026, 0, 1))).toBe("2026-01-01");
    expect(todayTitle(new Date(2026, 8, 9))).toBe("2026-09-09");
  });
});
