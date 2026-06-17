/**
 * Home-root breadcrumb lock.
 *
 * 2026-06-18 — the only constant "way home" from inside a hub was the corner
 * Catalyst logo; the breadcrumb rooted at "Projects"/"Products", not Home.
 * Decision (nav mental-model): every hub breadcrumb starts with a clickable
 * Home crumb → /for-you. One click, no new icon. This pins the root crumb.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const SRC = readFileSync(resolve(__dirname, '../ProjectPageHeader.tsx'), 'utf8');
const GLOBAL = readFileSync(resolve(__dirname, '../GlobalPageHeader.tsx'), 'utf8');

describe('GlobalPageHeader — breadcrumb roots at Home', () => {
  it('renders a clickable Home link to /for-you before the segments', () => {
    expect(GLOBAL).toMatch(/<Link\s+to="\/for-you"/);
    const homeIdx = GLOBAL.indexOf('to="/for-you"');
    const mapIdx = GLOBAL.indexOf('breadcrumbSegments.map');
    expect(homeIdx).toBeGreaterThan(-1);
    expect(homeIdx).toBeLessThan(mapIdx);
  });
});

describe('ProjectPageHeader — breadcrumb roots at Home', () => {
  it('first breadcrumb item is a clickable Home → /for-you', () => {
    expect(SRC).toMatch(/<BreadcrumbsItem text="Home" href="\/for-you" \/>/);
  });

  it('Home crumb precedes the hub root label', () => {
    const homeIdx = SRC.indexOf('text="Home"');
    const rootIdx = SRC.indexOf('text={rootLabel}');
    expect(homeIdx).toBeGreaterThan(-1);
    expect(rootIdx).toBeGreaterThan(-1);
    expect(homeIdx).toBeLessThan(rootIdx);
  });
});
