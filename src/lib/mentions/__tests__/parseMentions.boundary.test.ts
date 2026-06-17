/**
 * parseMentions — fallback-boundary contract.
 *
 * The non-roster fallback must NOT absorb trailing prose into a mention,
 * and must NEVER let a mention span a newline. Regression source: a Jira
 * comment "@Hadeel AlShabanat\n kindly you QA sign off…" rendered the
 * mention chip as "@Hadeel AlShabanat kindly" (the lowercase prose word
 * "kindly" was eaten, and the chip crossed the line break).
 */
import { describe, it, expect } from 'vitest';
import { parseMentions } from '../parseMentions';

const NO_ROSTER: { name: string; userId: string | null }[] = [];

function mentions(parts: ReturnType<typeof parseMentions>) {
  return parts.filter((p) => p.type === 'mention').map((p) => (p as { name: string }).name);
}

describe('parseMentions — fallback boundary', () => {
  it('does not absorb a lowercase prose word after the name', () => {
    const parts = parseMentions('@Hadeel AlShabanat kindly you QA sign off', NO_ROSTER);
    expect(mentions(parts)).toEqual(['Hadeel AlShabanat']);
    // "kindly" must remain plain text, not part of the chip.
    expect(parts.some((p) => p.type === 'text' && /kindly/.test((p as { value: string }).value))).toBe(true);
  });

  it('never lets a mention cross a newline', () => {
    const parts = parseMentions('@Hadeel AlShabanat\n kindly you QA', NO_ROSTER);
    const names = mentions(parts);
    expect(names).toEqual(['Hadeel AlShabanat']);
    expect(names.some((n) => n.includes('\n'))).toBe(false);
  });

  it('still chips a genuine 3-word Jira name (capitalised)', () => {
    const parts = parseMentions('@Arslaan Ahmad Malik Kindly prepare the template', NO_ROSTER);
    expect(mentions(parts)).toEqual(['Arslaan Ahmad Malik']);
  });

  it('roster match is unaffected — exact name chips, trailing word stays text', () => {
    const roster = [{ name: 'Hadeel AlShabanat', userId: 'u1' }];
    const parts = parseMentions('@Hadeel AlShabanat kindly cc', roster);
    expect(mentions(parts)).toEqual(['Hadeel AlShabanat']);
  });
});
