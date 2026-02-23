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

const COLUMNS: { key: SortKey; label: string; width: string }[] = [
  { key: 'item_key',       label: 'Key',       width: '24px 90px' },  // 24px for chevron
  { key: 'item_type',      label: 'Type',      width: '70px' },
  { key: 'title',          label: 'Title',     width: '1fr' },
  { key: 'hub',            label: 'Hub',       width: '80px' },
  { key: 'status',         label: 'Status',    width: '130px' },
  { key: 'priority',       label: 'Priority',  width: '70px' },
  { key: 'assigner_name',  label: 'Assigner',  width: '110px' },
  { key: 'age_days',       label: 'Age',       width: '60px' },
  { key: 'assigned_at',    label: 'Assigned',  width: '90px' },
];

const gridTemplate = '24px 90px 70px 1fr 80px 130px 70px 110px 60px 90px';

const PRIORITY_ORDER: Record<string, number> = { Highest: 0, High: 1, Medium: 2, Low: 3, Lowest: 4 };
const PRIORITY_COLORS: Record<string, string> = { Highest: '#DC2626', High: '#EF4444', Medium: '#D97706', Low: '#2563EB', Lowest: '#6B7280' };
const PRIORITY_ICONS: Record<string, string> = { Highest: '⬆⬆', High: '⬆', Medium: '➡', Low: '⬇', Lowest: '⬇⬇' };

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
    setCollapsedHubs(prev => {
      const next = new Set(prev);
      if (next.has(hub)) next.delete(hub); else next.add(hub);
      return next;
    });
  };

  const filtered = useMemo(() => {
    let result = [...items];
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(i =>
        i.item_key.toLowerCase().includes(q) ||
        i.title.toLowerCase().includes(q) ||
        (i.parent_key ?? '').toLowerCase().includes(q) ||
        (i.parent_title ?? '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [items, searchTerm]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let av: string | number = ((a as unknown as Record<string, unknown>)[sortKey] as string) ?? '';
      let bv: string | number = ((b as unknown as Record<string, unknown>)[sortKey] as string) ?? '';
      if (sortKey === 'priority') { av = PRIORITY_ORDER[av as string] ?? 5; bv = PRIORITY_ORDER[bv as string] ?? 5; }
      if (sortKey === 'age_days') { av = Number(av); bv = Number(bv); }
      if (typeof av === 'string') { av = av.toLowerCase(); bv = (bv as string).toLowerCase(); }
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  const hubGroups = useMemo(() => {
    const groups: Record<string, Resource360Item[]> = {};
    sorted.forEach(item => {
      const hub = item.hub ?? 'Other';
      if (!groups[hub]) groups[hub] = [];
      groups[hub].push(item);
    });
    return groups;
  }, [sorted]);

  if (items.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#9CA3AF' }}>No items to display</p>
        </div>
      </div>
    );
  }

  const headerLabels = ['', 'Key', 'Type', 'Title', 'Hub', 'Status', 'Priority', 'Assigner', 'Age', 'Assigned'];
  const headerKeys: (SortKey | null)[] = [null, 'item_key', 'item_type', 'title', 'hub', 'status', 'priority', 'assigner_name', 'age_days', 'assigned_at'];

  return (
    <div style={{ overflow: 'auto' }}>
      {/* Search bar */}
      <div style={{ padding: '10px 12px', borderBottom: '1px solid #E5E7EB', background: '#FFFFFF' }}>
        <input
          type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
          placeholder="Search key, title, parent…"
          style={{ width: 220, fontSize: 11, fontWeight: 500, padding: '5px 10px', borderRadius: 5, border: '1px solid #C5BDB3', background: '#FFFFFF', color: '#0A0A0A', outline: 'none' }}
        />
        <span style={{ marginLeft: 12, fontSize: 11, color: '#94A3B8' }}>{filtered.length} / {items.length}</span>
      </div>

      {/* Header row — STICKY */}
      <div
        className="grid items-center"
        style={{
          gridTemplateColumns: gridTemplate,
          height: 32, padding: '0 12px',
          background: '#EDE7E0',
          borderBottom: '1px solid #E5E7EB',
          position: 'sticky', top: 0, zIndex: 10,
        }}
      >
        {headerLabels.map((label, idx) => {
          const key = headerKeys[idx];
          return (
            <div
              key={idx}
              onClick={key ? () => handleSort(key) : undefined}
              className={key ? 'cursor-pointer select-none font-semibold flex items-center gap-1' : ''}
              style={{ color: key && sortKey === key ? '#2563EB' : '#9CA3AF', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.04em' }}
            >
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
            {/* Hub section header */}
            <div onClick={() => toggleHub(hub)} className="flex items-center gap-2 cursor-pointer"
              style={{ padding: '8px 12px', background: '#F3F4F6', borderBottom: '1px solid #E5E7EB', borderLeft: `3px solid ${hubColor}` }}>
              <span style={{ fontSize: 11, color: '#6B7280', transition: 'transform .15s', transform: collapsed ? 'rotate(-90deg)' : 'rotate(0)', display: 'inline-block' }}>▼</span>
              <span className="text-white font-bold" style={{ fontSize: 9, padding: '2px 7px', borderRadius: 4, background: hubColor }}>{hub}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#374151' }}>{hubItems.length} items</span>
            </div>

            {/* Rows */}
            {!collapsed && hubItems.map((item, rowIdx) => {
              const cat = getStatusCategory(item.status, item.status_category);
              const sc = STATUS_COLORS[cat];
              const priColor = PRIORITY_COLORS[item.priority] ?? '#6B7280';
              const priIcon = PRIORITY_ICONS[item.priority] ?? '';
              const stale = getStaleIndicator(item.age_days, item.status, item.status_category);
              const isExpanded = expandedId === item.work_item_id;

              return (
                <React.Fragment key={item.work_item_id}>
                  <div
                    onClick={() => onItemClick(item)}
                    className="grid items-center cursor-pointer transition-colors border-b"
                    style={{
                      gridTemplateColumns: gridTemplate,
                      height: 36, minHeight: 36, maxHeight: 36, overflow: 'hidden',
                      padding: '0 12px', borderColor: '#F0F0F3',
                      background: rowIdx % 2 === 1 ? '#FAFBFC' : 'transparent',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#EFF6FF'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = rowIdx % 2 === 1 ? '#FAFBFC' : 'transparent'; }}
                  >
                    {/* Expand chevron */}
                    <ExpandChevron expanded={isExpanded} onClick={e => { e.stopPropagation(); toggleExpand(item.work_item_id); }} />

                    <span style={{ fontSize: 11, fontWeight: 600, color: '#2563EB', fontFamily: 'monospace' }}>
                      <HighlightText text={item.item_key} query={searchTerm} />
                    </span>
                    <span style={{ fontSize: 10, color: '#6B7280' }}>{item.item_type}</span>
                    <span style={{ fontSize: 11, color: '#374151', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <HighlightText text={item.title} query={searchTerm} />
                    </span>
                    <span style={{ fontSize: 9, fontWeight: 600, color: hubColor }}>{WH_HUB_SHORT[item.hub] ?? item.hub}</span>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 3,
                      fontSize: 9, fontWeight: 600,
                      padding: '2px 7px', borderRadius: 100,
                      background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`,
                      width: 'fit-content', maxWidth: '100%',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      <span style={{ width: 4, height: 4, borderRadius: '50%', background: sc.dot, display: 'inline-block', flexShrink: 0 }} />
                      {item.status.length > 16 ? item.status.slice(0, 14) + '…' : item.status}
                    </span>
                    <span style={{ fontSize: 10, color: priColor }}>{priIcon} {item.priority}</span>
                    <span style={{ fontSize: 10, color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.assigner_name ?? '—'}</span>
                    <span style={{ fontSize: 10, fontWeight: 600, color: item.age_days > 30 ? '#EF4444' : '#6B7280', display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                      {item.age_days}d
                      {stale && <span title={stale.label} style={{ fontSize: 10 }}>{stale.icon}</span>}
                    </span>
                    <span style={{ fontSize: 10, color: '#9CA3AF' }}>{item.assigned_at?.slice(0, 10)}</span>
                  </div>

                  {/* Expanded panel */}
                  {isExpanded && (
                    <InlineExpansionPanel item={item} onOpenDetail={() => onItemClick(item)} />
                  )}
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
