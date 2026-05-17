import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repoRoot = resolve(__dirname, '../../../../..');

// 2026-05-17 jira-compare cycle 2: Vikram screenshot showed an empty
// column 2 between the visible row checkbox and the Key cell on
// BacklogPage. Root cause: BacklogPage defines its own __checkbox column
// AND passes selectable={true} to JiraTable. JiraTable auto-prepends a
// __select column when selectable, so the table renders TWO checkbox
// columns — the second one (__checkbox) appears empty because the
// canonical's __select is also active. UWVTable / IncidentListPage do
// not have this duplication.
describe('JiraTable consumers — no duplicate __checkbox column (2026-05-17)', () => {
  const consumers = [
    'src/modules/project-work-hub/pages/BacklogPage.atlaskit.tsx',
    'src/components/universal-work-view/UWVTable.tsx',
    'src/pages/incidenthub/IncidentListPage.tsx',
  ];

  it.each(consumers)(
    '%s — does not define a custom id: "__checkbox" column (rely on JiraTable\'s built-in __select)',
    (relPath) => {
      const src = readFileSync(resolve(repoRoot, relPath), 'utf8');
      expect(src).not.toMatch(/id:\s*['"]__checkbox['"]/);
    },
  );
});
