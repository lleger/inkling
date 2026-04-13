import { IS_BOLD, IS_ITALIC, IS_CODE, IS_STRIKETHROUGH } from "lexical";

export interface Segment {
  text: string;
  format: number;
  style: string;
}

export const MARKER_STYLE = "opacity: 0.45";

const HIGHLIGHT_PATTERNS: [RegExp, number][] = [
  [/\*\*\*(.+?)\*\*\*/g, IS_BOLD | IS_ITALIC],
  [/___(.+?)___/g, IS_BOLD | IS_ITALIC],
  [/\*\*(.+?)\*\*/g, IS_BOLD],
  [/__(.+?)__/g, IS_BOLD],
  [/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, IS_ITALIC],
  [/(?<!_)_(?!_)(.+?)(?<!_)_(?!_)/g, IS_ITALIC],
  [/`(.+?)`/g, IS_CODE],
  [/~~(.+?)~~/g, IS_STRIKETHROUGH],
];

export function parseMarkdownSegments(text: string): Segment[] {
  interface Span {
    start: number;
    end: number;
    format: number;
    markerLen: number;
  }

  const spans: Span[] = [];
  const consumed = new Set<number>();

  for (const [re, format] of HIGHLIGHT_PATTERNS) {
    re.lastIndex = 0;
    let match;
    while ((match = re.exec(text)) !== null) {
      const start = match.index;
      const end = start + match[0].length;
      let ok = true;
      for (let i = start; i < end; i++) {
        if (consumed.has(i)) {
          ok = false;
          break;
        }
      }
      if (!ok) {
        re.lastIndex = start + 1;
        continue;
      }
      for (let i = start; i < end; i++) consumed.add(i);
      const innerText = match[1];
      const markerLen = (match[0].length - innerText.length) / 2;
      spans.push({ start, end, format, markerLen });
    }
  }

  spans.sort((a, b) => a.start - b.start);

  const segments: Segment[] = [];
  let pos = 0;

  for (const span of spans) {
    if (span.start > pos) {
      segments.push({ text: text.slice(pos, span.start), format: 0, style: "" });
    }
    const openEnd = span.start + span.markerLen;
    segments.push({
      text: text.slice(span.start, openEnd),
      format: span.format,
      style: MARKER_STYLE,
    });
    const closeStart = span.end - span.markerLen;
    segments.push({
      text: text.slice(openEnd, closeStart),
      format: span.format,
      style: "",
    });
    segments.push({
      text: text.slice(closeStart, span.end),
      format: span.format,
      style: MARKER_STYLE,
    });
    pos = span.end;
  }

  if (pos < text.length) {
    segments.push({ text: text.slice(pos), format: 0, style: "" });
  }

  return segments.filter((s) => s.text.length > 0);
}
