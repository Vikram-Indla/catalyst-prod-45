/**
 * /admin/access — avatar contract.
 *
 * design-critique 2026-05-18 scored the page 20/30 (HALT) with two P0/P1
 * findings rooted in the same cause:
 *   (a) The PeopleTab Supabase query at AdminAccessPage.tsx:~751 strips
 *       `avatar_url` from the SELECT clause, so real profile photos
 *       never reach the renderer.
 *   (b) The renderer rolls its own brand-blue initials circle at
 *       lines 446 + 861, duplicating the pattern instead of using the
 *       canonical CatalystAvatar wrapper (which already lives at
 *       src/components/shared/CatalystAvatar.tsx and handles the
 *       src→initials→silhouette fallback chain).
 *
 * This test pins the fix so neither regression can sneak back.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..', '..');
const PAGE = join(ROOT, 'src/pages/admin/AdminAccessPage.tsx');

function source(): string {
  return readFileSync(PAGE, 'utf8');
}

describe('/admin/access — avatar contract', () => {
  it('PeopleTab profiles SELECT includes avatar_url (not stripped)', () => {
    const src = source();
    // Find the profiles SELECT — match the .select(...) clause and confirm
    // avatar_url appears inside it. Index-based slicing to avoid balanced-
    // brace regex issues if the select is long.
    const profilesIdx = src.indexOf("from('profiles')");
    expect(profilesIdx, "from('profiles') call not found").toBeGreaterThan(-1);
    const window = src.slice(profilesIdx, profilesIdx + 600);
    expect(window).toMatch(/\.select\(/);
    expect(window, 'avatar_url must be in the profiles SELECT').toMatch(/avatar_url/);
  });

  it('imports CatalystAvatar (the canonical wrapper)', () => {
    const src = source();
    expect(src).toMatch(
      /import\s+CatalystAvatar\s+from\s+['"]@\/components\/shared\/CatalystAvatar['"]/,
    );
  });

  it('uses <CatalystAvatar … /> in the JSX (replaces hand-rolled circles)', () => {
    const src = source();
    expect(src).toMatch(/<CatalystAvatar[\s\n]/);
  });

  it('no hand-rolled brand-bold initials circles remain', () => {
    const src = source();
    // The old pattern: borderRadius:'50%' inline-styled <div> whose background
    // is var(--ds-background-brand-bold...). CatalystAvatar uses a deterministic
    // per-name palette and a <span role="img">, not a brand-bold div.
    const handRolled = src.match(
      /borderRadius:\s*['"]50%['"][\s\S]{0,300}background:\s*['"]?var\(--ds-background-brand-bold/g,
    );
    expect(handRolled ?? []).toHaveLength(0);
  });

  it('the userInitial() helper is gone (its only callers were the hand-rolled circles)', () => {
    const src = source();
    // The function definition and any callsites must all be removed — leaving
    // it dead would let it grow new consumers and re-fork the avatar pattern.
    expect(src).not.toMatch(/function\s+userInitial\s*\(/);
    expect(src).not.toMatch(/\buserInitial\s*\(/);
  });
});
