// Smart typography replacement rules.
// Given a typed key and the text context before the cursor,
// returns the replacement character or null if no replacement.

export function getSmartReplacement(
  key: string,
  charBefore: string,
  twoBefore: string,
  textBefore = charBefore,
): { char: string; deleteCount: number } | null {
  const emojiReplacement = getEmojiReplacement(textBefore + key);
  if (emojiReplacement) return emojiReplacement;

  // Em-dash: typed - after -
  if (key === "-" && charBefore === "-") {
    return { char: "\u2014", deleteCount: 1 };
  }

  // Smart double quotes
  if (key === '"') {
    const isOpening = charBefore === "" || /[\s([{]/.test(charBefore);
    return { char: isOpening ? "\u201C" : "\u201D", deleteCount: 0 };
  }

  // Smart single quotes
  if (key === "'") {
    const isApostrophe = /\w/.test(charBefore);
    const isOpening = charBefore === "" || /[\s([{]/.test(charBefore);
    return { char: isApostrophe || !isOpening ? "\u2019" : "\u2018", deleteCount: 0 };
  }

  // Ellipsis: typed . after ..
  if (key === "." && twoBefore === "..") {
    return { char: "\u2026", deleteCount: 2 };
  }

  return null;
}

const EMOTICON_EMOJI: Record<string, string> = {
  ":)": "🙂",
  ":-)": "🙂",
  ":(": "🙁",
  ":-(": "🙁",
  ":/": "😕",
  ":-/": "😕",
  ";)": "😉",
  ";-)": "😉",
  ":D": "😀",
  ":-D": "😀",
  ":P": "😛",
  ":-P": "😛",
  ":p": "😛",
  ":-p": "😛",
  ":|": "😐",
  ":-|": "😐",
  "<3": "❤️",
};

const SHORTCODE_EMOJI: Record<string, string> = {
  "+1": "👍🏻",
  thumbsup: "👍🏻",
  thumbs_up: "👍🏻",
  "-1": "👎🏻",
  thumbsdown: "👎🏻",
  thumbs_down: "👎🏻",
  smile: "😄",
  slightly_smiling_face: "🙂",
  frowning_face: "🙁",
  wink: "😉",
  joy: "😂",
  laughing: "😆",
  rofl: "🤣",
  heart: "❤️",
  fire: "🔥",
  tada: "🎉",
  eyes: "👀",
  thinking_face: "🤔",
  cry: "😢",
  sob: "😭",
  clap: "👏🏻",
  pray: "🙏🏻",
  ok_hand: "👌🏻",
  wave: "👋🏻",
  rocket: "🚀",
  check: "✅",
  white_check_mark: "✅",
  x: "❌",
  warning: "⚠️",
};

function getEmojiReplacement(textWithKey: string): { char: string; deleteCount: number } | null {
  for (const [token, char] of Object.entries(EMOTICON_EMOJI)) {
    if (endsWithToken(textWithKey, token)) return { char, deleteCount: token.length - 1 };
  }

  const shortcode = textWithKey.match(/:([a-z0-9_+-]+):$/i);
  if (!shortcode || !startsAtTokenBoundary(textWithKey, shortcode.index ?? 0)) return null;

  const char = SHORTCODE_EMOJI[shortcode[1].toLowerCase()];
  if (!char) return null;

  return { char, deleteCount: shortcode[0].length - 1 };
}

function endsWithToken(text: string, token: string) {
  if (!text.endsWith(token)) return false;
  return startsAtTokenBoundary(text, text.length - token.length);
}

function startsAtTokenBoundary(text: string, tokenStart: number) {
  return tokenStart === 0 || /[\s([{]/.test(text[tokenStart - 1]);
}
