/**
 * AdminSidebarV2 — ADS-grade redesign contract.
 *
 * design-critique 2026-05-18 scored the hand-rolled sidebar 17/30 (HALT) with
 * 3 P0s rooted in the same cause: AdminSidebarV2 doesn't use the Atlassian
 * Design System sidebar primitives that every other hub sidebar uses.
 *
 * This file pins the redesign so it can't regress:
 *   1. No "AD" avatar badge / blue circle / gradient header chrome.
 *   2. No stranded SearchIcon above the textfield — the icon goes INSIDE
 *      the input via elemBeforeInput (ADS canonical pattern).
 *   3. No hand-rolled uppercase "PINNED" + pin glyph label — the Pinned
 *      section uses @atlaskit/side-navigation Section title (sentence case).
 *   4. Nav rows use @atlaskit/side-navigation primitives (LinkItem /
 *      ButtonItem / Section) instead of bare <Link> + manual hover CSS.
 *   5. A `/` keypress focuses the search input (Jira parity).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..', '..');
const ADMIN_SIDEBAR = join(ROOT, 'src/components/admin/AdminSidebarV2.tsx');

function source(): string {
  return readFileSync(ADMIN_SIDEBAR, 'utf8');
}

describe('AdminSidebarV2 — ADS-grade redesign', () => {
  describe('Header — text-only, no avatar badge (SidebarBase contract)', () => {
    it('does not render a circular avatar badge (borderRadius: 50%)', () => {
      const src = source();
      expect(src).not.toMatch(/borderRadius:\s*['"]50%['"]/);
    });

    it('does not render the literal "AD" badge text', () => {
      const src = source();
      // The hand-rolled badge contained the literal two-character "AD" string
      // as a text node inside the avatar div.
      expect(src).not.toMatch(/>\s*AD\s*</);
    });

    it('does not use linear-gradient on a brand-bold token (the AD badge fill)', () => {
      const src = source();
      expect(src).not.toMatch(/linear-gradient[^;]*bgBrandBold/);
      expect(src).not.toMatch(/linear-gradient[^;]*background-brand-bold/);
    });
  });

  describe('Search — ADS canonical pattern (icon inside the input)', () => {
    it('uses elemBeforeInput on @atlaskit/textfield for the search icon', () => {
      const src = source();
      // Anti-pattern: the old code passed `elemBeforeInput={null}` and
      // rendered <SearchIcon /> in a wrapper above the field.
      expect(src).not.toMatch(/elemBeforeInput=\{null\}/);
      // The icon must reach elemBeforeInput — either directly (<SearchIcon … />)
      // or wrapped in a padded container for visual alignment. We assert that
      // elemBeforeInput exists AND that SearchIcon appears within a 400-char
      // window after the prop name (same JSX expression value). Index-based
      // slicing avoids regex-balanced-braces issues with nested style={{ }}.
      const idx = src.indexOf('elemBeforeInput=');
      expect(idx, 'elemBeforeInput prop not found on textfield').toBeGreaterThan(-1);
      expect(src.slice(idx, idx + 400)).toContain('SearchIcon');
    });

    it('search placeholder reads "Search" (concise — no "settings..." padding)', () => {
      const src = source();
      // ADS canonical is short labels. The old "Search settings..." was verbose.
      // Either "Search" or "Search admin" both pass; "Search settings..." fails.
      expect(src).not.toMatch(/placeholder=['"]Search settings\.\.\.['"]/);
    });

    it('focuses the search input on "/" keypress (Jira parity)', () => {
      const src = source();
      // The handler must listen for the bare "/" key and call .focus() on the
      // search input ref. Accept either an `=== '/'` match or a `!== '/'`
      // early-return guard — both indicate a real / key handler.
      expect(src).toMatch(/e\.key\s*(?:===|!==)\s*['"]\/['"]/);
      expect(src).toMatch(/\.focus\(\)/);
      // And the handler must be wired to a keydown listener.
      expect(src).toMatch(/addEventListener\(['"]keydown['"]/);
    });
  });

  describe('Pinned — ADS Section, not custom uppercase + glyph', () => {
    it('does not render the uppercase string "PINNED"', () => {
      const src = source();
      expect(src).not.toMatch(/>\s*PINNED\s*</);
      expect(src).not.toMatch(/['"]PINNED['"]/);
    });

    it('does not render PinIcon as a section heading glyph', () => {
      const src = source();
      // The redesign drops the pin glyph from the heading. PinIcon may still
      // appear in the leading position of each pinned LinkItem — that's fine.
      // We pin the offence by checking the import is gone entirely (the file
      // no longer needs it once the heading glyph is removed AND LinkItem
      // pinned rows use no leading icon, which matches Jira's settings rail).
      expect(src).not.toMatch(/from\s+['"]@atlaskit\/icon\/core\/pin['"]/);
    });
  });

  describe('Nav primitives — @atlaskit/side-navigation', () => {
    it('imports from @atlaskit/side-navigation', () => {
      const src = source();
      expect(src).toMatch(/from\s+['"]@atlaskit\/side-navigation['"]/);
    });

    it('uses Section + (LinkItem or ButtonItem) primitives in JSX', () => {
      const src = source();
      expect(src).toMatch(/<Section[\s>]/);
      expect(src).toMatch(/<(?:LinkItem|ButtonItem)[\s>]/);
    });

    it('drops the hand-rolled hover/active <Link> rows (no onMouseEnter setHoveredPath on Link)', () => {
      const src = source();
      // The hand-rolled rows set `hoveredPath` via onMouseEnter for hover-bg.
      // ADS primitives handle hover natively, so this state goes away.
      expect(src).not.toMatch(/setHoveredPath\(`?\w/);
    });
  });
});
