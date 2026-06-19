import { BLOCKED_INPUT_TYPES, SENSITIVE_FIELD_PATTERNS } from './voiceFlow.config';
import type { ActiveField, ActiveFieldKind } from './voiceFlow.types';
import { captureFieldState } from './insertTextIntoTarget';

/**
 * Returns an ActiveField for `el` if it is eligible for voice input,
 * or null if the element should never trigger voice dictation.
 */
export function getActiveTextTarget(el: Element | null): ActiveField | null {
  if (!el || !(el instanceof HTMLElement)) return null;
  if (!el.isConnected) return null;

  const tag = el.tagName.toLowerCase();

  if (tag === 'input') {
    const input = el as HTMLInputElement;
    if (BLOCKED_INPUT_TYPES.has(input.type.toLowerCase())) return null;
    if (input.disabled || input.readOnly) return null;
    if (isSensitive(input)) return null;
    return buildField(input, 'input');
  }

  if (tag === 'textarea') {
    const ta = el as HTMLTextAreaElement;
    if (ta.disabled || ta.readOnly) return null;
    if (isSensitive(ta)) return null;
    return buildField(ta, 'textarea');
  }

  // contenteditable (includes ProseMirror, Tiptap, plain divs)
  if (el.isContentEditable) {
    if ((el as HTMLElement).getAttribute('aria-readonly') === 'true') return null;
    if (isSensitive(el)) return null;
    return buildField(el, 'contenteditable');
  }

  return null;
}

function buildField(el: HTMLElement, kind: ActiveFieldKind): ActiveField {
  const { savedStart, savedEnd, savedRange } = captureFieldState(el);
  return { element: el, kind, savedStart, savedEnd, savedRange };
}

function isSensitive(el: HTMLElement): boolean {
  const candidates = [
    el.getAttribute('name') ?? '',
    el.getAttribute('id') ?? '',
    el.getAttribute('aria-label') ?? '',
    el.getAttribute('placeholder') ?? '',
    el.getAttribute('autocomplete') ?? '',
  ];
  return SENSITIVE_FIELD_PATTERNS.some(re =>
    candidates.some(c => re.test(c))
  );
}

/**
 * Remove the space-character just before the cursor in an eligible field.
 * Called right before activating voice (double-space commit).
 */
export function removeSpaceBefore(field: ActiveField): void {
  const { element, kind } = field;

  if (kind === 'input' || kind === 'textarea') {
    const el = element as HTMLInputElement;
    const pos = el.selectionStart ?? 0;
    if (pos > 0 && el.value[pos - 1] === ' ') {
      const proto = kind === 'textarea' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      const nativeSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
      const next = el.value.slice(0, pos - 1) + el.value.slice(pos);
      if (nativeSetter) nativeSetter.call(el, next);
      else el.value = next;
      el.setSelectionRange(pos - 1, pos - 1);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }
    // Update field savedStart/End to reflect removed character
    field.savedStart = Math.max(0, (el.selectionStart ?? 1) );
    field.savedEnd   = field.savedStart;
    return;
  }

  // contenteditable: backward delete via execCommand
  document.execCommand('delete');
  // Re-capture range after deletion
  const sel = window.getSelection();
  if (sel?.rangeCount) {
    try {
      field.savedRange = sel.getRangeAt(0).cloneRange();
    } catch { /* stale */ }
  }
  field.savedStart = -1;
  field.savedEnd   = -1;
}
