// Smart typography replacement rules.
// Given a typed key and the text context before the cursor,
// returns the replacement character or null if no replacement.

export function getSmartReplacement(
  key: string,
  charBefore: string,
  twoBefore: string,
): { char: string; deleteCount: number } | null {
  // Em-dash: typed - after -
  if (key === "-" && charBefore === "-") {
    return { char: "\u2014", deleteCount: 1 };
  }

  // Smart double quotes
  if (key === '"') {
    const isOpening = charBefore === "" || /[\s(\[{]/.test(charBefore);
    return { char: isOpening ? "\u201C" : "\u201D", deleteCount: 0 };
  }

  // Smart single quotes
  if (key === "'") {
    const isApostrophe = /\w/.test(charBefore);
    const isOpening = charBefore === "" || /[\s(\[{]/.test(charBefore);
    return { char: isApostrophe || !isOpening ? "\u2019" : "\u2018", deleteCount: 0 };
  }

  // Ellipsis: typed . after ..
  if (key === "." && twoBefore === "..") {
    return { char: "\u2026", deleteCount: 2 };
  }

  return null;
}
