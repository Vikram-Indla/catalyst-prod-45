/**
 * BR subtask categories (2026-06-15): the Business Request detail view must
 * mount SubtasksPanel as a Catalyst-native, picker-scoped surface:
 *   - parentSource="catalyst"  → subtasks land in catalyst_issues, NOT ph_issues
 *   - childTypeOverride         → picker restricted to the 5 BR categories
 *   - projectKey from request_key prefix → MDT-### shared sequence (Q3)
 *
 * Static-analysis test (source-text) — the mount is deep inside a memo, so
 * we assert the wiring intent at the source level (matches workTypeIcons.test.ts).
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { BUSINESS_REQUEST_SUBTASK_TYPES } from '@/components/catalyst-detail-views/shared/parent-rules';

const VIEW_PATH = path.resolve(
  __dirname,
  '../CatalystViewBusinessRequest.v3.tsx',
);
const source = fs.readFileSync(VIEW_PATH, 'utf-8');

describe('BUSINESS_REQUEST_SUBTASK_TYPES', () => {
  it('is exactly the 5 agreed categories', () => {
    expect([...BUSINESS_REQUEST_SUBTASK_TYPES]).toEqual([
      'BRD Task', 'Business Gap', 'Change Request', 'UAT Finding', 'Figma',
    ]);
  });
});

describe('CatalystViewBusinessRequestV3 — SubtasksPanel wiring', () => {
  it('persists subtasks to catalyst_issues (parentSource="catalyst")', () => {
    expect(source).toContain('parentSource="catalyst"');
  });

  it('scopes the picker via childTypeOverride from BUSINESS_REQUEST_SUBTASK_TYPES', () => {
    expect(source).toContain('childTypeOverride={[...BUSINESS_REQUEST_SUBTASK_TYPES]}');
  });

  it('derives the subtask key prefix from request_key (MDT-### shared sequence)', () => {
    expect(source).toContain("request.request_key?.split('-')[0] || 'MDT'");
  });

  it('no longer hardcodes the MIM project fallback for subtasks', () => {
    expect(source).not.toContain("request.project_key || 'MIM'");
  });
});
