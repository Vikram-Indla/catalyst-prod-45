/**
 * BrListPanel — Left-panel card list for Product All Work.
 *
 * Structural clone of WorkListPanel (src/pages/project-hub/jira-list/components/WorkListPanel.tsx).
 * Differences from the original:
 *  1. Avatar is display-only — no WorkCardAssigneePicker write capability
 *     (the picker writes to ph_issues; BRs live in business_requests).
 *  2. Avatar click selects the card body (opens detail panel), not an inline picker.
 * Everything else — GroupByPopover, sort, keyboard nav, infinite scroll,
 * group headers, footer count — is identical to WorkListPanel.
 */
import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { GroupByPopover, type GroupByOption } from '@/components/shared/GroupByPopover';
import { IconButton } from '@atlaskit/button/new';
import ArrowUpIcon from '@atlaskit/icon/glyph/arrow-up';
import ArrowDownIcon from '@atlaskit/icon/glyph/arrow-down';
import RefreshIcon from '@atlaskit/icon/glyph/refresh';
import Spinner from '@atlaskit/spinner';
import Avatar from '@atlaskit/avatar';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import type { WorkItem } from '@/types/workItem.types';

// ── Types ─────────────────────────────────────────────────────────────────────

type GroupBy = 'none' | 'status' | 'assignee' | 'priority' | 'type';

const GROUP_BY_OPTIONS: GroupByOption<GroupBy>[] = [
  { key: 'status',   label: 'Status',     icon: 'status' },
  { key: 'assignee', label: 'Assignee',   icon: 'assignee' },
  { key: 'priority', label: 'Priority',   icon: 'priority' },
  { key: 'type',     label: 'Type', icon: 'type' },
];

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  items: WorkItem[];
  selectedKey: string | null;
  onSelect: (id: string) => void;
  onKeyClick?: (id: string) => void;
  externalQuery?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function BrListPanel({ items, selectedKey, onSelect, onKeyClick, externalQuery }: Props) {
  const [innerQuery, setInnerQuery] = useState('');
  const query = externalQuery !== undefined ? externalQuery : innerQuery;
  const showInnerSearch = externalQuery === undefined;

  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [groupBy, setGroupBy] = useState<GroupBy>('none');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const toggleGroup = useCallback((label: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }, []);

  const [page, setPage] = useState(50);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = !q
      ? items
      : items.filter(i => (i.jiraKey + ' ' + i.summary).toLowerCase().includes(q));
    return [...base].sort((a, b) => {
      const av = (a as any).jira_created_at ?? (a as any).createdAt ?? a.id ?? '';
      const bv = (b as any).jira_created_at ?? (b as any).createdAt ?? b.id ?? '';
      const cmp = String(av) < String(bv) ? -1 : String(av) > String(bv) ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [items, query, sortDir]);

  useEffect(() => { setPage(50); }, [query, sortDir, items.length]);

  const visible = filtered.slice(0, page);
  const hasMore = page < filtered.length;

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !isFetchingMore) {
        setIsFetchingMore(true);
        setTimeout(() => { setPage(p => p + 50); setIsFetchingMore(false); }, 200);
      }
    }, { threshold: 0.1 });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isFetchingMore]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      const currentIdx = visible.findIndex(i => i.id === selectedKey);
      const selectAt = (idx: number) => {
        const clamped = Math.max(0, Math.min(idx, visible.length - 1));
        const item = visible[clamped];
        if (item) { e.preventDefault(); onSelect(item.id); }
      };
      switch (e.key) {
        case 'ArrowDown': case 'j': return selectAt(currentIdx + 1);
        case 'ArrowUp':   case 'k': return selectAt(currentIdx - 1);
        case 'Home': return selectAt(0);
        case 'End':  return selectAt(visible.length - 1);
        case 'Enter': case ' ': {
          if (e.key === ' ') e.preventDefault();
          const item = visible[currentIdx];
          if (item && onKeyClick) onKeyClick(item.id);
          break;
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, selectedKey, onSelect, onKeyClick]);

  const grouped = useMemo<Array<{ label: string | null; items: WorkItem[] }>>(() => {
    if (groupBy === 'none') return [{ label: null, items: visible }];
    const map = new Map<string, WorkItem[]>();
    for (const item of visible) {
      let key: string;
      switch (groupBy) {
        case 'status':   key = item.statusName || item.status || 'Unknown'; break;
        case 'assignee': key = item.assignee?.name || 'Unassigned'; break;
        case 'priority': key = item.priority || 'Unknown'; break;
        case 'type': {
          const raw = ((item as any).rawType || item.type || 'Unknown') as string;
          key = raw.charAt(0).toUpperCase() + raw.slice(1);
          break;
        }
        default: key = 'Unknown';
      }
      const arr = map.get(key) ?? [];
      arr.push(item);
      map.set(key, arr);
    }
    return Array.from(map.entries()).map(([label, its]) => ({ label, items: its }));
  }, [visible, groupBy]);

  const visibleCount = Math.min(page, filtered.length);
  const totalLabel = filtered.length >= 1000 ? '1000+' : `${filtered.length}`;

  const renderCard = useCallback((item: WorkItem) => {
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
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(item.id); }
        }}
        style={{
          position: 'relative',
          width: '100%', boxSizing: 'border-box',
          textAlign: 'left', display: 'block', border: 'none',
          background: selected ? 'var(--ds-background-selected, #E9F2FF)' : 'var(--ds-surface, #FFFFFF)',
          padding: selected ? '16px 16px 16px 19px' : '16px',
          cursor: 'pointer', transition: 'background 80ms',
          boxShadow: selected ? 'none' : 'var(--ds-shadow-raised, 0 1px 1px rgba(30,31,33,0.25))',
        }}
        onMouseEnter={e => { if (!selected) e.currentTarget.style.background = 'var(--ds-background-neutral-hovered, #F8F9FA)'; }}
        onMouseLeave={e => { if (!selected) e.currentTarget.style.background = 'var(--ds-surface, #FFFFFF)'; }}
      >
        {selected && (
          <div aria-hidden="true" style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 3, background: 'var(--ds-background-brand-bold, #0C66E4)', borderRadius: '2px 0 0 2px' }} />
        )}
        <div dir={rtl ? 'rtl' : 'ltr'} style={{ fontWeight: 400, color: selected ? 'var(--ds-link, #0C66E4)' : 'var(--ds-text, #292A2E)', marginBottom: 8, lineHeight: '20px', fontSize: 14 }}>
          {item.summary || '(No title)'}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ds-text-subtlest, #44546F)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 20, height: 20, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <JiraIssueTypeIcon type={((item as any).rawType || item.type) as any} size={20} />
            </span>
            {onKeyClick ? (
              <button
                onClick={e => { e.stopPropagation(); onKeyClick(item.id); }}
                style={{ background: 'none', border: 'none', padding: 0, margin: 0, font: 'inherit', fontSize: 13, fontWeight: 500, color: 'var(--ds-text-subtlest, #44546F)', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 2 }}
              >
                {item.jiraKey}
              </button>
            ) : item.jiraKey}
          </span>
          {/* Display-only avatar — no click action, no inline picker */}
          {item.assignee && (
            <Avatar
              size="small"
              name={item.assignee.name}
              src={item.assignee.avatarUrl ?? undefined}
              appearance="circle"
            />
          )}
        </div>
      </div>
    );
  }, [selectedKey, onSelect, onKeyClick]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, fontSize: 14 }}>
      {showInnerSearch && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderBottom: '1px solid var(--ds-border, rgba(9,30,66,0.14))', flexWrap: 'nowrap', background: 'var(--ds-surface, #FFFFFF)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0, border: '1px solid var(--ds-border, rgba(9,30,66,0.14))', borderRadius: 6, padding: '0 8px', height: 32, background: 'transparent' }}>
            <input type="text" value={innerQuery} onChange={e => setInnerQuery(e.target.value)} placeholder="Search work" style={{ border: 'none', outline: 'none', boxShadow: 'none', width: '100%', fontSize: 14, background: 'transparent', color: 'var(--ds-text, #172B4D)' }} />
          </div>
        </div>
      )}

      <div style={{ height: 48, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px 0 12px', borderBottom: '1px solid var(--ds-border, rgba(9,30,66,0.14))', background: 'var(--ds-surface, #FFFFFF)' }}>
        <GroupByPopover value={groupBy} onChange={v => { setGroupBy(v); setCollapsedGroups(new Set()); }} options={GROUP_BY_OPTIONS} noneKey="none" label="Group by" />
        <div style={{ display: 'flex', gap: 2 }}>
          <IconButton appearance="subtle" icon={sortDir === 'asc' ? ArrowUpIcon : ArrowDownIcon} label={`Sort ${sortDir === 'asc' ? 'ascending' : 'descending'}`} onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')} />
          <IconButton appearance="subtle" icon={RefreshIcon} label="Refresh list" onClick={() => setPage(50)} />
        </div>
      </div>

      <div role="listbox" aria-label="Business request navigator" style={{ flex: 1, overflowY: 'auto', minHeight: 0, background: 'var(--ds-background-neutral, #F7F8F9)', display: 'flex', flexDirection: 'column', gap: 1, padding: '8px' }}>
        {grouped.map(group => {
          const isCollapsed = group.label != null && collapsedGroups.has(group.label);
          return (
            <React.Fragment key={group.label ?? '__root'}>
              {group.label != null && (
                <button
                  onClick={() => toggleGroup(group.label!)}
                  aria-expanded={!isCollapsed}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 6, padding: '8px 8px', fontSize: 12, fontWeight: 600, color: 'var(--ds-text-subtle, #626F86)', background: 'var(--ds-background-neutral, #F7F8F9)', border: 'none', borderBottom: '1px solid var(--ds-border, rgba(9,30,66,0.08))', borderRadius: 0, cursor: 'pointer', textAlign: 'left', userSelect: 'none', marginTop: 4, flexShrink: 0 }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'var(--ds-background-neutral, #F7F8F9)'; }}
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true" style={{ flexShrink: 0, transition: 'transform 120ms', transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}>
                    <path d="M2 3l3 4 3-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {groupBy === 'type' && <JiraIssueTypeIcon type={group.label as any} size={14} />}
                  <span style={{ flex: 1 }}>{group.label}</span>
                  <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--ds-text-subtlest, #8590A2)' }}>{group.items.length}</span>
                </button>
              )}
              {!isCollapsed && group.items.map(renderCard)}
            </React.Fragment>
          );
        })}
        {hasMore && !isFetchingMore && <div ref={sentinelRef} style={{ height: 1 }} aria-hidden="true" />}
        {isFetchingMore && <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0', background: 'var(--ds-background-neutral, #F7F8F9)' }}><Spinner size="small" /></div>}
        {visible.length === 0 && !isFetchingMore && <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--ds-text-subtle, #626F86)', fontSize: 14 }}>No business requests{query.trim() ? ` matching "${query.trim()}"` : ''}</div>}
      </div>

      <div style={{ height: 40, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderTop: '1px solid var(--ds-border, rgba(9,30,66,0.14))', background: 'var(--ds-surface, #FFFFFF)', fontSize: 13, gap: 4 }}>
        <span style={{ color: 'var(--ds-text-subtle, #626F86)', fontWeight: 400 }}>{visibleCount} of</span>
        <span style={{ color: 'var(--ds-link, #0C66E4)', fontWeight: 700 }}>{totalLabel}</span>
      </div>
    </div>
  );
}
