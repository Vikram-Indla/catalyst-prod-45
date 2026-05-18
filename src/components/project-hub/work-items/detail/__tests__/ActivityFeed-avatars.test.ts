/**
 * Phase B-5 — ActivityFeed inline avatar migration.
 *
 * ActivityFeed previously defined TWO local avatar functions:
 *   - function UserAvatar()    (line ~263) returning a hardcoded "ME" tile
 *     for the comment composer current-user indicator.
 *   - function ActivityAvatar({ name }) (line ~248) — deterministic-colour
 *     initials for activity-entry actors.
 *
 * Both replaced by the canonical wrappers shipped in Phase A + B:
 *   - UserAvatar() → CurrentUserAvatar (auth-binding wrapper, B-3)
 *   - ActivityAvatar({ name }) → <UserAvatar name={...} size="medium" />
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..', '..', '..', '..');
const FILE = join(ROOT, 'src/components/project-hub/work-items/detail/ActivityFeed.tsx');

function src(): string { return readFileSync(FILE, 'utf8'); }

describe('ActivityFeed — inline avatar migration', () => {
  it('no inline `function UserAvatar(` definition', () => {
    expect(src()).not.toMatch(/\bfunction\s+UserAvatar\s*\(/);
  });

  it('no inline `function ActivityAvatar(` definition', () => {
    expect(src()).not.toMatch(/\bfunction\s+ActivityAvatar\s*\(/);
  });

  it('imports CurrentUserAvatar from project-hub/shell', () => {
    expect(src()).toMatch(
      /import\s+\{[^}]*CurrentUserAvatar[^}]*\}\s+from\s+['"]@\/components\/project-hub\/shell\/CurrentUserAvatar['"]/,
    );
  });

  it('imports the canonical UserAvatar', () => {
    expect(src()).toMatch(
      /import\s+(?:UserAvatar|\{\s*UserAvatar\s*\})\s+from\s+['"]@\/components\/shared\/UserAvatar['"]/,
    );
  });

  it('uses <CurrentUserAvatar /> for the comment composer', () => {
    expect(src()).toMatch(/<CurrentUserAvatar[\s/>]/);
  });
});
