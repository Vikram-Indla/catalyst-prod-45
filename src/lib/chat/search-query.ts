/**
 * search-query — chat search operator parser.
 *
 * Supported operators (Slack-style, SLACK_BEHAVIOR_SPEC §10):
 *   from:@name   — author filter
 *   in:#channel  — channel filter
 *   key:BAU-123  — ticket key filter (uppercased)
 *   "exact"      — exact phrase
 *   -term        — exclusion (leading hyphen on a standalone token)
 */
export interface ParsedChatSearchQuery {
  text: string;
  phrases: string[];
  exclude: string[];
  from: string[];
  channels: string[];
  keys: string[];
}

export function parseChatSearchQuery(input: string): ParsedChatSearchQuery {
  const result: ParsedChatSearchQuery = {
    text: '',
    phrases: [],
    exclude: [],
    from: [],
    channels: [],
    keys: [],
  };

  let rest = input;

  // Quoted phrases first (only complete pairs)
  rest = rest.replace(/"([^"]*)"/g, (_m, p: string) => {
    if (p.trim()) result.phrases.push(p.trim());
    return ' ';
  });
  // Unterminated quote: drop the quote char, keep text
  rest = rest.replace(/"/g, '');

  const terms: string[] = [];
  for (const token of rest.split(/\s+/)) {
    if (!token) continue;
    const lower = token.toLowerCase();
    if (lower.startsWith('from:')) {
      const v = token.slice(5).replace(/^@/, '');
      if (v) result.from.push(v);
    } else if (lower.startsWith('in:')) {
      const v = token.slice(3).replace(/^#/, '');
      if (v) result.channels.push(v);
    } else if (lower.startsWith('key:')) {
      const v = token.slice(4).toUpperCase();
      if (v) result.keys.push(v);
    } else if (token.startsWith('-') && token.length > 1) {
      result.exclude.push(token.slice(1));
    } else {
      terms.push(token);
    }
  }

  result.text = terms.join(' ');
  return result;
}
