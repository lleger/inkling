import { normalizeMarkdown } from "./normalize-markdown";

export function clearDoneTasks(markdown: string): string {
  const lines = markdown.split("\n");
  const result: string[] = [];
  let skipIndent = -1;

  for (const line of lines) {
    const trimmed = line.trimStart();
    const currentIndent = line.length - trimmed.length;

    // If we're skipping sub-content of a removed item
    if (skipIndent >= 0) {
      if (trimmed.length === 0 || currentIndent > skipIndent) {
        continue;
      }
      skipIndent = -1;
    }

    // Check if this is a completed task
    if (/^- \[x\] /i.test(trimmed)) {
      skipIndent = currentIndent;
      continue;
    }

    result.push(line);
  }

  return normalizeMarkdown(result.join("\n"));
}
