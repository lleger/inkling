import { describe, it, expect } from "vitest";
import { parseTags, isTagZoneLine } from "./parse-tags";

describe("isTagZoneLine", () => {
  it("returns true for tag-only lines", () => {
    expect(isTagZoneLine("#project #draft")).toBe(true);
    expect(isTagZoneLine("#solo")).toBe(true);
    expect(isTagZoneLine("  #a #b  ")).toBe(true);
  });

  it("returns false for non-tag lines", () => {
    expect(isTagZoneLine("hello world")).toBe(false);
    expect(isTagZoneLine("#tag and text")).toBe(false);
    expect(isTagZoneLine("")).toBe(false);
  });
});

describe("parseTags", () => {
  it("extracts tags after heading", () => {
    expect(parseTags("# Title\n#project #draft\n\nBody")).toEqual(["project", "draft"]);
  });

  it("handles multiple tag lines", () => {
    expect(parseTags("# Title\n#a #b\n#c\n\nBody")).toEqual(["a", "b", "c"]);
  });

  it("tolerates blank line between heading and tags", () => {
    expect(parseTags("# Title\n\n#project\n\nBody")).toEqual(["project"]);
  });

  it("stops at blank line after tag zone", () => {
    expect(parseTags("# Title\n#a\n\n#notag\n\nBody")).toEqual(["a"]);
  });

  it("stops at non-tag content", () => {
    expect(parseTags("# Title\nSome text #a\n\nBody")).toEqual([]);
  });

  it("returns empty for no heading", () => {
    expect(parseTags("No heading\n#project")).toEqual([]);
  });

  it("returns empty for empty string", () => {
    expect(parseTags("")).toEqual([]);
  });

  it("deduplicates tags", () => {
    expect(parseTags("# Title\n#a #a #b")).toEqual(["a", "b"]);
  });

  it("lowercases tags", () => {
    expect(parseTags("# Title\n#Project #DRAFT")).toEqual(["project", "draft"]);
  });

  it("ignores body hashtags", () => {
    expect(parseTags("# Title\n#real\n\nBody #notag here")).toEqual(["real"]);
  });

  it("supports h2-h6 headings", () => {
    expect(parseTags("## Section\n#tag")).toEqual(["tag"]);
  });

  it("supports hyphenated tags", () => {
    expect(parseTags("# Title\n#my-tag #another-one")).toEqual(["my-tag", "another-one"]);
  });
});
