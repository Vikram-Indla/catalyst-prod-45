import { describe, it, expect } from 'vitest';
import { normalizeEntities } from '../normalizeEntities';

const KEYS = ['CAT', 'BAU', 'MWR'];

describe('normalizeEntities', () => {
  it('normalizes spoken ticket keys with spaces', () => {
    expect(normalizeEntities('Review cat 1234 before Thursday', KEYS))
      .toBe('Review CAT-1234 before Thursday');
  });

  it('normalizes "dash" spoken aloud', () => {
    expect(normalizeEntities('check BAU dash 42 today', KEYS))
      .toBe('check BAU-42 today');
  });

  it('canonicalizes case on already-hyphenated keys', () => {
    expect(normalizeEntities('see bau-6129 and mwr 966', KEYS))
      .toBe('see BAU-6129 and MWR-966');
  });

  it('NEVER touches unknown keys (zero-assumption)', () => {
    expect(normalizeEntities('the meeting 2024 covered abc 12', KEYS))
      .toBe('the meeting 2024 covered abc 12');
  });

  it('does not match inside words', () => {
    expect(normalizeEntities('concat 12 items in the scatter 34 plot', KEYS))
      .toBe('concat 12 items in the scatter 34 plot');
  });

  it('handles multiple keys in one utterance', () => {
    expect(normalizeEntities('link cat 1 to cat 2 and bau 3', KEYS))
      .toBe('link CAT-1 to CAT-2 and BAU-3');
  });

  it('survives empty key list and empty text', () => {
    expect(normalizeEntities('cat 1234', [])).toBe('cat 1234');
    expect(normalizeEntities('', KEYS)).toBe('');
  });

  it('works inside translated Arabic→English output', () => {
    expect(normalizeEntities('I need to update ticket cat 1234 before the meeting', KEYS))
      .toBe('I need to update ticket CAT-1234 before the meeting');
  });
});
