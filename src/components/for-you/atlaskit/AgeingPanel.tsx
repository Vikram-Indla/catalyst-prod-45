/**
 * AgeingPanel — For You / Ageing tab.
 *
 * Grouping: 3 age brackets (Cooper goal-centric + Raskin Hick's Law, 2026-05-16)
 *   🔴 90+ days · 🟠 60-90 days · 🟡 30-60 days
 *
 * Filter: exclude items updated within the last 21 days — those are
 * being actively worked on and are false positives in a "stale" panel.
 *
 * Each row has a hover-reveal 3-dot menu (Reassign · Archive · Escalate).
 *
 * Data source: useAgeingItems() — filters to assignee_account_id = me.
 */
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { token } from '@atlaskit/tokens';
import { useGlobalSearchStore } from '@/store/globalSearchStore';
import Spinner from '@atlaskit/spinner';
import { useAgeingItems, type AgeingItem } from '@/hooks/useAgeingItems';
import ForYouRow from './ForYouRow';
import { ForYouEmptyState } from './helpers';
import { text } from '@/lib/typography';
import { resolveAvatarUrl } from '@/lib/avatars';
import type { WorkItem, HubType, WorkMode, WorkGroup } from '@/hooks/useForYouData';

// ─── Age bracket config ───────────────────────────────────────────────────────
type AgeBracket = 'ninetyPlus' | 'sixtyNinety' | 'thirtySixty';

const BRACKET_LABELS: Record<AgeBracket, string> = {
  ninetyPlus:   '🔴 90+ days — critical',
  sixtyNinety:  '🟠 60–90 days',
  thirtySixty:  '🟡 30–60 days',
};

const BRACKET_ORDER: AgeBracket[] = ['ninetyPlus', 'sixtyNinety', 'thirtySixty'];

function bracketFor(daysOpen: number): AgeBracket | null {
  if (daysOpen >= 90) return 'ninetyPlus';
  if (daysOpen >= 60) return 'sixtyNinety';
  if (daysOpen >= 30) return 'thirtySixty';
  return null; // < 30 days: not stale enough to surface
}

// A-3: exclude items updated within 21 days (actively worked on = false positive)
const STALE_DAYS = 21;
function isStale(a: AgeingItem): boolean {
  if (!a.jira_updated_at) return true;
  const daysSinceUpdate = (Date.now() - new Date(a.jira_updated_at).getTime()) / 86_400_000;
  return daysSinceUpdate >= STALE_DAYS;
}

// ─── Row mapping ────────────────────────────────────────────────────────────
function formatRelative(dateStr: string): string {
  if (!dateStr) return '—';
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

function initials(name: string): string {
  return (name || '').split(/\s+/).map(p => p[0]).filter(Boolean).join('').toUpperCase().slice(0, 2);
}

function ageingToWorkItem(a: AgeingItem): WorkItem {
  const assigneeName = a.assignee_display_name || 'Unassigned';
  return {
    id: a.issue_key,
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

// ─── Section heading ─────────────────────────────────────────────────────────
function SectionHeading({ label, count }: { label: string; count: number }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: token('space.100', '8px'),
      paddingInline: token('space.150', '12px'),
      paddingBlockStart: token('space.200', '16px'),
      paddingBlockEnd: token('space.100', '8px'),
    }}>
      <span style={{
        font: `500 14px/20px "Inter", system-ui, sans-serif`,
        letterSpacing: 'normal', color: text.subtlest, textTransform: 'none',
      }}>
        {label}
      </span>
      <span style={{
        font: `400 12px/16px "Inter", system-ui, sans-serif`,
        color: text.subtle,
        backgroundColor: token('elevation.surface.sunken', '#F7F8F9'),
        paddingInline: token('space.075', '6px'), borderRadius: 999,
      }}>
        {count}
      </span>
    </div>
  );
}

// ─── A-4: Hover-reveal 3-dot menu ────────────────────────────────────────────
type MenuAction = 'reassign' | 'archive' | 'escalate';

interface DotMenuProps {
  onAction: (action: MenuAction) => void;
}

function ThreeDotMenu({ onAction }: DotMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={menuRef} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        type="button"
        aria-label="More actions"
        onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
        style={{
          width: 28, height: 28,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          background: open ? token('color.background.neutral.subtle.hovered', 'rgba(9,30,66,0.06)') : 'transparent',
          border: 'none', borderRadius: 4, cursor: 'pointer',
          color: token('color.icon.subtle', '#6B778C'),
          transition: 'background-color 150ms cubic-bezier(0.15, 1, 0.3, 1)',
          padding: 0,
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = token('color.background.neutral.subtle.hovered', 'rgba(9,30,66,0.06)'); }}
        onMouseLeave={e => { if (!open) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
      >
        {/* ⋯ vertical ellipsis — 3 dots */}
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
          <circle cx="8" cy="3" r="1.2" /><circle cx="8" cy="8" r="1.2" /><circle cx="8" cy="13" r="1.2" />
        </svg>
      </button>
      {open && (
        <div
          role="menu"
          style={{
            position: 'absolute', right: 0, top: 32, zIndex: 9999,
            background: token('elevation.surface.overlay', '#FFFFFF'),
            border: `1px solid ${token('color.border', '#DCDFE4')}`,
            borderRadius: 8,
            boxShadow: token('elevation.shadow.overlay', '0 8px 16px rgba(9,30,66,0.15)'),
            minWidth: 160, padding: '4px 0',
          }}
        >
          {[
            { id: 'reassign' as MenuAction, label: 'Reassign' },
            { id: 'archive' as MenuAction, label: 'Move to Archive' },
            { id: 'escalate' as MenuAction, label: 'Escalate' },
          ].map(opt => (
            <button
              key={opt.id}
              role="menuitem"
              type="button"
              onClick={e => { e.stopPropagation(); setOpen(false); onAction(opt.id); }}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '8px 16px', background: 'transparent', border: 'none',
                font: `400 14px/20px "Inter", system-ui, sans-serif`,
                color: token('color.text', '#292A2E'), cursor: 'pointer',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = token('color.background.neutral.subtle.hovered', 'rgba(9,30,66,0.06)'); }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Row wrapper: ForYouRow + hover-reveal 3-dot menu ────────────────────────
function AgeingRow({ item, onSelect, suggestion }: {
  item: WorkItem;
  onSelect: (item: WorkItem) => void;
  suggestion?: string;
}) {
  const [hovered, setHovered] = useState(false);

  const handleAction = (action: MenuAction) => {
    // Actions are affordances — no backend wiring yet (deferred per handover).
    // They are surfaced so users can see the intent. Escalate could open a Jira
    // deep-link; Reassign and Archive need confirmation flows (Row 19 deferred).
    console.log('[AgeingPanel] action:', action, item.key);
  };

  return (
    <div
      style={{ position: 'relative', display: 'flex', alignItems: 'center' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <ForYouRow item={item} onSelect={onSelect} suggestion={suggestion} />
      </div>
      {/* 3-dot menu sits in the row's right gutter, z-index above row hover bg */}
      <div style={{
        position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)',
        opacity: hovered ? 1 : 0,
        transition: 'opacity 150ms cubic-bezier(0.15, 1, 0.3, 1)',
        pointerEvents: hovered ? 'auto' : 'none',
        zIndex: 1,
      }}>
        <ThreeDotMenu onAction={handleAction} />
      </div>
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function AgeingPanel() {
  const { data: ageingItems, isLoading, isError } = useAgeingItems();

  const grouped = useMemo(() => {
    if (!ageingItems) return [];
    // A-3: filter out items updated within the past 21 days
    const staleItems = ageingItems.filter(isStale);

    const buckets = new Map<AgeBracket, AgeingItem[]>();
    for (const a of staleItems) {
      const b = bracketFor(a.days_open);
      if (!b) continue; // < 30 days: not stale enough
      if (!buckets.has(b)) buckets.set(b, []);
      buckets.get(b)!.push(a);
    }
    for (const list of buckets.values()) {
      list.sort((x, y) => y.days_open - x.days_open);
    }
    return BRACKET_ORDER
      .map(b => ({ bracket: b, label: BRACKET_LABELS[b], items: buckets.get(b) ?? [] }))
      .filter(g => g.items.length > 0);
  }, [ageingItems]);

  const handleSelect = (item: WorkItem) => {
    useGlobalSearchStore.getState().openDetail({
      id: item.id,
      itemType: item.issueType,
      projectKey: item.projectKey,
    });
  };

  if (isLoading) {
    return (
      <div style={{ padding: token('space.300', '24px'), display: 'flex', alignItems: 'center', gap: token('space.150', '12px') }}>
        <Spinner size="small" />
        <span style={{ color: token('color.text.subtle', '#626F86'), font: `400 14px/20px "Inter", system-ui, sans-serif` }}>
          Loading ageing items…
        </span>
      </div>
    );
  }

  if (isError) {
    return (
      <ForYouEmptyState
        title="Couldn't load ageing items"
        description="There was a problem reading your assigned work. Try reloading the page."
      />
    );
  }

  if (!grouped.length) {
    return (
      <ForYouEmptyState
        title="No stalled work — you're on top of things"
        description="Items updated in the last 21 days or open fewer than 30 days are filtered out. Nothing left to chase."
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {grouped.map(({ bracket, label, items }) => (
        <div key={bracket}>
          <SectionHeading label={label} count={items.length} />
          {items.map(a => (
            <AgeingRow
              key={a.id}
              item={ageingToWorkItem(a)}
              onSelect={handleSelect}
              suggestion={
                a.days_open >= 90
                  ? `Open ${a.days_open}d — consider reassigning or closing`
                  : undefined
              }
            />
          ))}
        </div>
      ))}
    </div>
  );
}
