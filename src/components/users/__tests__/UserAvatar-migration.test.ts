/**
 * Phase B-2 — components/users/UserAvatar migration to canonical.
 *
 * Sibling at src/components/users/UserAvatar.tsx (43 lines) had a
 * GUARDRAIL ("Renders CircleUser face icon never bare initials"). Same
 * resolution as B-1: drop the GUARDRAIL, use canonical initials. Country
 * prop maps 1:1.
 *
 * Sole consumer: src/pages/admin/UsersManagement.tsx (named import via
 * the src/components/users/index.ts barrel).
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..', '..');
const SIBLING = join(ROOT, 'src/components/users/UserAvatar.tsx');
const BARREL = join(ROOT, 'src/components/users/index.ts');
const CONSUMER = join(ROOT, 'src/pages/admin/UsersManagement.tsx');

function src(p: string): string { return readFileSync(p, 'utf8'); }

describe('components/users/UserAvatar — migration to canonical', () => {
  it('sibling file no longer exists', () => {
    expect(existsSync(SIBLING)).toBe(false);
  });

  it('barrel re-export forwards to the canonical path', () => {
    const s = src(BARREL);
    expect(s).toMatch(/export\s+\{[^}]*UserAvatar[^}]*\}\s+from\s+['"]@\/components\/shared\/UserAvatar['"]/);
  });

  it('UsersManagement callsite uses canonical API (passes size, no avatarUrl prop)', () => {
    const s = src(CONSUMER);
    // The sibling took no size prop — defaulted to a fixed CSS class. The
    // canonical needs an explicit ADS-canonical size to render correctly.
    expect(s).toMatch(/<UserAvatar[\s\S]{0,400}size=['"](?:xsmall|small|medium|large|xlarge|xxlarge)['"]/);
    expect(s).not.toMatch(/<UserAvatar[\s\S]{0,400}avatarUrl=/);
  });
});
