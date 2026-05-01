import React, { useState, useMemo, useCallback } from 'react';
import { useChronologyEvents } from '@/hooks/useResource360';
import { HUB_COLORS, HUB_SHORT } from '@/constants/resource360';
import { getStatusCategory } from '@/utils/statusCategory';

const T = {
  bg: '#F5F0EB', surface: 'var(--bg-app)', text1: 'var(--fg-1)', text2: '#1A1A2E',
  text3: '#3D3D56', text4: 'var(--fg-3)', border: 'var(--divider)', borderStrong: 'var(--divider)',
  todo: '#E23636', progress: 'var(--cp-blue)', done: '#0E8A5F',
  pendingHighlight: '#FFF3E0',
  shadow: '0 2px 8px rgba(0,0,0,.12)',
  mono: "'JetBrains Mono', 'SF Mono', monospace",
};

interface ChronologyViewProps {
  resourceId: string;
  onItemClick: (item: any) => void;
}

const ChronologyView: React.FC<ChronologyViewProps> = ({ resourceId, onItemClick }) => {
  const { data: events } = useChronologyEvents(resourceId);
  const items = events || [];

  // Filters
  const [hubFilter, setHubFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [assignerFilter, setAssignerFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showPendingOnly, setShowPendingOnly] = useState(false);
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  // Unique values for dropdowns
  const hubs = useMemo(() => [...new Set(items.map((i: any) => i.hub || i.source_hub).filter(Boolean))].sort(), [items]);
  const statuses = useMemo(() => [...new Set(items.map((i: any) => i.status).filter(Boolean))].sort(), [items]);
  const priorities = useMemo(() => [...new Set(items.map((i: any) => i.priority).filter(Boolean))].sort(), [items]);
  const assigners = useMemo(() => [...new Set(items.map((i: any) => i.assigner_name || i.assignee_name).filter(Boolean))].sort() as string[], [items]);

  // Apply filters
  const filtered = useMemo(() => {
    let result = [...items];
    if (hubFilter !== 'all') result = result.filter((i: any) => (i.hub || i.source_hub) === hubFilter);
    if (statusFilter !== 'all') result = result.filter((i: any) => i.status === statusFilter);
    if (priorityFilter !== 'all') result = result.filter((i: any) => i.priority === priorityFilter);
    if (assignerFilter !== 'all') result = result.filter((i: any) => (i.assigner_name || i.assignee_name) === assignerFilter);
    const dateField = (i: any) => i.assigned_at || i.event_date || '';
    if (dateFrom) result = result.filter((i: any) => dateField(i) >= dateFrom);
    if (dateTo) result = result.filter((i: any) => dateField(i) <= dateTo + 'T23:59:59');
    if (showPendingOnly) result = result.filter((i: any) => getStatusCategory(i.status_category || i.status) !== 'done');
    return result.sort((a: any, b: any) => {
      const da = a.assigned_at || a.event_date || '';
      const db = b.assigned_at || b.event_date || '';
      return new Date(db).getTime() - new Date(da).getTime();
    });
  }, [items, hubFilter, statusFilter, priorityFilter, assignerFilter, dateFrom, dateTo, showPendingOnly]);

  // Group by date
  const groups = useMemo(() => {
    const g: Record<string, any[]> = {};
    filtered.forEach((item: any) => {
      const d = (item.assigned_at || item.event_date || 'Unknown').slice(0, 10);
      if (!g[d]) g[d] = [];
      g[d].push(item);
    });
    return g;
  }, [filtered]);

  const clearFilters = useCallback(() => {
    setHubFilter('all'); setStatusFilter('all');
    setPriorityFilter('all'); setAssignerFilter('all');
    setDateFrom(''); setDateTo(''); setShowPendingOnly(false);
  }, []);

  const hasActiveFilters = hubFilter !== 'all' || statusFilter !== 'all' ||
    priorityFilter !== 'all' || assignerFilter !== 'all' ||
    dateFrom || dateTo || showPendingOnly;

  const pendingCount = items.filter((i: any) => getStatusCategory(i.status_category || i.status) !== 'done').length;

  return (
    <div style={{ fontFamily: 'var(--cp-font-body)', height: '100%', display: 'flex', flexDirection: 'column' }}>

      {/* ═══ FILTER BAR ═══ */}
      <div style={{ padding: '10px 16px', borderBottom: `1px solid ${T.border}`, background: T.surface }}>
        {/* Top row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Pending checkbox */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: T.text2, cursor: 'pointer' }}>
            <input type="checkbox" checked={showPendingOnly} onChange={e => setShowPendingOnly(e.target.checked)}
              style={{ accentColor: T.todo, width: 14, height: 14 }} />
            Pending Only ({pendingCount})
          </label>

          <div style={{ width: 1, height: 18, background: T.borderStrong }} />

          {/* Quick hub pills */}
          <div style={{ display: 'flex', gap: 4 }}>
            <FilterPill label="All" active={hubFilter === 'all'} onClick={() => setHubFilter('all')} />
            {hubs.slice(0, 5).map((h: string) => (
              <FilterPill key={h} label={HUB_SHORT[h] ?? h.replace('Hub', '')} active={hubFilter === h}
                onClick={() => setHubFilter(h)} dotColor={HUB_COLORS[h]} />
            ))}
          </div>

          <div style={{ flex: 1 }} />

          {/* Advanced toggle */}
          <button onClick={() => setFiltersExpanded(!filtersExpanded)}
            style={{
              fontSize: 10, fontWeight: 700,
              background: filtersExpanded ? T.text1 : T.surface,
              color: filtersExpanded ? 'var(--ds-surface, var(--ds-surface, var(--ds-surface, #fff)))' : T.text3,
              border: `1px solid ${T.borderStrong}`,
              padding: '4px 10px', borderRadius: 6, cursor: 'pointer',
            }}>
            {filtersExpanded ? '▲ Less' : '▼ Filters'}
          </button>

          {/* Clear */}
          {hasActiveFilters && (
            <button onClick={clearFilters} style={{
              fontSize: 10, fontWeight: 700, color: T.todo, background: 'none',
              border: 'none', cursor: 'pointer', textDecoration: 'underline',
            }}>
              Clear all
            </button>
          )}

          {/* Count */}
          <span style={{ fontSize: 10, fontWeight: 700, color: T.text4, fontFamily: T.mono }}>
            {filtered.length} / {items.length}
          </span>
        </div>

        {/* Advanced filters row */}
        {filtersExpanded && (
          <div style={{ display: 'flex', gap: 10, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <AdvancedSelect label="Status" value={statusFilter} onChange={setStatusFilter} options={statuses} />
            <AdvancedSelect label="Priority" value={priorityFilter} onChange={setPriorityFilter} options={priorities} />
            <AdvancedSelect label="Assignee" value={assignerFilter} onChange={setAssignerFilter} options={assigners} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: T.text3 }}>From</span>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                style={{
                  fontSize: 10, padding: '3px 6px', borderRadius: 4,
                  border: `1px solid ${T.borderStrong}`, background: T.surface,
                  color: T.text1, fontFamily: T.mono,
                }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: T.text3 }}>To</span>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                style={{
                  fontSize: 10, padding: '3px 6px', borderRadius: 4,
                  border: `1px solid ${T.borderStrong}`, background: T.surface,
                  color: T.text1, fontFamily: T.mono,
                }} />
            </div>
          </div>
        )}
      </div>

      {/* ═══ EVENT STREAM ═══ */}
      <div style={{ flex: 1, overflow: 'auto', padding: '0 16px 16px' }}>
        {filtered.length === 0 && (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: T.text3 }}>No items match filters</p>
            <p style={{ fontSize: 11, color: T.text4 }}>Adjust your filters to see results</p>
          </div>
        )}

        {Object.entries(groups).map(([date, dateItems]) => {
          const dt = new Date(date);
          const dayLabel = isNaN(dt.getTime()) ? date :
            dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
          return (
            <div key={date} style={{ marginTop: 12 }}>
              {/* Date header */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0',
              }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: T.text1, letterSpacing: '0.02em' }}>
                  {dayLabel}
                </span>
                <div style={{ flex: 1, height: 1, background: T.border }} />
                <span style={{ fontSize: 10, fontWeight: 700, color: T.text4 }}>
                  {dateItems.length} item{dateItems.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Items */}
              {dateItems.map((item: any, idx: number) => {
                const cat = getStatusCategory(item.status_category || item.status);
                const isPending = cat !== 'done';
                const statusColor = cat === 'todo' ? T.todo : cat === 'progress' ? T.progress : T.done;
                const hubColor = HUB_COLORS[item.hub || item.source_hub] ?? 'var(--ds-text-subtlest, var(--ds-text-subtlest, #64748B))';
                const hub = item.hub || item.source_hub || 'ProjectHub';
                const baseBg = idx % 2 === 0 ? T.surface : '#FAF8F5';
                const highlightBg = showPendingOnly && isPending ? T.pendingHighlight : baseBg;
                const key = item.item_key || item.key || '—';
                const title = item.title || '';
                const assigner = item.assigner_name || item.assignee_name || '—';
                const status = item.status || '';
                const ageDays = item.age_days ?? 0;
                const parentKey = item.parent_key || item.parent_item_key;
                const parentTitle = item.parent_title || item.parent_summary;

                return (
                  <div key={item.id || idx} onClick={() => onItemClick(item)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '7px 16px', minHeight: 42,
                      background: highlightBg,
                      borderBottom: `1px solid ${T.border}`,
                      borderLeft: `4px solid ${statusColor}`,
                      cursor: 'pointer', transition: 'background .1s',
                      borderRadius: 0,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#EDE7E0'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = highlightBg; }}>

                    {/* Key + Hub badge */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 80, flexShrink: 0 }}>
                      <span style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 700, color: T.text1 }}>
                        {key}
                      </span>
                      <span style={{
                        fontSize: 8, fontWeight: 800, color: 'var(--ds-surface, var(--ds-surface, var(--ds-surface, #fff)))', padding: '1px 5px',
                        borderRadius: 4, background: hubColor, width: 'fit-content',
                        textTransform: 'uppercase' as const,
                      }}>
                        {HUB_SHORT[hub] ?? hub.replace('Hub', '').slice(0, 4).toUpperCase()}
                      </span>
                    </div>

                    {/* Title + Parent */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 12, fontWeight: 600, color: T.text1, lineHeight: 1.3,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const,
                      }}>
                        {title}
                      </div>
                      {parentKey && (
                        <div style={{
                          fontSize: 10, color: T.text4, marginTop: 1,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const,
                        }}>
                          ↳ {parentKey}{parentTitle ? ` · ${parentTitle}` : ''}
                        </div>
                      )}
                    </div>

                    {/* Assigner */}
                    <div style={{ fontSize: 11, fontWeight: 600, color: T.progress, minWidth: 80, flexShrink: 0, textAlign: 'right' }}>
                      {assigner}
                    </div>

                    {/* Status pill — SOLID */}
                    <span style={{
                      fontSize: 9, fontWeight: 700, color: 'var(--ds-surface, var(--ds-surface, var(--ds-surface, #fff)))', padding: '2px 8px',
                      borderRadius: 4, background: statusColor, whiteSpace: 'nowrap' as const,
                      flexShrink: 0,
                    }}>
                      {status.length > 16 ? status.slice(0, 14) + '…' : status}
                    </span>

                    {/* Age */}
                    <span style={{
                      fontFamily: T.mono, fontSize: 10, fontWeight: 800, minWidth: 28, textAlign: 'right',
                      flexShrink: 0,
                      color: ageDays > 14 ? T.todo : ageDays > 7 ? '#CA8A04' : T.text4,
                    }}>
                      {ageDays}d
                    </span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ChronologyView;

/* ─── Filter Sub-Components ─── */

function FilterPill({ label, active, onClick, dotColor }: {
  label: string; active: boolean; onClick: () => void; dotColor?: string;
}) {
  return (
    <button onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 4,
      cursor: 'pointer', transition: 'all .12s',
      background: active ? 'var(--cp-blue)' : T.surface,
      color: active ? 'var(--ds-surface, var(--ds-surface, var(--ds-surface, #fff)))' : T.text3,
      border: active ? 'none' : `1px solid ${T.borderStrong}`,
    }}>
      {dotColor && <span style={{ width: 6, height: 6, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />}
      {label}
    </button>
  );
}

function AdvancedSelect({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: string[];
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: T.text3 }}>{label}</span>
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{
          fontSize: 10, fontWeight: 600, padding: '3px 6px',
          borderRadius: 4, border: `1px solid ${T.borderStrong}`,
          background: T.surface, color: T.text1, cursor: 'pointer',
        }}>
        <option value="all">All</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}
