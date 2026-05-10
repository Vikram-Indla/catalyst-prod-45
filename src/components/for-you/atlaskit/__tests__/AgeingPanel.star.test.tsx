/**
 * AgeingPanel — star button must not render.
 *
 * AgeingPanel doesn't wire onToggleStar → ForYouRow gates the star button
 * on that prop → star is invisible in ageing context.
 * Dead interactions are worse than absent ones (CLAUDE.md UX rule).
 *
 * Root-cause ref: preflight 2026-05-10 A1-HIGH
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const ageingSrc = readFileSync(resolve(__dirname, '../AgeingPanel.tsx'), 'utf-8');
const rowSrc = readFileSync(resolve(__dirname, '../ForYouRow.tsx'), 'utf-8');

describe('AgeingPanel — star no-op prevention', () => {
  it('AgeingPanel does not pass onToggleStar to ForYouRow', () => {
    // If onToggleStar were passed, clicks would no-op silently — dead interaction.
    // The fix: don't pass it. ForYouRow gates the star button on this prop.
    expect(
      ageingSrc.includes('onToggleStar'),
      'AgeingPanel must NOT pass onToggleStar to ForYouRow. ' +
      'Without a real handler the star is a dead interaction — omit it so the ' +
      'button is never rendered (ForYouRow gates on onToggleStar).',
    ).toBe(false);
  });

  it('ForYouRow gates the star button on onToggleStar prop', () => {
    // Verify ForYouRow does not render the star unconditionally.
    expect(
      rowSrc.includes('onToggleStar &&'),
      'ForYouRow must guard <StarButton> with {onToggleStar && ...} so callers ' +
      'that omit the prop never see a non-functional star.',
    ).toBe(true);
  });
});
