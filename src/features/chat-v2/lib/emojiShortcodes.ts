import { FREQUENTLY_USED, SECTIONS, type EmojiEntry } from '../components/EmojiPicker/emojiData';

const HARDCODED: Record<string, string> = {
  '+1': '👍',
  '-1': '👎',
  ':)': '🙂',
  ':(': '☹️',
  ':D': '😄',
  ';)': '😉',
  ':P': '😛',
  '<3': '❤️',
};

function toShortcode(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

let shortcodeMap: Record<string, string> | null = null;

function getMap(): Record<string, string> {
  if (shortcodeMap) return shortcodeMap;
  const out: Record<string, string> = { ...HARDCODED };
  const collect = (entries: EmojiEntry[]) => {
    for (const entry of entries) {
      const code = toShortcode(entry.name);
      if (code && !(code in out)) out[code] = entry.emoji;
      for (const kw of entry.keywords) {
        const kcode = toShortcode(kw);
        if (kcode && !(kcode in out)) out[kcode] = entry.emoji;
      }
    }
  };
  collect(FREQUENTLY_USED);
  for (const section of SECTIONS) collect(section.entries);
  shortcodeMap = out;
  return out;
}

const SHORTCODE_RE = /:([A-Za-z0-9_+\-]+):/g;

export function replaceEmojiShortcodes(text: string): string {
  if (!text || text.indexOf(':') === -1) return text;
  const map = getMap();
  return text.replace(SHORTCODE_RE, (full, code: string) => {
    const key = code.toLowerCase();
    return map[key] ?? full;
  });
}
