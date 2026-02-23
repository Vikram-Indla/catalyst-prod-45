import React, { useState, useMemo } from 'react';
import type { Resource360Item } from '@/types/resource360';
import { getStatusCategory, STATUS_COLORS, WH_HUB_COLORS, WH_HUB_SHORT } from '@/types/resource360';

interface Props {
  items: Resource360Item[];
  onItemClick: (item: Resource360Item) => void;
}

type SortKey = 'item_key' | 'item_type' | 'title' | 'hub' | 'status' | 'priority' | 'assigner_name' | 'age_days' | 'assigned_at';
type SortDir = 'asc' | 'desc';

const COLUMNS: { key: SortKey; label: string; width: string }[] = [
  { key: 'item_key',       label: 'Key',       width: '90px' },
  { key: 'item_type',      label: 'Type',      width: '70px' },
  { key: 'title',          label: 'Title',     width: '1fr' },
  { key: 'hub',            label: 'Hub',       width: '80px' },
  { key: 'status',         label: 'Status',    width: '100px' },
  { key: 'priority',       label: 'Priority',  width: '70px' },
  { key: 'assigner_name',  label: 'Assigner',  width: '110px' },
  { key: 'age_days',       label: 'Age',       width: '50px' },
  { key: 'assigned_at',    label: 'Assigned',  width: '90px' },
];

const PRIORITY_ORDER: Record<string, number> = {
  Highest: 0, High: 1, Medium: 2, Low: 3, Lowest: 4,
};

const PRIORITY_COLORS: Record<string, string> = {
  Highest: '#DC2626', High: '#EF4444', Medium: '#D97706', Low: '#2563EB', Lowest: '#6B7280',
};

const PRIORITY_ICONS: Record<string, string> = {
  Highest: '⬆⬆', High: '⬆', Medium: '➡', Low: '⬇', Lowest: '⬇⬇',
};

/**
 * 9-column sortable list view, grouped by hub.
 * 36px row height per CATALYST10 spec.
 */
export function Resource360List({ items, onItemClick }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('hub');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [collapsedHubs, setCollapsedHubs] = useState<Set<string>>(new Set());

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const toggleHub = (hub: string) => {
    setCollapsedHubs((prev) => {
      const next = new Set(prev);
      if (next.has(hub)) next.delete(hub);
      else next.add(hub);
      return next;
    });
  };

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => {
      let av: string | number = ((a as unknown as Record<string, unknown>)[sortKey] as string) ?? '';
      let bv: string | number = ((b as unknown as Record<string, unknown>)[sortKey] as string) ?? '';
      if (sortKey === 'priority') {
        av = PRIORITY_ORDER[av as string] ?? 5;
        bv = PRIORITY_ORDER[bv as string] ?? 5;
      }
      if (sortKey === 'age_days') {
        av = Number(av);
        bv = Number(bv);
      }
      if (typeof av === 'string') {
        av = av.toLowerCase();
        bv = (bv as string).toLowerCase();
      }
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [items, sortKey, sortDir]);

  const hubGroups = useMemo(() => {
    const groups: Record<string, Resource360Item[]> = {};
    sorted.forEach((item) => {
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

  const gridTemplate = COLUMNS.map((c) => c.width).join(' ');

  return (
    <div style={{ overflow: 'auto' }}>
      {/* Header row */}
      <div
        className="grid items-center sticky top-0 z-10"
        style={{
          gridTemplateColumns: gridTemplate,
          height: 32,
          padding: '0 12px',
          background: '#F9FAFB',
          borderBottom: '1px solid #E5E7EB',
        }}
      >
        {COLUMNS.map((col) => (
          <div
            key={col.key}
            onClick={() => handleSort(col.key)}
            className="cursor-pointer select-none font-semibold flex items-center gap-1"
            style={{ color: sortKey === col.key ? '#2563EB' : '#9CA3AF', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.04em' }}
          >
            {col.label}
            {sortKey === col.key && (
              <span style={{ fontSize: 8 }}>{sortDir === 'asc' ? '▲' : '▼'}</span>
            )}
          </div>
        ))}
      </div>

      {/* Hub groups */}
      {Object.entries(hubGroups).map(([hub, hubItems]) => {
        const hubColor = WH_HUB_COLORS[hub] ?? '#64748B';
        const collapsed = collapsedHubs.has(hub);

        return (
          <div key={hub}>
            {/* Hub section header */}
            <div
              onClick={() => toggleHub(hub)}
              className="flex items-center gap-2 cursor-pointer"
              style={{
                padding: '6px 12px',
                background: '#F9FAFB',
                borderBottom: '1px solid #F0F0F3',
              }}
            >
              <span style={{ fontSize: 10, color: '#9CA3AF', transform: collapsed ? 'rotate(-90deg)' : 'none', transition: 'transform 150ms' }}>
                ▼
              </span>
              <span style={{ fontSize: 11, fontWeight: 700, color: hubColor }}>
                {hub}
              </span>
              <span style={{ fontSize: 10, color: '#9CA3AF' }}>
                {hubItems.length} items
              </span>
            </div>

            {/* Rows */}
            {!collapsed && hubItems.map((item) => {
              const cat = getStatusCategory(item.status);
              const sc = STATUS_COLORS[cat];
              const priColor = PRIORITY_COLORS[item.priority] ?? '#6B7280';
              const priIcon = PRIORITY_ICONS[item.priority] ?? '';

              return (
                <div
                  key={item.work_item_id}
                  onClick={() => onItemClick(item)}
                  className="grid items-center cursor-pointer transition-colors border-b"
                  style={{
                    gridTemplateColumns: gridTemplate,
                    height: 36,
                    padding: '0 12px',
                    borderColor: '#F7F7F8',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#F9FAFB'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#2563EB', fontFamily: 'monospace' }}>
                    {item.item_key}
                  </span>
                  <span style={{ fontSize: 10, color: '#6B7280' }}>
                    {item.item_type}
                  </span>
                  <span style={{ fontSize: 11, color: '#374151', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.title}
                  </span>
                  <span style={{ fontSize: 9, fontWeight: 600, color: hubColor }}>
                    {WH_HUB_SHORT[item.hub] ?? item.hub}
                  </span>
                  <span style={{ fontSize: 10, color: sc.text, display: 'flex', alignItems: 'center', gap: 3 }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: sc.dot }} />
                    {item.status}
                  </span>
                  <span style={{ fontSize: 10, color: priColor }}>
                    {priIcon} {item.priority}
                  </span>
                  <span style={{ fontSize: 10, color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.assigner_name ?? '—'}
                  </span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: item.age_days > 30 ? '#EF4444' : '#6B7280' }}>
                    {item.age_days}d
                  </span>
                  <span style={{ fontSize: 10, color: '#9CA3AF' }}>
                    {item.assigned_at?.slice(0, 10)}
                  </span>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
