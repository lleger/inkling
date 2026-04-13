import { describe, it, expect } from "vitest";
import { IS_BOLD, IS_ITALIC, IS_CODE, IS_STRIKETHROUGH } from "lexical";
import { parseMarkdownSegments, MARKER_STYLE } from "./markdown-highlight";

describe("parseMarkdownSegments", () => {
  it("returns single segment for plain text", () => {
    const segments = parseMarkdownSegments("hello world");
    expect(segments).toEqual([{ text: "hello world", format: 0, style: "" }]);
  });

  it("parses **bold** with dimmed markers", () => {
    const segments = parseMarkdownSegments("**bold**");
    expect(segments).toEqual([
      { text: "**", format: IS_BOLD, style: MARKER_STYLE },
      { text: "bold", format: IS_BOLD, style: "" },
      { text: "**", format: IS_BOLD, style: MARKER_STYLE },
    ]);
  });

  it("parses *italic*", () => {
    const segments = parseMarkdownSegments("*italic*");
    expect(segments).toEqual([
      { text: "*", format: IS_ITALIC, style: MARKER_STYLE },
      { text: "italic", format: IS_ITALIC, style: "" },
      { text: "*", format: IS_ITALIC, style: MARKER_STYLE },
    ]);
  });

  it("parses `code`", () => {
    const segments = parseMarkdownSegments("`code`");
    expect(segments).toEqual([
      { text: "`", format: IS_CODE, style: MARKER_STYLE },
      { text: "code", format: IS_CODE, style: "" },
      { text: "`", format: IS_CODE, style: MARKER_STYLE },
    ]);
  });

  it("parses ~~strikethrough~~", () => {
    const segments = parseMarkdownSegments("~~struck~~");
    expect(segments).toEqual([
      { text: "~~", format: IS_STRIKETHROUGH, style: MARKER_STYLE },
      { text: "struck", format: IS_STRIKETHROUGH, style: "" },
      { text: "~~", format: IS_STRIKETHROUGH, style: MARKER_STYLE },
    ]);
  });

  it("parses ***bold italic***", () => {
    const segments = parseMarkdownSegments("***both***");
    expect(segments).toEqual([
      { text: "***", format: IS_BOLD | IS_ITALIC, style: MARKER_STYLE },
      { text: "both", format: IS_BOLD | IS_ITALIC, style: "" },
      { text: "***", format: IS_BOLD | IS_ITALIC, style: MARKER_STYLE },
    ]);
  });

  it("handles bold and italic in same line", () => {
    const segments = parseMarkdownSegments("**bold** and *italic*");
    expect(segments).toHaveLength(7);
    // bold part
    expect(segments[0]).toEqual({ text: "**", format: IS_BOLD, style: MARKER_STYLE });
    expect(segments[1]).toEqual({ text: "bold", format: IS_BOLD, style: "" });
    expect(segments[2]).toEqual({ text: "**", format: IS_BOLD, style: MARKER_STYLE });
    // gap
    expect(segments[3]).toEqual({ text: " and ", format: 0, style: "" });
    // italic part
    expect(segments[4]).toEqual({ text: "*", format: IS_ITALIC, style: MARKER_STYLE });
    expect(segments[5]).toEqual({ text: "italic", format: IS_ITALIC, style: "" });
    expect(segments[6]).toEqual({ text: "*", format: IS_ITALIC, style: MARKER_STYLE });
  });

  it("handles text before and after formatting", () => {
    const segments = parseMarkdownSegments("hello **world** goodbye");
    expect(segments[0]).toEqual({ text: "hello ", format: 0, style: "" });
    expect(segments[4]).toEqual({ text: " goodbye", format: 0, style: "" });
  });

  it("returns plain text when no patterns match", () => {
    const segments = parseMarkdownSegments("no formatting here");
    expect(segments).toEqual([{ text: "no formatting here", format: 0, style: "" }]);
  });

  it("handles incomplete markers as plain text", () => {
    const segments = parseMarkdownSegments("just ** open");
    expect(segments).toEqual([{ text: "just ** open", format: 0, style: "" }]);
  });
});
