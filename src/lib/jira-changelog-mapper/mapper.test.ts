/**
 * mapChangelogItem — pure function that converts a Jira changelog item
 * into rows for catalyst_status_history (status field only) AND
 * work_item_changelogs (every field).
 *
 * Phase 4 row 2 — TIS hover card feature. CLAUDE.md TDD gate.
 *
 * The function ships RED before mapper.ts exists. It pins the contract
 * that wh-jira-changelog-backfill must populate BOTH tables — the current
 * edge fn only writes catalyst_status_history for `field === 'status'`,
 * leaving work_item_changelogs empty and the assignee-history hover card
 * with no data source.
 */
import { describe, it, expect } from 'vitest';
// Import target does NOT exist yet — RED state for TDD.
import { mapChangelogItem, type JiraHistoryItem, type ChangelogContext } from './mapper';

const ctx: ChangelogContext = {
  issue_key: 'BAU-5957',
  project_key: 'BAU',
  work_item_id: '11111111-1111-1111-1111-111111111111',
  jira_history_id: '7000123',
  changed_at: '2026-05-24T11:30:00.000Z',
  actor_name: 'Vikram Indla',
  actor_account_id: '5b10ac8d82e05b22cc7d4ef5',
  actor_avatar_url: 'https://secure.gravatar.com/avatar/abc',
};

describe('mapChangelogItem — Jira changelog → DB rows', () => {
  it('status field produces BOTH catalyst_status_history AND work_item_changelogs rows', () => {
    const item: JiraHistoryItem = {
      field: 'status',
      fromString: 'Demand Validation',
      toString: 'In Design',
      from: '10001',
      to: '10002',
    };
    const result = mapChangelogItem(item, ctx);
    expect(result.status_history).not.toBeNull();
    expect(result.status_history).toMatchObject({
      issue_key: 'BAU-5957',
      from_status: 'Demand Validation',
      to_status: 'In Design',
      actor_name: 'Vikram Indla',
      actor_account_id: '5b10ac8d82e05b22cc7d4ef5',
      changed_at: '2026-05-24T11:30:00.000Z',
    });
    expect(result.changelog).toMatchObject({
      work_item_id: '11111111-1111-1111-1111-111111111111',
      field_name: 'status',
      field_type: 'jira',
      from_value: '10001',
      from_display: 'Demand Validation',
      to_value: '10002',
      to_display: 'In Design',
      changed_by: 'Vikram Indla',
      changed_by_avatar: 'https://secure.gravatar.com/avatar/abc',
      changed_at: '2026-05-24T11:30:00.000Z',
      jira_changelog_id: '7000123',
    });
  });

  it('assignee field produces ONLY work_item_changelogs row', () => {
    const item: JiraHistoryItem = {
      field: 'assignee',
      fromString: 'Nada Alkhairy',
      toString: 'Yazeed Daraz',
      from: 'acc:nada',
      to: 'acc:yazeed',
    };
    const result = mapChangelogItem(item, ctx);
    expect(result.status_history).toBeNull();
    expect(result.changelog).toMatchObject({
      field_name: 'assignee',
      from_value: 'acc:nada',
      from_display: 'Nada Alkhairy',
      to_value: 'acc:yazeed',
      to_display: 'Yazeed Daraz',
    });
  });

  it('priority field produces ONLY work_item_changelogs row', () => {
    const item: JiraHistoryItem = {
      field: 'priority',
      fromString: 'Medium',
      toString: 'High',
      from: '3',
      to: '2',
    };
    const result = mapChangelogItem(item, ctx);
    expect(result.status_history).toBeNull();
    expect(result.changelog?.field_name).toBe('priority');
    expect(result.changelog?.to_display).toBe('High');
  });

  it('status with no toString returns null for status_history (defensive)', () => {
    const item: JiraHistoryItem = { field: 'status', fromString: 'To Do', toString: null };
    const result = mapChangelogItem(item, ctx);
    expect(result.status_history).toBeNull();
  });

  it('unknown field still produces a changelog row (every Jira event is auditable)', () => {
    const item: JiraHistoryItem = {
      field: 'Sprint',
      fromString: 'Sprint 12',
      toString: 'Sprint 13',
    };
    const result = mapChangelogItem(item, ctx);
    expect(result.status_history).toBeNull();
    expect(result.changelog).not.toBeNull();
    expect(result.changelog?.field_name).toBe('Sprint');
  });

  it('null actor_name does not throw — produces row with null changed_by', () => {
    const item: JiraHistoryItem = { field: 'assignee', toString: 'Someone', from: null };
    const result = mapChangelogItem(item, { ...ctx, actor_name: null, actor_avatar_url: null });
    expect(result.changelog?.changed_by).toBeNull();
    expect(result.changelog?.changed_by_avatar).toBeNull();
  });
});
