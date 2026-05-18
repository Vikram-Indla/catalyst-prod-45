/**
 * Phase B-4b — DemandDetailsViewTab inline UserAvatar migration.
 *
 * The drawer tab defines its own inline `function UserAvatar(...)` at
 * roughly line 78, used 3× in the same file. Same hardcoded-bronze
 * initials pattern as the planner sibling. Migration: delete the inline
 * function, import the canonical, rewrite the 3 callsites with ADS sizes.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..', '..', '..');
const FILE = join(ROOT, 'src/components/industry/drawer-tabs/DemandDetailsViewTab.tsx');

function src(): string { return readFileSync(FILE, 'utf8'); }

describe('DemandDetailsViewTab — inline UserAvatar migration', () => {
  it('inline `function UserAvatar(` definition is gone', () => {
    expect(src()).not.toMatch(/\bfunction\s+UserAvatar\s*\(/);
  });

  it('canonical UserAvatar is imported from @/components/shared/UserAvatar', () => {
    expect(src()).toMatch(/import\s+(?:UserAvatar|\{\s*UserAvatar\s*\})\s+from\s+['"]@\/components\/shared\/UserAvatar['"]/);
  });

  it('callsites no longer pass size="sm" (must use ADS-canonical "small")', () => {
    const s = src();
    expect(s).not.toMatch(/<UserAvatar[\s\S]{0,200}size=['"]sm['"]/);
  });
});
