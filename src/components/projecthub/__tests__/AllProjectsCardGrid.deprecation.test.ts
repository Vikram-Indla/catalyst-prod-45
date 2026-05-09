/**
 * P1 deprecation gate — AllProjectsCardGrid must NOT import from backlog module.
 * Cross-module coupling (RequestMetrics, PriorityChip, HealthChip from backlog)
 * was the root defect. This test stays red until the file is deleted.
 */
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const CARD_GRID_PATH = resolve(
  __dirname,
  '../AllProjectsCardGrid.tsx',
);

describe('AllProjectsCardGrid deprecation', () => {
  it('file must not exist (deprecated in P1)', () => {
    expect(existsSync(CARD_GRID_PATH)).toBe(false);
  });

  it('AllProjectsPage must not import AllProjectsCardGrid', () => {
    const pagePath = resolve(__dirname, '../../../pages/project-hub/AllProjectsPage.tsx');
    const src = readFileSync(pagePath, 'utf-8');
    expect(src).not.toContain('AllProjectsCardGrid');
  });
});
