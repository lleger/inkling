export interface TocHeading {
  id: string;
  level: 1 | 2 | 3 | 4 | 5 | 6;
  text: string;
  line: number;
  occurrence: number;
}

const headingRe = /^(#{1,6})\s+(.+?)\s*$/;
const fenceRe = /^\s*(```|~~~)/;
const inlineMarkdownRe = /[*_`~[\]()]/g;

export function parseTableOfContents(markdown: string): TocHeading[] {
  const headings: TocHeading[] = [];
  const slugCounts = new Map<string, number>();
  const textCounts = new Map<string, number>();
  let inFence = false;

  const lines = markdown.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (fenceRe.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const match = line.match(headingRe);
    if (!match) continue;

    const text = cleanHeadingText(match[2]);
    if (!text) continue;

    const textKey = normalizeHeadingText(text);
    const occurrence = (textCounts.get(textKey) ?? 0) + 1;
    textCounts.set(textKey, occurrence);

    const slug = slugify(text) || `heading-${i + 1}`;
    const slugCount = (slugCounts.get(slug) ?? 0) + 1;
    slugCounts.set(slug, slugCount);

    headings.push({
      id: slugCount === 1 ? slug : `${slug}-${slugCount}`,
      level: match[1].length as TocHeading["level"],
      text,
      line: i + 1,
      occurrence,
    });
  }

  return headings;
}

export function normalizeHeadingText(text: string): string {
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}

export function parseMarkdownHeadingLine(
  line: string,
): { level: TocHeading["level"]; text: string } | null {
  const match = line.match(headingRe);
  if (!match) return null;

  const text = cleanHeadingText(match[2]);
  if (!text) return null;

  return { level: match[1].length as TocHeading["level"], text };
}

function cleanHeadingText(text: string): string {
  return text
    .replace(/\s+#+\s*$/, "")
    .replace(inlineMarkdownRe, "")
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}
