import { describe, it, expect, vi, beforeEach } from 'vitest';
import { insertTextIntoTarget, captureFieldState } from '../insertTextIntoTarget';
import type { ActiveField } from '../voiceFlow.types';

function makeInput(value = 'hello ', selStart = 6, selEnd = 6): HTMLInputElement {
  const el = document.createElement('input');
  el.type = 'text';
  el.value = value;
  document.body.appendChild(el);
  el.focus();
  el.setSelectionRange(selStart, selEnd);
  return el;
}

function makeTextarea(value = 'hello ', selStart = 6): HTMLTextAreaElement {
  const el = document.createElement('textarea');
  el.value = value;
  document.body.appendChild(el);
  el.focus();
  el.setSelectionRange(selStart, selStart);
  return el;
}

function makeContentEditable(text = 'hello '): HTMLDivElement {
  const el = document.createElement('div');
  el.contentEditable = 'true';
  el.textContent = text;
  document.body.appendChild(el);
  el.focus();
  return el;
}

function makeField(el: HTMLElement, kind: ActiveField['kind']): ActiveField {
  const state = captureFieldState(el);
  return { element: el, kind, ...state };
}

describe('captureFieldState', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('captures input selection indices', () => {
    const el = makeInput('hello world', 5, 5);
    const state = captureFieldState(el);
    expect(state.savedStart).toBe(5);
    expect(state.savedEnd).toBe(5);
    expect(state.savedRange).toBeNull();
  });

  it('captures textarea selection indices', () => {
    const el = makeTextarea('test input', 4);
    const state = captureFieldState(el);
    expect(state.savedStart).toBe(4);
    expect(state.savedRange).toBeNull();
  });
});

describe('insertTextIntoTarget — input', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('inserts text at saved position', () => {
    const el = makeInput('hello ', 6, 6);
    const field = makeField(el, 'input');

    insertTextIntoTarget(field, 'world');

    expect(el.value).toBe('hello world');
  });

  it('replaces selected range', () => {
    const el = makeInput('hello world', 6, 11);
    const field = makeField(el, 'input');

    insertTextIntoTarget(field, 'earth');

    expect(el.value).toBe('hello earth');
  });

  it('dispatches input event', () => {
    const el = makeInput('test ', 5, 5);
    const field = makeField(el, 'input');
    const handler = vi.fn();
    el.addEventListener('input', handler);

    insertTextIntoTarget(field, 'value');

    expect(handler).toHaveBeenCalled();
  });

  it('does nothing for empty text', () => {
    const el = makeInput('hello', 5, 5);
    const field = makeField(el, 'input');
    const original = el.value;

    insertTextIntoTarget(field, '');
    insertTextIntoTarget(field, '   ');

    expect(el.value).toBe(original);
  });

  it('inserts at end when savedStart is -1', () => {
    const el = makeInput('hello', 5, 5);
    const field: ActiveField = {
      element: el, kind: 'input',
      savedStart: -1, savedEnd: -1, savedRange: null,
    };

    insertTextIntoTarget(field, ' world');

    expect(el.value).toBe('hello world');
  });
});

describe('insertTextIntoTarget — textarea', () => {
  afterEach(() => { document.body.innerHTML = ''; });

  it('inserts text at saved position in textarea', () => {
    const el = makeTextarea('hello ', 6);
    const field = makeField(el, 'textarea');

    insertTextIntoTarget(field, 'world');

    expect(el.value).toBe('hello world');
  });
});
