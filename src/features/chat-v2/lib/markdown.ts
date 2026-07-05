/**
 * Tiny markdown ↔ HTML helpers for the chat composer.
 * Composer stores markdown in DB (bodyText), renders as HTML for display.
 */

function escape(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Inline-only markdown → HTML. Supports **bold**, _italic_, ~~strike~~,
 * <u>underline</u>, [text](url), `code`, ```fenced blocks```, @mention,
 * ordered/unordered lists, and newlines. Output is escaped first, then
 * markdown tokens are transformed.
 *
 * Pass selfToken (current user's name with whitespace removed) to colour
 * self-mentions differently from mentions of others.
 */
const CODE_BLOCK_STYLE = [
  'font-family:var(--ds-font-family-code,monospace)',
  'background:var(--cv2-bg-row-active)',
  'border:1px solid var(--cv2-border)',
  'border-radius:var(--cv2-radius-sm,4px)',
  'padding:var(--ds-space-100)',
  'margin:var(--ds-space-050) 0',
  'overflow-x:auto',
  'white-space:pre',
  'font-size:var(--ds-font-size-100,12px)',
  'line-height:1.5',
].join(';');

// Slack-style blockquote. Tokens only — no bare colors (COLOR LAW).
// Logical properties so the accent bar sits on the leading edge in BOTH
// directions: left for LTR (English) messages, right for RTL (Arabic) — the
// message carries dir="auto", so each blockquote follows its own text.
const QUOTE_STYLE = [
  'border-inline-start:4px solid var(--cv2-border-strong)',
  'padding-block:0',
  'padding-inline:var(--ds-space-150)',
  'margin:var(--ds-space-050) 0',
  'color:var(--cv2-text)',
].join(';');

export function renderMarkdownInline(md: string, selfToken?: string): string {
  if (!md) return '';
  const lines = md.split('\n');
  const out: string[] = [];
  let inUl = false;
  let inOl = false;
  let inFence = false;
  let fenceBuf: string[] = [];
  let inQuote = false;
  let quoteBuf: string[] = [];
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

  // One <blockquote> per contiguous run of "> " lines, inner lines joined
  // with <br/>. Buffer entries are already transformed inline HTML.
  const flushQuote = () => {
    out.push(`<blockquote style="${QUOTE_STYLE}">${quoteBuf.join('<br/>')}</blockquote>`);
    quoteBuf = [];
    inQuote = false;
  };

  // Code is always LTR regardless of the surrounding message direction.
  const flushFence = () => {
    out.push(`<pre dir="ltr" style="${CODE_BLOCK_STYLE}"><code>${escape(fenceBuf.join('\n'))}</code></pre>`);
    fenceBuf = [];
    inFence = false;
  };

  for (const raw of lines) {
    if (inFence) {
      const trailing = /^(.*?)```\s*$/.exec(raw);
      if (trailing) {
        if (trailing[1]) fenceBuf.push(trailing[1]);
        flushFence();
      } else {
        fenceBuf.push(raw);
      }
      continue;
    }
    // Blockquote line: "> content" or a bare ">". Quotes hold inline content
    // only — a fence opener inside a quote is NOT special. Checked before the
    // fence opener so "> ```" stays quote text.
    const quote = /^>(?: (.*))?$/.exec(raw);
    if (quote) {
      closeLists();
      inQuote = true;
      quoteBuf.push(transformInline(quote[1] ?? '', self));
      continue;
    }
    if (inQuote) flushQuote();
    // Opening fence. Slack-tolerant: content may share the opening line
    // ("```const x = 1;"), and a short word token is treated as a language
    // tag (dropped — no highlighting). One-line blocks ("```x = 1```") close
    // immediately.
    const open = /^```(.*)$/.exec(raw);
    if (open) {
      closeLists();
      inFence = true;
      let rest = open[1];
      const oneLine = /^(.*?)```\s*$/.exec(rest);
      if (oneLine) rest = oneLine[1];
      if (rest && !/^[A-Za-z0-9+#-]{1,15}$/.test(rest)) fenceBuf.push(rest);
      if (oneLine) flushFence();
      continue;
    }
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
  if (inQuote) flushQuote();
  closeLists();
  // Unterminated fence at EOF still renders as a block — a lie-free
  // best-effort beats silently dropping the user's code.
  if (inFence) flushFence();

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

  // Block-boundary-aware join: contentEditable keeps the FIRST line as a bare
  // text node and wraps subsequent lines in <div>s. A plain join('') glues
  // line 1 onto line 2 (the lost-first-newline bug — bit fences AND quotes).
  // Insert the missing newline whenever a block child follows inline content.
  const BLOCK_TAGS = new Set(['div', 'p', 'ul', 'ol', 'blockquote', 'pre']);
  let inner = '';
  for (const child of Array.from(el.childNodes)) {
    const childTag =
      child.nodeType === Node.ELEMENT_NODE ? (child as HTMLElement).tagName.toLowerCase() : '';
    if (BLOCK_TAGS.has(childTag) && inner.length > 0 && !inner.endsWith('\n')) {
      inner += '\n';
    }
    inner += walk(child);
  }

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
    case 'pre':
      return inner ? `\`\`\`\n${inner.replace(/\n$/, '')}\n\`\`\`\n` : '';
    case 'blockquote':
      return inner
        ? inner.replace(/\n$/, '').split('\n').map(line => `> ${line}`).join('\n') + '\n'
        : '';
    case 'code':
      // <code> inside <pre> is handled by the pre case (inner passes through).
      if (el.parentElement?.tagName.toLowerCase() === 'pre') return inner;
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
