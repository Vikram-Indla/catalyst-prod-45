import type { ActiveField } from './voiceFlow.types';

/**
 * Insert `text` at the saved cursor position of `field`.
 *
 * Strategy per kind:
 *   input / textarea  → setRangeText at savedStart/End, dispatch synthetic events
 *   contenteditable   → restore cloned Range, execCommand('insertText') for ProseMirror compat
 *                       fallback: Range API + InputEvent
 */
export function insertTextIntoTarget(field: ActiveField, text: string): void {
  if (!text.trim()) return;
  const { element, kind, savedStart, savedEnd, savedRange } = field;

  try {
    if (kind === 'input') {
      // Single-line fields can't hold structure — flatten (S2).
      insertIntoInputLike(
        element as HTMLInputElement,
        text.replace(/\n+/g, ' ').replace(/ {2,}/g, ' '),
        savedStart,
        savedEnd,
      );
    } else if (kind === 'textarea') {
      insertIntoInputLike(element as HTMLTextAreaElement, text, savedStart, savedEnd);
    } else {
      insertIntoContentEditable(element, text, savedRange);
    }
  } catch (e) {
    console.warn('[VoiceFlow] insertTextIntoTarget failed:', e);
  }
}

function insertIntoInputLike(
  el: HTMLInputElement | HTMLTextAreaElement,
  text: string,
  start: number,
  end: number,
): void {
  el.focus();

  const safeStart = start < 0 ? el.value.length : Math.min(start, el.value.length);
  const safeEnd   = end   < 0 ? el.value.length : Math.min(end,   el.value.length);

  el.setSelectionRange(safeStart, safeEnd);
  el.setRangeText(text, safeStart, safeEnd, 'end');

  // Notify React (controlled inputs use synthetic events via Object.getOwnPropertyDescriptor trick)
  const proto = el instanceof HTMLTextAreaElement
    ? HTMLTextAreaElement.prototype
    : HTMLInputElement.prototype;
  const nativeSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  if (nativeSetter) {
    nativeSetter.call(el, el.value);
  }
  el.dispatchEvent(new Event('input',  { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

function insertIntoContentEditable(
  el: HTMLElement,
  text: string,
  savedRange: Range | null,
): void {
  el.focus();

  // Restore saved caret position
  if (savedRange) {
    try {
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(savedRange);
      }
    } catch {
      // Range stale — fall through, will insert at current caret
    }
  }

  // Structured text (S2): rich editors model paragraphs as nodes — a raw
  // "\n" inside insertText is ignored or collapses in ProseMirror. Insert
  // line-by-line with insertParagraph between lines so lists and paragraph
  // breaks land as real structure (Tiptap's input rules even auto-listify
  // "- " and "1. " prefixes typed this way).
  if (text.includes('\n')) {
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (i > 0 && !document.execCommand('insertParagraph', false)) {
        // Editor refused the break — flush the rest flat so every word
        // still lands exactly once (structure is nice-to-have, words are not).
        const rest = lines.slice(i).filter(Boolean).join(' ');
        if (rest) document.execCommand('insertText', false, ' ' + rest);
        return;
      }
      if (lines[i] && !document.execCommand('insertText', false, lines[i])) {
        const rest = lines.slice(i).filter(Boolean).join(' ');
        insertViaRangeFallback(el, i === 0 ? rest : ' ' + rest);
        return;
      }
    }
    return;
  }

  // execCommand works with ProseMirror: PM listens to InputEvent / MutationObserver
  // Deprecated but universally supported and the only reliable cross-engine method.
  const ok = document.execCommand('insertText', false, text);

  if (!ok) {
    insertViaRangeFallback(el, text);
  }
}

/** Last-resort insertion: Range API + InputEvent. */
function insertViaRangeFallback(el: HTMLElement, text: string): void {
  const sel = window.getSelection();
  if (!sel?.rangeCount) return;
  const range = sel.getRangeAt(0);
  range.deleteContents();
  const node = document.createTextNode(text);
  range.insertNode(node);
  range.setStartAfter(node);
  range.setEndAfter(node);
  sel.removeAllRanges();
  sel.addRange(range);
  el.dispatchEvent(new InputEvent('input', {
    bubbles: true,
    cancelable: true,
    data: text,
    inputType: 'insertText',
  }));
}

/** Capture current caret position from an already-focused element. */
export function captureFieldState(element: HTMLElement): {
  savedStart: number;
  savedEnd: number;
  savedRange: Range | null;
  savedValue: string | null;
} {
  const tag = element.tagName.toLowerCase();

  if (tag === 'input' || tag === 'textarea') {
    const el = element as HTMLInputElement;
    return {
      savedStart: el.selectionStart ?? el.value.length,
      savedEnd:   el.selectionEnd   ?? el.value.length,
      savedRange: null,
      savedValue: el.value,
    };
  }

  // contenteditable
  const sel = window.getSelection();
  if (sel?.rangeCount) {
    try {
      return {
        savedStart: -1,
        savedEnd:   -1,
        savedRange: sel.getRangeAt(0).cloneRange(),
        savedValue: null,
      };
    } catch {
      /* fall through */
    }
  }
  return { savedStart: -1, savedEnd: -1, savedRange: null, savedValue: null };
}

/**
 * Restore an input/textarea to its exact pre-activation state (value +
 * selection). Called on cancel so an aborted dictation session leaves the
 * field as it was — including the space removed by double-space activation.
 *
 * contenteditable is left alone: rewriting a rich editor's DOM from outside
 * corrupts its internal state (ProseMirror/BlockNote), and a cancelled
 * session never inserted into it anyway (inserts are status-guarded).
 * Returns true when a restore was applied.
 */
export function restoreFieldSnapshot(field: ActiveField): boolean {
  const { element, kind, savedValue, savedStart, savedEnd } = field;
  if (kind !== 'input' && kind !== 'textarea') return false;
  if (typeof savedValue !== 'string') return false;

  const el = element as HTMLInputElement | HTMLTextAreaElement;
  if (!el.isConnected || el.value === savedValue) return false;

  const proto = el instanceof HTMLTextAreaElement
    ? HTMLTextAreaElement.prototype
    : HTMLInputElement.prototype;
  const nativeSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  if (nativeSetter) nativeSetter.call(el, savedValue);
  else el.value = savedValue;

  try {
    const pos = Math.min(Math.max(savedStart, 0), savedValue.length);
    const end = Math.min(Math.max(savedEnd, pos), savedValue.length);
    el.setSelectionRange(pos, end);
  } catch { /* selection best-effort */ }

  el.dispatchEvent(new Event('input',  { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
}
