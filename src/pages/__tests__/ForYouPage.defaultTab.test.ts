/**
 * For You default tab — every navigation to /for-you (no tab segment) lands
 * on "Assigned to me". The last-used tab is NOT restored from localStorage.
 * Explicit /for-you/:tab deep-links are still honored. (Vikram 2026-06-17)
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const SRC = readFileSync(
  join(__dirname, '..', 'ForYouPage.atlaskit.tsx'),
  'utf8',
);

describe('ForYouPage default tab', () => {
  it('does not restore the active tab from localStorage', () => {
    expect(SRC).not.toMatch(/localStorage\.getItem\(FOR_YOU_TAB_KEY\)/);
  });

  it('defaults to "assigned" when the URL has no tab segment', () => {
    expect(SRC).toMatch(/setActiveTab\(\s*['"]assigned['"]\s*\)/);
  });

  it('still honors an explicit /for-you/:tab deep-link', () => {
    expect(SRC).toMatch(/urlTab && VALID_TABS\.has\(urlTab\)/);
  });
});
