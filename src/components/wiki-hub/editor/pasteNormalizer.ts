/**
 * pasteNormalizer — Notion-grade paste for the Wiki editor
 * (CAT-DOCS-NOTION-20260704-001 gap-closure P0a).
 *
 * Google Docs and Word paste inline-styled span/`<b id="docs-internal-
 * guid">` soup that ProseMirror parses poorly. This pure-function
 * normalizer rewrites their dialects into semantic HTML BEFORE
 * BlockNote's HTML parser sees it:
 *   - unwraps the GDocs internal-guid <b> wrapper
 *   - font-weight ≥ 600 → <strong>, font-style italic → <em>,
 *     text-decoration underline/line-through → <u>/<s>
 *   - Word MsoListParagraph runs → real <ul>/<ol><li> lists
 *   - strips vendor classes, mso-* styles, empty spans, <o:p> tags
 *
 * Everything else (markdown, plain text, real HTML, Notion's clean
 * export) passes through to the default handler untouched.
 */

export function isVendorHtml(html: string): boolean {
  return /docs-internal-guid|mso-|class="?Mso|urn:schemas-microsoft-com/i.test(html);
}

function styleOf(el: HTMLElement): CSSStyleDeclaration {
  return el.style;
}

function unwrap(el: Element): void {
  const parent = el.parentNode;
  if (!parent) return;
  while (el.firstChild) parent.insertBefore(el.firstChild, el);
  parent.removeChild(el);
}

function wrapInner(el: HTMLElement, tag: string): void {
  const wrapper = el.ownerDocument.createElement(tag);
  while (el.firstChild) wrapper.appendChild(el.firstChild);
  el.appendChild(wrapper);
}

/** GDocs/Word inline styles → semantic tags, applied to every styled span/b. */
function semanticizeInline(root: HTMLElement): void {
  root.querySelectorAll<HTMLElement>('span, b, i, font').forEach((el) => {
    const s = styleOf(el);
    const weight = s.fontWeight;
    const isBold =
      weight === 'bold' || (Number(weight) >= 600 && weight !== '') ||
      (el.tagName === 'B' && s.fontWeight !== 'normal');
    const isItalic = s.fontStyle === 'italic' || el.tagName === 'I';
    const deco = s.textDecoration || s.textDecorationLine || '';
    if (isBold) wrapInner(el, 'strong');
    if (isItalic) wrapInner(el, 'em');
    if (/underline/.test(deco)) wrapInner(el, 'u');
    if (/line-through/.test(deco)) wrapInner(el, 's');
  });
}

/** Word list paragraphs (MsoListParagraph, mso-list styles) → real lists. */
function listifyWord(root: HTMLElement): void {
  const doc = root.ownerDocument;
  const isListPara = (el: Element): boolean =>
    /MsoListParagraph/i.test(el.className) ||
    /mso-list:/i.test(el.getAttribute('style') ?? '');

  const paras = Array.from(root.querySelectorAll('p')).filter(isListPara);
  let currentList: HTMLElement | null = null;
  let currentOrdered = false;

  paras.forEach((p) => {
    const text = p.textContent ?? '';
    // Word puts the bullet/number glyph in a mso-list "ignore" span:
    // "· item" / "1. item" / "a) item"
    const ordered = /^\s*(\d+[.)]|[a-z][.)])\s/i.test(text);
    const li = doc.createElement('li');
    // Drop the glyph prefix.
    li.innerHTML = p.innerHTML;
    li.querySelectorAll('[style*="mso-list" i], span[lang]').forEach((n) => {
      if (/^[\s·•\-\d.()a-z]*$/i.test(n.textContent ?? '') && (n.textContent ?? '').length <= 5) n.remove();
    });
    const startsFresh = !currentList || currentOrdered !== ordered || p.previousElementSibling !== currentList;
    if (startsFresh) {
      currentList = doc.createElement(ordered ? 'ol' : 'ul');
      currentOrdered = ordered;
      p.parentNode?.insertBefore(currentList, p);
    }
    currentList!.appendChild(li);
    p.remove();
  });
}

/** Remove vendor noise that confuses the parser. */
function stripNoise(root: HTMLElement): void {
  // GDocs wraps everything in <b id="docs-internal-guid-..."> — not bold.
  root.querySelectorAll('b[id^="docs-internal-guid"]').forEach(unwrap);
  // Word XML islands and comments-ish tags.
  root.querySelectorAll('o\\:p, xml, style, meta, link').forEach((el) => el.remove());
  // Vendor classes/styles carry no meaning after semanticize.
  root.querySelectorAll<HTMLElement>('[class], [style]').forEach((el) => {
    el.removeAttribute('class');
    el.removeAttribute('style');
  });
  // Spans that now carry nothing.
  root.querySelectorAll('span, font').forEach((el) => {
    if (!el.attributes.length) unwrap(el);
  });
}

/**
 * Normalize vendor HTML into semantic HTML. Pure function — safe to unit
 * test with fixture strings.
 */
export function normalizeVendorHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const body = doc.body;
  semanticizeInline(body);
  listifyWord(body);
  stripNoise(body);
  return body.innerHTML;
}

/**
 * BlockNote pasteHandler: intercept GDocs/Word HTML, normalize, and feed
 * the cleaned HTML back through editor.pasteHTML. Everything else defers
 * to the default handler (markdown-priority behavior preserved).
 */
export function wikiPasteHandler(context: {
  event: ClipboardEvent;
  editor: { pasteHTML: (html: string) => void };
  defaultPasteHandler: (o?: { prioritizeMarkdownOverHTML?: boolean; plainTextAsMarkdown?: boolean }) => boolean | undefined;
}): boolean | undefined {
  const html = context.event.clipboardData?.getData('text/html');
  if (html && isVendorHtml(html)) {
    try {
      context.editor.pasteHTML(normalizeVendorHtml(html));
      return true;
    } catch {
      return context.defaultPasteHandler();
    }
  }
  return context.defaultPasteHandler();
}
