/**
 * Phase B-3 — project-hub/shell/UserAvatar migration to canonical.
 *
 * The shell-local sibling (66 lines) is renamed to CurrentUserAvatar
 * and rewritten as a thin wrapper that reads the current auth user and
 * forwards `{ name, src }` to the canonical UserAvatar. Decision A from
 * the brief: keep auto-binding semantics so TopNav callsite stays
 * `<CurrentUserAvatar />` with zero props.
 *
 * Sole consumer of the shell sibling is TopNav.tsx:148 (ActivityFeed
 * has its OWN inline UserAvatar at line 263, unrelated — flagged
 * separately).
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..', '..', '..');
const OLD_SIBLING = join(ROOT, 'src/components/project-hub/shell/UserAvatar.tsx');
const NEW_WRAPPER = join(ROOT, 'src/components/project-hub/shell/CurrentUserAvatar.tsx');
const TOPNAV = join(ROOT, 'src/components/project-hub/shell/TopNav.tsx');

function src(p: string): string { return readFileSync(p, 'utf8'); }

describe('project-hub/shell — CurrentUserAvatar migration', () => {
  it('old sibling at shell/UserAvatar.tsx no longer exists', () => {
    expect(existsSync(OLD_SIBLING)).toBe(false);
  });

  it('new CurrentUserAvatar.tsx wrapper exists', () => {
    expect(existsSync(NEW_WRAPPER)).toBe(true);
  });

  it('CurrentUserAvatar imports the canonical UserAvatar (composition, not duplication)', () => {
    const s = src(NEW_WRAPPER);
    expect(s).toMatch(/import\s+(?:UserAvatar|\{\s*UserAvatar\s*\})\s+from\s+['"]@\/components\/shared\/UserAvatar['"]/);
    expect(s).toMatch(/<UserAvatar[\s\n]/);
  });

  it('CurrentUserAvatar wrapper does not duplicate the deleted sibling logic', () => {
    const s = src(NEW_WRAPPER);
    // No hand-rolled circle / initials / CircleUser fallback / palette logic.
    expect(s).not.toMatch(/getAvatarColor\s*\(/);
    expect(s).not.toMatch(/getUserInitials\s*\(/);
    expect(s).not.toMatch(/CircleUser\b/);
  });

  it('TopNav imports CurrentUserAvatar (not the deleted UserAvatar sibling)', () => {
    const s = src(TOPNAV);
    expect(s).toMatch(/import\s+\{[^}]*CurrentUserAvatar[^}]*\}\s+from\s+['"]\.\/CurrentUserAvatar['"]/);
    expect(s).not.toMatch(/from\s+['"]\.\/UserAvatar['"]/);
  });

  it('TopNav renders <CurrentUserAvatar /> (the auto-binding wrapper)', () => {
    const s = src(TOPNAV);
    expect(s).toMatch(/<CurrentUserAvatar[\s/>]/);
  });
});
