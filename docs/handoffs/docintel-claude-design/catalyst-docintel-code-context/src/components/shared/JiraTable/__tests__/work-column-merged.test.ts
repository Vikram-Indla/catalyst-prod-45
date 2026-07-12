import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repoRoot = resolve(__dirname, '../../../../..');
const src = readFileSync(
  resolve(repoRoot, 'src/modules/project-work-hub/pages/BacklogPage.atlaskit.tsx'),
  'utf8',
);

// 2026-05-17 jira-compare cycle 2 (design-critique H4 P0): Jira renders the
// row identifier as a single "Work" column containing [type icon][BAU key
// link][summary text]. Catalyst was splitting this across two columns ("Key"
// + "Summary") with a vertical divider that Jira does not have. The fix
// merges them: id stays 'key' for URL backward-compat, label changes to
// "Work", the cell renderer composes the existing key + summary cell
// factories so inline edit, hover affordances, and key navigation all
// continue to work inside one cell.
describe('BacklogPage — Key + Summary merged into "Work" column (2026-05-17)', () => {
  it('does not define a standalone id: "summary" column', () => {
    expect(src).not.toMatch(/id:\s*['"]summary['"]/);
  });

  it('renames the key column header to "Work"', () => {
    // The 'key' column's label must read "Work" (Jira parity).
    expect(src).toMatch(/id:\s*['"]key['"][\s\S]{0,800}label:\s*['"]Work['"]/);
  });

  it('Work column composes makeKeyCell + makeSummaryInlineEditCell', () => {
    // Both factories must be invoked inside the Work column's cell
    // definition (within ~3000 chars of the id: 'key' line — the composed
    // IIFE is verbose because it inlines the type-icon resolver).
    // 2026-07-09: makeKeyCell → makeSummaryInlineEditCell grew to ~2500 chars
    // after the 'initiative' branch (hex-colored badge icon resolution) was
    // added to the type-icon resolver inline in this cell — widened from
    // 2000 to 3000 to match; the composition contract itself is unchanged.
    const pattern = /id:\s*['"]key['"][\s\S]{0,3000}makeKeyCell[\s\S]{0,3000}makeSummaryInlineEditCell/;
    expect(src).toMatch(pattern);
  });

  it('DEFAULT_VISIBLE_COLUMNS does not include "summary"', () => {
    const m = src.match(/DEFAULT_VISIBLE_COLUMNS\s*=\s*\[([^\]]+)\]/);
    expect(m).toBeTruthy();
    expect(m![1]).not.toContain("'summary'");
  });

  it('ALLOWED_COLUMN_IDS does not include "summary"', () => {
    // Match the ALLOWED_COLUMN_IDS set body.
    const m = src.match(/ALLOWED_COLUMN_IDS\s*=\s*new Set\(\[([\s\S]*?)\]\)/);
    expect(m).toBeTruthy();
    expect(m![1]).not.toMatch(/['"]summary['"]/);
  });
});
