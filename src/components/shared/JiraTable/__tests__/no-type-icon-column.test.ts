import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repoRoot = resolve(__dirname, '../../../../..');

// Per-consumer assertions: each consumer must (a) not define a standalone
// __type column, (b) drop the now-unused makeTypeIconCell import, and (c)
// pass an icon source into makeKeyCell so the type glyph stays visible in
// the Key cell (Jira "Work" column parity, 2026-05-17 jira-compare).
// 2026-06-16: IncidentListPage.tsx stopped defining its own JiraTable columns
// entirely — it now delegates to the canonical BacklogPage (with an incidents
// data adapter) per CLAUDE.md "adopt canonical components, do not
// reimplement" (see file header comment there). There is no more `__type`
// column, `makeKeyCell` call, or `type_icon_url` reference to check in this
// file; the icon-in-Key-cell contract for its rendered rows is already
// covered by the BacklogPage.atlaskit.tsx entry below, since that's what
// actually renders them now. Removed as a standalone consumer rather than
// left with a stale assertion against dead code.
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

  it('IncidentListPage.tsx delegates to the canonical BacklogPage instead of defining its own columns', () => {
    const src = readFileSync(
      resolve(repoRoot, 'src/pages/incidenthub/IncidentListPage.tsx'),
      'utf8',
    );
    expect(src).toMatch(/from ['"]@\/modules\/project-work-hub\/pages\/BacklogPage\.atlaskit['"]/);
    expect(src).not.toMatch(/makeKeyCell|makeTypeIconCell|id:\s*['"]__type['"]/);
  });
});
