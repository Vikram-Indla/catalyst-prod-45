/**
 * WorkListPanel — Left panel: search + filter + scrollable card list
 * Jira-parity split view left column
 */
import React, { useMemo, useState } from 'react';
import { Search, Filter, ArrowUpDown, RotateCw } from 'lucide-react';
import { WorkItemTypeIcon } from '@/components/icons/WorkItemTypeIcon';
import type { WorkItem } from '@/types/workItem.types';

const V = {
  textPrimary: '#172B4D',
  textMuted: '#6B778C',
  border: '#DFE1E6',
  surface: '#FFFFFF',
  selectedBg: '#E9F2FF',
  selectedBorder: '#85B8FF',
  hoverBg: '#F7F8F9',
  keyColor: '#6B778C',
  avatarPurple: '#6554C0',
};

interface Props {
  items: WorkItem[];
  selectedKey: string | null;
  onSelect: (id: string) => void;
}

export function WorkListPanel({ items, selectedKey, onSelect }: Props) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(i =>
      (i.jiraKey + ' ' + i.summary).toLowerCase().includes(q)
    );
  }, [items, query]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      {/* Top bar: Ask AI + Search + Filter */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 10,
        padding: 10, borderBottom: `1px solid ${V.border}`, background: V.surface,
      }}>
        <button style={{
          height: 34, padding: '0 12px', border: `1px solid ${V.border}`,
          background: V.surface, borderRadius: 8, fontWeight: 600, cursor: 'pointer',
          fontSize: 13, fontFamily: 'Inter, sans-serif', color: '#7C3AED',
        }}>
          Ask AI
        </button>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          border: `1px solid ${V.border}`, borderRadius: 8, padding: '0 10px', height: 34,
        }}>
          <Search size={14} style={{ opacity: 0.65, flexShrink: 0 }} />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search…"
            style={{
              border: 'none', outline: 'none', width: '100%', fontSize: 14,
              fontFamily: 'Inter, sans-serif', background: 'transparent',
            }}
          />
        </div>

        <button style={{
          height: 34, padding: '0 12px', border: `1px solid ${V.border}`,
          background: V.surface, borderRadius: 8, cursor: 'pointer',
          fontSize: 13, fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', gap: 4,
        }}>
          <Filter size={13} /> Filter
        </button>
      </div>

      {/* List header: sort label + actions */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 12px', borderBottom: `1px solid ${V.border}`, background: V.surface,
      }}>
        <span style={{ fontWeight: 600, color: V.textPrimary, fontSize: 13, fontFamily: 'Inter, sans-serif', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          Created <span style={{ opacity: 0.65, fontSize: 11 }}>▾</span>
        </span>
        <div style={{ display: 'inline-flex', gap: 6 }}>
          <ListIconBtn><ArrowUpDown size={14} /></ListIconBtn>
          <ListIconBtn><RotateCw size={14} /></ListIconBtn>
        </div>
      </div>

      {/* Scrollable card list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 10, minHeight: 0, background: V.surface }}>
        {filtered.map(item => {
          const selected = item.id === selectedKey;
          const rtl = /[\u0600-\u06FF]/.test(item.summary);
          return (
            <button
              key={item.id}
              onClick={() => onSelect(item.id)}
              style={{
                width: '100%', textAlign: 'left',
                border: `1px solid ${selected ? V.selectedBorder : V.border}`,
                background: selected ? V.selectedBg : V.surface,
                borderRadius: 10, padding: 12, marginBottom: 10, cursor: 'pointer',
                display: 'block',
                transition: 'background 100ms',
              }}
              onMouseEnter={e => { if (!selected) e.currentTarget.style.background = V.hoverBg; }}
              onMouseLeave={e => { if (!selected) e.currentTarget.style.background = V.surface; }}
            >
              <div
                dir={rtl ? 'rtl' : 'ltr'}
                style={{
                  fontWeight: 700, color: V.textPrimary, marginBottom: 8, lineHeight: 1.25,
                  fontSize: 14, fontFamily: 'Inter, sans-serif',
                  overflow: 'hidden', textOverflow: 'ellipsis',
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                }}
              >
                {item.summary || '(No title)'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: V.keyColor, display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: "'JetBrains Mono', monospace" }}>
                  <WorkItemTypeIcon type={item.type} size={14} />
                  {item.jiraKey}
                </span>
                <div style={{
                  width: 28, height: 28, borderRadius: 999,
                  background: item.assignee?.color || V.avatarPurple,
                  color: '#FFFFFF', display: 'grid', placeItems: 'center',
                  fontWeight: 800, fontSize: 12, flexShrink: 0,
                }}>
                  {item.assignee?.initials || 'NA'}
                </div>
              </div>
            </button>
          );
        })}

        {/* Footer count */}
        <div style={{ marginTop: 10, padding: 10, color: V.textMuted, fontSize: 12, textAlign: 'center', fontFamily: 'Inter, sans-serif' }}>
          {filtered.length} of {items.length}+
        </div>
      </div>
    </div>
  );
}

function ListIconBtn({ children }: { children: React.ReactNode }) {
  return (
    <button
      style={{
        border: '1px solid transparent', background: 'transparent', cursor: 'pointer',
        padding: '6px 8px', borderRadius: 8, color: '#6B778C', display: 'flex', alignItems: 'center',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = '#F4F5F7'; e.currentTarget.style.borderColor = '#DFE1E6'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; }}
    >
      {children}
    </button>
  );
}
