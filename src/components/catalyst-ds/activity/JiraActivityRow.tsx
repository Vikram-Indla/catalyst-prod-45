import * as React from 'react';
import { Avatar } from '@/components/ads';
import { StatusPill } from '@/components/shared/JiraTable/cells';
import { statusToLozenge } from '@/modules/project-work-hub/utils/statusToLozenge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { CdsActivityItem } from '../types';

// ─── Field dispatcher ───────────────────────────────────────────────
//
// Jira's changelog `field` string is inconsistent — it's a display
// label for some fields ("Link", "Attachment", "Epic Link", "Sprint",
// "Fix Version") and a lowercase id for others ("status", "summary",
// "description", "assignee", "reporter", "priority", "resolution",
// "labels", "duedate"). Custom fields use the field's display name.
//
// This normalizer maps every form to a single dispatch key so the
// renderer picks the right widget. The `field_type` column we already
// store ("jira" | "custom") is the tiebreaker for customs.
type FieldKind =
  | 'status'
  | 'priority'
  | 'assignee'
  | 'reporter'
  | 'attachment'
  | 'link'
  | 'description'
  | 'summary'
  | 'labels'
  | 'sprint'
  | 'fixVersion'
  | 'component'
  | 'resolution'
  | 'duedate'
  | 'epicLink'
  | 'parent'
  | 'text';

function normalizeField(field: string): FieldKind {
  const f = (field ?? '').trim().toLowerCase();
  switch (f) {
    case 'status': return 'status';
    case 'priority': return 'priority';
    case 'assignee': return 'assignee';
    case 'reporter': return 'reporter';
    case 'attachment': return 'attachment';
    case 'link':
    case 'issuelinks':
    case 'remoteissuelink': return 'link';
    case 'description': return 'description';
    case 'summary': return 'summary';
    case 'labels': return 'labels';
    case 'sprint': return 'sprint';
    case 'fix version':
    case 'fixversion':
    case 'fix versions':
    case 'fixversions': return 'fixVersion';
    case 'component':
    case 'components': return 'component';
    case 'resolution': return 'resolution';
    case 'duedate':
    case 'due date': return 'duedate';
    case 'epic link':
    case 'epic child': return 'epicLink';
    case 'parent':
    case 'parent link': return 'parent';
    default: return 'text';
  }
}

// Human‑friendly verb + field for the headline. Jira phrases:
//   updated the Link / changed the Status / added an Attachment /
//   updated the Description / changed the Priority / changed the Assignee
function describeAction(kind: FieldKind, field: string, oldValue: string | null, newValue: string | null): string {
  const display = (() => {
    switch (kind) {
      case 'status': return 'Status';
      case 'priority': return 'Priority';
      case 'assignee': return 'Assignee';
      case 'reporter': return 'Reporter';
      case 'attachment': return 'an Attachment';
      case 'link': return 'the Link';
      case 'description': return 'the Description';
      case 'summary': return 'the Summary';
      case 'labels': return 'Labels';
      case 'sprint': return 'Sprint';
      case 'fixVersion': return 'Fix versions';
      case 'component': return 'Components';
      case 'resolution': return 'the Resolution';
      case 'duedate': return 'Due date';
      case 'epicLink': return 'the Epic Link';
      case 'parent': return 'the Parent';
      default: return field || 'a field';
    }
  })();

  // Jira uses "added"/"removed" for attachment/link when the OTHER side is null,
  // "changed" for status/priority/assignee/reporter, "updated" for everything else.
  const verb = (() => {
    if (kind === 'attachment' || kind === 'link') {
      if (!oldValue && newValue) return 'added';
      if (oldValue && !newValue) return 'removed';
      return 'updated';
    }
    if (kind === 'status' || kind === 'priority' || kind === 'assignee' || kind === 'reporter') return 'changed';
    return 'updated';
  })();

  // "the Link" / "the Status" already includes the article — don't double up.
  const needsThe = !display.startsWith('the ') && !display.startsWith('a ') && !display.startsWith('an ');
  return `${verb} ${needsThe ? 'the ' : ''}${display}`;
}

function formatAbsolute(ts: string): string {
  const d = new Date(ts);
  if (isNaN(d.getTime())) return '';
  return (
    d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) +
    ' at ' +
    d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  );
}

// ─── Value lookups (name → enrichment) ───────────────────────────────
//
// Our `ph_activity_log` stores the STRING form (`new_value` / `old_value`).
// Jira's UI knows the colour / icon / avatar because the change carries the
// underlying id (status id, priority id, accountId) — we only have the
// name. Best‑effort: look up the supporting data by name.

interface StatusByName { name: string; status_category: string | null; }

function useStatusByNames(names: Array<string | null | undefined>) {
  const distinct = [...new Set(names.filter((n): n is string => !!n))];
  return useQuery<Map<string, string | null>>({
    queryKey: ['activity-status-by-names', distinct.sort().join('|')],
    enabled: distinct.length > 0,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from('ph_issues')
        .select('status, status_category')
        .in('status', distinct);
      const map = new Map<string, string | null>();
      for (const row of (data ?? []) as StatusByName[]) {
        if (!map.has(row.name) && row.status_category != null) {
          map.set(row.name, row.status_category);
        }
      }
      return map;
    },
  });
}

interface UserByName { full_name: string | null; avatar_url: string | null; }

function useUserByNames(names: Array<string | null | undefined>) {
  const distinct = [...new Set(names.filter((n): n is string => !!n))];
  return useQuery<Map<string, UserByName>>({
    queryKey: ['activity-users-by-names', distinct.sort().join('|')],
    enabled: distinct.length > 0,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .in('full_name', distinct);
      const map = new Map<string, UserByName>();
      for (const row of (data ?? []) as UserByName[]) {
        if (row.full_name) map.set(row.full_name, row);
      }
      return map;
    },
  });
}

// ─── Value renderers ────────────────────────────────────────────────

const PRIORITY_GLYPH: Record<string, { glyph: string; color: string }> = {
  Highest: { glyph: '↑↑', color: '#CD1316' },
  High:    { glyph: '↑',  color: '#E2483D' },
  Medium:  { glyph: '=',  color: '#E1A20B' },
  Low:     { glyph: '↓',  color: '#2884FF' },
  Lowest:  { glyph: '↓↓', color: '#0C66E4' },
};

function StatusValue({ value, statusMap }: { value: string | null; statusMap?: Map<string, string | null> }) {
  if (!value) return <NoneLabel />;
  const cat = statusMap?.get(value) ?? null;
  return <StatusPill appearance={statusToLozenge(value, cat ?? undefined)}>{value}</StatusPill>;
}

function PriorityValue({ value }: { value: string | null }) {
  if (!value) return <NoneLabel />;
  const meta = PRIORITY_GLYPH[value];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      {meta && (
        <span aria-hidden style={{ color: meta.color, fontWeight: 700, lineHeight: 1 }}>{meta.glyph}</span>
      )}
      <span>{value}</span>
    </span>
  );
}

function UserValue({ value, userMap }: { value: string | null; userMap?: Map<string, UserByName> }) {
  if (!value) return <NoneLabel />;
  const p = userMap?.get(value);
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <Avatar src={p?.avatar_url ?? undefined} name={value} size="xsmall" />
      <span>{value}</span>
    </span>
  );
}

function PlainValue({ value }: { value: string | null }) {
  if (!value) return <NoneLabel />;
  return <span>{value}</span>;
}

function NoneLabel() {
  return <span style={{ color: 'var(--ds-text-subtle, #6B778C)' }}>None</span>;
}

function Arrow() {
  return (
    <span aria-hidden style={{ color: 'var(--ds-text-subtle, #6B778C)', margin: '0 6px' }}>
      →
    </span>
  );
}

// ─── HISTORY pill ───────────────────────────────────────────────────

export function HistoryPill({ label = 'HISTORY' }: { label?: string }) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: 3,
        border: '1px solid var(--ds-border, #DFE1E6)',
        background: 'var(--ds-background-neutral, #F4F5F7)',
        color: 'var(--ds-text-subtle, #42526E)',
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: 0.5,
        lineHeight: '14px',
        textTransform: 'uppercase',
        fontFamily: 'var(--cp-font-body, system-ui, sans-serif)',
      }}
    >
      {label}
    </span>
  );
}

// ─── Main row ───────────────────────────────────────────────────────

export interface JiraActivityRowProps {
  item: CdsActivityItem;
  /** Show the "HISTORY" / "COMMENT" type pill on each row (All tab only). */
  showTypePill?: boolean;
  /** Pre-fetched status-name → category map (batched at the panel level). */
  statusByNames?: Map<string, string | null>;
  /** Pre-fetched user-name → profile map. */
  userByNames?: Map<string, UserByName>;
}

export function JiraActivityRow({
  item,
  showTypePill,
  statusByNames,
  userByNames,
}: JiraActivityRowProps) {
  if (!item.fieldChange) {
    // No field change — fall back to a minimal "actor did X" line for
    // creation events etc. Mirrors how Jira renders the implicit
    // "created the work item" hint.
    return (
      <div style={{ display: 'flex', gap: 12, padding: '12px 0' }}>
        <span style={{ flexShrink: 0 }}>
          <Avatar src={item.actor.avatarUrl ?? undefined} name={item.actor.name} size="small" />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, color: 'var(--ds-text, #172B4D)' }}>
            <strong>{item.actor.name}</strong> {item.description ?? 'updated this work item'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--ds-text-subtle, #6B778C)' }}>
            {formatAbsolute(item.timestamp)}
          </div>
          {showTypePill && <div style={{ marginTop: 6 }}><HistoryPill /></div>}
        </div>
      </div>
    );
  }

  const fc = item.fieldChange;
  const kind = normalizeField(fc.field);
  const action = describeAction(kind, fc.field, fc.oldValue, fc.newValue);

  const renderSide = (value: string | null) => {
    switch (kind) {
      case 'status':   return <StatusValue value={value} statusMap={statusByNames} />;
      case 'priority': return <PriorityValue value={value} />;
      case 'assignee':
      case 'reporter': return <UserValue value={value} userMap={userByNames} />;
      default:         return <PlainValue value={value} />;
    }
  };

  const isLongText = kind === 'description' || kind === 'summary';

  return (
    <div style={{ display: 'flex', gap: 12, padding: '12px 0' }}>
      <span style={{ flexShrink: 0 }}>
        <Avatar src={item.actor.avatarUrl ?? undefined} name={item.actor.name} size="small" />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: 'var(--ds-text, #172B4D)' }}>
          <strong style={{ color: 'var(--ds-link, #0C66E4)', fontWeight: 600 }}>{item.actor.name}</strong>{' '}
          <span style={{ color: 'var(--ds-text-subtle, #44546F)' }}>{action}</span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--ds-text-subtle, #6B778C)', marginTop: 2 }}>
          {formatAbsolute(item.timestamp)}
        </div>
        {showTypePill && <div style={{ marginTop: 6 }}><HistoryPill /></div>}

        {/* Diff payload — inline for short values, two-column for long text */}
        {isLongText ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto 1fr',
              gap: 12,
              alignItems: 'start',
              marginTop: 8,
              fontSize: 13,
              color: 'var(--ds-text, #172B4D)',
            }}
          >
            <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {fc.oldValue ?? <NoneLabel />}
            </div>
            <div style={{ color: 'var(--ds-text-subtle, #6B778C)', paddingTop: 1 }}>→</div>
            <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {fc.newValue ?? <NoneLabel />}
            </div>
          </div>
        ) : (
          <div style={{ display: 'inline-flex', alignItems: 'center', flexWrap: 'wrap', marginTop: 8, fontSize: 13 }}>
            {renderSide(fc.oldValue)}
            <Arrow />
            {renderSide(fc.newValue)}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Batched lookup hooks for the panel ──────────────────────────────
//
// Surface the lookups so the parent panel can pre-fetch a single map
// for ALL rows in the visible feed and pass it down per-row, instead
// of each row firing its own query.

export function useActivityLookups(items: CdsActivityItem[]) {
  const statusNames: Array<string | null> = [];
  const userNames: Array<string | null> = [];
  for (const it of items) {
    if (!it.fieldChange) continue;
    const kind = normalizeField(it.fieldChange.field);
    if (kind === 'status') {
      statusNames.push(it.fieldChange.oldValue, it.fieldChange.newValue);
    }
    if (kind === 'assignee' || kind === 'reporter') {
      userNames.push(it.fieldChange.oldValue, it.fieldChange.newValue);
    }
  }
  const { data: statusByNames } = useStatusByNames(statusNames);
  const { data: userByNames } = useUserByNames(userNames);
  return { statusByNames, userByNames };
}
