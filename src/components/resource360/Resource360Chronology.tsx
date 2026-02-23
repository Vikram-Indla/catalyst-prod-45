import React, { useState, useMemo } from 'react';
import type { Resource360Item } from '@/types/resource360';
import { getStatusCategory, getStaleIndicator, STATUS_COLORS, WH_HUB_COLORS, WH_HUB_SHORT } from '@/types/resource360';
import { HighlightText, InlineExpansionPanel, ExpandChevron, useExpandedRow, expandAnimationCSS } from './Resource360Shared';

interface Props {
  items: Resource360Item[];
  onItemClick: (item: Resource360Item) => void;
}

export function Resource360Chronology({ items, onItemClick }: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const { expandedId, toggleExpand } = useExpandedRow();

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
    return result.sort((a, b) => new Date(b.assigned_at).getTime() - new Date(a.assigned_at).getTime());
  }, [items, searchTerm]);

  const groups: Record<string, Resource360Item[]> = {};
  filtered.forEach(item => {
    const d = item.assigned_at?.slice(0, 10) ?? 'Unknown';
    if (!groups[d]) groups[d] = [];
    groups[d].push(item);
  });

  return (
    <div style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Search + count */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: '1px solid #E5E7EB' }}>
        <input
          type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
          placeholder="Search key, title, parent…"
          style={{ width: 220, fontSize: 11, fontWeight: 500, padding: '5px 10px', borderRadius: 5, border: '1px solid #C5BDB3', background: '#FFFFFF', color: '#0A0A0A', outline: 'none' }}
        />
        <span style={{ marginLeft: 'auto', fontSize: 11, color: '#94A3B8', fontWeight: 500 }}>
          {filtered.length} / {items.length} items
        </span>
      </div>

      <div style={{ padding: '12px 0' }}>
        {filtered.length === 0 && (
          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#334155' }}>No items match</p>
            <p style={{ fontSize: 12, color: '#94A3B8' }}>Try a different search term</p>
          </div>
        )}

        <div style={{ padding: '0 16px' }}>
          {Object.entries(groups).map(([date, dateItems]) => {
            const dt = new Date(date);
            const dayLabel = dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
            return (
              <div key={date} style={{ marginBottom: 16 }}>
                {/* Date header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#334155', letterSpacing: '0.02em' }}>{dayLabel}</span>
                  <div style={{ flex: 1, height: 1, background: '#E5E7EB' }} />
                  <span style={{ fontSize: 10, color: '#94A3B8', fontWeight: 500 }}>{dateItems.length} item{dateItems.length !== 1 ? 's' : ''}</span>
                </div>

                {/* Cards */}
                {dateItems.map(item => {
                  const cat = getStatusCategory(item.status, item.status_category);
                  const sc = STATUS_COLORS[cat];
                  const hubColor = WH_HUB_COLORS[item.hub] ?? '#64748B';
                  const hubShort = WH_HUB_SHORT[item.hub] ?? item.hub?.slice(0, 4).toUpperCase();
                  const stale = getStaleIndicator(item.age_days, item.status, item.status_category);
                  const isExpanded = expandedId === item.work_item_id;

                  return (
                    <React.Fragment key={item.work_item_id}>
                      <div
                        onClick={() => onItemClick(item)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '8px 12px', marginBottom: isExpanded ? 0 : 4,
                          background: '#fff', borderRadius: isExpanded ? '8px 8px 0 0' : 8,
                          border: '1px solid #F0F0F3',
                          cursor: 'pointer', transition: 'all .12s',
                          borderLeft: `3px solid ${sc.dot}`,
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#F9FAFB'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = '#fff'; }}
                      >
                        <ExpandChevron expanded={isExpanded} onClick={e => { e.stopPropagation(); toggleExpand(item.work_item_id); }} />

                        {/* Key + Hub */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, minWidth: 64 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#334155', fontFamily: "'JetBrains Mono', monospace" }}>
                            <HighlightText text={item.item_key} query={searchTerm} />
                          </span>
                          <span style={{ fontSize: 8, fontWeight: 700, color: hubColor, background: `${hubColor}14`, padding: '1px 5px', borderRadius: 3, letterSpacing: '0.04em' }}>
                            {hubShort}
                          </span>
                        </div>

                        {/* Title + Parent */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 500, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            <HighlightText text={item.title} query={searchTerm} />
                          </div>
                          {item.parent_key && (
                            <div style={{ fontSize: 10, color: '#94A3B8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              ↳ <HighlightText text={`${item.parent_key}${item.parent_title ? ` · ${item.parent_title}` : ''}`} query={searchTerm} />
                            </div>
                          )}
                        </div>

                        {/* Assigner */}
                        <div style={{ fontSize: 10, color: '#2563EB', fontWeight: 500, minWidth: 80, textAlign: 'right', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.assigner_name ?? '—'}
                        </div>

                        {/* Status pill */}
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 3,
                          fontSize: 9, fontWeight: 600, color: sc.text, background: sc.bg,
                          padding: '2px 7px', borderRadius: 4, whiteSpace: 'nowrap',
                        }}>
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: sc.dot }} />
                          {item.status.length > 16 ? item.status.slice(0, 14) + '…' : item.status}
                        </span>

                        {/* Age + Stale badge */}
                        <span style={{ fontSize: 10, fontWeight: 600, minWidth: 28, textAlign: 'right', color: item.age_days > 14 ? '#EF4444' : '#6B7280', display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                          {item.age_days}d
                          {stale && <span title={stale.label} style={{ fontSize: 10 }}>{stale.icon}</span>}
                        </span>
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
        </div>
      </div>
      <style>{expandAnimationCSS}</style>
    </div>
  );
}
