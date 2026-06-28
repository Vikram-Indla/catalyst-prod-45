import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repoRoot = resolve(__dirname, '../../../../..');
const src = readFileSync(
  resolve(repoRoot, 'src/components/shared/JiraTable/JiraTable.tsx'),
  'utf8',
);

// RCA 2026-06-28 (excess Work-column left padding): the expand-chevron slot
// was reserved on EVERY row whenever `getRowHasChildren` was provided as a
// prop. Callers (BacklogPage, Tasks) always pass it as a function, so the
// empty 24px slot (+4px margin) was rendered even when 0 rows were expandable,
// pushing the type icon + key ~28px to the right. The fix gates the empty slot
// on `anyRowHasChildren` (at least one VISIBLE row is actually expandable),
// matching Jira: the toggle column appears only when something can be toggled.
describe('JiraTable — chevron slot gating (2026-06-28 RCA)', () => {
  it('computes anyRowHasChildren from the actual visible rows', () => {
    // The gate must be derived from real expandability, not prop presence.
    expect(src).toMatch(/const\s+anyRowHasChildren\s*=/);
    expect(src).toMatch(/anyRowHasChildren[\s\S]{0,200}getRowHasChildren\([\s\S]{0,40}\)/);
  });

  it('gates the empty chevron placeholder on anyRowHasChildren, not on prop presence', () => {
    // The placeholder early-return must use anyRowHasChildren.
    expect(src).toMatch(/if\s*\(\s*!anyRowHasChildren\s*\)\s*return null/);
  });

  it('does NOT gate the empty slot on bare getRowHasChildren presence (the old bug)', () => {
    // Regression guard: reverting to `if (!getRowHasChildren) return null`
    // reintroduces the per-row dead padding on flat lists.
    expect(src).not.toMatch(/if\s*\(\s*!getRowHasChildren\s*\)\s*return null/);
  });
});
