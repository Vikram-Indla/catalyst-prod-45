import React, { useState, useMemo } from 'react';
import type { Resource360Item } from '@/types/resource360';
import { getStatusCategory, getStaleIndicator, WH_HUB_COLORS, WH_HUB_SHORT } from '@/types/resource360';
import { HighlightText, InlineExpansionPanel, ExpandChevron, useExpandedRow, expandAnimationCSS } from './Resource360Shared';

const T = {
  bg: '#F5F0EB', surface: '#FFFFFF', text1: '#0A0A0A', text2: '#1A1A2E',
  text3: '#3D3D56', text4: '#6B6B80', border: '#D9D2C9', borderStrong: '#C5BDB3',
  todo: '#E23636', progress: '#2563EB', done: '#0E8A5F', pendHl: '#FFF3E0',
  mono: "'JetBrains Mono','SF Mono',monospace",
};

interface Props { items: Resource360Item[]; onItemClick: (item: Resource360Item) => void; }

export function Resource360Chronology({ items, onItemClick }: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [hubFilter, setHubFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [assignerFilter, setAssignerFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showPendingOnly, setShowPendingOnly] = useState(false);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const { expandedId, toggleExpand } = useExpandedRow();

  const hubs = useMemo(() => [...new Set(items.map(i => i.hub).filter(Boolean))].sort(), [items]);
  const statuses = useMemo(() => [...new Set(items.map(i => i.status).filter(Boolean))].sort(), [items]);
  const priorities = useMemo(() => [...new Set(items.map(i => i.priority).filter(Boolean))].sort(), [items]);
  const assigners = useMemo(() => [...new Set(items.map(i => i.assigner_name).filter(Boolean))].sort() as string[], [items]);

  const filtered = useMemo(() => {
    let r = [...items];
    if (hubFilter !== 'all') r = r.filter(i => i.hub === hubFilter);
    if (statusFilter !== 'all') r = r.filter(i => i.status === statusFilter);
    if (priorityFilter !== 'all') r = r.filter(i => i.priority === priorityFilter);
    if (assignerFilter !== 'all') r = r.filter(i => i.assigner_name === assignerFilter);
    if (dateFrom) r = r.filter(i => i.assigned_at >= dateFrom);
    if (dateTo) r = r.filter(i => i.assigned_at <= dateTo + 'T23:59:59');
    if (showPendingOnly) r = r.filter(i => getStatusCategory(i.status, i.status_category) !== 'done');
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      r = r.filter(i => i.item_key.toLowerCase().includes(q) || i.title.toLowerCase().includes(q) || (i.parent_key ?? '').toLowerCase().includes(q) || (i.parent_title ?? '').toLowerCase().includes(q));
    }
    return r.sort((a, b) => new Date(b.assigned_at).getTime() - new Date(a.assigned_at).getTime());
  }, [items, hubFilter, statusFilter, priorityFilter, assignerFilter, dateFrom, dateTo, showPendingOnly, searchTerm]);

  const groups = useMemo(() => {
    const g: Record<string, Resource360Item[]> = {};
    filtered.forEach(item => { const d = item.assigned_at?.slice(0, 10) ?? 'Unknown'; if (!g[d]) g[d] = []; g[d].push(item); });
    return g;
  }, [filtered]);

  const pendingCount = items.filter(i => getStatusCategory(i.status, i.status_category) !== 'done').length;
  const hasFilters = hubFilter !== 'all' || statusFilter !== 'all' || priorityFilter !== 'all' || assignerFilter !== 'all' || dateFrom || dateTo || showPendingOnly || searchTerm;
  const clearAll = () => { setHubFilter('all'); setStatusFilter('all'); setPriorityFilter('all'); setAssignerFilter('all'); setDateFrom(''); setDateTo(''); setShowPendingOnly(false); setSearchTerm(''); };

  return (
    <div style={{ fontFamily: 'var(--cp-font-body)' }}>
      {/* FILTER BAR */}
      <div style={{ padding: '8px 16px', borderBottom: `1px solid ${T.border}`, background: T.surface }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search key, title, parent…"
            style={{ width: 200, fontSize: 11, padding: '5px 10px', borderRadius: 6, border: `1px solid ${T.borderStrong}`, background: T.surface, color: T.text1, fontWeight: 500, outline: 'none' }} />
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 600, color: T.text3, cursor: 'pointer' }}>
            <input type="checkbox" checked={showPendingOnly} onChange={e => setShowPendingOnly(e.target.checked)} style={{ accentColor: T.todo, width: 13, height: 13 }} />
            Pending ({pendingCount})
          </label>
          <div style={{ display: 'flex', gap: 3 }}>
            {hubs.slice(0, 5).map(h => (
              <button key={h} onClick={() => setHubFilter(hubFilter === h ? 'all' : h)} style={{
                fontSize: 9, fontWeight: 800, padding: '3px 8px', borderRadius: 4, cursor: 'pointer',
                background: hubFilter === h ? (WH_HUB_COLORS[h] ?? T.text1) : T.surface,
                color: hubFilter === h ? '#fff' : T.text3,
                border: hubFilter === h ? 'none' : `1px solid ${T.border}`,
              }}>{(h ?? '').replace('Hub', '')}</button>
            ))}
          </div>
          <button onClick={() => setFiltersExpanded(!filtersExpanded)} style={{ fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 6, cursor: 'pointer', background: filtersExpanded ? T.text1 : T.surface, color: filtersExpanded ? '#fff' : T.text3, border: `1px solid ${T.borderStrong}` }}>
            {filtersExpanded ? '▲ Less' : '▼ Filters'}
          </button>
          {hasFilters && <button onClick={clearAll} style={{ fontSize: 9, fontWeight: 700, color: T.todo, background: 'transparent', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Clear all</button>}
          <span style={{ marginLeft: 'auto', fontSize: 10, color: T.text4, fontWeight: 600 }}>{filtered.length}/{items.length}</span>
        </div>
        {filtersExpanded && (
          <div style={{ display: 'flex', gap: 10, marginTop: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <Sel label="Status" value={statusFilter} onChange={setStatusFilter} options={statuses} />
            <Sel label="Priority" value={priorityFilter} onChange={setPriorityFilter} options={priorities} />
            <Sel label="Assignee" value={assignerFilter} onChange={setAssignerFilter} options={assigners} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: T.text4, textTransform: 'uppercase' }}>FROM</span>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ fontSize: 10, padding: '3px 6px', borderRadius: 4, border: `1px solid ${T.borderStrong}`, fontFamily: T.mono }} />
              <span style={{ fontSize: 9, fontWeight: 700, color: T.text4, textTransform: 'uppercase' }}>TO</span>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ fontSize: 10, padding: '3px 6px', borderRadius: 4, border: `1px solid ${T.borderStrong}`, fontFamily: T.mono }} />
            </div>
          </div>
        )}
      </div>

      {/* EVENT STREAM — NO TABS */}
      <div style={{ padding: '12px 16px' }}>
        {filtered.length === 0 && <div style={{ padding: 40, textAlign: 'center' }}><p style={{ fontSize: 14, fontWeight: 600, color: T.text3 }}>No items match filters</p></div>}
        {Object.entries(groups).map(([date, dateItems]) => {
          const dt = new Date(date);
          const dayLabel = dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
          const dTodo = dateItems.filter(i => getStatusCategory(i.status, i.status_category) === 'todo').length;
          const dProg = dateItems.filter(i => getStatusCategory(i.status, i.status_category) === 'progress').length;
          const dDone = dateItems.filter(i => getStatusCategory(i.status, i.status_category) === 'done').length;
          const dTotal = dateItems.length;
          return (
            <div key={date} style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: T.text1 }}>{dayLabel}</span>
                <div style={{ flex: 1, height: 1, background: T.border }} />
                {/* Mini status bar */}
                <div style={{ display: 'flex', width: 48, height: 4, borderRadius: 4, overflow: 'hidden', background: T.border }}>
                  <div style={{ width: `${dTotal > 0 ? (dDone / dTotal) * 100 : 0}%`, background: T.done }} />
                  <div style={{ width: `${dTotal > 0 ? (dProg / dTotal) * 100 : 0}%`, background: T.progress }} />
                  <div style={{ width: `${dTotal > 0 ? (dTodo / dTotal) * 100 : 0}%`, background: T.todo }} />
                </div>
                <span style={{ fontSize: 10, color: T.text4 }}>{dTotal} item{dTotal !== 1 ? 's' : ''}</span>
              </div>

              {dateItems.map((item, idx) => {
                const cat = getStatusCategory(item.status, item.status_category);
                const isPending = cat !== 'done';
                const sc = cat === 'todo' ? T.todo : cat === 'progress' ? T.progress : T.done;
                const stale = getStaleIndicator(item.age_days, item.status, item.status_category);
                const bg = showPendingOnly && isPending ? T.pendHl : idx % 2 === 0 ? T.surface : '#FAF8F5';
                const isExpanded = expandedId === item.work_item_id;
                const hc = WH_HUB_COLORS[item.hub] ?? '#64748B';
                const hs = WH_HUB_SHORT[item.hub] ?? item.hub?.slice(0, 4).toUpperCase();

                return (
                  <React.Fragment key={item.work_item_id}>
                    <div onClick={() => onItemClick(item)} style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', minHeight: 42,
                      background: bg, borderBottom: `1px solid ${T.border}`, borderLeft: `4px solid ${sc}`,
                      cursor: 'pointer', transition: 'background .1s',
                    }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#EDE7E0'; }} onMouseLeave={e => { e.currentTarget.style.background = bg; }}>
                      <ExpandChevron expanded={isExpanded} onClick={e => { e.stopPropagation(); toggleExpand(item.work_item_id); }} />
                      {/* Key + Hub */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, minWidth: 64 }}>
                        <span style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 700, color: T.text1 }}>
                          <HighlightText text={item.item_key} query={searchTerm} />
                        </span>
                        <span style={{ fontSize: 8, fontWeight: 800, color: '#fff', padding: '1px 5px', borderRadius: 4, background: hc }}>{hs}</span>
                      </div>
                      {/* Title + parent */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 500, color: T.text1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <HighlightText text={item.title} query={searchTerm} />
                        </div>
                        {item.parent_key && (
                          <div style={{ fontSize: 10, color: T.text4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            ↳ {item.parent_key}{item.parent_title ? ` · ${item.parent_title}` : ''}
                          </div>
                        )}
                      </div>
                      {/* Assigner */}
                      <div style={{ fontSize: 10, color: T.progress, fontWeight: 500, minWidth: 80, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.assigner_name ?? '—'}</div>
                      {/* Status pill — SOLID */}
                      <span style={{ fontSize: 9, fontWeight: 700, color: '#fff', background: sc, padding: '2px 7px', borderRadius: 4, whiteSpace: 'nowrap' }}>
                        {item.status.length > 16 ? item.status.slice(0, 14) + '…' : item.status}
                      </span>
                      {/* Age + stale */}
                      <span style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 700, minWidth: 40, textAlign: 'right', color: item.age_days > 14 ? T.todo : item.age_days > 7 ? '#CA8A04' : T.text4 }}>
                        {item.age_days}d{stale && <span title={stale.label} style={{ fontSize: 10, marginLeft: 2 }}>{stale.icon}</span>}
                      </span>
                    </div>
                    {isExpanded && <InlineExpansionPanel item={item} onOpenDetail={() => onItemClick(item)} />}
                  </React.Fragment>
                );
              })}
            </div>
          );
        })}
      </div>
      <style>{expandAnimationCSS}</style>
    </div>
  );
}

function Sel({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div>
      <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--fg-3)', textTransform: 'uppercase', display: 'block', marginBottom: 2 }}>{label}</span>
      <select value={value} onChange={e => onChange(e.target.value)} style={{ fontSize: 10, fontWeight: 600, padding: '3px 6px', borderRadius: 4, border: '1px solid var(--divider)', background: 'var(--bg-app)', color: 'var(--fg-1)', cursor: 'pointer' }}>
        <option value="all">All</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}
