import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repoRoot = resolve(__dirname, '../../../../..');

// 2026-05-17 jira-compare cycle 2 (design-critique H8 P0): the drag affordance
// must NOT live as a structural __drag column — it reserves layout width for
// an icon that's visibility:hidden 99% of the time, leaving an empty gap
// between the row checkbox and the Key cell. Jira renders the grip as a
// row-level absolute overlay positioned outside the column flow. JiraTable
// now exposes renderRowDragHandle + rowDragHandleHidden props; BacklogPage
// must use those instead of a column definition.
describe('BacklogPage — drag handle is row-level, not a column (2026-05-17)', () => {
  const src = readFileSync(
    resolve(repoRoot, 'src/modules/project-work-hub/pages/BacklogPage.atlaskit.tsx'),
    'utf8',
  );

  it('does not define an id: "__drag" column', () => {
    expect(src).not.toMatch(/id:\s*['"]__drag['"]/);
  });

  it('passes renderRowDragHandle to the canonical JiraTable', () => {
    expect(src).toMatch(/renderRowDragHandle=/);
  });

  it('passes rowDragHandleHidden so sort/group state still gates visibility', () => {
    expect(src).toMatch(/rowDragHandleHidden=/);
  });
});

describe('canonical JiraTable — exposes row-level drag handle props (2026-05-17)', () => {
  const src = readFileSync(
    resolve(repoRoot, 'src/components/shared/JiraTable/types.ts'),
    'utf8',
  );

  it('JiraTableProps declares renderRowDragHandle', () => {
    expect(src).toMatch(/renderRowDragHandle\?:/);
  });

  it('JiraTableProps declares rowDragHandleHidden', () => {
    expect(src).toMatch(/rowDragHandleHidden\?:/);
  });
});
