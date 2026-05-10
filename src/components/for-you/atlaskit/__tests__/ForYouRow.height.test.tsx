/**
 * ForYouRow — row height contract.
 *
 * Jira For You row spec (April 2026): 56px tall.
 * Previous impl was 48px; over-corrected to 62px in a fix pass.
 * The spec is authoritative: height must be exactly 56.
 *
 * Root-cause ref: preflight 2026-05-10 D2-HIGH
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(
  resolve(__dirname, '../ForYouRow.tsx'),
  'utf-8',
);

describe('ForYouRow — row height', () => {
  it('row container height must be 56 (Jira spec), not 48 or 62', () => {
    // The spec comment at the top of the file says "56px tall".
    // The container style block is the one with `data-testid="for-you-row"` above it.
    // Check the style block contains height: 56 and not height: 48 or height: 62.
    expect(
      src.includes('height: 56,'),
      'ForYouRow container must have height: 56 — Jira For You row spec is 56px. ' +
      'Current value appears to differ. Fix the height in the style object of the ' +
      'role="button" div with data-testid="for-you-row".',
    ).toBe(true);
    expect(
      src.includes('height: 62,') || src.includes('height: 48,'),
      'ForYouRow must not use height: 62 or height: 48 — spec is 56px.',
    ).toBe(false);
  });
});
