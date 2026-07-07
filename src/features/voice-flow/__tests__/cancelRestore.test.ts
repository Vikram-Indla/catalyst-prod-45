import { describe, it, expect, afterEach } from 'vitest';
import { captureFieldState, insertTextIntoTarget, restoreFieldSnapshot } from '../insertTextIntoTarget';
import type { ActiveField } from '../voiceFlow.types';

// Cancel contract: an aborted dictation session leaves the target field
// exactly as it was before activation — including the space that
// double-space activation removed and any insert that raced the cancel.

function makeInput(value: string, caret = value.length): HTMLInputElement {
  const el = document.createElement('input');
  el.type = 'text';
  el.value = value;
  document.body.appendChild(el);
  el.focus();
  el.setSelectionRange(caret, caret);
  return el;
}

function fieldFor(el: HTMLElement, kind: ActiveField['kind']): ActiveField {
  return { element: el, kind, ...captureFieldState(el) };
}

afterEach(() => { document.body.innerHTML = ''; });

describe('captureFieldState savedValue', () => {
  it('captures the full input value', () => {
    const el = makeInput('draft question ');
    expect(captureFieldState(el).savedValue).toBe('draft question ');
  });

  it('is null for contenteditable', () => {
    const el = document.createElement('div');
    el.setAttribute('contenteditable', 'true');
    document.body.appendChild(el);
    expect(captureFieldState(el).savedValue).toBeNull();
  });
});

describe('restoreFieldSnapshot', () => {
  it('restores value mutated after capture (removed activation space)', () => {
    const el = makeInput('hello ');
    const field = fieldFor(el, 'input');
    // double-space activation removes the trailing space
    el.value = 'hello';
    expect(restoreFieldSnapshot(field)).toBe(true);
    expect(el.value).toBe('hello ');
  });

  it('restores value after a raced session insert', () => {
    const el = makeInput('hello ');
    const field = fieldFor(el, 'input');
    insertTextIntoTarget(field, 'Hello, hello. Hello.');
    expect(el.value).not.toBe('hello ');
    expect(restoreFieldSnapshot(field)).toBe(true);
    expect(el.value).toBe('hello ');
  });

  it('dispatches an input event so controlled React state syncs', () => {
    const el = makeInput('abc');
    const field = fieldFor(el, 'input');
    el.value = 'abcdef';
    let fired = false;
    el.addEventListener('input', () => { fired = true; });
    restoreFieldSnapshot(field);
    expect(fired).toBe(true);
  });

  it('no-ops when the value never changed', () => {
    const el = makeInput('same');
    const field = fieldFor(el, 'input');
    expect(restoreFieldSnapshot(field)).toBe(false);
    expect(el.value).toBe('same');
  });

  it('never touches contenteditable', () => {
    const el = document.createElement('div');
    el.setAttribute('contenteditable', 'true');
    el.textContent = 'rich text';
    document.body.appendChild(el);
    const field = fieldFor(el, 'contenteditable');
    el.textContent = 'rich text changed';
    expect(restoreFieldSnapshot(field)).toBe(false);
    expect(el.textContent).toBe('rich text changed');
  });

  it('restores the saved caret position', () => {
    const el = makeInput('one two', 3);
    const field = fieldFor(el, 'input');
    el.value = 'one BLAH two';
    restoreFieldSnapshot(field);
    expect(el.selectionStart).toBe(3);
    expect(el.selectionEnd).toBe(3);
  });
});
