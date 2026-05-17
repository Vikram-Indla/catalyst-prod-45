import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repoRoot = resolve(__dirname, '../../../../..');

// Per-consumer assertions: each consumer must (a) not define a standalone
// __type column, (b) drop the now-unused makeTypeIconCell import, and (c)
// pass an icon source into makeKeyCell so the type glyph stays visible in
// the Key cell (Jira "Work" column parity, 2026-05-17 jira-compare).
const consumers: Array<{ path: string; iconSource: RegExp }> = [
  {
    path: 'src/components/universal-work-view/UWVTable.tsx',
    iconSource: /JiraIssueTypeIcon/,
  },
  {
    path: 'src/pages/incidenthub/IncidentListPage.tsx',
    iconSource: /type_icon_url/,
  },
];

describe('JiraTable consumers — icon-only Type column removal (2026-05-17 jira-compare)', () => {
  describe.each(consumers)('$path', ({ path, iconSource }) => {
    const src = readFileSync(resolve(repoRoot, path), 'utf8');

    it('does not define an id: "__type" column', () => {
      expect(src).not.toMatch(/id:\s*['"]__type['"]/);
    });

    it('does not import makeTypeIconCell (column was removed; icon now lives in Key cell)', () => {
      expect(src).not.toMatch(/makeTypeIconCell/);
    });

    it('renders the type icon inside the Key cell (icon source appears within the makeKeyCell call)', () => {
      // Match makeKeyCell( ... iconSource ... ) — icon must be one of the
      // first ~600 chars after the call site (the 4th positional arg).
      const pattern = new RegExp(`makeKeyCell\\(\\s*[\\s\\S]{0,600}?${iconSource.source}`);
      expect(src).toMatch(pattern);
    });
  });
});
