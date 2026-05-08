/**
 * Bucket C — work type icons must use WorkItemTypeIcon (canonical, with
 * admin override support via useIconOverrides) not JiraIssueTypeIcon
 * (legacy, no override path).
 *
 * We test this at the source-text level: the modal must NOT import
 * JiraIssueTypeIcon. Static-analysis style test — no DOM needed.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

const MODAL_PATH = path.resolve(
  __dirname,
  '../CreateStoryModal.tsx',
);

const source = fs.readFileSync(MODAL_PATH, 'utf-8');

describe('CreateStoryModal icon canonicalization (Bucket C)', () => {
  it('does NOT import JiraIssueTypeIcon (legacy, no admin-override path)', () => {
    expect(source).not.toContain('JiraIssueTypeIcon');
  });

  it('imports WorkItemTypeIcon (canonical, backed by useIconOverrides)', () => {
    expect(source).toContain('WorkItemTypeIcon');
  });
});
