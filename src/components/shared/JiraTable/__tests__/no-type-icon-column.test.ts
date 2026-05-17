import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repoRoot = resolve(__dirname, '../../../../..');

// Per-consumer assertions: each consumer must (a) not define a standalone
// __type column, (b) drop the now-unused makeTypeIconCell import, and (c)
// pass an icon source into makeKeyCell so the type glyph stays visible in
// the Key cell (Jira "Work" column parity, 2026-05-17 jira-compare).
const consumers: Array<{
  path: string;
  bannedColumnId: RegExp;
  iconSource: RegExp;
}> = [
  {
    path: 'src/components/universal-work-view/UWVTable.tsx',
    bannedColumnId: /id:\s*['"]__type['"]/,
    iconSource: /JiraIssueTypeIcon/,
  },
  {
    path: 'src/pages/incidenthub/IncidentListPage.tsx',
    bannedColumnId: /id:\s*['"]__type['"]/,
    iconSource: /type_icon_url/,
  },
  {
    path: 'src/modules/project-work-hub/pages/BacklogPage.atlaskit.tsx',
    bannedColumnId: /id:\s*['"]type['"]/,
    iconSource: /JiraIssueTypeIcon/,
  },
];

describe('JiraTable consumers — icon-only Type column removal (2026-05-17 jira-compare)', () => {
  describe.each(consumers)('$path', ({ path, bannedColumnId, iconSource }) => {
    const src = readFileSync(resolve(repoRoot, path), 'utf8');

    it('does not define a standalone Type column', () => {
      expect(src).not.toMatch(bannedColumnId);
    });

    it('does not import makeTypeIconCell (column was removed; icon now lives in Key cell)', () => {
      expect(src).not.toMatch(/makeTypeIconCell/);
    });

    it('renders the type icon inside the Key cell (icon source appears within the makeKeyCell call)', () => {
      // Match makeKeyCell( ... iconSource ... ) — icon source must appear
      // inside the call site as the 4th positional arg. Window widened to
      // 1500 chars to accommodate BacklogPage's verbose initiative branch
      // (initiative-vs-typeMap branch is ~1300 chars before JiraIssueTypeIcon).
      const pattern = new RegExp(`makeKeyCell\\(\\s*[\\s\\S]{0,1500}?${iconSource.source}`);
      expect(src).toMatch(pattern);
    });
  });
});
