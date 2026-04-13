const TAG_RE = /^#([a-zA-Z0-9_-]+)$/;

export function isTagZoneLine(line: string): boolean {
  const tokens = line.trim().split(/\s+/);
  if (tokens.length === 0 || (tokens.length === 1 && tokens[0] === "")) return false;
  return tokens.every((t) => TAG_RE.test(t));
}

export function parseTags(content: string): string[] {
  const lines = content.split("\n");
  let headingFound = false;
  let foundFirstTag = false;
  const tags: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    if (!headingFound) {
      if (/^#{1,6}\s+/.test(trimmed)) headingFound = true;
      continue;
    }

    // Skip blank lines between heading and tag zone
    if (trimmed.length === 0) {
      if (foundFirstTag) break; // blank after tags ends the zone
      continue; // blank before tags, keep looking
    }

    if (isTagZoneLine(trimmed)) {
      foundFirstTag = true;
      const tokens = trimmed.split(/\s+/);
      for (const t of tokens) {
        const match = t.match(TAG_RE);
        if (match) tags.push(match[1].toLowerCase());
      }
      continue;
    }

    break;
  }

  return [...new Set(tags)];
}
