import React, { useMemo, useState } from 'react';
import type { Resource360Item } from '@/types/resource360';
import { getStatusCategory, getStaleIndicator, WH_HUB_COLORS, WH_HUB_SHORT } from '@/types/resource360';
import { HighlightText } from './Resource360Shared';

const T = {
  bg: '#F5F0EB', surface: '#FFFFFF', text1: '#0A0A0A', text2: '#1A1A2E',
  text3: '#3D3D56', text4: '#6B6B80', border: '#D9D2C9',
  todo: '#E23636', progress: '#2563EB', done: '#0E8A5F',
  shadow: '0 2px 8px rgba(0,0,0,.12)',
  mono: "'JetBrains Mono', 'SF Mono', monospace",
};

interface Props {
  items: Resource360Item[];
  onItemClick: (item: Resource360Item) => void;
}

export function Resource360Board({ items, onItemClick }: Props) {
  const [searchTerm, setSearchTerm] = useState('');

  const columns = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const filtered = q
      ? items.filter(i => i.item_key.toLowerCase().includes(q) || i.title.toLowerCase().includes(q) || (i.parent_key ?? '').toLowerCase().includes(q))
      : items;
    return {
      todo: filtered.filter(i => getStatusCategory(i.status, i.status_category) === 'todo').sort((a, b) => b.age_days - a.age_days),
      progress: filtered.filter(i => getStatusCategory(i.status, i.status_category) === 'progress').sort((a, b) => b.age_days - a.age_days),
      done: filtered.filter(i => getStatusCategory(i.status, i.status_category) === 'done').sort((a, b) => new Date(b.assigned_at).getTime() - new Date(a.assigned_at).getTime()),
    };
  }, [items, searchTerm]);

  const colConfig = [
    { key: 'todo' as const, label: 'TO DO', color: T.todo, items: columns.todo },
    { key: 'progress' as const, label: 'IN PROGRESS', color: T.progress, items: columns.progress },
    { key: 'done' as const, label: 'DONE', color: T.done, items: columns.done },
  ];

  return (
    <div style={{ fontFamily: 'var(--cp-font-body)', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Search bar */}
      <div style={{ padding: '10px 16px', borderBottom: `1px solid ${T.border}`, background: T.surface }}>
        <input
          type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
          placeholder="Search key, title, or parent…"
          style={{ width: 220, fontSize: 11, padding: '5px 10px', borderRadius: 6, border: `1px solid ${T.border}`, background: T.surface, color: T.text1, outline: 'none' }}
        />
      </div>

      {/* Board columns */}
      <div style={{ flex: 1, display: 'flex', gap: 12, padding: 12, overflow: 'hidden' }}>
        {colConfig.map(col => (
          <div key={col.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            {/* Column header */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 10px', marginBottom: 8,
              borderBottom: `3px solid ${col.color}`,
            }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: col.color, flexShrink: 0 }} />
              <span style={{ fontSize: 11, fontWeight: 800, color: T.text1, letterSpacing: '0.06em' }}>{col.label}</span>
              <span style={{
                fontSize: 10, fontWeight: 800, color: '#fff', marginLeft: 'auto',
                background: col.color, borderRadius: 12, padding: '1px 7px',
              }}>{col.items.length}</span>
            </div>

            {/* Cards */}
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: 4 }}>
              {col.items.map(item => {
                const hubColor = WH_HUB_COLORS[item.hub] ?? '#64748B';
                const hubShort = WH_HUB_SHORT[item.hub] ?? item.hub?.slice(0, 4).toUpperCase();
                const stale = getStaleIndicator(item.age_days, item.status, item.status_category);

                return (
                  <div key={item.work_item_id} onClick={() => onItemClick(item)}
                    style={{
                      background: T.surface, borderRadius: 8, padding: '8px 10px',
                      marginBottom: 6, cursor: 'pointer',
                      border: `1px solid ${stale ? T.todo : T.border}`,
                      borderLeft: `4px solid ${col.color}`,
                      boxShadow: T.shadow, transition: 'all .12s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,.15)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow = T.shadow; e.currentTarget.style.transform = 'none'; }}
                  >
                    {/* Row 1: Key + Hub + Stale + Age */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                      <span style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 700, color: T.text1 }}>
                        <HighlightText text={item.item_key} query={searchTerm} />
                      </span>
                      <span style={{ fontSize: 8, fontWeight: 800, color: '#fff', padding: '1px 5px', borderRadius: 4, background: hubColor }}>{hubShort}</span>
                      {stale && <span title={stale.label} style={{ fontSize: 10 }}>{stale.icon}</span>}
                      <span style={{ fontFamily: T.mono, fontSize: 9, fontWeight: 700, color: item.age_days > 14 ? T.todo : T.text4, marginLeft: 'auto' }}>{item.age_days}d</span>
                    </div>

                    {/* Row 2: Title */}
                    <div style={{
                      fontSize: 11, fontWeight: 600, color: T.text2, lineHeight: 1.3, marginBottom: 4,
                      overflow: 'hidden', textOverflow: 'ellipsis',
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any,
                    }}>
                      <HighlightText text={item.title} query={searchTerm} />
                    </div>

                    {/* Row 3: Priority + Assigner */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      {item.priority && (
                        <span style={{ fontSize: 9, color: T.text3 }}>
                          {item.priority === 'Critical' || item.priority === 'Highest' ? '⬆⬆' : item.priority === 'High' ? '⬆' : item.priority === 'Medium' ? '➡' : '⬇'} {item.priority}
                        </span>
                      )}
                      <span style={{ fontSize: 9, color: T.text4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 80 }}>
                        {item.assigner_name ?? ''}
                      </span>
                    </div>
                  </div>
                );
              })}

              {col.items.length === 0 && (
                <div style={{ padding: 20, textAlign: 'center', fontSize: 11, color: T.text4 }}>No items</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
