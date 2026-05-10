/**
 * Stage 3 X6 — CatalystActivitySection history dedup
 *
 * Jira's bulk-sync / incremental-sync writes Jira changelog entries
 * into ph_activity_log. Some Jira changelog items have field: "comment"
 * (when a comment is added/edited via the Jira API — the changelog records
 * it as a field change). These entries would appear in the Activity > History
 * feed AND in the Activity > Comments feed simultaneously — a visual duplicate
 * in the "All" tab.
 *
 * Fix: the history query in CatalystActivitySection must filter out
 * ph_activity_log rows where field_name = 'comment'.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(
  resolve(__dirname, '../CatalystActivitySection.tsx'),
  'utf-8',
);

describe('CatalystActivitySection — history dedup', () => {
  it('history query must exclude field_name = comment entries to prevent double-rendering with Comments feed', () => {
    // The ph_activity_log history query should filter out rows where
    // field_name is 'comment'. Jira's API changelog uses field:"comment"
    // for comment additions — these are already shown in the Comments feed
    // (from ph_comments). Including them in history creates a duplicate.
    //
    // Expected: source contains a .neq / .not / .filter call targeting
    // 'field_name' and the string 'comment' within the history query block.
    const hasFilter = (
      src.includes(".neq('field_name', 'comment')") ||
      src.includes('.neq("field_name", "comment")') ||
      src.includes(".not('field_name', 'in'") ||
      src.includes('.not("field_name", "in"')
    );
    expect(
      hasFilter,
      'CatalystActivitySection history query must filter out field_name="comment" entries. ' +
      'Add .neq(\'field_name\', \'comment\') to the ph_activity_log query to prevent ' +
      'Jira comment-changelog entries from appearing in History alongside Comments.',
    ).toBe(true);
  });
});
