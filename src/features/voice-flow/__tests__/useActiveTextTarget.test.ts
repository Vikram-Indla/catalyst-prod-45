import { describe, it, expect, afterEach } from 'vitest';
import { getActiveTextTarget } from '../useActiveTextTarget';

// The voice-zone gate was removed in c2f1420dc — activation is eligible in
// ALL editable fields, minus blocked/sensitive/disabled fields and the
// explicit data-voice-flow="off" opt-out (fields whose Enter/Space gestures
// belong to the surface itself, e.g. the Doc Intel Ask box).

function mount(el: HTMLElement): HTMLElement {
  document.body.appendChild(el);
  return el;
}

afterEach(() => { document.body.innerHTML = ''; });

describe('eligibility (no zone gate)', () => {
  it('returns ActiveField for a plain text input anywhere', () => {
    const el = mount(Object.assign(document.createElement('input'), { type: 'text' }));
    expect(getActiveTextTarget(el)).not.toBeNull();
    expect(getActiveTextTarget(el)?.kind).toBe('input');
  });

  it('returns ActiveField for a textarea anywhere', () => {
    const el = mount(document.createElement('textarea'));
    expect(getActiveTextTarget(el)?.kind).toBe('textarea');
  });

  it('returns ActiveField for contenteditable anywhere', () => {
    const el = document.createElement('div');
    el.setAttribute('contenteditable', 'true');
    mount(el);
    expect(getActiveTextTarget(el)?.kind).toBe('contenteditable');
  });

  it('blocks password inputs', () => {
    const el = mount(Object.assign(document.createElement('input'), { type: 'password' }));
    expect(getActiveTextTarget(el)).toBeNull();
  });

  it('blocks disabled inputs', () => {
    const el = mount(Object.assign(document.createElement('input'), { type: 'text', disabled: true }));
    expect(getActiveTextTarget(el)).toBeNull();
  });

  it('blocks sensitive fields by aria-label', () => {
    const el = Object.assign(document.createElement('input'), { type: 'text' });
    el.setAttribute('aria-label', 'API key');
    mount(el);
    expect(getActiveTextTarget(el)).toBeNull();
  });
});

describe('data-voice-flow="off" opt-out', () => {
  it('returns null when the field itself opts out', () => {
    const el = Object.assign(document.createElement('input'), { type: 'text' });
    el.setAttribute('data-voice-flow', 'off');
    mount(el);
    expect(getActiveTextTarget(el)).toBeNull();
  });

  it('returns null when an ancestor opts out', () => {
    const wrap = document.createElement('div');
    wrap.setAttribute('data-voice-flow', 'off');
    const mid = document.createElement('div');
    const el = Object.assign(document.createElement('input'), { type: 'text' });
    mid.appendChild(el);
    wrap.appendChild(mid);
    document.body.appendChild(wrap);
    expect(getActiveTextTarget(el)).toBeNull();
  });

  it('opt-out applies to contenteditable descendants too', () => {
    const wrap = document.createElement('div');
    wrap.setAttribute('data-voice-flow', 'off');
    const el = document.createElement('div');
    el.setAttribute('contenteditable', 'true');
    wrap.appendChild(el);
    document.body.appendChild(wrap);
    expect(getActiveTextTarget(el)).toBeNull();
  });

  it('sibling fields outside the opt-out container stay eligible', () => {
    const wrap = document.createElement('div');
    wrap.setAttribute('data-voice-flow', 'off');
    document.body.appendChild(wrap);
    const el = mount(Object.assign(document.createElement('input'), { type: 'text' }));
    expect(getActiveTextTarget(el)).not.toBeNull();
  });
});
