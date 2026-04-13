// Convert smart typography back to plain ASCII for markdown mode.
export function plainifyTypography(text: string): string {
  return text
    .replace(/\u2014/g, "--") // em-dash → --
    .replace(/\u2013/g, "--") // en-dash → -- (same in plain text)
    .replace(/[\u201C\u201D]/g, '"') // smart double quotes → "
    .replace(/[\u2018\u2019]/g, "'") // smart single quotes → '
    .replace(/\u2026/g, "..."); // ellipsis → ...
}
