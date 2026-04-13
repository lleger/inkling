// Normalize markdown after a round-trip through $convertToMarkdownString.
// That function inserts \n\n between all block elements, which breaks:
// - Tight lists (items should be separated by \n, not \n\n)
// - Tables (rows must be contiguous with no blank lines)
// - Heading → content flow
export function normalizeMarkdown(text: string): string {
  let result = text;

  // Compact loose lists: \n\n between consecutive list items → \n
  let prev = "";
  while (prev !== result) {
    prev = result;
    result = result.replace(
      /(^|\n)([ \t]*(?:[-*+]|\d+\.)[ \t]+.+)\n\n([ \t]*(?:[-*+]|\d+\.)[ \t]+)/gm,
      "$1$2\n$3",
    );
  }

  // Compact heading → tag line: \n\n between heading and #tag line → \n
  result = result.replace(/(^#{1,6}\s+.+)\n\n(#[a-zA-Z0-9_-]+)/gm, "$1\n$2");

  // Compact consecutive tag lines: \n\n between #tag lines → \n
  prev = "";
  while (prev !== result) {
    prev = result;
    result = result.replace(/(^#[a-zA-Z0-9_-]+(?:\s+#[a-zA-Z0-9_-]+)*)\n\n(#[a-zA-Z0-9_-]+)/gm, "$1\n$2");
  }

  // Compact table rows: \n\n between consecutive | ... | lines → \n
  prev = "";
  while (prev !== result) {
    prev = result;
    result = result.replace(/(^\|.+\|[^\S\n]*)\n\n(\|)/gm, "$1\n$2");
  }

  // General: collapse 3+ newlines to 2
  result = result.replace(/\n{3,}/g, "\n\n");
  // Trim trailing
  result = result.replace(/\n+$/, "");
  return result;
}
