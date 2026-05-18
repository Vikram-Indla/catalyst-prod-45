/**
 * /for-you/{tab} — tabs are route segments, not query params or localStorage.
 *
 * Tabs must be addressable URLs:
 *   /for-you            → defaults to recommended
 *   /for-you/ai-theme   → AI Focus tab
 *   /for-you/assigned   → Assigned to me
 *   /for-you/starred    → Starred
 *   /for-you/r360       → Resource 360
 *   /for-you/ageing     → Ageing
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..');
const APP = join(ROOT, 'App.tsx');

function source(): string {
  return readFileSync(APP, 'utf8');
}

describe('/for-you/{tab} — segment routing', () => {
  it('declares /for-you/:tab route in App.tsx', () => {
    const src = source();
    expect(src).toMatch(/path=["']for-you\/:tab["']/);
  });

  it('/for-you without tab still renders ForYouPage (index route or bare path)', () => {
    const src = source();
    expect(src).toMatch(/path=["']for-you["']/);
  });
});
