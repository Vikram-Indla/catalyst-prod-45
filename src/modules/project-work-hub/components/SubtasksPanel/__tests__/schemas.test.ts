/**
 * Unit tests for the Zod boundary validator used in SubtasksPanel createMutation.
 *
 * These are pure function tests — no React, no Supabase, no mocks required.
 * They pin the exact shape that ph_issues.insert() accepts so a future refactor
 * cannot silently drop a required field.
 */
import { describe, it, expect } from 'vitest';
import {
  subtaskCreateInputSchema,
  subtaskUpdatePatchSchema,
  describeCreateError,
} from '../schemas';

describe('subtaskCreateInputSchema', () => {
  const valid = {
    summary: 'Add SSO button',
    issue_type: 'Sub-task',
    parent_key: 'BAU-5335',
    project_key: 'BAU',
    priority: 'Medium' as const,
  };

  it('accepts a well-formed payload', () => {
    const r = subtaskCreateInputSchema.safeParse(valid);
    expect(r.success).toBe(true);
  });

  it('defaults priority to Medium when omitted', () => {
    const { priority, ...without } = valid;
    const r = subtaskCreateInputSchema.safeParse(without);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.priority).toBe('Medium');
  });

  it('rejects empty summary', () => {
    const r = subtaskCreateInputSchema.safeParse({ ...valid, summary: '' });
    expect(r.success).toBe(false);
  });

  it('rejects whitespace-only summary', () => {
    const r = subtaskCreateInputSchema.safeParse({ ...valid, summary: '   \t  ' });
    expect(r.success).toBe(false);
  });

  it('trims leading/trailing whitespace on summary', () => {
    const r = subtaskCreateInputSchema.safeParse({ ...valid, summary: '  Add SSO  ' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.summary).toBe('Add SSO');
  });

  it('rejects summary longer than 255 chars', () => {
    const r = subtaskCreateInputSchema.safeParse({ ...valid, summary: 'x'.repeat(256) });
    expect(r.success).toBe(false);
  });

  it('rejects missing parent_key', () => {
    const r = subtaskCreateInputSchema.safeParse({ ...valid, parent_key: '' });
    expect(r.success).toBe(false);
  });

  it('rejects invalid priority', () => {
    const r = subtaskCreateInputSchema.safeParse({ ...valid, priority: 'Blocker' });
    expect(r.success).toBe(false);
  });
});

describe('subtaskUpdatePatchSchema', () => {
  it('accepts a single-field patch', () => {
    const r = subtaskUpdatePatchSchema.safeParse({ status: 'Done', status_category: 'done' });
    expect(r.success).toBe(true);
  });

  it('accepts a multi-field patch', () => {
    const r = subtaskUpdatePatchSchema.safeParse({
      priority: 'High',
      assignee_account_id: 'acc-123',
      assignee_display_name: 'Fatima',
    });
    expect(r.success).toBe(true);
  });

  it('accepts an assignee clear (null)', () => {
    const r = subtaskUpdatePatchSchema.safeParse({
      assignee_account_id: null,
      assignee_display_name: null,
    });
    expect(r.success).toBe(true);
  });

  it('rejects empty patch', () => {
    const r = subtaskUpdatePatchSchema.safeParse({});
    expect(r.success).toBe(false);
  });

  it('rejects invalid status_category', () => {
    const r = subtaskUpdatePatchSchema.safeParse({ status_category: 'in-progress' });
    expect(r.success).toBe(false);
  });

  it('accepts a position update', () => {
    const r = subtaskUpdatePatchSchema.safeParse({ position: 4096 });
    expect(r.success).toBe(true);
  });

  it('rejects non-finite position', () => {
    const r = subtaskUpdatePatchSchema.safeParse({ position: Number.POSITIVE_INFINITY });
    expect(r.success).toBe(false);
  });
});

describe('describeCreateError', () => {
  it('returns null for a valid input', () => {
    expect(describeCreateError({
      summary: 'x',
      issue_type: 'Sub-task',
      parent_key: 'BAU-1',
      project_key: 'BAU',
    })).toBeNull();
  });

  it('returns a joined error string for invalid input', () => {
    const msg = describeCreateError({ summary: '', issue_type: '', parent_key: '', project_key: '' });
    expect(msg).not.toBeNull();
    expect(typeof msg).toBe('string');
    expect((msg as string).length).toBeGreaterThan(0);
  });
});
