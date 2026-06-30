/**
 * getFilterSummaryContext — deterministic context builder (security boundary).
 *
 * Runs BEFORE the AI. Responsibility:
 *   1. Permission-gate: items without a key/summary are excluded silently.
 *   2. Filter by ItemScope (auto-derived from summaryType — no UI control).
 *   3. Classify each item (businessStatus, isBlocked, isInReview, isDecisionNeeded, etaDate).
 *   4. Sanitize: strip HTML, truncate summary, replace internal IDs with display names.
 *   5. Cap at options.maxItems (hard ceiling: 30).
 *   6. Compute fallback counts (used by both the edge function and the non-AI fallback).
 *
 * The AI only ever receives FilterSummaryContext — never raw JqlResultRow objects,
 * never raw_json, never comment bodies, never UUIDs.
 *
 * Zero-assumption rule (CLAUDE.md P0): missing fields → null or 'unknown', never fabricated defaults.
 */

import type { JqlResultRow } from '@/hooks/workhub/useJqlResults';
import type {
  WhatsAppSummaryOptions,
  FilterSummaryContext,
  SanitizedItem,
  BusinessStatus,
  EtaSource,
} from './types';

// ── Constants ─────────────────────────────────────────────────────────────────

export const MAX_ITEMS_HARD_CEILING = 30;
export const SUMMARY_MAX_CHARS = 200;

// Jira status strings that indicate "in review" classification.
const REVIEW_STATUS_PATTERNS = [
  'in review',
  'ready for review',
  'under review',
  'review',
  'ready for qa',
  'in qa',
  'qa',
  'testing',
  'ready for testing',
  'in testing',
  'awaiting review',
  'pending review',
  'code review',
];

// Jira status strings that indicate a decision is needed.
const DECISION_STATUS_PATTERNS = [
  'awaiting decision',
  'pending decision',
  'pending approval',
  'awaiting approval',
  'approval pending',
  'blocked on decision',
  'needs decision',
  'escalated',
];

// Jira status strings that indicate "blocked" classification.
const BLOCKED_STATUS_PATTERNS = ['blocked', 'on hold', 'impediment'];

// Jira status strings that indicate "not started" classification.
const NOT_STARTED_CATEGORIES = ['To Do'];

// ── Date helpers ──────────────────────────────────────────────────────────────

function todayMidnight(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}

function parseLocalDate(dateStr: string): Date {
  const parts = dateStr.split('-');
  return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
}

// ── Classification helpers ────────────────────────────────────────────────────

function matchesAny(str: string, patterns: string[]): boolean {
  const lower = str.toLowerCase();
  return patterns.some(p => lower.includes(p));
}

function classifyBusinessStatus(row: JqlResultRow): BusinessStatus {
  const cat = row.statusCategory?.toLowerCase() ?? '';
  const st = row.status?.toLowerCase() ?? '';

  if (cat === 'done') return 'done';
  if (row.isFlagged || matchesAny(st, BLOCKED_STATUS_PATTERNS)) return 'blocked';
  if (matchesAny(st, REVIEW_STATUS_PATTERNS)) return 'in_review';
  if (matchesAny(st, DECISION_STATUS_PATTERNS)) return 'blocked'; // treat as blocked variant
  if (cat === 'in progress' || cat === 'indeterminate') return 'in_progress';
  if (NOT_STARTED_CATEGORIES.some(c => cat === c.toLowerCase() || st === c.toLowerCase())) return 'not_started';
  if (cat === '') return 'unknown';
  return 'in_progress'; // safe default for non-empty non-done categories
}

function resolveEta(row: JqlResultRow): { etaDate: string | null; etaSource: EtaSource } {
  if (row.dueDate) {
    return { etaDate: row.dueDate, etaSource: 'due_date' };
  }
  if (row.sprintName) {
    return { etaDate: null, etaSource: 'sprint' };
  }
  return { etaDate: null, etaSource: 'missing' };
}

function daysStaleFor(row: JqlResultRow, today: Date): number | null {
  if (!row.updated) return null;
  return daysBetween(new Date(row.updated), today);
}

function isOverdue(row: JqlResultRow, today: Date): boolean {
  if (!row.dueDate) return false;
  if (row.statusCategory?.toLowerCase() === 'done') return false;
  const due = parseLocalDate(row.dueDate);
  return due.getTime() < today.getTime();
}

function sanitizeSummary(raw: string): string {
  const stripped = raw.replace(/<[^>]+>/g, '').trim();
  return stripped.length > SUMMARY_MAX_CHARS
    ? stripped.slice(0, SUMMARY_MAX_CHARS - 1) + '…'
    : stripped;
}

// ── Scope — auto-derived from summaryType, no UI control ─────────────────────

function derivedScopeFilter(summaryType: string) {
  return (row: JqlResultRow): boolean => {
    if (summaryType === 'blockers') {
      const st = classifyBusinessStatus(row);
      return st === 'blocked';
    }
    if (summaryType === 'eta') {
      // Only items with an explicit due date are meaningful for ETA summaries
      return !!row.dueDate;
    }
    // 'full' and 'progress' — include all items
    return true;
  };
}

// ── Sanitize a single row into a SanitizedItem ───────────────────────────────

function sanitizeRow(row: JqlResultRow, today: Date): SanitizedItem {
  const businessStatus = classifyBusinessStatus(row);
  const isBlocked = businessStatus === 'blocked';
  const isInReview = businessStatus === 'in_review';
  const isDecisionNeeded = matchesAny(row.status ?? '', DECISION_STATUS_PATTERNS);
  const { etaDate, etaSource } = resolveEta(row);

  const blockerReason = isBlocked
    ? (row.flagReason?.trim() || null)
    : null;

  return {
    key: row.key,
    summary: sanitizeSummary(row.summary ?? ''),
    issueType: row.issueType ?? 'Unknown',
    assignee: row.assigneeName?.trim() || 'Unassigned',
    businessStatus,
    rawStatus: row.status ?? '',
    isBlocked,
    blockerReason,
    etaDate,
    etaSource,
    sprintName: row.sprintName ?? null,
    isInReview,
    isDecisionNeeded,
    daysStale: daysStaleFor(row, today),
    priority: row.priority ?? null,
  };
}

// ── Main export ───────────────────────────────────────────────────────────────

export function getFilterSummaryContext(
  filterName: string,
  filterJql: string,
  projectKey: string | null,
  allRows: JqlResultRow[],
  options: WhatsAppSummaryOptions,
): FilterSummaryContext {
  const today = todayMidnight();
  const maxItems = Math.min(options.maxItems, MAX_ITEMS_HARD_CEILING);
  const scopeFilter = derivedScopeFilter(options.summaryType);

  // Step 1: Permission gate — exclude rows missing key or summary.
  const permittedRows = allRows.filter(r => r.key && r.summary);

  // Step 2: Scope filter (auto-derived from summaryType — no time-period filter).
  const filtered = permittedRows.filter(scopeFilter);

  // Step 3: Classify and sanitize ALL filtered rows (needed for accurate counts).
  const allSanitized: SanitizedItem[] = filtered.map(r => sanitizeRow(r, today));

  // Step 4: Compute counts over the full filtered set.
  let done = 0, inProgress = 0, blocked = 0, inReview = 0, notStarted = 0;
  let decisionNeeded = 0, missingEta = 0, overdue = 0;

  for (const item of allSanitized) {
    if (item.businessStatus === 'done') done++;
    else if (item.businessStatus === 'in_progress') inProgress++;
    else if (item.businessStatus === 'blocked') blocked++;
    else if (item.businessStatus === 'in_review') inReview++;
    else if (item.businessStatus === 'not_started') notStarted++;
    if (item.isDecisionNeeded) decisionNeeded++;
    if (item.etaSource === 'missing' && item.businessStatus !== 'done') missingEta++;
  }

  for (const r of filtered) {
    if (isOverdue(r, today)) overdue++;
  }

  // Step 5: Cap the items sent to the AI.
  const cappedItems = allSanitized.slice(0, maxItems);
  const isTruncated = allSanitized.length > maxItems;

  return {
    filterName,
    filterJql,
    projectKey,
    totalItemCount: permittedRows.length,
    cappedItemCount: cappedItems.length,
    isTruncated,
    generatedAt: new Date().toISOString(),
    options: { ...options, maxItems },
    counts: {
      total: allSanitized.length,
      done,
      inProgress,
      blocked,
      inReview,
      notStarted,
      decisionNeeded,
      missingEta,
      overdue,
    },
    cappedItems,
  };
}

// ── Non-AI fallback text ──────────────────────────────────────────────────────

/**
 * Deterministic fallback summary used when the AI call fails.
 * Never shown unless the AI errors — user sees "Retry" + this text.
 */
export function buildFallbackSummary(ctx: FilterSummaryContext): string {
  const { filterName, counts, isTruncated, cappedItemCount, totalItemCount } = ctx;
  const truncNote = isTruncated
    ? ` (showing ${cappedItemCount} of ${totalItemCount})`
    : '';

  const lines: string[] = [
    `*${filterName}* — ${counts.total} item${counts.total !== 1 ? 's' : ''}${truncNote}`,
    '',
    `✅ Done: ${counts.done}`,
    `🔄 In progress: ${counts.inProgress}`,
    counts.blocked > 0 ? `🚫 Blocked: ${counts.blocked}` : null,
    counts.inReview > 0 ? `👁 In review: ${counts.inReview}` : null,
    counts.notStarted > 0 ? `⏸ Not started: ${counts.notStarted}` : null,
    counts.overdue > 0 ? `⚠️ Overdue: ${counts.overdue}` : null,
    counts.missingEta > 0 ? `📅 Missing ETA: ${counts.missingEta}` : null,
    counts.decisionNeeded > 0 ? `🤔 Decision needed: ${counts.decisionNeeded}` : null,
  ].filter((l): l is string => l !== null);

  return lines.join('\n');
}
