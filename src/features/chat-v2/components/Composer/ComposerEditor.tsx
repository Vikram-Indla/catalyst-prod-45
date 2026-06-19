import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';

interface ComposerEditorProps {
  /** Markdown source. Composer owns the value; editor mounts it once and emits markdown out. */
  value: string;
  onChange: (markdown: string) => void;
  onSubmit: () => void;
  placeholder: string;
  /** Fired when caret sits inside a "@query" trigger token. null when no trigger active. */
  onMentionTrigger?: (state: { query: string; anchorRect: DOMRect } | null) => void;
}

export interface ComposerEditorHandle {
  focus: () => void;
  toggleFormat: (action: FormatAction) => void;
  insertText: (text: string) => void;
  insertEmoji: (emoji: string) => void;
  setMarkdown: (markdown: string) => void;
  getHtml: () => string;
  /** Replace the current "@query" token (preceding the caret) with the given replacement text. */
  replaceMentionToken: (replacement: string) => void;
}

export type FormatAction = 'bold' | 'italic' | 'underline' | 'strike' | 'link' | 'ol' | 'ul';

const ACTION_TO_COMMAND: Record<FormatAction, string | null> = {
  bold: 'bold',
  italic: 'italic',
  underline: 'underline',
  strike: 'strikethrough',
  link: null,
  ol: 'insertOrderedList',
  ul: 'insertUnorderedList',
};

/**
 * contentEditable rich text composer.
 * - execCommand applies visual formatting (B/I/U/S, ol/ul, links).
 * - onChange emits markdown derived from current HTML (composer converts back on send).
 */
export const ComposerEditor = forwardRef<ComposerEditorHandle, ComposerEditorProps>(
  function ComposerEditor({ value, onChange, onSubmit, placeholder, onMentionTrigger }, ref) {
    const editorRef = useRef<HTMLDivElement>(null);
    const [empty, setEmpty] = useState(true);
    const lastEmitRef = useRef('');

    const detectMentionTrigger = () => {
      if (!onMentionTrigger) return;
      const trigger = readMentionTrigger();
      onMentionTrigger(trigger);
    };

    useEffect(() => {
      const el = editorRef.current;
      if (!el) return;
      if (value === '' && lastEmitRef.current !== '') {
        el.innerHTML = '';
        setEmpty(true);
        lastEmitRef.current = '';
      }
    }, [value]);

    const emitChange = () => {
      const el = editorRef.current;
      if (!el) return;
      const html = el.innerHTML;
      const md = htmlToMarkdownLight(html);
      lastEmitRef.current = md;
      setEmpty(!el.textContent || el.textContent.trim() === '');
      onChange(md);
      detectMentionTrigger();
    };

    useImperativeHandle(ref, () => ({
      focus: () => {
        editorRef.current?.focus();
        placeCursorAtEnd(editorRef.current);
      },
      toggleFormat: (action: FormatAction) => applyFormat(editorRef.current, action, emitChange),
      insertText: (text: string) => {
        editorRef.current?.focus();
        document.execCommand('insertText', false, text);
        emitChange();
      },
      insertEmoji: (emoji: string) => {
        editorRef.current?.focus();
        document.execCommand('insertText', false, emoji);
        emitChange();
      },
      setMarkdown: (markdown: string) => {
        const el = editorRef.current;
        if (!el) return;
        el.innerHTML = markdown ? markdownToHtmlLight(markdown) : '';
        lastEmitRef.current = markdown;
        setEmpty(!markdown);
      },
      getHtml: () => editorRef.current?.innerHTML ?? '',
      replaceMentionToken: (replacement: string) => {
        replaceMentionAtCaret(editorRef.current, replacement);
        emitChange();
      },
    }));

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Enter' && !e.shiftKey && !e.altKey && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        onSubmit();
        return;
      }
      if (e.metaKey || e.ctrlKey) {
        const k = e.key.toLowerCase();
        if (k === 'b') {
          e.preventDefault();
          applyFormat(editorRef.current, 'bold', emitChange);
        } else if (k === 'i') {
          e.preventDefault();
          applyFormat(editorRef.current, 'italic', emitChange);
        } else if (k === 'u') {
          e.preventDefault();
          applyFormat(editorRef.current, 'underline', emitChange);
        } else if (k === 'k') {
          e.preventDefault();
          applyFormat(editorRef.current, 'link', emitChange);
        }
      }
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
      e.preventDefault();
      const text = e.clipboardData.getData('text/plain');
      document.execCommand('insertText', false, text);
      emitChange();
    };

    const handleKeyUp = () => {
      detectMentionTrigger();
    };

    const handleClick = () => {
      detectMentionTrigger();
    };

    return (
      <div style={{ position: 'relative' }}>
        {empty && (
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: 10,
              left: 14,
              color: 'var(--cv2-text-muted)',
              fontFamily: 'var(--cv2-font)',
              fontSize: 'var(--cv2-fs-composer)',
              fontWeight: 400,
              pointerEvents: 'none',
              userSelect: 'none',
            }}
          >
            {placeholder}
          </span>
        )}
        <div
          ref={editorRef}
          role="textbox"
          aria-label={placeholder}
          aria-multiline="true"
          contentEditable
          suppressContentEditableWarning
          onInput={emitChange}
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
          onClick={handleClick}
          onPaste={handlePaste}
          style={{
            minHeight: 40,
            maxHeight: 240,
            overflowY: 'auto',
            padding: '10px 14px',
            background: 'transparent',
            color: 'var(--cv2-text-strong)',
            outline: 'none',
            fontFamily: 'var(--cv2-font)',
            fontSize: 'var(--cv2-fs-composer)',
            fontWeight: 400,
            lineHeight: 1.45,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        />
      </div>
    );
  },
);

function applyFormat(el: HTMLElement | null, action: FormatAction, emit: () => void) {
  if (!el) return;
  el.focus();
  if (action === 'link') {
    const sel = window.getSelection();
    if (!sel || sel.toString() === '') {
      const url = window.prompt('Link URL', 'https://');
      if (!url) return;
      const label = window.prompt('Link text', url) ?? url;
      document.execCommand('insertHTML', false,
        `<a href="${escapeAttr(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`);
    } else {
      const url = window.prompt('Link URL', 'https://');
      if (!url) return;
      document.execCommand('createLink', false, url);
    }
  } else {
    const cmd = ACTION_TO_COMMAND[action];
    if (cmd) document.execCommand(cmd, false);
  }
  emit();
}

function placeCursorAtEnd(el: HTMLElement | null) {
  if (!el) return;
  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(false);
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/"/g, '&quot;');
}

/* Markdown ⇄ HTML conversions kept small to avoid a heavy parser dep.
 * The editor mirrors what renderMarkdownInline + htmlToMarkdown in lib/markdown.ts
 * understand, just enough to round-trip B/I/U/S/link/ol/ul/code. */

function htmlToMarkdownLight(html: string): string {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  const md = walk(tmp).replace(/\n{3,}/g, '\n\n').trim();
  return md;
}

function walk(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? '';
  if (node.nodeType !== Node.ELEMENT_NODE) return '';
  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();
  const inner = Array.from(el.childNodes).map(walk).join('');
  switch (tag) {
    case 'br': return '\n';
    case 'div':
    case 'p': return inner + (inner.endsWith('\n') ? '' : '\n');
    case 'b':
    case 'strong': return inner ? `**${inner}**` : '';
    case 'i':
    case 'em': return inner ? `_${inner}_` : '';
    case 'u': return inner ? `<u>${inner}</u>` : '';
    case 's':
    case 'strike':
    case 'del': return inner ? `~~${inner}~~` : '';
    case 'a': return `[${inner}](${el.getAttribute('href') ?? ''})`;
    case 'code': return inner ? `\`${inner}\`` : '';
    case 'ul': return Array.from(el.children).map(li => `- ${walk(li).trim()}`).join('\n') + '\n';
    case 'ol': return Array.from(el.children).map((li, i) => `${i + 1}. ${walk(li).trim()}`).join('\n') + '\n';
    case 'li': return inner;
    default: return inner;
  }
}

function markdownToHtmlLight(md: string): string {
  const lines = md.split('\n');
  const out: string[] = [];
  let inUl = false;
  let inOl = false;
  const close = () => {
    if (inUl) { out.push('</ul>'); inUl = false; }
    if (inOl) { out.push('</ol>'); inOl = false; }
  };
  for (const line of lines) {
    const ul = /^- (.+)$/.exec(line);
    const ol = /^\d+\. (.+)$/.exec(line);
    if (ul) {
      if (inOl) { out.push('</ol>'); inOl = false; }
      if (!inUl) { out.push('<ul>'); inUl = true; }
      out.push(`<li>${inlineMd(ul[1])}</li>`);
      continue;
    }
    if (ol) {
      if (inUl) { out.push('</ul>'); inUl = false; }
      if (!inOl) { out.push('<ol>'); inOl = true; }
      out.push(`<li>${inlineMd(ol[1])}</li>`);
      continue;
    }
    close();
    if (line === '') out.push('<br>');
    else out.push(`<div>${inlineMd(line)}</div>`);
  }
  close();
  return out.join('');
}

/** Reads the "@query" token immediately preceding the caret, if any.
 *  Returns null when the caret is not inside a mention trigger. */
function readMentionTrigger(): { query: string; anchorRect: DOMRect } | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || !sel.isCollapsed) return null;
  const range = sel.getRangeAt(0);
  const node = range.startContainer;
  if (node.nodeType !== Node.TEXT_NODE) return null;
  const text = node.textContent ?? '';
  const offset = range.startOffset;
  const upToCaret = text.slice(0, offset);
  const atIdx = upToCaret.lastIndexOf('@');
  if (atIdx < 0) return null;
  const after = upToCaret.slice(atIdx + 1);
  // Mention token cannot contain whitespace
  if (/\s/.test(after)) return null;
  // Don't trigger on email addresses (something before '@' without whitespace)
  if (atIdx > 0) {
    const prevChar = upToCaret[atIdx - 1];
    if (prevChar && !/\s/.test(prevChar)) return null;
  }
  const triggerRange = document.createRange();
  triggerRange.setStart(node, atIdx);
  triggerRange.setEnd(node, offset);
  const rect = triggerRange.getBoundingClientRect();
  return { query: after, anchorRect: rect };
}

/** Replaces the "@query" token preceding the caret with an atomic mention
 *  pill — a contenteditable=false span styled like the rendered mention,
 *  followed by a single space, with the caret placed after the space.
 *  `replacement` is the full "@Token " string the picker would have inserted
 *  (e.g. "@MennaNasser "); we strip the trailing space and the leading "@"
 *  to derive the token used inside the span. */
function replaceMentionAtCaret(root: HTMLElement | null, replacement: string) {
  if (!root) return;
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  const range = sel.getRangeAt(0);
  const node = range.startContainer;
  if (node.nodeType !== Node.TEXT_NODE) return;
  const text = node.textContent ?? '';
  const offset = range.startOffset;
  const upToCaret = text.slice(0, offset);
  const atIdx = upToCaret.lastIndexOf('@');
  if (atIdx < 0) return;

  // Extract the bare token (without leading '@' or trailing space).
  const rawToken = replacement.replace(/^@/, '').replace(/\s+$/, '');
  if (!rawToken) return;

  // Split the text node at the '@' position. Keep the "before" portion in
  // the original node, drop the "@query" piece entirely, then insert a
  // styled <span class="cv2-mention"> with @token + a trailing space text
  // node. The whole span is an atomic unit (contenteditable=false) so it
  // gets deleted as a single character with one backspace.
  const before = text.slice(0, atIdx);
  const after = text.slice(offset);
  node.textContent = before;

  const span = document.createElement('span');
  span.className = 'cv2-mention';
  span.setAttribute('data-self', 'false');
  span.setAttribute('data-cv2-mention-token', rawToken);
  span.setAttribute('contenteditable', 'false');
  span.textContent = `@${rawToken}`;

  // Wrap "after" + a leading space so the caret can land beyond the pill.
  const tail = document.createTextNode(` ${after}`);

  const parent = node.parentNode!;
  parent.insertBefore(span, node.nextSibling);
  parent.insertBefore(tail, span.nextSibling);

  // Place caret one position into the tail text node (just after the NBSP).
  const newRange = document.createRange();
  newRange.setStart(tail, 1);
  newRange.collapse(true);
  sel.removeAllRanges();
  sel.addRange(newRange);
}

function inlineMd(s: string): string {
  let v = escapeHtml(s);
  v = v.replace(/`([^`]+)`/g, '<code>$1</code>');
  v = v.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  v = v.replace(/~~([^~]+)~~/g, '<s>$1</s>');
  v = v.replace(/_([^_]+)_/g, '<em>$1</em>');
  v = v.replace(/&lt;u&gt;([\s\S]+?)&lt;\/u&gt;/g, '<u>$1</u>');
  v = v.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
  // Mention pills — rehydrate '@token' back into atomic spans so editing an
  // existing draft preserves the pill UX.
  v = v.replace(
    /(^|[\s(>])@([A-Za-z][A-Za-z0-9_]*)/g,
    (_m, lead, token) =>
      `${lead}<span class="cv2-mention" data-self="false" data-cv2-mention-token="${token}" contenteditable="false">@${token}</span>`,
  );
  return v;
}
