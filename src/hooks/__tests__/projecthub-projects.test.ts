/**
 * Tests for Projects module — icon fields and sync count filter.
 * TDD: these tests are written FIRST and must fail until implementation is complete.
 */
import { describe, it, expect } from 'vitest';
import type { ProjectListItem } from '@/types/projecthub';

// ── Test 1: ProjectListItem must expose icon fields ──────────────────────────
// These fields don't exist yet on the type — this test captures the contract.
describe('ProjectListItem type contract', () => {
  it('has icon_avatar_url field (from projects.avatar_url via parallel fetch)', () => {
    // Runtime shape check: create a minimal object satisfying the extended type
    // and verify the fields are accessible without TypeScript errors.
    const item: ProjectListItem = {
      id: 'test-id',
      name: 'Test Project',
      project_key: 'TST',
      status: 'active',
      health_status: null,
      department: null,
      description: null,
      total_epics: 0,
      total_features: 0,
      total_stories: 0,
      total_tasks: 0,
      total_issues: 0,
      work_items_todo: 0,
      work_items_in_progress: 0,
      work_items_done: 0,
      completion_percentage: 0,
      updated_at: '2026-01-01T00:00:00Z',
      created_at: '2026-01-01T00:00:00Z',
      owner_id: null,
      priority: null,
      tags: null,
      member_count: 0,
      member_ids: null,
      last_synced_at: null,
      lead_id: null,
      lead_name: null,
      lead_avatar_url: null,
      computed_score: null,
      // NEW fields — these will cause a TS error until added to the type
      icon_avatar_url: null,
      icon_color: null,
      jira_issue_count: null,
    };

    expect('icon_avatar_url' in item).toBe(true);
    expect('icon_color' in item).toBe(true);
    expect('jira_issue_count' in item).toBe(true);
  });
});

// ── Test 2: Sync count filter logic ──────────────────────────────────────────
// Extract the date boundary into a pure, testable constant so the query can
// be validated without mocking Supabase.
import { SYNC_COUNT_DATE_BOUNDARY, buildSyncCountFilter } from '@/hooks/projecthub-sync-utils';

describe('buildSyncCountFilter', () => {
  it('returns only issues with jira_updated_at >= 2026-01-01', () => {
    const issues = [
      { project_key: 'BAU', jira_updated_at: '2025-12-31T23:59:59Z' }, // excluded
      { project_key: 'BAU', jira_updated_at: '2026-01-01T00:00:00Z' }, // included
      { project_key: 'BAU', jira_updated_at: '2026-05-09T10:00:00Z' }, // included
      { project_key: 'IRP', jira_updated_at: '2026-03-15T00:00:00Z' }, // included
      { project_key: 'IRP', jira_updated_at: '2024-06-01T00:00:00Z' }, // excluded
    ];
    const counts = buildSyncCountFilter(issues);
    expect(counts['BAU']).toBe(2);
    expect(counts['IRP']).toBe(1);
    expect(Object.keys(counts)).toHaveLength(2);
  });

  it('uses 2026-01-01 as the boundary date', () => {
    expect(SYNC_COUNT_DATE_BOUNDARY).toBe('2026-01-01');
  });

  it('excludes issues with null jira_updated_at', () => {
    const issues = [
      { project_key: 'BAU', jira_updated_at: null },
    ];
    const counts = buildSyncCountFilter(issues);
    expect(counts['BAU']).toBeUndefined();
  });
});
