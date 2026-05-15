import { describe, expect, it } from "vitest";
import { parseMarkdownHeadingLine, parseTableOfContents } from "./table-of-contents";

describe("parseTableOfContents", () => {
  it("extracts markdown headings", () => {
    expect(parseTableOfContents("# Title\n\n## Section\n\n### Detail")).toEqual([
      { id: "title", level: 1, text: "Title", line: 1, occurrence: 1 },
      { id: "section", level: 2, text: "Section", line: 3, occurrence: 1 },
      { id: "detail", level: 3, text: "Detail", line: 5, occurrence: 1 },
    ]);
  });

  it("ignores headings inside fenced code blocks", () => {
    const input = "# Real\n\n```ts\n# Not a heading\n```\n\n## Also real";

    expect(parseTableOfContents(input).map((heading) => heading.text)).toEqual([
      "Real",
      "Also real",
    ]);
  });

  it("deduplicates slugs and tracks text occurrences", () => {
    expect(parseTableOfContents("## Intro\n\n### Intro\n\n## Intro")).toEqual([
      { id: "intro", level: 2, text: "Intro", line: 1, occurrence: 1 },
      { id: "intro-2", level: 3, text: "Intro", line: 3, occurrence: 2 },
      { id: "intro-3", level: 2, text: "Intro", line: 5, occurrence: 3 },
    ]);
  });

  it("cleans trailing hashes and simple inline markdown", () => {
    expect(parseTableOfContents("## **API** `keys` ##")[0]).toMatchObject({
      id: "api-keys",
      text: "API keys",
    });
  });
});

describe("parseMarkdownHeadingLine", () => {
  it("parses one heading line", () => {
    expect(parseMarkdownHeadingLine("### Roadmap")).toEqual({ level: 3, text: "Roadmap" });
  });

  it("returns null for non-heading lines", () => {
    expect(parseMarkdownHeadingLine("#tag #draft")).toBeNull();
  });
});
