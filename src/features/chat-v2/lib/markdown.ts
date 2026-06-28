/**
 * Tiny markdown ↔ HTML helpers for the chat composer.
 * Composer stores markdown in DB (bodyText), renders as HTML for display.
 */

function escape(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Inline-only markdown → HTML. Supports **bold**, _italic_, ~~strike~~,
 * <u>underline</u>, [text](url), `code`, @mention, ordered/unordered lists,
 * and newlines. Output is escaped first, then markdown tokens are transformed.
 *
 * Pass selfToken (current user's name with whitespace removed) to colour
 * self-mentions differently from mentions of others.
 */
export function renderMarkdownInline(md: string, selfToken?: string): string {
  if (!md) return '';
  const lines = md.split('\n');
  const out: string[] = [];
  let inUl = false;
  let inOl = false;
  const self = (selfToken ?? '').trim().toLowerCase();

  const closeLists = () => {
    if (inUl) {
      out.push('</ul>');
      inUl = false;
    }
    if (inOl) {
      out.push('</ol>');
      inOl = false;
    }
  };

  for (const raw of lines) {
    const ulMatch = /^- (.+)$/.exec(raw);
    const olMatch = /^\d+\. (.+)$/.exec(raw);
    if (ulMatch) {
      if (inOl) {
        out.push('</ol>');
        inOl = false;
      }
      if (!inUl) {
        out.push('<ul style="margin:4px 0;padding-left:16px;">');
        inUl = true;
      }
      out.push(`<li>${transformInline(ulMatch[1], self)}</li>`);
      continue;
    }
    if (olMatch) {
      if (inUl) {
        out.push('</ul>');
        inUl = false;
      }
      if (!inOl) {
        out.push('<ol style="margin:4px 0;padding-left:16px;">');
        inOl = true;
      }
      out.push(`<li>${transformInline(olMatch[1], self)}</li>`);
      continue;
    }
    closeLists();
    if (raw === '') {
      out.push('<br/>');
    } else {
      out.push(transformInline(raw, self));
      out.push('<br/>');
    }
  }
  closeLists();

  let html = out.join('');
  if (html.endsWith('<br/>')) html = html.slice(0, -5);
  return html;
}

function transformInline(text: string, selfToken: string): string {
  let s = escape(text);
  s = s.replace(/`([^`]+)`/g, '<code style="font-family:var(--ds-font-family-code,monospace);background:var(--cv2-bg-row-active);padding:0px 4px;border-radius:3px;font-size:13px;">$1</code>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/~~([^~]+)~~/g, '<s>$1</s>');
  s = s.replace(/(^|[\s(>])_([^_]+)_(?=[\s)<.,!?]|$)/g, '$1<em>$2</em>');
  s = s.replace(/&lt;u&gt;([\s\S]+?)&lt;\/u&gt;/g, '<u>$1</u>');
  s = s.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" style="color:var(--cv2-text-link);text-decoration:none;">$1</a>',
  );
  // @mention pill — must run AFTER the link rule so URLs aren't mangled.
  // Pattern: an '@' preceded by start/whitespace/punctuation, followed by a
  // word token (letters / digits / underscore). Examples: @here, @MennaNasser.
  s = s.replace(
    /(^|[\s(>])@([A-Za-z][A-Za-z0-9_]*)/g,
    (_m, lead, token) => {
      const isSelf = selfToken !== '' && token.toLowerCase() === selfToken;
      return `${lead}<span class="cv2-mention" data-self="${isSelf}">@${token}</span>`;
    },
  );
  return s;
}

/**
 * Inline markdown → HTML for AI summary text. The LLM emits full names like
 * "@Adnan Ali" or "@Vikram Indla" that the single-token regex in
 * renderMarkdownInline truncates to "@Adnan", "@Vikram". This pass takes a
 * list of known participant full names and tokenises THOSE first (longest
 * first to avoid prefix collisions), then runs the standard single-token
 * pass for anything left over. Self-mention highlighting is keyed on the
 * caller's own full name (case-insensitive, exact match).
 */
export function renderSummaryInline(
  text: string,
  participantFullNames: string[],
  selfFullName: string,
): string {
  if (!text) return '';
  const self = (selfFullName ?? '').trim().toLowerCase();
  let s = escape(text);
  // Long-name mentions first. Sort descending by length so "@Adnan Ali" matches
  // before "@Adnan" could partial-match. Each match is parked behind a
  // placeholder token so the single-token fallback below can't re-enter it
  // (the closing '>' of the wrapper span would otherwise satisfy the lead
  // character class and split "@Vikram Indla" into a pill + plain "Indla").
  const sorted = (participantFullNames ?? [])
    .filter(n => !!n && n.trim().length > 0)
    .slice()
    .sort((a, b) => b.length - a.length);
  const parked: string[] = [];
  const park = (html: string): string => {
    const idx = parked.length;
    parked.push(html);
    return `MENTION_${idx}`;
  };
  for (const name of sorted) {
    const escName = escape(name);
    const isSelf = name.trim().toLowerCase() === self;
    const re = new RegExp(`@${escapeRegExp(escName)}`, 'g');
    s = s.replace(re, () =>
      park(`<span class="cv2-mention" data-self="${isSelf}">@${escName}</span>`),
    );
  }
  // Single-token fallback for "@token" the LLM emitted that wasn't in the
  // participant list (first-name-only references etc.).
  s = s.replace(
    /(^|[\s(>])@([A-Za-z][A-Za-z0-9_]*)/g,
    (_m, lead, token) => {
      const isSelf = self !== '' && token.toLowerCase() === self.replace(/\s+/g, '');
      return `${lead}${park(`<span class="cv2-mention" data-self="${isSelf}">@${token}</span>`)}`;
    },
  );
  // Bold / strike pass.
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/~~([^~]+)~~/g, '<s>$1</s>');
  // Restore parked mention spans.
  s = s.replace(/MENTION_(\d+)/g, (_m, idx) => parked[Number(idx)] ?? '');
  return s;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * contentEditable HTML → markdown. Walks the DOM and emits the inline
 * markdown variants that renderMarkdownInline understands. The composer
 * uses execCommand which produces <b><i><u><strike><a>... — convert back.
 */
export function htmlToMarkdown(html: string): string {
  if (!html) return '';
  const wrapper = document.createElement('div');
  wrapper.innerHTML = html;
  return walk(wrapper).trim();
}

function walk(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? '';
  if (node.nodeType !== Node.ELEMENT_NODE) return '';
  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();

  // Mention pill — composer inserts these as atomic spans with the bare
  // token in data-cv2-mention-token. Serialise back to "@token" so the
  // stored markdown stays human-readable and round-trips cleanly.
  if (tag === 'span' && el.classList.contains('cv2-mention')) {
    const token = el.getAttribute('data-cv2-mention-token') ?? (el.textContent ?? '').replace(/^@/, '');
    return token ? `@${token}` : '';
  }

  const inner = Array.from(el.childNodes).map(walk).join('');

  switch (tag) {
    case 'br':
      return '\n';
    case 'div':
    case 'p':
      return (inner.length && !inner.endsWith('\n') ? `${inner}\n` : inner);
    case 'b':
    case 'strong':
      return inner ? `**${inner}**` : '';
    case 'i':
    case 'em':
      return inner ? `_${inner}_` : '';
    case 'u':
      return inner ? `<u>${inner}</u>` : '';
    case 's':
    case 'strike':
    case 'del':
      return inner ? `~~${inner}~~` : '';
    case 'a': {
      const href = el.getAttribute('href') ?? '';
      return `[${inner}](${href})`;
    }
    case 'code':
      return inner ? `\`${inner}\`` : '';
    case 'ul':
      return Array.from(el.children)
        .map(li => `- ${walk(li).trim()}`)
        .join('\n') + '\n';
    case 'ol':
      return Array.from(el.children)
        .map((li, i) => `${i + 1}. ${walk(li).trim()}`)
        .join('\n') + '\n';
    case 'li':
      return inner;
    default:
      return inner;
  }
}
