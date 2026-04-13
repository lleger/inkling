import { describe, it, expect } from "vitest";
import { plainifyTypography } from "./plain-typography";

describe("plainifyTypography", () => {
  it("converts em-dash to --", () => {
    expect(plainifyTypography("hello\u2014world")).toBe("hello--world");
  });

  it("converts en-dash to --", () => {
    expect(plainifyTypography("1\u20135")).toBe("1--5");
  });

  it("converts smart double quotes to straight", () => {
    expect(plainifyTypography("\u201CHello\u201D")).toBe('"Hello"');
  });

  it("converts smart single quotes to straight", () => {
    expect(plainifyTypography("\u2018Hello\u2019")).toBe("'Hello'");
  });

  it("converts apostrophes", () => {
    expect(plainifyTypography("don\u2019t")).toBe("don't");
  });

  it("converts ellipsis to three dots", () => {
    expect(plainifyTypography("wait\u2026")).toBe("wait...");
  });

  it("handles mixed smart typography", () => {
    expect(plainifyTypography("\u201CHe said\u2014\u2018wait\u2026\u2019\u201D")).toBe(
      '"He said--\'wait...\'\"',
    );
  });

  it("passes through plain text unchanged", () => {
    expect(plainifyTypography("hello world")).toBe("hello world");
  });
});
