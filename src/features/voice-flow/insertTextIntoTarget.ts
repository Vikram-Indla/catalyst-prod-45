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
    if (kind === 'input' || kind === 'textarea') {
      insertIntoInputLike(element as HTMLInputElement | HTMLTextAreaElement, text, savedStart, savedEnd);
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

  // execCommand works with ProseMirror: PM listens to InputEvent / MutationObserver
  // Deprecated but universally supported and the only reliable cross-engine method.
  const ok = document.execCommand('insertText', false, text);

  if (!ok) {
    // Fallback: Range API + InputEvent
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
}

/** Capture current caret position from an already-focused element. */
export function captureFieldState(element: HTMLElement): {
  savedStart: number;
  savedEnd: number;
  savedRange: Range | null;
} {
  const tag = element.tagName.toLowerCase();

  if (tag === 'input' || tag === 'textarea') {
    const el = element as HTMLInputElement;
    return {
      savedStart: el.selectionStart ?? el.value.length,
      savedEnd:   el.selectionEnd   ?? el.value.length,
      savedRange: null,
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
      };
    } catch {
      /* fall through */
    }
  }
  return { savedStart: -1, savedEnd: -1, savedRange: null };
}
