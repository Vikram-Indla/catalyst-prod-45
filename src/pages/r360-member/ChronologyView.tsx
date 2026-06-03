/**
 * R360 Chronology View
 * Extracted from R360MemberDetail.tsx
 */
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { token } from '@atlaskit/tokens';
import { ChevronDown } from '@/lib/atlaskit-icons';
import { useTheme } from '@/hooks/useTheme';
import { getJiraIcon } from '@/components/r360/R360JiraIcons';
import type { R360WorkItem } from '@/types/r360';
import { getFromTagClass, getFromTagPrefix } from './helpers';
import { getChronologyStatusLozengeColors } from './StatusLozenge';
import { ProjTag, MiniAvatar, CompletedSummaryBar } from './SmallComponents';
import { QuickSearchInput } from './QuickSearchInput';

export function ChronologyView({ items, onSelect, weekStart, weekEnd }: { items: R360WorkItem[]; onSelect: (i: R360WorkItem) => void; weekStart: Date; weekEnd: Date }) {
  const { isDark } = useTheme();
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [quickSearch, setQuickSearch] = useState('');
  const groupRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const carryoverRef = useRef<HTMLDivElement | null>(null);

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const y = new Date(today); y.setDate(y.getDate() - 1);
  const yesterdayStr = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, '0')}-${String(y.getDate()).padStart(2, '0')}`;
  const todayLabel = `Today, ${today.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

  // Quick search filter — matches key or title
  const filteredItems = useMemo(() => {
    const q = quickSearch.trim().toLowerCase();
    if (!q) return items;
    return items.filter(i =>
      (i.item_key || '').toLowerCase().includes(q) ||
      (i.title || '').toLowerCase().includes(q)
    );
  }, [items, quickSearch]);

  // Separate items with activity vs carryover (no activity this week)
  const weekStartStr = weekStart.toISOString().slice(0, 10);
  const weekEndStr = weekEnd.toISOString().slice(0, 10);
  const carryoverItems = useMemo(() => {
    return filteredItems.filter(item => {
      if (item.status_category === 'done') return false;
      const updStr = item.updated_at?.slice(0, 10) || '';
      return updStr < weekStartStr || updStr > weekEndStr;
    });
  }, [filteredItems, weekStartStr, weekEndStr]);

  const activeItems = useMemo(() => {
    const carryoverIds = new Set(carryoverItems.map(i => i.id));
    return filteredItems.filter(i => !carryoverIds.has(i.id));
  }, [filteredItems, carryoverItems]);

  const groups = useMemo(() => {
    const map = new Map<string, { label: string; items: R360WorkItem[] }>();
    activeItems.forEach(item => {
      if (!map.has(item.group_date)) map.set(item.group_date, { label: item.date_label, items: [] });
      map.get(item.group_date)!.items.push(item);
    });
    return Array.from(map.entries()).sort(([a], [b]) => b.localeCompare(a));
  }, [activeItems]);

  const CARRYOVER_PAGE = 20;
  const [carryoverVisible, setCarryoverVisible] = useState(CARRYOVER_PAGE);
  const carryoverSentinelRef = useRef<HTMLDivElement | null>(null);
  const visibleCarryover = useMemo(() => carryoverItems.slice(0, carryoverVisible), [carryoverItems, carryoverVisible]);
  const hasMoreCarryover = carryoverVisible < carryoverItems.length;
  const loadMoreCarryover = useCallback(() => {
    setCarryoverVisible(c => Math.min(c + CARRYOVER_PAGE, carryoverItems.length));
  }, [carryoverItems.length]);

  useEffect(() => {
    if (!hasMoreCarryover || collapsed.has('__carryover__')) return;
    const el = carryoverSentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) {
        setCarryoverVisible(c => Math.min(c + CARRYOVER_PAGE, carryoverItems.length));
      }
    }, { rootMargin: '200px' });
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMoreCarryover, carryoverItems.length, collapsed]);

  // Split out Today's group from the rest -- memoized
  const todayGroup = useMemo(() => groups.find(([k]) => k === todayStr), [groups, todayStr]);
  const otherGroups = useMemo(() => groups.filter(([k]) => k !== todayStr), [groups, todayStr]);

  // D-19: No auto-scroll -- Chronology renders Today first at the top.
  // The tab-switch handler already scrolls to top on view change.

  // Render a single chronology card
  const renderChronoCard = (item: R360WorkItem) => {
    const fromClass = getFromTagClass(item.age_days);
    const statusText = (item.status || '').trim();
    const { background, color } = getChronologyStatusLozengeColors(item.status || '', item.status_category);

    return (
      <div key={item.id} className="r3-chrono-card" onClick={() => onSelect(item)}>
        <div style={{ width: 24, display: 'flex', alignItems: 'center', flexShrink: 0 }}>{getJiraIcon(item.item_type)}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <span className="r3-card-key">{item.item_key}</span>
            <ProjTag projectKey={item.project_key} />
            {item.role_on_item === 'Contributor' && (
              <MiniAvatar name={item.assignee_name} size={18} />
            )}
            {item.carried_from_label && (
              <span className={`r3-from-tag ${fromClass}`} style={{ fontSize: '10px' }}>
                {getFromTagPrefix(item.age_days)}{item.carried_from_label}
              </span>
            )}
          </div>
          <div className="r3-card-title r3-card-title--lg">{item.title}</div>
          {item.parent_key && (
            <div className="r3-parent-ref" style={{ marginTop: 4 }}>
              {'\u21B3'} <span className="r3-parent-key">{item.parent_key}</span> {item.parent_title}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {item.role_on_item === 'Contributor' && (
              <span style={{ fontSize: 12.5, color: 'var(--ds-text-subtle, var(--cp-text-secondary, var(--cp-text-secondary, #44546F)))', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <span style={{ color: 'var(--ds-text-subtlest, #626F86)' }}>{'\u2192'}</span> <MiniAvatar name={item.assignee_name} size={18} /> {item.assignee_name}
              </span>
            )}
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                height: '20px',
                padding: '0 8px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'none',
                letterSpacing: '0.03em',
                whiteSpace: 'nowrap',
                background,
                color,
              }}
            >
              {statusText || 'To do'}
            </span>
          </div>
          <span style={{ fontSize: 11, fontWeight: 400, color: item.age_days > 60 ? 'var(--ds-text-warning, #974F0C)' : 'var(--ds-text-subtlest, #626F86)', whiteSpace: 'nowrap' }}>
            {item.age_days} days ago
          </span>
        </div>
      </div>
    );
  };

  // Render a day group header + items
  const renderDayGroup = (dateKey: string, group: { label: string; items: R360WorkItem[] }) => {
    const isCollapsed = collapsed.has(dateKey);
    const dotClass = dateKey === todayStr ? 'r3-date-dot--today' : dateKey === yesterdayStr ? 'r3-date-dot--yesterday' : 'r3-date-dot--other';
    const statusDist = { done: 0, in_progress: 0, to_do: 0, blocked: 0 };
    group.items.forEach(i => {
      if (i.status_category === 'done') statusDist.done++;
      else if (i.status_category === 'in_progress' || i.status_category === 'in_qa') statusDist.in_progress++;
      else if (i.status_category === 'blocked') statusDist.blocked++;
      else statusDist.to_do++;
    });
    const total = group.items.length;

    return (
      <div key={dateKey} ref={el => { groupRefs.current[dateKey] = el; }} className="r3-date-group">
        <div className="r3-date-header" onClick={() => setCollapsed(prev => { const n = new Set(prev); n.has(dateKey) ? n.delete(dateKey) : n.add(dateKey); return n; })}>
          <span className={`r3-date-dot ${dotClass}`} />
          <span className="r3-date-label">{group.label}</span>
          <span className="r3-date-count">{total} items</span>
          <div className="r3-minibar">
            {statusDist.done > 0 && <div style={{ width: `${statusDist.done / total * 100}%`, background: 'var(--ds-text-success, var(--cp-success, #16A34A))' }} />}
            {statusDist.in_progress > 0 && <div style={{ width: `${statusDist.in_progress / total * 100}%`, background: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary, #2563EB))' }} />}
            {statusDist.to_do > 0 && <div style={{ width: `${statusDist.to_do / total * 100}%`, background: 'var(--ds-text-warning, var(--cp-warning, #D97706))' }} />}
            {statusDist.blocked > 0 && <div style={{ width: `${statusDist.blocked / total * 100}%`, background: 'var(--ds-text-danger, #EF4444)' }} />}
          </div>
          <ChevronDown size={16} className={`r3-date-chevron ${isCollapsed ? 'r3-date-chevron--collapsed' : ''}`} />
        </div>
        {!isCollapsed && (
          <div className="r3-chrono-items">
            {group.items.map(renderChronoCard)}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="r3-chrono">
      <QuickSearchInput value={quickSearch} onChange={setQuickSearch} resultCount={quickSearch.trim() ? filteredItems.length : undefined} totalCount={items.length} />

      {/* D-13: Green completed summary bar */}
      <CompletedSummaryBar
        items={items}
        testId="r360-chrono-completed-bar"
        onViewClick={() => {
          const doneItem = items.find(i => i.status_category === 'done');
          if (doneItem) {
            onSelect(doneItem);
          }
        }}
      />

      <div className="r3-chrono-line" />

      {/* D-11: Today Anchor -- always first */}
      <div data-testid="r360-chrono-today" ref={el => { groupRefs.current[todayStr] = el; }} className="r3-date-group">
        <div className="r3-date-header" onClick={() => setCollapsed(prev => { const n = new Set(prev); n.has('__today__') ? n.delete('__today__') : n.add('__today__'); return n; })}>
          <span className="r3-date-dot r3-date-dot--today" />
          <span className="r3-date-label" style={{ fontWeight: 650, fontSize: '13px' }}>{todayLabel}</span>
          <span className="r3-date-count">{todayGroup ? todayGroup[1].items.length : 0} items</span>
          {todayGroup && (() => {
            const total = todayGroup[1].items.length;
            const sd = { done: 0, in_progress: 0, to_do: 0, blocked: 0 };
            todayGroup[1].items.forEach(i => {
              if (i.status_category === 'done') sd.done++;
              else if (i.status_category === 'in_progress' || i.status_category === 'in_qa') sd.in_progress++;
              else if (i.status_category === 'blocked') sd.blocked++;
              else sd.to_do++;
            });
            return (
              <div className="r3-minibar">
                {sd.done > 0 && <div style={{ width: `${sd.done / total * 100}%`, background: 'var(--ds-text-success, var(--cp-success, #16A34A))' }} />}
                {sd.in_progress > 0 && <div style={{ width: `${sd.in_progress / total * 100}%`, background: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary, #2563EB))' }} />}
                {sd.to_do > 0 && <div style={{ width: `${sd.to_do / total * 100}%`, background: 'var(--ds-text-warning, var(--cp-warning, #D97706))' }} />}
                {sd.blocked > 0 && <div style={{ width: `${sd.blocked / total * 100}%`, background: 'var(--ds-text-danger, #EF4444)' }} />}
              </div>
            );
          })()}
          <ChevronDown size={16} className={`r3-date-chevron ${collapsed.has('__today__') ? 'r3-date-chevron--collapsed' : ''}`} />
        </div>
        {!collapsed.has('__today__') && (
          todayGroup ? (
            <div className="r3-chrono-items">
              {todayGroup[1].items.map(renderChronoCard)}
            </div>
          ) : (
            <div style={{ paddingLeft: '28px', fontSize: '12px', fontStyle: 'italic', color: 'var(--ds-text-subtlest, #626F86)', padding: '8px 0 8px 28px' }}>
              No activity yet today
            </div>
          )
        )}
      </div>

      {/* Other day groups in reverse chronological order */}
      {otherGroups.map(([dateKey, group]) => renderDayGroup(dateKey, group))}

      {/* D-12: Carried Over section at the bottom */}
      {carryoverItems.length > 0 && (
        <div data-testid="r360-chrono-carryover" ref={carryoverRef} className="r3-date-group">
          <div className="r3-date-header" onClick={() => {
            setCollapsed(prev => {
              const n = new Set(prev);
              if (n.has('__carryover__')) {
                n.delete('__carryover__');
                setCarryoverVisible(CARRYOVER_PAGE);
              } else {
                n.add('__carryover__');
              }
              return n;
            });
          }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', border: '2px solid var(--ds-text-warning, var(--cp-warning, #D97706))', background: 'transparent', flexShrink: 0 }} />
            <span className="r3-date-label" style={{ fontWeight: 650, fontSize: '13px' }}>Carried Over</span>
            <span className="r3-date-count">{carryoverItems.length} items</span>
            <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: 'var(--ds-surface-sunken, #F8FAFC)', color: 'var(--ds-text-subtlest, #626F86)' }}>No activity this week</span>
            <ChevronDown size={16} className={`r3-date-chevron ${collapsed.has('__carryover__') ? 'r3-date-chevron--collapsed' : ''}`} />
          </div>
          {!collapsed.has('__carryover__') && (
            <div className="r3-chrono-items">
              {visibleCarryover.map(renderChronoCard)}
              {hasMoreCarryover && (
                <>
                  <div ref={carryoverSentinelRef} style={{ height: 1 }} />
                  <button
                    onClick={loadMoreCarryover}
                    style={{
                      display: 'block', width: '100%', padding: '8px 0',
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      fontSize: 12, fontWeight: 500,
                      color: 'var(--ds-link, #0052CC)',
                    }}
                  >
                    Show more ({carryoverItems.length - carryoverVisible} remaining)
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
