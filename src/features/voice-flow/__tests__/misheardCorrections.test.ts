import { describe, it, expect } from 'vitest';
import { applyMisheardCorrections } from '../dictionary';

const MAP = [
  { term: 'Sikander', misheard: ['sick under', 'Sakander'] },
  { term: 'Senaei', misheard: ['sen eye'] },
];

describe('applyMisheardCorrections', () => {
  it('replaces known mishearings whole-word, case-insensitive', () => {
    expect(applyMisheardCorrections('Ask sick under about it', MAP))
      .toBe('Ask Sikander about it');
    expect(applyMisheardCorrections('ping SAKANDER and sen eye', MAP))
      .toBe('ping Sikander and Senaei');
  });

  it('never replaces partial words', () => {
    expect(applyMisheardCorrections('the homesick underdog', MAP))
      .toBe('the homesick underdog');
  });

  it('empty map is a no-op', () => {
    expect(applyMisheardCorrections('sick under', [])).toBe('sick under');
  });

  it('skips self-referential entries', () => {
    expect(applyMisheardCorrections('Sikander is here', [{ term: 'Sikander', misheard: ['sikander'] }]))
      .toBe('Sikander is here');
  });
});
