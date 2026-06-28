/**
 * WorkItemsSection — list of work items linked to a release.
 *
 * Header: title + count + chevron (expand/collapse) + (+) add icon + (⋯) menu
 *
 * Menu (⋯):
 *   - View in All work navigator (navigates with project + fix_version filters)
 *   - Manage warnings (opens ManageWarningsDialog)
 *   - Divider + "Display information" section with 4 checkbox rows
 *     (Priority, Work item status, Assignee, Feature flag status)
 *     Checked rows render with blue tint + bold text.
 *
 * Filter toolbar: Search · Epic · Status category · Warnings · Assignee · Clear filters
 * Sort by Date created (toggleable asc/desc arrow).
 *
 * Each work-item row: type icon · key · summary · priority icon · status pill · assignee
 *                     · ⋯ menu ("Move to <top 4 versions>" · divider · "View all versions" · "Remove from version")
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import CanonicalPriorityIcon from '@/components/shared/PriorityIcon';
import { useApprovedProfilesByJiraId } from '@/hooks/useApprovedProfiles';
import CatalystAvatar from '@/components/shared/CatalystAvatar';
import { CatalystStatusPill } from '@/components/catalyst-detail-views/shared/sections/CatalystStatusPill';
import ChevronDownIcon from '@atlaskit/icon/glyph/chevron-down';
import ChevronRightIcon from '@atlaskit/icon/glyph/chevron-right';
import ArrowUpIcon from '@atlaskit/icon/glyph/arrow-up';
import ArrowDownIcon from '@atlaskit/icon/glyph/arrow-down';
import AddIcon from '@atlaskit/icon/glyph/add';
import MoreIcon from '@atlaskit/icon/glyph/more';
import SearchIcon from '@atlaskit/icon/glyph/search';
import { Checkbox } from '@atlaskit/checkbox';
import { ManageWarningsDialog, loadWarningSettings, type WarningSettings } from './ManageWarningsDialog';
import { AddWorkItemsModal } from './AddWorkItemsModal';
import { MoveToVersionModal } from './MoveToVersionModal';
import { catalystFlag } from '@/lib/catalystFlag';

const BORDER = 'var(--ds-border, #DFE1E6)';
const BLUE = 'var(--ds-border-selected, #1868DB)';
const BLUE_BG = 'var(--ds-background-selected, #E9F2FE)';
const BLUE_TEXT = 'var(--ds-text-selected, #0C66E4)';
const TEXT = 'var(--ds-text, #292A2E)';
const SUBTLE = 'var(--ds-text-subtle, #505258)';
const SUBTLEST = 'var(--ds-text-subtlest, #6B778C)';

// 2026-06-26: hover background on every menu-item button inside the row
// 3-dot action menu (Move to / View all versions / Remove from version).
// Inline styles can't express :hover, so inject a one-time stylesheet.
// HMR-safe: updates textContent if the style tag exists (CLAUDE.md 2026-06-11).
const WIS_MENU_STYLE_ID = 'wis-row-menu-item-css';
const WIS_MENU_CSS = `
  .wis-row-menu-item:hover {
    background: var(--ds-background-neutral-subtle-hovered, #F1F2F4) !important;
  }
`;
if (typeof document !== 'undefined') {
  const existing = document.getElementById(WIS_MENU_STYLE_ID);
  if (existing) {
    existing.textContent = WIS_MENU_CSS;
  } else {
    const el = document.createElement('style');
    el.id = WIS_MENU_STYLE_ID;
    el.textContent = WIS_MENU_CSS;
    document.head.appendChild(el);
  }
}

interface Issue {
  id: string;
  issue_key: string;
  summary: string;
  issue_type: string | null;
  status: string | null;
  status_category: string | null;
  priority: string | null;
  assignee_account_id: string | null;
  assignee_display_name: string | null;
  parent_key: string | null;
  jira_created_at: string | null;
  sprint_release: any;
}

import type { EntityConfig } from '@/lib/entity-hub/config';

interface Props {
  releaseId: string;
  releaseName: string;
  projectId: string;
  projectKey: string | null;
  onOpenItem?: (item: { issueKey: string; issueType: string | null }) => void;
  /** 2026-06-26: entity-hub config. Defaults to RELEASE_CONFIG so existing
   *  release-hub usages stay unchanged. When config.kind === 'sprint' the
   *  ph_issues filter switches from sprint_release JSONB to sprint_name text. */
  config?: EntityConfig;
}

type DisplayKey = 'priority' | 'status' | 'assignee' | 'featureFlag';
const DISPLAY_DEFAULT: Record<DisplayKey, boolean> = {
  priority: true,
  status: true,
  assignee: true,
  featureFlag: true,
};

const STATUS_BG: Record<string, { bg: string; color: string }> = {
  todo: { bg: 'var(--ds-background-neutral, #F1F2F4)', color: TEXT },
  'in progress': { bg: 'var(--ds-background-information, #E9F2FE)', color: BLUE_TEXT },
  done: { bg: 'var(--ds-background-success, #DCFFF1)', color: 'var(--ds-text-success, #216E4E)' },
};

function priorityIcon(priority: string | null) {
  if (!priority) return null;
  return <CanonicalPriorityIcon level={priority} size={16} />;
}

/** Resolves account_id → avatar_url via canonical hook, then renders
 *  CatalystAvatar (which already handles the src → initials → silhouette
 *  cascade). Unassigned (no accountId) skips the hook and renders the
 *  Atlaskit default Person glyph. */
function AssigneeAvatar({
  accountId, name, size = 'small',
}: { accountId: string | null; name: string | null; size?: 'xsmall' | 'small' | 'medium' | 'large' }) {
  const byJiraId = useApprovedProfilesByJiraId();
  const profile = accountId ? byJiraId.get(accountId) : undefined;
  if (!accountId && !name) {
    return <CatalystAvatar size={size} />;
  }
  return (
    <CatalystAvatar
      size={size}
      name={profile?.name || name || undefined}
      src={profile?.avatarUrl || undefined}
    />
  );
}

export function WorkItemsSection({ releaseId, releaseName, projectId, projectKey, onOpenItem, config }: Props) {
  const entityKind = config?.kind ?? 'release';
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [collapsed, setCollapsed] = useState(false);
  const [search, setSearch] = useState('');
  const [epicFilter, setEpicFilter] = useState<string[]>([]);
  const [statusCatFilter, setStatusCatFilter] = useState<string[]>([]);
  const [warningsFilter, setWarningsFilter] = useState<string[]>([]);
  const [assigneeFilter, setAssigneeFilter] = useState<string[]>([]);
  const [sortAsc, setSortAsc] = useState(true);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isWarningsDialogOpen, setIsWarningsDialogOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [moreMenuPos, setMoreMenuPos] = useState<{ top: number; right: number } | null>(null);
  const moreTriggerRef = useRef<HTMLButtonElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  const [display, setDisplay] = useState<Record<DisplayKey, boolean>>(DISPLAY_DEFAULT);
  const [warningSettings, setWarningSettings] = useState<WarningSettings>(() => loadWarningSettings());

  const PAGE_SIZE = 10;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: Event) => setWarningSettings((e as CustomEvent).detail);
    window.addEventListener('catalyst:warning-settings', h as any);
    return () => window.removeEventListener('catalyst:warning-settings', h as any);
  }, []);

  const { data: items = [], isLoading, error } = useQuery<Issue[]>({
    queryKey: ['ph_entity_items', entityKind, releaseId, releaseName],
    queryFn: async () => {
      const target = (releaseName || '').trim();
      if (!target) return [];

      const select = 'id, issue_key, summary, issue_type, status, status_category, priority, assignee_account_id, assignee_display_name, parent_key, jira_created_at, sprint_release';

      if (entityKind === 'sprint') {
        // Sprint filter: ph_issues.sprint_release JSONB contains entry
        // matching the sprint name. We do NOT use ph_issues.sprint_name
        // (text) — jira-sync overwrites it on every sync, so it's not a
        // reliable link (proven 2026-06-26: backfill of 710 rows reverted
        // to 2 within minutes). sprint_release JSONB is the canonical Jira
        // payload that persists across syncs.
        const containsResult = await supabase
          .from('ph_issues')
          .select(select)
          .contains('sprint_release', JSON.stringify([{ name: target }]) as any)
          .limit(2000);
        if ((containsResult.data?.length ?? 0) > 0) {
          return containsResult.data as Issue[];
        }
        // Fallback: scan + filter client-side (handles JSON shape variants).
        const fb = await supabase
          .from('ph_issues')
          .select(select)
          .not('sprint_release', 'is', null)
          .limit(5000);
        if (!fb.data) return [];
        return fb.data.filter((row: any) => {
          const arr = row.sprint_release;
          return Array.isArray(arr) && arr.some((el: any) => el && el.name === target);
        }) as Issue[];
      }

      // Release filter: ph_issues.sprint_release JSONB contains entry with matching name.
      const containsResult = await supabase
        .from('ph_issues')
        .select(select)
        .contains('sprint_release', JSON.stringify([{ name: target }]) as any)
        .limit(2000);
      if ((containsResult.data?.length ?? 0) > 0) {
        return containsResult.data as Issue[];
      }
      const fb = await supabase
        .from('ph_issues')
        .select(select)
        .not('sprint_release', 'is', null)
        .limit(5000);
      if (!fb.data) return [];
      return fb.data.filter((row: any) => {
        const arr = row.sprint_release;
        return Array.isArray(arr) && arr.some((el: any) => el && el.name === target);
      }) as Issue[];
    },
    enabled: !!releaseName,
  });

  // Epic candidates derived from items (unique parent_key)
  const epicOptions = useMemo(() => {
    const seen = new Set<string>();
    const out: { key: string; label: string }[] = [];
    items.forEach((i) => {
      if (!i.parent_key) return;
      if (seen.has(i.parent_key)) return;
      seen.add(i.parent_key);
      out.push({ key: i.parent_key, label: i.parent_key });
    });
    return out;
  }, [items]);

  // Dedupe assignees by display_name first (account_id can vary across rows for
  // the same person, e.g. Jira account vs Supabase user id). Falls back to
  // account_id when no name, finally __unassigned__.
  const assigneeKey = (i: { assignee_display_name: string | null; assignee_account_id: string | null }) =>
    (i.assignee_display_name?.trim() || i.assignee_account_id?.trim() || '__unassigned__');

  const assigneeOptions = useMemo(() => {
    const seen = new Set<string>();
    // 2026-06-26: Unassigned is ALWAYS the first option, regardless of whether
    // any current item is unassigned — it is a structural filter bucket, not a
    // user. Real assignees follow, deduped, sorted by label.
    const out: { id: string; label: string; accountId: string | null }[] = [
      { id: '__unassigned__', label: 'Unassigned', accountId: null },
    ];
    seen.add('__unassigned__');
    items.forEach((i) => {
      const k = assigneeKey(i);
      if (k === '__unassigned__') return;
      if (seen.has(k)) return;
      seen.add(k);
      out.push({
        id: k,
        label: i.assignee_display_name || k,
        accountId: i.assignee_account_id,
      });
    });
    const [unassigned, ...rest] = out;
    rest.sort((a, b) => a.label.localeCompare(b.label));
    return [unassigned, ...rest];
  }, [items]);

  // Filter pipeline
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let out = items;
    if (q) out = out.filter((i) => (i.issue_key || '').toLowerCase().includes(q) || (i.summary || '').toLowerCase().includes(q));
    if (epicFilter.length > 0) out = out.filter((i) => i.parent_key && epicFilter.includes(i.parent_key));
    if (statusCatFilter.length > 0) {
      const lower = statusCatFilter.map((s) => s.toLowerCase());
      out = out.filter((i) => lower.includes(String(i.status_category ?? '').toLowerCase()));
    }
    if (assigneeFilter.length > 0) {
      out = out.filter((i) => assigneeFilter.includes(assigneeKey(i)));
    }
    // Warnings filter is a UI toggle bucket — real data plumbing TBD, no-op for now.
    return out;
  }, [items, search, epicFilter, statusCatFilter, assigneeFilter]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      const da = a.jira_created_at ? new Date(a.jira_created_at).getTime() : 0;
      const db = b.jira_created_at ? new Date(b.jira_created_at).getTime() : 0;
      return sortAsc ? da - db : db - da;
    });
    return arr;
  }, [filtered, sortAsc]);

  // Reset pagination when filters / sort / data changes
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [search, epicFilter, statusCatFilter, warningsFilter, assigneeFilter, sortAsc, sorted.length]);

  const visibleItems = useMemo(() => sorted.slice(0, visibleCount), [sorted, visibleCount]);
  const hasMore = visibleCount < sorted.length;

  // Infinite scroll: observe sentinel inside the bordered scroll container
  useEffect(() => {
    if (!hasMore) return;
    const sentinel = sentinelRef.current;
    const root = scrollContainerRef.current;
    if (!sentinel || !root) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisibleCount((c) => Math.min(c + PAGE_SIZE, sorted.length));
        }
      },
      { root, rootMargin: '100px', threshold: 0 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, sorted.length]);

  const clearFilters = () => {
    setSearch('');
    setEpicFilter([]);
    setStatusCatFilter([]);
    setWarningsFilter([]);
    setAssigneeFilter([]);
  };

  // ⋯ More menu anchor
  useEffect(() => {
    if (!isMoreMenuOpen || !moreTriggerRef.current) return;
    const update = () => {
      const r = moreTriggerRef.current!.getBoundingClientRect();
      setMoreMenuPos({ top: r.bottom + 4, right: window.innerWidth - r.right });
    };
    update();
    const s = () => update();
    window.addEventListener('scroll', s, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', s, true);
      window.removeEventListener('resize', update);
    };
  }, [isMoreMenuOpen]);

  useEffect(() => {
    if (!isMoreMenuOpen) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (moreTriggerRef.current?.contains(t)) return;
      if (moreMenuRef.current?.contains(t)) return;
      setIsMoreMenuOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [isMoreMenuOpen]);

  // Remove a work item from this release (clears sprint_release entry matching releaseName)
  const removeMutation = useMutation({
    mutationFn: async (issueId: string) => {
      const { data: row, error: readErr } = await supabase
        .from('ph_issues')
        .select('sprint_release')
        .eq('id', issueId)
        .single();
      if (readErr) throw new Error(readErr.message);
      const arr: any[] = Array.isArray((row as any)?.sprint_release) ? (row as any).sprint_release : [];
      const next = arr.filter((el) => el && el.name !== releaseName);
      const { error } = await supabase.from('ph_issues').update({ sprint_release: next }).eq('id', issueId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      // 2026-06-26: invalidate both legacy + new entity-aware query keys
      // so both release + sprint surfaces refresh after a remove.
      queryClient.refetchQueries({
        predicate: (q) =>
          Array.isArray(q.queryKey) &&
          (q.queryKey[0] === 'ph_release_items'
            || q.queryKey[0] === 'ph_entity_items'
            || q.queryKey[0] === 'ph_release_contributors'),
      });
      queryClient.invalidateQueries({ queryKey: ['projecthub', 'release-progress'] });
      queryClient.invalidateQueries({ queryKey: ['projecthub-sprints'] });
      queryClient.invalidateQueries({ queryKey: ['projecthub-releases'] });
      catalystFlag.success('Removed from version.');
    },
    onError: (e: any) => catalystFlag.error(e?.message || 'Failed to remove'),
  });

  return (
    <>
      <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Section header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <h2 style={{ margin: 0, fontSize: 'var(--ds-font-size-500)', fontWeight: 700, color: TEXT }}>Work items</h2>
          <span
            style={{
              fontSize: 'var(--ds-font-size-200)',
              fontWeight: 600,
              color: TEXT,
              background: 'var(--ds-background-neutral, #F1F2F4)',
              padding: '1px 8px',
              borderRadius: 3,
              minWidth: 18,
              textAlign: 'center',
              lineHeight: '18px',
              display: 'inline-block',
            }}
          >
            {items.length}
          </span>
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            aria-label={collapsed ? 'Expand' : 'Collapse'}
            style={{ all: 'unset', cursor: 'pointer', display: 'inline-flex', color: SUBTLE }}
          >
            {collapsed ? <ChevronRightIcon label="" /> : <ChevronDownIcon label="" />}
          </button>
          <div style={{ flex: 1 }} />
          <button
            type="button"
            aria-label="Add work items"
            onClick={() => setIsAddOpen(true)}
            style={iconBtnSubtle()}
          >
            <AddIcon label="" />
          </button>
          <button
            ref={moreTriggerRef}
            type="button"
            aria-label="More actions"
            aria-expanded={isMoreMenuOpen}
            onClick={() => setIsMoreMenuOpen((v) => !v)}
            style={iconBtnSubtle(isMoreMenuOpen)}
          >
            <MoreIcon label="" />
          </button>
        </div>

        {!collapsed && (
          <>
            {/* Filter toolbar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <SearchField value={search} onChange={setSearch} />
              <CheckboxFilterPill
                label="Epic"
                selectedCount={epicFilter.length}
                options={epicOptions.map((e) => ({ id: e.key, label: e.label }))}
                value={epicFilter}
                onChange={setEpicFilter}
                searchable
              />
              <PillFilter
                label="Status category"
                selectedCount={statusCatFilter.length}
                options={[
                  { id: 'To Do', label: 'TO DO', pillBg: 'var(--ds-background-neutral, #F1F2F4)', pillColor: TEXT },
                  { id: 'In Progress', label: 'IN PROGRESS', pillBg: 'var(--ds-background-information, #E9F2FE)', pillColor: BLUE_TEXT },
                  { id: 'Done', label: 'DONE', pillBg: 'var(--ds-background-success, #DCFFF1)', pillColor: 'var(--ds-text-success, #216E4E)' },
                ]}
                value={statusCatFilter}
                onChange={setStatusCatFilter}
              />
              <CheckboxFilterPill
                label="Warnings"
                selectedCount={warningsFilter.length}
                options={[
                  { id: 'unreviewed_code', label: 'Unreviewed code' },
                  { id: 'open_prs', label: 'Open pull requests' },
                  { id: 'failing_builds', label: 'Failing builds' },
                ]}
                value={warningsFilter}
                onChange={setWarningsFilter}
                header="Show completed work items with"
              />
              <CheckboxFilterPill
                label="Assignee"
                selectedCount={assigneeFilter.length}
                options={assigneeOptions.map((a) => ({ id: a.id, label: a.label, avatar: a.accountId ?? '' }))}
                value={assigneeFilter}
                onChange={setAssigneeFilter}
                searchable
                placeholder="Choose assignee..."
              />
              {(() => {
                const hasFilters =
                  search.length > 0 ||
                  epicFilter.length > 0 ||
                  statusCatFilter.length > 0 ||
                  warningsFilter.length > 0 ||
                  assigneeFilter.length > 0;
                return (
                  <button
                    type="button"
                    onClick={clearFilters}
                    disabled={!hasFilters}
                    style={{
                      all: 'unset',
                      cursor: hasFilters ? 'pointer' : 'not-allowed',
                      color: hasFilters ? BLUE_TEXT : SUBTLEST,
                      fontSize: 'var(--ds-font-size-400)',
                      padding: '0 6px',
                    }}
                  >
                    Clear filters
                  </button>
                );
              })()}
              <div style={{ flex: 1 }} />
              <button
                type="button"
                onClick={() => setSortAsc((v) => !v)}
                style={{ all: 'unset', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, color: SUBTLE, fontSize: 'var(--ds-font-size-300)' }}
              >
                <span>Sort by: <span style={{ color: TEXT }}>Date created</span></span>
                {sortAsc ? <ArrowUpIcon label="" size="small" /> : <ArrowDownIcon label="" size="small" />}
              </button>
            </div>

            {/* Items list */}
            <div
              ref={scrollContainerRef}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 0,
                border: `1px solid ${BORDER}`,
                borderRadius: 3,
                background: 'var(--ds-surface, #FFFFFF)',
                overflow: 'hidden auto',
                maxHeight: 560,
              }}
            >
              {visibleItems.map((it, idx) => (
                <WorkItemRow
                  key={it.id}
                  item={it}
                  display={display}
                  releaseName={releaseName}
                  projectId={projectId}
                  isLast={!hasMore && idx === visibleItems.length - 1}
                  onRemove={() => removeMutation.mutate(it.id)}
                  config={config}
                  onOpen={() => onOpenItem?.({ issueKey: it.issue_key, issueType: it.issue_type })}
                />
              ))}
              {isLoading && (
                <div style={{ padding: '16px 12px', color: SUBTLEST, fontSize: 'var(--ds-font-size-300)' }}>Loading work items…</div>
              )}
              {error && (
                <div style={{ padding: '16px 12px', color: 'var(--ds-text-danger, #C9372C)', fontSize: 'var(--ds-font-size-300)' }}>
                  Query error: {(error as any)?.message || String(error)}
                </div>
              )}
              {!isLoading && !error && sorted.length === 0 && (
                <div style={{ padding: '16px 12px', color: SUBTLEST, fontSize: 'var(--ds-font-size-300)' }}>
                  No work items in this release.
                </div>
              )}
              {hasMore && (
                <div
                  ref={sentinelRef}
                  style={{ padding: '10px 12px', color: SUBTLEST, fontSize: 'var(--ds-font-size-200)', textAlign: 'center' }}
                >
                  Loading more…
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setIsAddOpen(true)}
              style={{ all: 'unset', cursor: 'pointer', marginTop: 4, color: SUBTLE, fontSize: 'var(--ds-font-size-300)', display: 'inline-flex', alignItems: 'center', gap: 4 }}
            >
              <AddIcon label="" size="small" /> Add work items
            </button>
          </>
        )}
      </section>

      <ProgressSection items={items} />

      {/* ⋯ More menu portal */}
      {isMoreMenuOpen && moreMenuPos && createPortal(
        <div
          ref={moreMenuRef}
          role="menu"
          style={{
            position: 'fixed',
            top: moreMenuPos.top,
            right: moreMenuPos.right,
            zIndex: 10010,
            background: 'var(--ds-surface-overlay, #FFFFFF)',
            border: `1px solid ${BORDER}`,
            borderRadius: 4,
            boxShadow: '0 8px 24px rgba(9,30,66,0.16), 0 2px 4px rgba(9,30,66,0.08)', // ads-scanner:ignore-line — Atlassian elevation shadow rgba(9,30,66,*), no ds-shadow token for arbitrary alpha
            padding: '6px 0',
            minWidth: 220,
          }}
        >
          <button
            type="button"
            disabled={items.length === 0}
            onClick={() => {
              if (items.length === 0) return;
              setIsMoreMenuOpen(false);
              const href = config
                ? config.buildWorkHref(releaseId, { projectKey: projectKey ?? undefined })
                : `/release-hub/releases-management/${releaseId}/work`;
              navigate(href);
            }}
            style={{
              ...menuItemStyle(),
              opacity: items.length === 0 ? 0.5 : 1,
              cursor: items.length === 0 ? 'not-allowed' : 'pointer',
              color: items.length === 0 ? SUBTLEST : TEXT,
            }}
          >
            View in All work navigator
          </button>
          <button
            type="button"
            onClick={() => { setIsMoreMenuOpen(false); setIsWarningsDialogOpen(true); }}
            style={menuItemStyle()}
          >
            Manage warnings
          </button>
          <div style={{ height: 1, background: BORDER, margin: '6px 0' }} />
          <div style={{ padding: '4px 12px', fontSize: 'var(--ds-font-size-200)', fontWeight: 700, color: SUBTLE, textTransform: 'none' }}>
            Display information
          </div>
          {([
            ['priority', 'Priority'],
            ['status', 'Work item status'],
            ['assignee', 'Assignee'],
          ] as Array<[DisplayKey, string]>).map(([key, label]) => (
            <DisplayCheckRow
              key={key}
              checked={display[key]}
              label={label}
              onToggle={() => setDisplay((d) => ({ ...d, [key]: !d[key] }))}
            />
          ))}
        </div>,
        document.body,
      )}

      <ManageWarningsDialog isOpen={isWarningsDialogOpen} onClose={() => setIsWarningsDialogOpen(false)} />
      <AddWorkItemsModal
        isOpen={isAddOpen}
        release={{ id: releaseId, name: releaseName, project_id: projectId }}
        onClose={() => setIsAddOpen(false)}
      />
    </>
  );
}

function SearchField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [focused, setFocused] = useState(false);
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        height: 32,
        padding: '0 8px',
        border: `1px solid ${focused ? BLUE : BORDER}`,
        borderRadius: 3,
        background: 'var(--ds-surface, #FFFFFF)',
        minWidth: 180,
        boxShadow: focused ? '0 0 0 1px rgba(24,104,219,0.2)' : 'none', // ads-scanner:ignore-line — semi-transparent overlay, no ADS token for alpha variant
        transition: 'border-color 80ms ease, box-shadow 80ms ease',
      }}
    >
      <span style={{ color: SUBTLE, display: 'inline-flex' }}><SearchIcon label="" size="small" /></span>
      <input
        value={value}
        onChange={(e) => onChange(e.currentTarget.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder=""
        style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 'var(--ds-font-size-400)', color: TEXT }}
      />
    </div>
  );
}

function iconBtnSubtle(active = false): React.CSSProperties {
  return {
    all: 'unset',
    cursor: 'pointer',
    width: 28,
    height: 28,
    borderRadius: 3,
    border: `1px solid ${active ? BLUE : 'transparent'}`,
    background: active ? BLUE_BG : 'transparent',
    color: active ? BLUE_TEXT : SUBTLE,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  };
}

function menuItemStyle(): React.CSSProperties {
  return {
    all: 'unset',
    cursor: 'pointer',
    display: 'block',
    width: '100%',
    boxSizing: 'border-box',
    padding: '8px 12px',
    fontSize: 'var(--ds-font-size-400)',
    color: TEXT,
  };
}

function DisplayCheckRow({
  checked, label, onToggle,
}: { checked: boolean; label: string; onToggle: () => void }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      onClick={onToggle}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      role="menuitemcheckbox"
      aria-checked={checked}
      style={{
        all: 'unset',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        width: '100%',
        boxSizing: 'border-box',
        padding: '6px 12px',
        cursor: 'pointer',
        background: checked
          ? 'var(--ds-background-selected, #E9F2FE)'
          : hover
            ? 'var(--ds-background-neutral-subtle-hovered, #F1F2F4)'
            : 'transparent',
        color: checked
          ? 'var(--ds-text-selected, #0C66E4)'
          : 'var(--ds-text-subtle, #505258)',
        fontWeight: 400,
        fontSize: 'var(--ds-font-size-400)',
      }}
    >
      <Checkbox isChecked={checked} onChange={() => { /* noop */ }} />
      <span>{label}</span>
    </button>
  );
}

// ─── Pill-style filters used in the toolbar ─────────────────────────────────

function CheckboxFilterPill({
  label, selectedCount, options, value, onChange,
  searchable = false, placeholder, header,
}: {
  label: string;
  selectedCount: number;
  options: { id: string; label: string; avatar?: string }[];
  value: string[];
  onChange: (next: string[]) => void;
  searchable?: boolean;
  placeholder?: string;
  header?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const tRef = useRef<HTMLButtonElement>(null);
  const pRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !tRef.current) return;
    const update = () => {
      const r = tRef.current!.getBoundingClientRect();
      setPos({ top: r.bottom + 4, left: r.left });
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const on = (e: MouseEvent) => {
      const t = e.target as Node;
      if (tRef.current?.contains(t)) return;
      if (pRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', on);
    return () => document.removeEventListener('mousedown', on);
  }, [open]);

  const filteredOpts = useMemo(() => {
    if (!q.trim()) return options;
    const s = q.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(s));
  }, [options, q]);

  const isActive = open || value.length > 0;

  return (
    <>
      <button
        ref={tRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={pillBtn(isActive)}
      >
        <span>{label}</span>
        {selectedCount > 0 && (
          <span style={{
            minWidth: 22, height: 18, padding: '0 6px', borderRadius: 3,
            background: 'var(--ds-background-accent-blue-subtle, #CCE0FF)',
            color: 'var(--ds-text, #292A2E)',
            fontSize: 'var(--ds-font-size-100)', fontWeight: 700,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}>{selectedCount}</span>
        )}
        <ChevronDownIcon label="" size="small" />
      </button>
      {open && pos && createPortal(
        <div
          ref={pRef}
          style={{
            position: 'fixed', top: pos.top, left: pos.left, zIndex: 10010,
            minWidth: 220, maxHeight: 360, overflow: 'hidden', display: 'flex', flexDirection: 'column',
            background: 'var(--ds-surface-overlay, #FFFFFF)', border: `1px solid ${BORDER}`, borderRadius: 4,
            boxShadow: '0 8px 24px rgba(9,30,66,0.16), 0 2px 4px rgba(9,30,66,0.08)', // ads-scanner:ignore-line — Atlassian elevation shadow rgba(9,30,66,*), no ds-shadow token for arbitrary alpha
          }}
        >
          {searchable && (
            <div style={{ padding: 8, borderBottom: `1px solid ${BORDER}` }}>
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.currentTarget.value)}
                placeholder={placeholder || `Search ${label} filters...`}
                style={{
                  width: '100%', boxSizing: 'border-box', height: 32, padding: '0 8px',
                  border: `1px solid ${BLUE}`, borderRadius: 3, outline: 'none', fontSize: 'var(--ds-font-size-300)', color: TEXT,
                }}
              />
            </div>
          )}
          {header && (
            <div style={{ padding: '8px 12px', fontSize: 'var(--ds-font-size-200)', color: SUBTLE, borderBottom: `1px solid ${BORDER}` }}>
              {header}
            </div>
          )}
          <div style={{ overflowY: 'auto', padding: '4px 0' }}>
            {filteredOpts.length === 0 && (
              <div style={{ padding: '8px 12px', fontSize: 'var(--ds-font-size-300)', color: SUBTLEST }}>No matches</div>
            )}
            {filteredOpts.map((opt) => {
              const checked = value.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onChange(checked ? value.filter((x) => x !== opt.id) : [...value, opt.id])}
                  style={{
                    all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                    width: '100%', boxSizing: 'border-box', padding: '6px 12px',
                    background: checked ? BLUE_BG : 'transparent', fontSize: 'var(--ds-font-size-300)', color: TEXT,
                  }}
                >
                  <Checkbox isChecked={checked} onChange={() => { /* noop */ }} />
                  {('avatar' in opt) && (
                    <AssigneeAvatar
                      accountId={opt.id === '__unassigned__' ? null : ((opt as any).avatar || null)}
                      name={opt.id === '__unassigned__' ? null : opt.label}
                    />
                  )}
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

function PillFilter({
  label, selectedCount, options, value, onChange,
}: {
  label: string;
  selectedCount: number;
  options: { id: string; label: string; pillBg: string; pillColor: string }[];
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const tRef = useRef<HTMLButtonElement>(null);
  const pRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !tRef.current) return;
    const update = () => {
      const r = tRef.current!.getBoundingClientRect();
      setPos({ top: r.bottom + 4, left: r.left });
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const on = (e: MouseEvent) => {
      const t = e.target as Node;
      if (tRef.current?.contains(t)) return;
      if (pRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', on);
    return () => document.removeEventListener('mousedown', on);
  }, [open]);

  const isActive = open || value.length > 0;

  return (
    <>
      <button ref={tRef} type="button" onClick={() => setOpen((v) => !v)} style={pillBtn(isActive)}>
        <span>{label}</span>
        {selectedCount > 0 && (
          <span style={{
            minWidth: 22, height: 18, padding: '0 6px', borderRadius: 3,
            background: 'var(--ds-background-accent-blue-subtle, #CCE0FF)',
            color: 'var(--ds-text, #292A2E)',
            fontSize: 'var(--ds-font-size-100)', fontWeight: 700,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}>{selectedCount}</span>
        )}
        <ChevronDownIcon label="" size="small" />
      </button>
      {open && pos && createPortal(
        <div
          ref={pRef}
          style={{
            position: 'fixed', top: pos.top, left: pos.left, zIndex: 10010,
            minWidth: 180,
            background: 'var(--ds-surface-overlay, #FFFFFF)', border: `1px solid ${BORDER}`, borderRadius: 4,
            boxShadow: '0 8px 24px rgba(9,30,66,0.16), 0 2px 4px rgba(9,30,66,0.08)', // ads-scanner:ignore-line — Atlassian elevation shadow rgba(9,30,66,*), no ds-shadow token for arbitrary alpha
            padding: '6px 0',
          }}
        >
          {options.map((opt) => {
            const checked = value.includes(opt.id);
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onChange(checked ? value.filter((x) => x !== opt.id) : [...value, opt.id])}
                style={{
                  all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                  width: '100%', boxSizing: 'border-box', padding: '6px 12px',
                  background: checked ? BLUE_BG : 'transparent',
                }}
              >
                <Checkbox isChecked={checked} onChange={() => { /* noop */ }} />
                <span
                  style={{
                    background: opt.pillBg,
                    color: opt.pillColor,
                    fontSize: 'var(--ds-font-size-100)',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 3,
                    letterSpacing: 0.4,
                  }}
                >
                  {opt.label}
                </span>
              </button>
            );
          })}
        </div>,
        document.body,
      )}
    </>
  );
}

function pillBtn(active: boolean): React.CSSProperties {
  return {
    all: 'unset',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    height: 32,
    padding: '0 10px',
    border: `1px solid ${active ? BLUE : BORDER}`,
    background: 'var(--ds-surface, #FFFFFF)',
    color: active ? BLUE_TEXT : TEXT,
    borderRadius: 3,
    fontSize: 'var(--ds-font-size-300)',
    fontWeight: 500,
    boxShadow: active ? '0 0 0 1px rgba(24,104,219,0.2)' : 'none', // ads-scanner:ignore-line — semi-transparent overlay, no ADS token for alpha variant
  };
}

// ─── Single work-item row ───────────────────────────────────────────────────

function WorkItemRow({
  item, display, releaseName, projectId, isLast, onRemove, onOpen, config,
}: {
  item: Issue;
  display: Record<DisplayKey, boolean>;
  releaseName: string;
  projectId: string;
  isLast: boolean;
  onRemove: () => void;
  onOpen?: () => void;
  config?: EntityConfig;
}) {
  const entityTable = config?.table ?? 'ph_releases';
  const [hover, setHover] = useState(false);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const tRef = useRef<HTMLButtonElement>(null);
  const pRef = useRef<HTMLDivElement>(null);

  // Pull top sibling releases for the Move-to submenu.
  // Order by name (release_date column does not exist on ph_releases — that
  // wrong ORDER BY silently returned 0 rows, so the menu showed empty).
  // Fetch 5 then drop the current release client-side, slice to 4.
  const { data: siblings } = useQuery({
    queryKey: ['siblings-for-move', entityTable, projectId, item.id, releaseName],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from(entityTable)
        .select('id, name, title, status')
        .eq('project_id', projectId)
        .neq('status', 'archived')
        .order('name')
        .limit(5);
      if (error) throw new Error(error.message);
      return (data ?? [])
        .filter((r: any) => (r.name || r.title) !== releaseName)
        .slice(0, 4);
    },
    enabled: open,
    staleTime: 30_000,
  });

  const queryClient = useQueryClient();
  const moveMutation = useMutation({
    mutationFn: async (target: { id: string; name: string | null; title: string | null }) => {
      const { data: row, error: readErr } = await supabase
        .from('ph_issues')
        .select('sprint_release')
        .eq('id', item.id)
        .single();
      if (readErr) throw new Error(readErr.message);
      const current: any[] = Array.isArray((row as any)?.sprint_release) ? (row as any).sprint_release : [];
      const filtered = current.filter((el) => el && el.name !== releaseName);
      const next = [...filtered, { id: '', name: target.name || target.title, releaseDate: '' }];
      const { error: upErr } = await supabase
        .from('ph_issues')
        .update({ sprint_release: next })
        .eq('id', item.id);
      if (upErr) throw new Error(upErr.message);
    },
    onSuccess: () => {
      // 2026-06-26: refetch both legacy + new entity-aware list queries so
      // the moved item disappears from the source list and the destination
      // list picks it up if mounted.
      queryClient.refetchQueries({
        predicate: (q) =>
          Array.isArray(q.queryKey) &&
          (q.queryKey[0] === 'ph_release_items'
            || q.queryKey[0] === 'ph_entity_items'
            || q.queryKey[0] === 'ph_release_contributors'),
      });
      queryClient.invalidateQueries({ queryKey: ['projecthub', 'release-progress'] });
      queryClient.invalidateQueries({ queryKey: ['projecthub-sprints'] });
      queryClient.invalidateQueries({ queryKey: ['projecthub-releases'] });
      catalystFlag.success('Work item moved.');
    },
    onError: (e: any) => catalystFlag.error(e?.message || 'Failed to move'),
  });

  useEffect(() => {
    if (!open || !tRef.current) return;
    const r = tRef.current.getBoundingClientRect();
    setPos({ top: r.bottom + 4, right: window.innerWidth - r.right });
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const on = (e: MouseEvent) => {
      const t = e.target as Node;
      if (tRef.current?.contains(t)) return;
      if (pRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', on);
    return () => document.removeEventListener('mousedown', on);
  }, [open]);

  const statusKey = String(item.status_category ?? '').toLowerCase();
  const statusStyle = STATUS_BG[statusKey] || STATUS_BG.todo;

  return (
    <>
      <div
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest('button, a')) return;
          onOpen?.();
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '10px 12px',
          borderBottom: isLast ? 'none' : `1px solid ${BORDER}`,
          background: hover ? 'var(--ds-background-neutral-subtle-hovered, #F1F2F4)' : 'transparent',
          cursor: 'pointer',
        }}
      >
        <span style={{ display: 'inline-flex', width: 16, flexShrink: 0 }}>
          {item.issue_type ? <JiraIssueTypeIcon type={item.issue_type as any} size={16} /> : null}
        </span>
        <a
          href="#"
          onClick={(e) => { e.preventDefault(); onOpen?.(); }}
          style={{
            color: 'var(--ds-link, #0C66E4)',
            fontWeight: 400,
            fontSize: 'var(--ds-font-size-400)',
            fontFamily: 'inherit',
            lineHeight: 1,
            letterSpacing: 0,
            textDecoration: 'underline',
            whiteSpace: 'nowrap',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          {item.issue_key}
        </a>
        <span style={{
          flex: 1,
          minWidth: 0,
          color: 'var(--ds-text, #292A2E)',
          fontSize: 'var(--ds-font-size-400)',
          fontWeight: 400,
          fontFamily: 'inherit',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {item.summary}
        </span>
        {display.priority && (
          <span style={{ display: 'inline-flex' }}>{priorityIcon(item.priority)}</span>
        )}
        {display.status && (
          <CatalystStatusPill
            status={item.status || statusKey || 'Backlog'}
            statusCategory={item.status_category as any}
            issueType={item.issue_type as any}
            interactive={false}
            compact
          />
        )}
        {display.assignee && (
          <span style={{ display: 'inline-flex' }}>
            <AssigneeAvatar accountId={item.assignee_account_id} name={item.assignee_display_name} />
          </span>
        )}
        <button
          ref={tRef}
          type="button"
          aria-label="More actions"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          style={{
            ...iconBtnSubtle(open),
            visibility: hover || open ? 'visible' : 'hidden',
          }}
        >
          <MoreIcon label="" size="small" />
        </button>
      </div>

      {open && pos && createPortal(
        <div
          ref={pRef}
          style={{
            position: 'fixed', top: pos.top, right: pos.right, zIndex: 10010,
            minWidth: 220,
            background: 'var(--ds-surface-overlay, #FFFFFF)', border: `1px solid ${BORDER}`, borderRadius: 4,
            boxShadow: '0 8px 24px rgba(9,30,66,0.16), 0 2px 4px rgba(9,30,66,0.08)', // ads-scanner:ignore-line — Atlassian elevation shadow rgba(9,30,66,*), no ds-shadow token for arbitrary alpha
            padding: '6px 0',
          }}
        >
          {(siblings ?? []).length > 0 && (
            <>
              <div style={{ padding: '4px 12px', fontSize: 'var(--ds-font-size-200)', fontWeight: 700, color: SUBTLE }}>Move to</div>
              {(siblings ?? []).map((s: any) => (
                <button
                  key={s.id}
                  type="button"
                  className="wis-row-menu-item"
                  onClick={() => { setOpen(false); moveMutation.mutate(s); }}
                  style={menuItemStyle()}
                >
                  {s.name || s.title}
                </button>
              ))}
              <button
                type="button"
                className="wis-row-menu-item"
                onClick={() => { setOpen(false); setIsMoveModalOpen(true); }}
                style={menuItemStyle()}
              >
                View all versions
              </button>
              <div style={{ height: 1, background: BORDER, margin: '6px 0' }} />
            </>
          )}
          <button
            type="button"
            className="wis-row-menu-item"
            onClick={() => { setOpen(false); onRemove(); }}
            style={menuItemStyle()}
          >
            Remove from version
          </button>
        </div>,
        document.body,
      )}

      <MoveToVersionModal
        isOpen={isMoveModalOpen}
        workItemId={item.id}
        currentReleaseName={releaseName}
        projectId={projectId}
        entityTable={entityTable}
        onClose={() => setIsMoveModalOpen(false)}
      />
    </>
  );
}

// ─── Progress section ───────────────────────────────────────────────────────

const PROGRESS_DONE = 'var(--ds-background-success-bold, #22A06B)';
const PROGRESS_WIP = 'var(--ds-background-information-bold, #1868DB)';
const PROGRESS_TODO = 'var(--ds-border, #DFE1E6)';
const PROGRESS_WARN = 'var(--ds-background-warning-bold, #E2B203)';

function ProgressSection({ items }: { items: Issue[] }) {
  const [collapsed, setCollapsed] = useState(false);
  const total = items.length;
  const counts = useMemo(() => {
    let done = 0, inProgress = 0, toDo = 0;
    for (const i of items) {
      const c = String(i.status_category ?? '').toLowerCase();
      if (c === 'done') done += 1;
      else if (c === 'in progress' || c === 'inprogress' || c === 'in_progress') inProgress += 1;
      else toDo += 1;
    }
    return { done, inProgress, toDo, warning: 0 };
  }, [items]);

  const segments = total
    ? [
        { key: 'done', pct: (counts.done / total) * 100, color: PROGRESS_DONE },
        { key: 'wip', pct: (counts.inProgress / total) * 100, color: PROGRESS_WIP },
        { key: 'todo', pct: (counts.toDo / total) * 100, color: PROGRESS_TODO },
      ].filter((s) => s.pct > 0)
    : [];

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <h2 style={{ margin: 0, fontSize: 'var(--ds-font-size-500)', fontWeight: 700, color: TEXT }}>Progress</h2>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}
          aria-expanded={!collapsed}
        >
          <span style={{ fontSize: 'var(--ds-font-size-400)', fontWeight: 600, color: TEXT }}>Work items</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: SUBTLE, fontSize: 'var(--ds-font-size-300)' }}>
            {counts.done} of {total} done
            {collapsed ? <ChevronRightIcon label="" size="small" /> : <ChevronDownIcon label="" size="small" />}
          </span>
        </button>

        <div
          role="progressbar"
          aria-valuenow={counts.done}
          aria-valuemin={0}
          aria-valuemax={total}
          style={{
            display: 'flex',
            gap: 2,
            height: 8,
            width: '100%',
            borderRadius: 4,
            overflow: 'hidden',
            background: PROGRESS_TODO,
          }}
        >
          {segments.map((seg, i) => (
            <div
              key={seg.key}
              style={{
                width: `${seg.pct}%`,
                background: seg.color,
                height: '100%',
                borderRadius:
                  segments.length === 1
                    ? 4
                    : i === 0
                    ? '4px 0 0 4px'
                    : i === segments.length - 1
                    ? '0 4px 4px 0'
                    : 0,
              }}
            />
          ))}
        </div>

        {!collapsed && (
          <ul style={{ listStyle: 'none', margin: 0, padding: '8px 0 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <ProgressStatRow color={PROGRESS_DONE} label="Done" count={counts.done} />
            <ProgressStatRow color={PROGRESS_WIP} label="In progress" count={counts.inProgress} />
            <ProgressStatRow color={PROGRESS_TODO} label="To do" count={counts.toDo} />
          </ul>
        )}
      </div>
    </section>
  );
}

function ProgressStatRow({ color, label, count }: { color: string; label: string; count: number }) {
  return (
    <li style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--ds-font-size-400)', color: TEXT }}>
      <span
        aria-hidden
        style={{
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: color,
          flexShrink: 0,
        }}
      />
      <span style={{ fontWeight: 600 }}>{label}:</span>
      <span style={{ color: SUBTLE }}>{count} work item{count === 1 ? '' : 's'}</span>
    </li>
  );
}
