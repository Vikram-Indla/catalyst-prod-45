import { describe, it, expect, afterEach } from 'vitest';
import { getActiveTextTarget } from '../useActiveTextTarget';

function inZone(el: HTMLElement): HTMLElement {
  const zone = document.createElement('div');
  zone.dataset.voiceZone = 'true';
  zone.appendChild(el);
  document.body.appendChild(zone);
  return el;
}

function noZone(el: HTMLElement): HTMLElement {
  document.body.appendChild(el);
  return el;
}

afterEach(() => { document.body.innerHTML = ''; });

describe('voice zone gate', () => {
  it('returns null for contenteditable outside voice zone', () => {
    const el = document.createElement('div');
    el.setAttribute('contenteditable', 'true');
    noZone(el);
    expect(getActiveTextTarget(el)).toBeNull();
  });

  it('returns ActiveField for contenteditable inside voice zone', () => {
    const el = document.createElement('div');
    el.setAttribute('contenteditable', 'true');
    inZone(el);
    expect(getActiveTextTarget(el)).not.toBeNull();
    expect(getActiveTextTarget(el)?.kind).toBe('contenteditable');
  });

  it('returns null for textarea outside voice zone', () => {
    const el = noZone(document.createElement('textarea'));
    expect(getActiveTextTarget(el)).toBeNull();
  });

  it('returns ActiveField for textarea inside voice zone', () => {
    const el = inZone(document.createElement('textarea'));
    expect(getActiveTextTarget(el)).not.toBeNull();
    expect(getActiveTextTarget(el)?.kind).toBe('textarea');
  });

  it('returns null for text input outside voice zone', () => {
    const el = noZone(Object.assign(document.createElement('input'), { type: 'text' }));
    expect(getActiveTextTarget(el)).toBeNull();
  });

  it('returns ActiveField for text input inside voice zone', () => {
    const el = inZone(Object.assign(document.createElement('input'), { type: 'text' }));
    expect(getActiveTextTarget(el)).not.toBeNull();
  });

  it('still blocks password input even inside voice zone', () => {
    const el = inZone(Object.assign(document.createElement('input'), { type: 'password' }));
    expect(getActiveTextTarget(el)).toBeNull();
  });

  it('checks ancestor chain, not just direct parent', () => {
    const zone = document.createElement('div');
    zone.dataset.voiceZone = 'true';
    const mid = document.createElement('div');
    const inner = document.createElement('div');
    inner.setAttribute('contenteditable', 'true');
    mid.appendChild(inner);
    zone.appendChild(mid);
    document.body.appendChild(zone);
    expect(getActiveTextTarget(inner)).not.toBeNull();
  });

  it('returns null for disabled input inside voice zone', () => {
    const el = inZone(Object.assign(document.createElement('input'), { type: 'text', disabled: true }));
    expect(getActiveTextTarget(el)).toBeNull();
  });
});
