/**
 * Context builder tests — the security boundary for the WhatsApp AI summary.
 *
 * These tests verify:
 *  - Classification (businessStatus, isBlocked, isInReview, isDecisionNeeded)
 *  - Permission gating (items without key/summary excluded)
 *  - TimePeriod filtering (last_7_days, last_14_days, last_30_days, current_sprint, all_time)
 *  - ItemScope filtering (all, in_progress, blocked, due_soon)
 *  - Hard cap (never exceeds MAX_ITEMS_HARD_CEILING)
 *  - Count accuracy (counts over full filtered set, not capped set)
 *  - ETA resolution (due_date > sprint > missing)
 *  - Sanitization (HTML stripped, summary truncated at 200 chars)
 *  - Zero-assumption: missing fields → null, never fabricated defaults
 *  - Fallback summary text
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { JqlResultRow } from '@/hooks/workhub/useJqlResults';
import {
  getFilterSummaryContext,
  buildFallbackSummary,
  MAX_ITEMS_HARD_CEILING,
  SUMMARY_MAX_CHARS,
} from '../contextBuilder';
import type { WhatsAppSummaryOptions } from '../types';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const TODAY = '2026-06-13';

const defaultOptions: WhatsAppSummaryOptions = {
  summaryType: 'full',
  audience: 'stakeholder',
  tone: 'formal',
  itemScope: 'all',
  timePeriod: 'all_time',
  includeBlockers: true,
  includeEta: true,
  includeDecisions: true,
  maxItems: 10,
};

function makeRow(overrides: Partial<JqlResultRow> = {}): JqlResultRow {
  return {
    id: 'uuid-1',
    key: 'BAU-1',
    summary: 'Test item',
    issueType: 'Story',
    status: 'In Progress',
    statusCategory: 'In Progress',
    projectKey: 'BAU',
    assigneeName: 'Alice',
    priority: 'Medium',
    created: `${TODAY}T00:00:00Z`,
    updated: `${TODAY}T10:00:00Z`,
    dueDate: null,
    parentKey: null,
    parentSummary: null,
    sprintName: null,
    isFlagged: null,
    flagReason: null,
    ...overrides,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildCtx(
  rows: JqlResultRow[],
  optOverrides: Partial<WhatsAppSummaryOptions> = {},
) {
  return getFilterSummaryContext(
    'My Filter',
    'project = BAU',
    'BAU',
    rows,
    { ...defaultOptions, ...optOverrides },
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('getFilterSummaryContext', () => {
  // Pin today so date-based assertions are deterministic
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(`${TODAY}T12:00:00Z`));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  // ── Permission gating ──────────────────────────────────────────────────────

  it('excludes rows with no key', () => {
    const ctx = buildCtx([makeRow({ key: '' })]);
    expect(ctx.cappedItems).toHaveLength(0);
    expect(ctx.totalItemCount).toBe(0);
  });

  it('excludes rows with no summary', () => {
    const ctx = buildCtx([makeRow({ summary: '' })]);
    expect(ctx.cappedItems).toHaveLength(0);
  });

  it('includes rows that have both key and summary', () => {
    const ctx = buildCtx([makeRow()]);
    expect(ctx.cappedItems).toHaveLength(1);
    expect(ctx.cappedItems[0].key).toBe('BAU-1');
  });

  // ── Hard cap ──────────────────────────────────────────────────────────────

  it('never exceeds MAX_ITEMS_HARD_CEILING regardless of maxItems option', () => {
    const rows = Array.from({ length: 50 }, (_, i) =>
      makeRow({ key: `BAU-${i}`, id: `id-${i}` }),
    );
    const ctx = buildCtx(rows, { maxItems: 999 });
    expect(ctx.cappedItems.length).toBeLessThanOrEqual(MAX_ITEMS_HARD_CEILING);
  });

  it('marks isTruncated when filtered count exceeds maxItems', () => {
    const rows = Array.from({ length: 15 }, (_, i) =>
      makeRow({ key: `BAU-${i}`, id: `id-${i}` }),
    );
    const ctx = buildCtx(rows, { maxItems: 5 });
    expect(ctx.isTruncated).toBe(true);
    expect(ctx.cappedItemCount).toBe(5);
    expect(ctx.counts.total).toBe(15); // counts over full set, not capped
  });

  it('does not mark isTruncated when all items fit', () => {
    const ctx = buildCtx([makeRow()], { maxItems: 10 });
    expect(ctx.isTruncated).toBe(false);
  });

  // ── Classification — businessStatus ────────────────────────────────────────

  it('classifies "Done" status_category as done', () => {
    const ctx = buildCtx([makeRow({ statusCategory: 'Done', status: 'Done' })]);
    expect(ctx.cappedItems[0].businessStatus).toBe('done');
  });

  it('classifies isFlagged=true as blocked', () => {
    const ctx = buildCtx([makeRow({ isFlagged: true, flagReason: 'Waiting for API' })]);
    const item = ctx.cappedItems[0];
    expect(item.businessStatus).toBe('blocked');
    expect(item.isBlocked).toBe(true);
    expect(item.blockerReason).toBe('Waiting for API');
  });

  it('classifies status "Blocked" string as blocked', () => {
    const ctx = buildCtx([makeRow({ status: 'Blocked', statusCategory: 'In Progress' })]);
    expect(ctx.cappedItems[0].businessStatus).toBe('blocked');
  });

  it('classifies "On Hold" status as blocked', () => {
    const ctx = buildCtx([makeRow({ status: 'On Hold', statusCategory: 'In Progress' })]);
    expect(ctx.cappedItems[0].businessStatus).toBe('blocked');
  });

  it('classifies "In Review" status as in_review', () => {
    const ctx = buildCtx([makeRow({ status: 'In Review', statusCategory: 'In Progress' })]);
    expect(ctx.cappedItems[0].businessStatus).toBe('in_review');
    expect(ctx.cappedItems[0].isInReview).toBe(true);
  });

  it('classifies "Ready for QA" as in_review', () => {
    const ctx = buildCtx([makeRow({ status: 'Ready for QA', statusCategory: 'In Progress' })]);
    expect(ctx.cappedItems[0].businessStatus).toBe('in_review');
  });

  it('classifies To Do category as not_started', () => {
    const ctx = buildCtx([makeRow({ status: 'To Do', statusCategory: 'To Do' })]);
    expect(ctx.cappedItems[0].businessStatus).toBe('not_started');
  });

  it('classifies decision-needed status patterns', () => {
    const ctx = buildCtx([makeRow({ status: 'Awaiting Decision', statusCategory: 'In Progress' })]);
    expect(ctx.cappedItems[0].isDecisionNeeded).toBe(true);
  });

  it('blockerReason is null when not blocked', () => {
    const ctx = buildCtx([makeRow({ isFlagged: false, flagReason: 'ignored' })]);
    expect(ctx.cappedItems[0].blockerReason).toBeNull();
  });

  it('blockerReason is null when blocked but no flag_reason', () => {
    const ctx = buildCtx([makeRow({ isFlagged: true, flagReason: null })]);
    expect(ctx.cappedItems[0].blockerReason).toBeNull();
  });

  // ── ETA resolution ─────────────────────────────────────────────────────────

  it('resolves ETA from dueDate when present', () => {
    const ctx = buildCtx([makeRow({ dueDate: '2026-06-20' })]);
    const item = ctx.cappedItems[0];
    expect(item.etaDate).toBe('2026-06-20');
    expect(item.etaSource).toBe('due_date');
  });

  it('resolves ETA source as sprint when no dueDate but sprint exists', () => {
    const ctx = buildCtx([makeRow({ dueDate: null, sprintName: 'Sprint 12' })]);
    const item = ctx.cappedItems[0];
    expect(item.etaDate).toBeNull(); // sprint name is the signal, not a date
    expect(item.etaSource).toBe('sprint');
    expect(item.sprintName).toBe('Sprint 12');
  });

  it('resolves ETA source as missing when neither dueDate nor sprint', () => {
    const ctx = buildCtx([makeRow({ dueDate: null, sprintName: null })]);
    expect(ctx.cappedItems[0].etaSource).toBe('missing');
  });

  // ── Counts ─────────────────────────────────────────────────────────────────

  it('counts are computed over full filtered set, not capped set', () => {
    const rows = [
      makeRow({ key: 'BAU-1', statusCategory: 'Done', status: 'Done' }),
      makeRow({ key: 'BAU-2', statusCategory: 'Done', status: 'Done' }),
      makeRow({ key: 'BAU-3', status: 'In Progress', statusCategory: 'In Progress' }),
    ];
    const ctx = buildCtx(rows, { maxItems: 1 }); // cap to 1
    expect(ctx.cappedItems).toHaveLength(1);
    expect(ctx.counts.total).toBe(3);
    expect(ctx.counts.done).toBe(2);
    expect(ctx.counts.inProgress).toBe(1);
  });

  it('counts overdue items correctly', () => {
    const rows = [
      makeRow({ key: 'BAU-1', dueDate: '2026-06-10', statusCategory: 'In Progress' }), // past
      makeRow({ key: 'BAU-2', dueDate: '2026-06-20', statusCategory: 'In Progress' }), // future
      makeRow({ key: 'BAU-3', dueDate: '2026-06-10', statusCategory: 'Done' }), // past but done — not overdue
    ];
    const ctx = buildCtx(rows);
    expect(ctx.counts.overdue).toBe(1);
  });

  it('counts missingEta only for non-done items', () => {
    const rows = [
      makeRow({ key: 'BAU-1', dueDate: null, sprintName: null, statusCategory: 'In Progress' }),
      makeRow({ key: 'BAU-2', dueDate: null, sprintName: null, statusCategory: 'Done' }), // done, not counted
    ];
    const ctx = buildCtx(rows);
    expect(ctx.counts.missingEta).toBe(1);
  });

  // ── TimePeriod filtering ───────────────────────────────────────────────────

  it('last_7_days excludes items updated >7 days ago', () => {
    const rows = [
      makeRow({ key: 'BAU-1', updated: '2026-06-05T00:00:00Z' }), // 8 days ago
      makeRow({ key: 'BAU-2', updated: '2026-06-10T00:00:00Z' }), // 3 days ago
    ];
    const ctx = buildCtx(rows, { timePeriod: 'last_7_days' });
    expect(ctx.cappedItems.map(i => i.key)).toEqual(['BAU-2']);
  });

  it('last_7_days excludes items with null updated date', () => {
    const ctx = buildCtx([makeRow({ updated: null })], { timePeriod: 'last_7_days' });
    expect(ctx.cappedItems).toHaveLength(0);
  });

  it('all_time includes items regardless of updated date', () => {
    const rows = [
      makeRow({ key: 'BAU-1', updated: null }),
      makeRow({ key: 'BAU-2', updated: '2020-01-01T00:00:00Z' }),
    ];
    const ctx = buildCtx(rows, { timePeriod: 'all_time' });
    expect(ctx.cappedItems).toHaveLength(2);
  });

  it('current_sprint includes only items with sprintName set', () => {
    const rows = [
      makeRow({ key: 'BAU-1', sprintName: 'Sprint 12' }),
      makeRow({ key: 'BAU-2', sprintName: null }),
    ];
    const ctx = buildCtx(rows, { timePeriod: 'current_sprint' });
    expect(ctx.cappedItems.map(i => i.key)).toEqual(['BAU-1']);
  });

  // ── ItemScope filtering ────────────────────────────────────────────────────

  it('blocked scope includes only blocked items', () => {
    const rows = [
      makeRow({ key: 'BAU-1', isFlagged: true }),
      makeRow({ key: 'BAU-2', status: 'In Progress', statusCategory: 'In Progress' }),
    ];
    const ctx = buildCtx(rows, { itemScope: 'blocked' });
    expect(ctx.cappedItems.map(i => i.key)).toEqual(['BAU-1']);
  });

  it('in_progress scope includes in_progress and in_review items', () => {
    const rows = [
      makeRow({ key: 'BAU-1', status: 'In Progress', statusCategory: 'In Progress' }),
      makeRow({ key: 'BAU-2', status: 'In Review', statusCategory: 'In Progress' }),
      makeRow({ key: 'BAU-3', statusCategory: 'Done', status: 'Done' }),
    ];
    const ctx = buildCtx(rows, { itemScope: 'in_progress' });
    const keys = ctx.cappedItems.map(i => i.key);
    expect(keys).toContain('BAU-1');
    expect(keys).toContain('BAU-2');
    expect(keys).not.toContain('BAU-3');
  });

  it('due_soon scope includes items due within 7 days', () => {
    const rows = [
      makeRow({ key: 'BAU-1', dueDate: '2026-06-14', statusCategory: 'In Progress' }), // tomorrow
      makeRow({ key: 'BAU-2', dueDate: '2026-06-30', statusCategory: 'In Progress' }), // too far
      makeRow({ key: 'BAU-3', dueDate: null, statusCategory: 'In Progress' }), // no date
    ];
    const ctx = buildCtx(rows, { itemScope: 'due_soon' });
    expect(ctx.cappedItems.map(i => i.key)).toEqual(['BAU-1']);
  });

  // ── Sanitization ──────────────────────────────────────────────────────────

  it('strips HTML from summary', () => {
    const ctx = buildCtx([makeRow({ summary: '<b>Hello</b> <em>world</em>' })]);
    expect(ctx.cappedItems[0].summary).toBe('Hello world');
  });

  it('truncates summary at SUMMARY_MAX_CHARS', () => {
    const longSummary = 'A'.repeat(SUMMARY_MAX_CHARS + 50);
    const ctx = buildCtx([makeRow({ summary: longSummary })]);
    expect(ctx.cappedItems[0].summary.length).toBeLessThanOrEqual(SUMMARY_MAX_CHARS);
    expect(ctx.cappedItems[0].summary).toMatch(/…$/);
  });

  it('assigns Unassigned when assigneeName is null', () => {
    const ctx = buildCtx([makeRow({ assigneeName: null })]);
    expect(ctx.cappedItems[0].assignee).toBe('Unassigned');
  });

  it('assigns Unknown issueType when issueType is null', () => {
    const ctx = buildCtx([makeRow({ issueType: null })]);
    expect(ctx.cappedItems[0].issueType).toBe('Unknown');
  });

  // ── Zero-assumption: no typed domain fallbacks ─────────────────────────────

  it('priority is null when row priority is null (not fabricated)', () => {
    const ctx = buildCtx([makeRow({ priority: null })]);
    expect(ctx.cappedItems[0].priority).toBeNull();
  });

  it('etaDate is null when dueDate is null (not fabricated)', () => {
    const ctx = buildCtx([makeRow({ dueDate: null, sprintName: null })]);
    expect(ctx.cappedItems[0].etaDate).toBeNull();
  });

  // ── Payload shape (contract test for edge-function) ────────────────────────

  it('filterName, filterJql, projectKey, generatedAt are present in output', () => {
    const ctx = getFilterSummaryContext('My Filter', 'project = BAU', 'BAU', [makeRow()], defaultOptions);
    expect(ctx.filterName).toBe('My Filter');
    expect(ctx.filterJql).toBe('project = BAU');
    expect(ctx.projectKey).toBe('BAU');
    expect(ctx.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('options in output has maxItems capped at MAX_ITEMS_HARD_CEILING', () => {
    const ctx = buildCtx([makeRow()], { maxItems: 999 });
    expect(ctx.options.maxItems).toBe(MAX_ITEMS_HARD_CEILING);
  });
});

// ── buildFallbackSummary ──────────────────────────────────────────────────────

describe('buildFallbackSummary', () => {
  it('includes filter name in bold', () => {
    const ctx = getFilterSummaryContext('Sprint Filter', 'project = BAU', 'BAU', [], defaultOptions);
    const text = buildFallbackSummary(ctx);
    expect(text).toContain('*Sprint Filter*');
  });

  it('shows truncation note when isTruncated', () => {
    const rows = Array.from({ length: 15 }, (_, i) => makeRow({ key: `BAU-${i}`, id: `id-${i}` }));
    const ctx = buildCtx(rows, { maxItems: 5 });
    const text = buildFallbackSummary(ctx);
    expect(text).toContain('showing 5 of 15');
  });

  it('includes blocked line only when blocked count > 0', () => {
    const ctx = buildCtx([makeRow({ isFlagged: true })]);
    expect(buildFallbackSummary(ctx)).toContain('🚫 Blocked: 1');
  });

  it('omits blocked line when blocked count is 0', () => {
    const ctx = buildCtx([makeRow()]);
    expect(buildFallbackSummary(ctx)).not.toContain('Blocked');
  });
});
