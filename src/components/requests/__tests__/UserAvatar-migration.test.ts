/**
 * Phase B-1 — requests/UserAvatar migration to canonical.
 *
 * The canonical UserAvatar at src/components/shared/UserAvatar.tsx (commit
 * 44d277e62, v2.0.0) is now the single canonical user-face component.
 *
 * The requests/ module previously shipped its own 59-line sibling with a
 * documented GUARDRAIL ("Renders CircleUser face icon (never bare
 * initials)"). That GUARDRAIL is dropped — initials carry more identity
 * signal than a generic face glyph. The Unassigned dashed-circle empty
 * state + the full-name tooltip move to the RequestTable cell renderer.
 *
 * Pinned here: the sibling is deleted, the consumer points at the
 * canonical with ADS-canonical size names, and the Unassigned + tooltip
 * UX is preserved inline at the callsite.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..', '..');
const SIBLING = join(ROOT, 'src/components/requests/UserAvatar.tsx');
const TABLE = join(ROOT, 'src/components/requests/RequestTable.tsx');

function src(p: string): string {
  return readFileSync(p, 'utf8');
}

describe('requests/UserAvatar — migration to canonical', () => {
  it('src/components/requests/UserAvatar.tsx no longer exists', () => {
    expect(existsSync(SIBLING)).toBe(false);
  });

  it('RequestTable imports UserAvatar from the canonical path (not the deleted sibling)', () => {
    const s = src(TABLE);
    expect(s).toMatch(/from\s+['"]@\/components\/shared\/UserAvatar['"]/);
    expect(s).not.toMatch(/from\s+['"]\.\/UserAvatar['"]/);
  });

  it('RequestTable no longer passes numeric size — must use ADS-canonical names', () => {
    const s = src(TABLE);
    // Old: <UserAvatar name={...} size={24} showName />
    // New: <UserAvatar name={...} size="small" />
    expect(s).not.toMatch(/<UserAvatar[\s\S]{0,200}size=\{\d+\}/);
  });

  it('RequestTable no longer passes showName / showTooltip (handled at callsite now)', () => {
    const s = src(TABLE);
    expect(s).not.toMatch(/<UserAvatar[\s\S]{0,200}showName/);
    expect(s).not.toMatch(/<UserAvatar[\s\S]{0,200}showTooltip/);
  });

  it('RequestTable preserves the Unassigned empty state at the callsite', () => {
    const s = src(TABLE);
    // The previous sibling rendered an italic "Unassigned" label when name was null.
    // The migration moves that handling inline to the cell renderer.
    expect(s).toMatch(/Unassigned/);
  });

  it('RequestTable imports formatShortName (was used inside the deleted sibling)', () => {
    const s = src(TABLE);
    // formatShortName was previously imported only by the sibling. After
    // migration the consumer needs it to render the truncated name beside
    // the avatar in the assignee cell.
    expect(s).toMatch(/import\s+\{[^}]*formatShortName[^}]*\}\s+from\s+['"]@\/lib\/format-name['"]/);
  });
});
