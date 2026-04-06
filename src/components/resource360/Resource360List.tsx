import React, { useState, useMemo } from 'react';
import type { Resource360Item } from '@/types/resource360';
import { getStatusCategory, getStaleIndicator, STATUS_COLORS, WH_HUB_COLORS, WH_HUB_SHORT } from '@/types/resource360';
import { HighlightText, InlineExpansionPanel, ExpandChevron, useExpandedRow, expandAnimationCSS } from './Resource360Shared';

interface Props {
  items: Resource360Item[];
  onItemClick: (item: Resource360Item) => void;
}

type SortKey = 'item_key' | 'item_type' | 'title' | 'hub' | 'status' | 'priority' | 'assigner_name' | 'age_days' | 'assigned_at';
type SortDir = 'asc' | 'desc';

const gridTemplate = '24px 90px 70px 1fr 80px 130px 70px 110px 60px 90px';
const PRIORITY_ORDER: Record<string, number> = { Highest: 0, Critical: 0, High: 1, Medium: 2, Low: 3, Lowest: 4 };
const PRIORITY_COLORS: Record<string, string> = { Highest: '#DC2626', Critical: '#DC2626', High: '#EF4444', Medium: '#D97706', Low: '#2563EB', Lowest: '#6B7280' };
const PRIORITY_ICONS: Record<string, string> = { Highest: '⬆⬆', Critical: '⬆⬆', High: '⬆', Medium: '➡', Low: '⬇', Lowest: '⬇⬇' };

export function Resource360List({ items, onItemClick }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('hub');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [collapsedHubs, setCollapsedHubs] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const { expandedId, toggleExpand } = useExpandedRow();

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const toggleHub = (hub: string) => {
    setCollapsedHubs(prev => { const n = new Set(prev); if (n.has(hub)) n.delete(hub); else n.add(hub); return n; });
  };

  const filtered = useMemo(() => {
    let result = [...items];
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(i =>
        i.item_key.toLowerCase().includes(q) || i.title.toLowerCase().includes(q) ||
        (i.parent_key ?? '').toLowerCase().includes(q) || (i.parent_title ?? '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [items, searchTerm]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let av: string | number = ((a as any)[sortKey]) ?? '';
      let bv: string | number = ((b as any)[sortKey]) ?? '';
      if (sortKey === 'priority') { av = PRIORITY_ORDER[av as string] ?? 5; bv = PRIORITY_ORDER[bv as string] ?? 5; }
      if (sortKey === 'age_days') { av = Number(av); bv = Number(bv); }
      if (typeof av === 'string') { av = av.toLowerCase(); bv = (bv as string).toLowerCase(); }
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  const hubGroups = useMemo(() => {
    const g: Record<string, Resource360Item[]> = {};
    sorted.forEach(item => { const hub = item.hub ?? 'Other'; if (!g[hub]) g[hub] = []; g[hub].push(item); });
    return g;
  }, [sorted]);

  if (items.length === 0) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}><p style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg-4)' }}>No items to display</p></div>;
  }

  const headerLabels = ['', 'Key', 'Type', 'Title', 'Hub', 'Status', 'Priority', 'Assigner', 'Age', 'Assigned'];
  const headerKeys: (SortKey | null)[] = [null, 'item_key', 'item_type', 'title', 'hub', 'status', 'priority', 'assigner_name', 'age_days', 'assigned_at'];

  return (
    <div style={{ overflow: 'auto', fontFamily: "'Inter', sans-serif" }}>
      {/* Search */}
      <div style={{ padding: '10px 12px', borderBottom: '1px solid #D9D2C9', background: 'var(--bg-app)' }}>
        <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search key, title, parent…"
          style={{ width: 220, fontSize: 11, fontWeight: 500, padding: '5px 10px', borderRadius: 6, border: '1px solid var(--divider)', background: 'var(--bg-app)', color: 'var(--fg-1)', outline: 'none' }} />
        <span style={{ marginLeft: 12, fontSize: 11, color: 'var(--fg-3)' }}>{filtered.length} / {items.length}</span>
      </div>

      {/* Header — STICKY */}
      <div style={{
        display: 'grid', gridTemplateColumns: gridTemplate, alignItems: 'center',
        height: 50, padding: '8px 12px', background: '#EDE7E0',
        borderBottom: '1px solid #D9D2C9', position: 'sticky', top: 0, zIndex: 10,
      }}>
        {headerLabels.map((label, idx) => {
          const key = headerKeys[idx];
          return (
            <div key={idx} onClick={key ? () => handleSort(key) : undefined}
              style={{ color: key && sortKey === key ? 'var(--cp-blue)' : 'var(--fg-3)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', cursor: key ? 'pointer' : 'default', userSelect: 'none', display: 'flex', alignItems: 'center', gap: 2 }}>
              {label}
              {key && sortKey === key && <span style={{ fontSize: 8 }}>{sortDir === 'asc' ? '▲' : '▼'}</span>}
            </div>
          );
        })}
      </div>

      {/* Hub groups */}
      {Object.entries(hubGroups).map(([hub, hubItems]) => {
        const hubColor = WH_HUB_COLORS[hub] ?? '#64748B';
        const collapsed = collapsedHubs.has(hub);
        return (
          <div key={hub}>
            <div onClick={() => toggleHub(hub)} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', cursor: 'pointer',
              background: '#F3F4F6', borderBottom: '1px solid #D9D2C9', borderLeft: `3px solid ${hubColor}`,
            }}>
              <span style={{ fontSize: 11, color: 'var(--fg-3)', transition: 'transform .15s', transform: collapsed ? 'rotate(-90deg)' : 'rotate(0)', display: 'inline-block' }}>▼</span>
              <span style={{ fontSize: 9, fontWeight: 800, color: '#fff', padding: '2px 7px', borderRadius: 4, background: hubColor }}>{hub}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-2)' }}>{hubItems.length} items</span>
            </div>

            {!collapsed && hubItems.map((item, rowIdx) => {
              const cat = getStatusCategory(item.status, item.status_category);
              const sc = STATUS_COLORS[cat];
              const priColor = PRIORITY_COLORS[item.priority] ?? '#6B7280';
              const priIcon = PRIORITY_ICONS[item.priority] ?? '';
              const stale = getStaleIndicator(item.age_days, item.status, item.status_category);
              const isExpanded = expandedId === item.work_item_id;

              return (
                <React.Fragment key={item.work_item_id}>
                  <div onClick={() => onItemClick(item)}
                    style={{
                      display: 'grid', gridTemplateColumns: gridTemplate, alignItems: 'center',
                      height: 50, padding: '8px 12px', borderBottom: '1px solid #F0F0F3',
                      background: rowIdx % 2 === 1 ? '#FAFBFC' : 'transparent', cursor: 'pointer',
                      borderLeft: `3px solid ${sc.dot}`, transition: 'background .1s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--tint-blue, #EFF6FF)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = rowIdx % 2 === 1 ? '#FAFBFC' : 'transparent'; }}>
                    <ExpandChevron expanded={isExpanded} onClick={e => { e.stopPropagation(); toggleExpand(item.work_item_id); }} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--cp-blue)', fontFamily: "'JetBrains Mono', monospace" }}><HighlightText text={item.item_key} query={searchTerm} /></span>
                    <span style={{ fontSize: 10, color: 'var(--fg-3)' }}>{item.item_type}</span>
                    <span style={{ fontSize: 11, color: 'var(--fg-2)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><HighlightText text={item.title} query={searchTerm} /></span>
                    <span style={{ fontSize: 9, fontWeight: 600, color: hubColor }}>{WH_HUB_SHORT[item.hub] ?? item.hub}</span>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 9, fontWeight: 600,
                      padding: '2px 7px', borderRadius: 100, background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`,
                      width: 'fit-content', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      <span style={{ width: 4, height: 4, borderRadius: '50%', background: sc.dot, flexShrink: 0 }} />
                      {item.status.length > 16 ? item.status.slice(0, 14) + '…' : item.status}
                    </span>
                    <span style={{ fontSize: 10, color: priColor }}>{priIcon} {item.priority}</span>
                    <span style={{ fontSize: 10, color: 'var(--fg-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.assigner_name ?? '—'}</span>
                    <span style={{ fontSize: 10, fontWeight: 600, color: item.age_days > 14 ? 'var(--sem-danger)' : 'var(--fg-3)', display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                      {item.age_days}d
                      {stale && <span title={stale.label} style={{ fontSize: 10 }}>{stale.icon}</span>}
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--fg-4)' }}>{item.assigned_at?.slice(0, 10)}</span>
                  </div>
                  {isExpanded && <InlineExpansionPanel item={item} onOpenDetail={() => onItemClick(item)} />}
                </React.Fragment>
              );
            })}
          </div>
        );
      })}
      <style>{expandAnimationCSS}</style>
    </div>
  );
}
