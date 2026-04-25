/**
 * AgeingPanel — For You / Ageing tab.
 *
 * Styling contract (April 2026 /design-critique pass):
 * ───────────────────────────────────────────────────
 *   Same row primitive as every other For You tab. No filter pills, no
 *   metric strip, no governance banner, no AI-Cleanup CTA — those
 *   surfaces live in the governance dashboard and distract from the
 *   "Hey, these are breaching your SLA" signal the For You page is
 *   supposed to carry. This panel renders a grouped list of ForYouRows
 *   with SLA-breach headings and nothing else.
 *
 *   The old AgeingTab component is still shipped for the notifications
 *   drawer (which has its own chrome needs), so we don't delete it — we
 *   just stop wrapping it here.
 *
 * Data source
 * ───────────
 *   `useAgeingItems()` already filters to `assignee_account_id = me` at
 *   the SQL layer (see src/hooks/useAgeingItems.ts Step B). The returned
 *   AgeingItem shape is a superset of what we need — we map it to
 *   WorkItem and route through ForYouRow.
 *
 * SLA grouping
 * ────────────
 *   AgeingTab buckets by days_open (1 week / 1 month / 1-3 months / 3+).
 *   That's chronological, not SLA-aware. The redesign groups by
 *   SLA breach state using the per-issue-type thresholds:
 *     Production Incident  → 1 day
 *     QA Bug               → 3 days
 *     Sub-task             → 5 days
 *     Story                → 10 days
 *     Feature              → 15 days
 *   Items past their threshold go into "Overdue SLA", the rest bucket by
 *   age (this week / this month / older) so the user's eye lands on the
 *   breaches first.
 */
import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { token } from '@atlaskit/tokens';
import Spinner from '@atlaskit/spinner';
import { useAgeingItems, type AgeingItem } from '@/hooks/useAgeingItems';
import ForYouRow from './ForYouRow';
import { ForYouEmptyState } from './helpers';
import { text } from '@/lib/typography';
import { resolveAvatarUrl } from '@/lib/avatars';
import type { WorkItem, HubType, WorkMode, WorkGroup } from '@/hooks/useForYouData';

// ─── SLA thresholds (mirrors AgeingTab) ─────────────────────────────────────
// Jira's "days in current status" thresholds keyed by normalised item type.
// Everything past its threshold bucketed into "Overdue SLA".
const SLA_THRESHOLDS: Record<string, number> = {
  'Production Incident': 1,
  'QA Bug': 3,
  'Sub-task': 5,
  'Story': 10,
  'Feature': 15,
};

function normaliseItemType(raw: string): string {
  const v = (raw || '').toLowerCase();
  if (v.includes('incident')) return 'Production Incident';
  if (v.includes('bug')) return 'QA Bug';
  if (v.includes('sub')) return 'Sub-task';
  if (v.includes('feature') || v.includes('new feature')) return 'Feature';
  return 'Story';
}

// ─── Row mapping ────────────────────────────────────────────────────────────
function formatRelative(dateStr: string): string {
  if (!dateStr) return '—';
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins === 1) return '1 minute ago';
  if (mins < 60) return `${mins} minutes ago`;
  const hours = Math.floor(mins / 60);
  if (hours === 1) return '1 hour ago';
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
}

function initials(name: string): string {
  return (name || '')
    .split(/\s+/)
    .map(p => p[0])
    .filter(Boolean)
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function ageingToWorkItem(a: AgeingItem): WorkItem {
  const assigneeName = a.assignee_display_name || 'Unassigned';
  return {
    id: a.id,
    key: a.issue_key,
    summary: a.summary,
    phIssueId: a.id,
    mode: 'DEL' as WorkMode,
    level: a.issue_type,
    project: a.project_name || a.project_key || '',
    projectKey: a.project_key || '',
    hub: 'ProjectHub' as HubType,
    hubLabel: 'Project',
    issueType: a.issue_type,
    status: a.status || 'To Do',
    priority: a.priority || 'Medium',
    priorityLevel: 2,
    parentKey: a.parent_key || undefined,
    parentSummary: a.parent_summary || undefined,
    updatedAt: a.jira_updated_at ? formatRelative(a.jira_updated_at) : '—',
    createdAt: a.jira_created_at || '—',
    jiraUrl: a.issue_key ? `https://jira.example.com/browse/${a.issue_key}` : undefined,
    assignee: {
      id: a.assignee_account_id || 'none',
      name: assigneeName,
      initials: initials(assigneeName),
      avatarColor: '#6B7280',
      avatarUrl: resolveAvatarUrl(assigneeName) || undefined,
    },
    reporter: a.reporter_display_name || undefined,
    group: 'EARLIER' as WorkGroup,
    starred: false,
  };
}

// ─── Section heading — identical to AssignedPanel.SectionHeading ────────────
function SectionHeading({ label, count }: { label: string; count: number }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        paddingInline: 12,
        paddingBlockStart: 16,
        paddingBlockEnd: 8,
      }}
    >
      <span
        style={{
          font: `500 14px/20px var(--ds-font-family-body)`,
          letterSpacing: 'normal',
          color: text.subtlest,
          textTransform: 'none',
        }}
      >
        {label}
      </span>
      <span
        style={{
          font: `400 12px/16px var(--ds-font-family-body)`,
          color: text.subtle,
          backgroundColor: token('elevation.surface.sunken', '#F7F8F9'),
          paddingInline: 6,
          borderRadius: 999,
        }}
      >
        {count}
      </span>
    </div>
  );
}

// ─── Bucketing ──────────────────────────────────────────────────────────────
type AgeingBucket = 'overdue' | 'thisWeek' | 'thisMonth' | 'quarter' | 'older';

const BUCKET_LABELS: Record<AgeingBucket, string> = {
  overdue:   'Overdue SLA',
  thisWeek:  'This week (1–7 days)',
  thisMonth: 'This month (8–30 days)',
  quarter:   '1–3 months',
  older:     '3+ months',
};

const BUCKET_ORDER: AgeingBucket[] = ['overdue', 'thisWeek', 'thisMonth', 'quarter', 'older'];

function bucketFor(a: AgeingItem): AgeingBucket {
  const type = normaliseItemType(a.issue_type);
  const threshold = SLA_THRESHOLDS[type] ?? 10;
  if (a.days_open > threshold) return 'overdue';
  if (a.days_open <= 7) return 'thisWeek';
  if (a.days_open <= 30) return 'thisMonth';
  if (a.days_open <= 90) return 'quarter';
  return 'older';
}

// ─── Component ──────────────────────────────────────────────────────────────
export default function AgeingPanel() {
  const navigate = useNavigate();
  const { data: ageingItems, isLoading, isError } = useAgeingItems();

  const grouped = useMemo(() => {
    if (!ageingItems) return [];
    const buckets = new Map<AgeingBucket, AgeingItem[]>();
    for (const a of ageingItems) {
      const b = bucketFor(a);
      if (!buckets.has(b)) buckets.set(b, []);
      buckets.get(b)!.push(a);
    }
    // Within each bucket, sort most-aged first.
    for (const list of buckets.values()) {
      list.sort((x, y) => y.days_open - x.days_open);
    }
    return BUCKET_ORDER
      .map(b => ({ bucket: b, label: BUCKET_LABELS[b], items: buckets.get(b) ?? [] }))
      .filter(g => g.items.length > 0);
  }, [ageingItems]);

  const handleSelect = (item: WorkItem) => {
    if (!item.key) return;
    navigate(`/issues/${item.key}`);
  };

  const handleToggleStar = () => {
    // Stars aren't wired for governance rows — the ageing source doesn't
    // track star state. Rendering the star (hover-reveal) keeps visual
    // parity with Assigned; click is a no-op so we don't silently fail
    // a persistence round-trip.
  };

  if (isLoading) {
    return (
      <div style={{ padding: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
        <Spinner size="small" />
        <span style={{ color: token('color.text.subtle', '#626F86'), font: `400 14px/20px var(--ds-font-family-body)` }}>
          Loading ageing items…
        </span>
      </div>
    );
  }

  if (isError) {
    return (
      <ForYouEmptyState
        title="Couldn't load ageing items"
        description="There was a problem reading your assigned work from the governance view. Try reloading the page."
      />
    );
  }

  if (!ageingItems || ageingItems.length === 0) {
    return (
      <ForYouEmptyState
        title="No ageing items assigned to you"
        description="Every work item assigned to you is within its SLA window. Clean inbox."
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {grouped.map(({ bucket, label, items }) => (
        <div key={bucket}>
          <SectionHeading label={label} count={items.length} />
          {items.map(a => (
            <ForYouRow
              key={a.id}
              item={ageingToWorkItem(a)}
              onSelect={handleSelect}
              onToggleStar={handleToggleStar}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
