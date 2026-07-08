import { describe, it, expect } from 'vitest';
import { structureText } from '../structureText';

describe('structureText — spoken commands', () => {
  it('new paragraph → blank line', () => {
    expect(structureText('Summary of the issue. new paragraph The fix is simple.'))
      .toBe('Summary of the issue.\n\nThe fix is simple.');
  });

  it('new line → line break', () => {
    expect(structureText('Item one new line item two'))
      .toBe('Item one\nitem two');
  });

  it('bullet point → dash line', () => {
    expect(structureText('We need three things bullet point auth fix bullet point retry logic'))
      .toBe('We need three things\n- auth fix\n- retry logic');
  });

  it('leaves plain prose untouched', () => {
    const t = 'Please review the attached file before Thursday.';
    expect(structureText(t)).toBe(t);
  });
});

describe('structureText — ordinal enumeration', () => {
  it('converts First/Second/Third into a numbered list', () => {
    expect(structureText(
      'We need to prepare. First, review CAT-1234. Second, update the document. Third, inform the team.',
    )).toBe(
      'We need to prepare.\n1. Review CAT-1234\n2. Update the document\n3. Inform the team',
    );
  });

  it('handles "first thing … second thing" (translated Arabic pattern)', () => {
    expect(structureText(
      'First thing we review the ticket. Second thing we update the document.',
    )).toBe(
      '1. We review the ticket\n2. We update the document',
    );
  });

  it('a single ordinal is NOT a list', () => {
    const t = 'First, let me explain the background of this decision.';
    expect(structureText(t)).toBe(t);
  });

  it('ordinal words mid-sentence do not trigger', () => {
    const t = 'She won second place in the first round.';
    expect(structureText(t)).toBe(t);
  });
});

describe('structureText — snippets', () => {
  it('expands "insert <trigger>"', () => {
    expect(structureText('insert signoff', [{ trigger: 'signoff', expansion: 'Best regards,\nVikram' }]))
      .toBe('Best regards,\nVikram');
  });

  it('unknown trigger untouched', () => {
    expect(structureText('insert whatever', [{ trigger: 'signoff', expansion: 'X' }]))
      .toBe('insert whatever');
  });
});
