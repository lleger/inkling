import { describe, it, expect } from "vitest";
import { normalizeMarkdown } from "./normalize-markdown";

describe("normalizeMarkdown", () => {
  it("compacts loose unordered lists to tight", () => {
    const input = "- item one\n\n- item two\n\n- item three";
    expect(normalizeMarkdown(input)).toBe("- item one\n- item two\n- item three");
  });

  it("compacts loose ordered lists to tight", () => {
    const input = "1. first\n\n2. second\n\n3. third";
    expect(normalizeMarkdown(input)).toBe("1. first\n2. second\n3. third");
  });

  it("compacts mixed bullet markers", () => {
    const input = "* one\n\n* two\n\n* three";
    expect(normalizeMarkdown(input)).toBe("* one\n* two\n* three");
  });

  it("preserves blank lines between paragraphs", () => {
    const input = "First paragraph.\n\nSecond paragraph.";
    expect(normalizeMarkdown(input)).toBe("First paragraph.\n\nSecond paragraph.");
  });

  it("preserves blank line between heading and content", () => {
    const input = "# TODO\n\n* item one\n\n* item two";
    expect(normalizeMarkdown(input)).toBe("# TODO\n\n* item one\n* item two");
  });

  it("preserves blank line between list and paragraph", () => {
    const input = "- a\n\n- b\n\nSome text.";
    expect(normalizeMarkdown(input)).toBe("- a\n- b\n\nSome text.");
  });

  it("collapses 3+ newlines to 2", () => {
    const input = "hello\n\n\n\nworld";
    expect(normalizeMarkdown(input)).toBe("hello\n\nworld");
  });

  it("trims trailing newlines", () => {
    const input = "hello\n\n";
    expect(normalizeMarkdown(input)).toBe("hello");
  });

  it("handles empty string", () => {
    expect(normalizeMarkdown("")).toBe("");
  });

  it("handles content with no lists", () => {
    const input = "# Title\n\nJust a paragraph.";
    expect(normalizeMarkdown(input)).toBe("# Title\n\nJust a paragraph.");
  });

  it("handles task list items", () => {
    const input = "- [ ] todo\n\n- [x] done\n\n- [ ] another";
    expect(normalizeMarkdown(input)).toBe("- [ ] todo\n- [x] done\n- [ ] another");
  });

  it("handles indented nested lists", () => {
    const input = "- outer\n\n  - inner one\n\n  - inner two";
    expect(normalizeMarkdown(input)).toBe("- outer\n  - inner one\n  - inner two");
  });

  it("compacts table rows separated by blank lines", () => {
    const input = "| Name | Status |\n\n| --- | --- |\n\n| A | Done |\n\n| B | WIP |";
    expect(normalizeMarkdown(input)).toBe("| Name | Status |\n| --- | --- |\n| A | Done |\n| B | WIP |");
  });

  it("preserves blank line between table and surrounding content", () => {
    const input = "Some text.\n\n| A | B |\n\n| --- | --- |\n\n| 1 | 2 |\n\nMore text.";
    expect(normalizeMarkdown(input)).toBe("Some text.\n\n| A | B |\n| --- | --- |\n| 1 | 2 |\n\nMore text.");
  });

  it("handles table after heading", () => {
    const input = "# Title\n\n| Col |\n\n| --- |\n\n| Val |";
    expect(normalizeMarkdown(input)).toBe("# Title\n\n| Col |\n| --- |\n| Val |");
  });

  it("collapses blank lines inside fenced code blocks", () => {
    const input = "```js\nconst a = 1;\n\n\nconst b = 2;\n\n\nconst c = 3;\n```";
    expect(normalizeMarkdown(input)).toBe("```js\nconst a = 1;\nconst b = 2;\nconst c = 3;\n```");
  });

  it("collapses blank lines inside fence with no language", () => {
    const input = "```\nline1\n\nline2\n\nline3\n```";
    expect(normalizeMarkdown(input)).toBe("```\nline1\nline2\nline3\n```");
  });

  it("preserves content between code blocks", () => {
    const input = "```js\na;\n\nb;\n```\n\nMiddle.\n\n```py\nc\n\nd\n```";
    expect(normalizeMarkdown(input)).toBe("```js\na;\nb;\n```\n\nMiddle.\n\n```py\nc\nd\n```");
  });
});
