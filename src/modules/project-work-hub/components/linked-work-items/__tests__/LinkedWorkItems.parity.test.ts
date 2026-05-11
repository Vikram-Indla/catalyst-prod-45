/**
 * LinkedWorkItems — jira-compare DC4 2026-05-11 parity gates
 *
 * Probed 2026-05-11:
 *  - Jira linked work items renders a semantic table (native-issue-table /
 *    aria-rowgroup), NOT a div[role="list"]. Closest Atlaskit public equivalent
 *    confirmed in package.json: @atlaskit/dynamic-table@^18.4.0.
 *  - LinkTypeGroup used div[role="list"] + LinkedWorkItemRow with CSS grid —
 *    not a table, no sortable columns.
 *  - LinkedWorkItemRow used lucide-react <X> for the unlink action button;
 *    the ADS-only rule (CLAUDE.md 2026-04-28) requires @atlaskit/icon.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const LTG = readFileSync(
  resolve(__dirname, '../LinkTypeGroup.tsx'),
  'utf-8',
);

const LWR = readFileSync(
  resolve(__dirname, '../LinkedWorkItemRow.tsx'),
  'utf-8',
);

describe('LinkedWorkItems — jira-compare DC4 dynamic-table migration', () => {
  it('LinkTypeGroup must import @atlaskit/dynamic-table', () => {
    expect(
      LTG.includes("from '@atlaskit/dynamic-table'"),
      "LinkTypeGroup.tsx: must import DynamicTable from '@atlaskit/dynamic-table'",
    ).toBe(true);
  });

  it('LinkTypeGroup must NOT use div[role="list"] (must use DynamicTable)', () => {
    expect(
      LTG.includes('role="list"'),
      'LinkTypeGroup.tsx: div[role="list"] must be replaced with @atlaskit/dynamic-table',
    ).toBe(false);
  });

  it('LinkedWorkItemRow must NOT import from lucide-react (use @atlaskit/icon)', () => {
    expect(
      LWR.includes("from 'lucide-react'"),
      "LinkedWorkItemRow.tsx: lucide-react import must be replaced with @atlaskit/icon",
    ).toBe(false);
  });

  it('LinkedWorkItemRow must import from @atlaskit/icon for the unlink action', () => {
    expect(
      LWR.includes("from '@atlaskit/icon'") ||
        LWR.includes("from '@atlaskit/icon/"),
      "LinkedWorkItemRow.tsx: must use @atlaskit/icon for the unlink (X/cross) icon",
    ).toBe(true);
  });
});
