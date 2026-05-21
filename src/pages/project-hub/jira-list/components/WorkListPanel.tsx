/**
 * WorkListPanel — Jira-parity left panel: scrollable card list with group-by,
 * sort, refresh, infinite scroll, and full keyboard navigation.
 *
 * 2026-04-20: navigator avatars are interactive — clicking the avatar opens
 * an Atlassian-style assignee picker (WorkCardAssigneePicker) that writes to
 * ph_issues and invalidates the list query so the card refreshes in real time.
 * Card body click still selects the row; the picker stopPropagation()s its
 * own click so the two interactions never collide.
 *
 * 2026-05-21: Left Panel Navigator spec alignment (14 gaps closed):
 *  - GroupBySelector: @atlaskit/dropdown-menu (Group by: None/Status/Assignee/Priority)
 *  - SortConfigButton + RefreshButton: @atlaskit/button/new IconButton appearance="subtle"
 *  - IssueCardList: background #F7F8F9, gap 1px hairline separator (flex column)
 *  - Active card: 3px solid #0C66E4 left accent bar (position:absolute), #E9F2FF bg
 *  - Active summary color: #0C66E4
 *  - IssueTypeIcon: 20px
 *  - IssueKey typography: 13px/500/#44546F
 *  - Footer: 40px sticky, mixed-weight "N of 1000+" (gray + bold blue #0C66E4)
 *  - Infinite scroll: IntersectionObserver + @atlaskit/spinner (replaces Load-more button)
 *  - Keyboard: Up/Down arrows, J/K vim-style, Home/End, Enter/Space, Escape propagates to parent
 */
import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import DropdownMenu, { DropdownItem, DropdownItemGroup } from '@atlaskit/dropdown-menu';
import { IconButton } from '@atlaskit/button/new';
import ArrowUpIcon from '@atlaskit/icon/glyph/arrow-up';
import ArrowDownIcon from '@atlaskit/icon/glyph/arrow-down';
import RefreshIcon from '@atlaskit/icon/glyph/refresh';
import Spinner from '@atlaskit/spinner';
import { WorkItemTypeIcon } from '@/components/icons/WorkItemTypeIcon';
import { WorkCardAssigneePicker } from './WorkCardAssigneePicker';
import type { WorkItem } from '@/types/workItem.types';

// ── Types ─────────────────────────────────────────────────────────────────────

type GroupBy = 'none' | 'status' | 'assignee' | 'priority';

const GROUP_BY_LABELS: Record<GroupBy, string> = {
  none: 'None',
  status: 'Status',
  assignee: 'Assignee',
  priority: 'Priority',
};

const SUBTASK_TYPE_RE = /^(sub-?task|backend|frontend|figma|entity figma|integration)$/i;

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  items: WorkItem[];
  selectedKey: string | null;
  onSelect: (id: string) => void;
  /** Called when the issue key badge is clicked — opens detail modal for that item. */
  onKeyClick?: (id: string) => void;
  /** Project UUID — required for the assignee picker (project_members lookup). */
  projectId?: string;
  /** jira-compare 2026-05-02: AllWorkToolbar now owns the Search input.
   *  When externalQuery is provided, the rail filters by it and the
   *  inner search input is hidden. */
  externalQuery?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function WorkListPanel({
  items,
  selectedKey,
  onSelect,
  onKeyClick,
  projectId,
  externalQuery,
}: Props) {
  const [innerQuery, setInnerQuery] = useState('');
  const query = externalQuery !== undefined ? externalQuery : innerQuery;
  const showInnerSearch = externalQuery === undefined;

  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [groupBy, setGroupBy] = useState<GroupBy>('none');

  /* Infinite scroll — 50 items per page, expanded by IntersectionObserver. */
  const [page, setPage] = useState(50);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // ── Filter + sort ─────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    /* jira-compare follow-up (2026-05-02): rail shows top-level work only.
       Subtask types are visible via the parent's SubtasksPanel. */
    const topLevel = items.filter(i => {
      const t = (i.type || '') as string;
      const rawType = ((i as any).rawType || '') as string;
      return !SUBTASK_TYPE_RE.test(t) && !SUBTASK_TYPE_RE.test(rawType);
    });

    const q = query.trim().toLowerCase();
    const base = !q
      ? topLevel
      : topLevel.filter(i => (i.jiraKey + ' ' + i.summary).toLowerCase().includes(q));

    return [...base].sort((a, b) => {
      const av = (a as any).jira_created_at ?? (a as any).createdAt ?? a.id ?? '';
      const bv = (b as any).jira_created_at ?? (b as any).createdAt ?? b.id ?? '';
      const cmp = String(av) < String(bv) ? -1 : String(av) > String(bv) ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [items, query, sortDir]);

  /* Reset page when the filtered list changes (query/sort/items). */
  useEffect(() => { setPage(50); }, [query, sortDir, items.length]);

  const visible = filtered.slice(0, page);
  const hasMore = page < filtered.length;

  // ── Infinite scroll sentinel ──────────────────────────────────────────────

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isFetchingMore) {
          setIsFetchingMore(true);
          /* Small async tick so the spinner renders before the state update
             that expands the list — avoids a flash of the sentinel. */
          setTimeout(() => {
            setPage(p => p + 50);
            setIsFetchingMore(false);
          }, 200);
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isFetchingMore]);

  // ── Keyboard navigation ───────────────────────────────────────────────────

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      /* Never steal keystrokes from inline-edit inputs. */
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === 'INPUT' ||
          t.tagName === 'TEXTAREA' ||
          t.isContentEditable)
      )
        return;

      const currentIdx = visible.findIndex(i => i.id === selectedKey);

      const selectAt = (idx: number) => {
        const clamped = Math.max(0, Math.min(idx, visible.length - 1));
        const item = visible[clamped];
        if (item) {
          e.preventDefault();
          onSelect(item.id);
        }
      };

      switch (e.key) {
        case 'ArrowDown':
        case 'j':
          return selectAt(currentIdx + 1);
        case 'ArrowUp':
        case 'k':
          return selectAt(currentIdx - 1);
        case 'Home':
          return selectAt(0);
        case 'End':
          return selectAt(visible.length - 1);
        case 'Enter':
        case ' ': {
          if (e.key === ' ') e.preventDefault();
          const item = visible[currentIdx];
          if (item && onKeyClick) onKeyClick(item.id);
          break;
        }
        /* Escape: let it propagate to the parent detail panel / modal. */
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, selectedKey, onSelect, onKeyClick]);

  // ── Group-by ──────────────────────────────────────────────────────────────

  const grouped = useMemo<Array<{ label: string | null; items: WorkItem[] }>>(() => {
    if (groupBy === 'none') return [{ label: null, items: visible }];

    const map = new Map<string, WorkItem[]>();
    for (const item of visible) {
      const key =
        groupBy === 'status'
          ? item.statusName || item.status || 'Unknown'
          : groupBy === 'assignee'
          ? item.assignee?.name || 'Unassigned'
          : /* priority */ (item.priority || 'Unknown');
      const arr = map.get(key) ?? [];
      arr.push(item);
      map.set(key, arr);
    }
    return Array.from(map.entries()).map(([label, its]) => ({ label, items: its }));
  }, [visible, groupBy]);

  // ── Footer counts ─────────────────────────────────────────────────────────

  const visibleCount = Math.min(page, filtered.length);
  const totalLabel = filtered.length >= 1000 ? '1000+' : `${filtered.length}`;

  // ── Card renderer ─────────────────────────────────────────────────────────

  const renderCard = useCallback(
    (item: WorkItem) => {
      const selected = item.id === selectedKey;
      const rtl = /[؀-ۿ]/.test(item.summary);

      return (
        <div
          key={item.id}
          role="option"
          aria-selected={selected}
          tabIndex={0}
          onClick={() => onSelect(item.id)}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSelect(item.id);
            }
          }}
          style={{
            // position:relative so the absolute accent bar is contained
            position: 'relative',
            width: '100%',
            boxSizing: 'border-box',
            textAlign: 'left',
            display: 'block',
            border: 'none',
            background: selected
              ? 'var(--ds-background-selected, #E9F2FF)'
              : 'var(--ds-surface, #FFFFFF)',
            // Inset left padding by 3px when selected so text doesn't sit on bar
            padding: selected ? '16px 16px 16px 19px' : '16px',
            cursor: 'pointer',
            transition: 'background 80ms',
            // No box-shadow — spec uses left accent bar only for active state
            boxShadow: selected
              ? 'none'
              : 'var(--ds-shadow-raised, 0 1px 1px rgba(30,31,33,0.25))',
          }}
          onMouseEnter={e => {
            if (!selected)
              e.currentTarget.style.background =
                'var(--ds-background-neutral-hovered, #F8F9FA)';
          }}
          onMouseLeave={e => {
            if (!selected)
              e.currentTarget.style.background = 'var(--ds-surface, #FFFFFF)';
          }}
        >
          {/* ── Left accent bar (active card only) ── */}
          {selected && (
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                bottom: 0,
                width: 3,
                background: 'var(--ds-background-brand-bold, #0C66E4)',
                borderRadius: '2px 0 0 2px',
              }}
            />
          )}

          {/* ── Summary ── */}
          <div
            dir={rtl ? 'rtl' : 'ltr'}
            style={{
              fontWeight: 400,
              color: selected
                ? 'var(--ds-link, #0C66E4)'
                : 'var(--ds-text, #292A2E)',
              marginBottom: 8,
              lineHeight: '20px',
              fontSize: 14,
            }}
          >
            {item.summary || '(No title)'}
          </div>

          {/* ── Metadata row — IssueTypeIcon + IssueKey left, Assignee right ── */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
            }}
          >
            <span
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: 'var(--ds-text-subtlest, #44546F)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {/* IssueTypeIcon — 20px circle per spec */}
              <span
                style={{
                  width: 20,
                  height: 20,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <WorkItemTypeIcon
                  type={(item as any).rawType || item.type}
                  size={20}
                />
              </span>
              {onKeyClick ? (
                <button
                  onClick={e => {
                    e.stopPropagation();
                    onKeyClick(item.id);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    margin: 0,
                    font: 'inherit',
                    fontSize: 13,
                    fontWeight: 500,
                    color: 'var(--ds-text-subtlest, #44546F)',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    textUnderlineOffset: 2,
                  }}
                >
                  {item.jiraKey}
                </button>
              ) : (
                item.jiraKey
              )}
            </span>

            {/* AssigneeAvatar — WorkCardAssigneePicker wraps @atlaskit/avatar internally */}
            <div style={{ display: 'inline-flex', alignItems: 'center' }}>
              <WorkCardAssigneePicker
                dbId={item.dbId || item.id}
                currentAssigneeId={item.assignee?.id ?? null}
                currentAssigneeName={item.assignee?.name ?? null}
                projectId={projectId}
                fallbackInitials={item.assignee?.initials || 'NA'}
                fallbackColor={
                  item.assignee?.color ||
                  'var(--ds-background-accent-purple-subtle, #6554C0)'
                }
              />
            </div>
          </div>
        </div>
      );
    },
    [selectedKey, onSelect, onKeyClick, projectId],
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
        fontSize: 14,
      }}
    >
      {/* ── Inner search bar (hidden when AllWorkToolbar owns search) ── */}
      {showInnerSearch && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 12px',
            borderBottom: '1px solid var(--ds-border, rgba(9,30,66,0.14))',
            flexWrap: 'nowrap',
            background: 'var(--ds-surface, #FFFFFF)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              flex: 1,
              minWidth: 0,
              border: '1px solid var(--ds-border, rgba(9,30,66,0.14))',
              borderRadius: 6,
              padding: '0 8px',
              height: 32,
              background: 'transparent',
            }}
          >
            <input
              type="text"
              value={innerQuery}
              onChange={e => setInnerQuery(e.target.value)}
              placeholder="Search work"
              style={{
                border: 'none',
                outline: 'none',
                boxShadow: 'none',
                width: '100%',
                fontSize: 14,
                background: 'transparent',
                color: 'var(--ds-text, #172B4D)',
              }}
            />
          </div>
        </div>
      )}

      {/* ── Header (48px sticky) — GroupBySelector + Sort + Refresh ── */}
      <div
        style={{
          height: 48,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 4px 0 12px',
          borderBottom: '1px solid var(--ds-border, rgba(9,30,66,0.14))',
          background: 'var(--ds-surface, #FFFFFF)',
        }}
      >
        {/* GroupBySelector */}
        <DropdownMenu
          trigger={({ triggerRef, ...triggerProps }) => (
            <button
              ref={triggerRef as React.Ref<HTMLButtonElement>}
              {...triggerProps}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 400,
                fontSize: 13,
                color: 'var(--ds-text-subtlest, #44546F)',
                padding: '4px 8px',
                borderRadius: 3,
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background =
                  'var(--ds-background-neutral-hovered, #F1F2F4)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              Group by:{' '}
              <strong style={{ fontWeight: 600, color: 'var(--ds-text, #172B4D)' }}>
                {GROUP_BY_LABELS[groupBy]}
              </strong>
              <svg
                width="10"
                height="6"
                viewBox="0 0 10 6"
                aria-hidden="true"
                style={{ flexShrink: 0 }}
              >
                <path d="M0 0l5 6 5-6z" fill="currentColor" opacity="0.55" />
              </svg>
            </button>
          )}
        >
          <DropdownItemGroup>
            {(Object.keys(GROUP_BY_LABELS) as GroupBy[]).map(opt => (
              <DropdownItem key={opt} onClick={() => setGroupBy(opt)}>
                {GROUP_BY_LABELS[opt]}
              </DropdownItem>
            ))}
          </DropdownItemGroup>
        </DropdownMenu>

        {/* SortConfigButton + RefreshButton */}
        <div style={{ display: 'flex', gap: 2 }}>
          <IconButton
            appearance="subtle"
            icon={sortDir === 'asc' ? ArrowUpIcon : ArrowDownIcon}
            label={`Sort ${sortDir === 'asc' ? 'ascending' : 'descending'} by created date`}
            onClick={() => setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))}
          />
          <IconButton
            appearance="subtle"
            icon={RefreshIcon}
            label="Refresh list"
            onClick={() => setPage(50)}
          />
        </div>
      </div>

      {/* ── Scrollable card list ── */}
      <div
        role="listbox"
        aria-label="Issue navigator"
        style={{
          flex: 1,
          overflowY: 'auto',
          minHeight: 0,
          // IssueCardList container: #F7F8F9 bg with 1px gap (hairline sep between cards)
          background: 'var(--ds-background-neutral, #F7F8F9)',
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
        }}
      >
        {grouped.map(group => (
          <React.Fragment key={group.label ?? '__root'}>
            {/* Group header — rendered when groupBy is active */}
            {group.label != null && (
              <div
                style={{
                  padding: '8px 12px 4px',
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--ds-text-subtle, #626F86)',
                  background: 'var(--ds-background-neutral, #F7F8F9)',
                }}
              >
                {group.label}
              </div>
            )}
            {group.items.map(renderCard)}
          </React.Fragment>
        ))}

        {/* IntersectionObserver sentinel — triggers next-page load */}
        {hasMore && !isFetchingMore && (
          <div ref={sentinelRef} style={{ height: 1 }} aria-hidden="true" />
        )}

        {/* Next-page spinner */}
        {isFetchingMore && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              padding: '12px 0',
              background: 'var(--ds-background-neutral, #F7F8F9)',
            }}
          >
            <Spinner size="small" />
          </div>
        )}

        {/* Empty state */}
        {visible.length === 0 && !isFetchingMore && (
          <div
            style={{
              padding: '32px 16px',
              textAlign: 'center',
              color: 'var(--ds-text-subtle, #626F86)',
              fontSize: 14,
            }}
          >
            No work items
            {query.trim() ? ` matching "${query.trim()}"` : ''}
          </div>
        )}
      </div>

      {/* ── Footer (40px sticky) — "N of 1000+" mixed weight ── */}
      <div
        style={{
          height: 40,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderTop: '1px solid var(--ds-border, rgba(9,30,66,0.14))',
          background: 'var(--ds-surface, #FFFFFF)',
          fontSize: 13,
          gap: 4,
        }}
      >
        <span style={{ color: 'var(--ds-text-subtle, #626F86)', fontWeight: 400 }}>
          {visibleCount} of
        </span>
        <span style={{ color: 'var(--ds-link, #0C66E4)', fontWeight: 700 }}>
          {totalLabel}
        </span>
      </div>
    </div>
  );
}
