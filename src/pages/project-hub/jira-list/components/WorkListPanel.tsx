/**
 * WorkListPanel — Jira-parity left panel: search + filter + scrollable card list
 * Matches Jira's actual split view left column styling exactly.
 */
import React, { useMemo, useState } from 'react';
import { Search, Filter, ArrowUpDown, RotateCw } from 'lucide-react';
import { WorkItemTypeIcon } from '@/components/icons/WorkItemTypeIcon';
import type { WorkItem } from '@/types/workItem.types';

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
      {/* Top bar: Ask AI | Search work | Avatars | Filter */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 12px', borderBottom: '1px solid #DFE1E6', background: '#FFFFFF',
        flexWrap: 'nowrap',
      }}>
        <button style={{
          height: 32, padding: '0 10px', border: '1px solid #DFE1E6',
          background: '#FFFFFF', borderRadius: 6, cursor: 'pointer',
          fontSize: 13, fontWeight: 600, fontFamily: 'Inter, sans-serif',
          color: '#7C3AED', display: 'inline-flex', alignItems: 'center', gap: 4,
          flexShrink: 0, whiteSpace: 'nowrap',
        }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="#7C3AED"><circle cx="4" cy="4" r="1.5"/><circle cx="8" cy="4" r="1.5"/><circle cx="12" cy="4" r="1.5"/><circle cx="4" cy="8" r="1.5"/><circle cx="8" cy="8" r="1.5"/></svg>
          Ask AI
        </button>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0,
          border: '1px solid #DFE1E6', borderRadius: 6, padding: '0 8px', height: 32,
          background: '#FFFFFF',
        }}>
          <Search size={14} style={{ opacity: 0.5, flexShrink: 0 }} />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search work"
            style={{
              border: 'none', outline: 'none', width: '100%', fontSize: 14,
              fontFamily: "'Atlassian Sans', -apple-system, sans-serif",
              background: 'transparent', color: '#172B4D',
            }}
          />
        </div>

        <button style={{
          height: 32, padding: '0 10px', border: '1px solid #DFE1E6',
          background: '#FFFFFF', borderRadius: 6, cursor: 'pointer',
          fontSize: 13, fontFamily: 'Inter, sans-serif', display: 'inline-flex',
          alignItems: 'center', gap: 4, color: '#44546F', flexShrink: 0,
        }}>
          <Filter size={14} />
          Filter
        </button>
      </div>

      {/* Sort header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 12px', borderBottom: '1px solid #DFE1E6', background: '#FFFFFF',
      }}>
        <button style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          background: 'transparent', border: 'none', cursor: 'pointer',
          fontWeight: 600, color: '#172B4D', fontSize: 14,
          fontFamily: "'Atlassian Sans', -apple-system, sans-serif",
        }}>
          Created
          <svg width="10" height="6" viewBox="0 0 10 6"><path d="M0 0l5 6 5-6z" fill="#44546F"/></svg>
        </button>
        <div style={{ display: 'inline-flex', gap: 4 }}>
          <SortIconBtn><ArrowUpDown size={16} /></SortIconBtn>
          <SortIconBtn><RotateCw size={16} /></SortIconBtn>
        </div>
      </div>

      {/* Scrollable card list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 8px', minHeight: 0, background: '#FFFFFF' }}>
        {filtered.map(item => {
          const selected = item.id === selectedKey;
          const rtl = /[\u0600-\u06FF]/.test(item.summary);
          return (
            <button
              key={item.id}
              onClick={() => onSelect(item.id)}
              style={{
                width: '100%', textAlign: 'left', display: 'block',
                border: selected ? '2px solid #579DFF' : '1px solid #DFE1E6',
                background: selected ? '#E9F2FF' : '#FFFFFF',
                borderRadius: 8, padding: selected ? '11px' : '12px',
                marginBottom: 8, cursor: 'pointer',
                transition: 'background 80ms, border-color 80ms',
              }}
              onMouseEnter={e => { if (!selected) { e.currentTarget.style.background = '#F7F8F9'; } }}
              onMouseLeave={e => { if (!selected) { e.currentTarget.style.background = '#FFFFFF'; } }}
            >
              <div
                dir={rtl ? 'rtl' : 'ltr'}
                style={{
                  fontWeight: 600, color: selected ? '#0C66E4' : '#172B4D',
                  marginBottom: 8, lineHeight: 1.3, fontSize: 14,
                  fontFamily: "'Atlassian Sans', -apple-system, sans-serif",
                  overflow: 'hidden', textOverflow: 'ellipsis',
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                }}
              >
                {item.summary || '(No title)'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{
                  fontSize: 12, color: '#626F86', display: 'inline-flex',
                  alignItems: 'center', gap: 5,
                  fontFamily: "'JetBrains Mono', monospace", fontWeight: 500,
                }}>
                  <WorkItemTypeIcon type={item.type} size={14} />
                  {item.jiraKey}
                </span>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: item.assignee?.color || '#6554C0',
                  color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontSize: 11, flexShrink: 0,
                }}>
                  {item.assignee?.initials || 'NA'}
                </div>
              </div>
            </button>
          );
        })}

        {/* Footer count */}
        <div style={{
          padding: '12px 4px', color: '#626F86', fontSize: 12, textAlign: 'center',
          fontFamily: "'Atlassian Sans', -apple-system, sans-serif",
        }}>
          {filtered.length} of <a href="#" onClick={e => e.preventDefault()} style={{ color: '#0C66E4', fontWeight: 600, textDecoration: 'none' }}>1000+</a>
        </div>
      </div>
    </div>
  );
}

function SortIconBtn({ children }: { children: React.ReactNode }) {
  return (
    <button
      style={{
        width: 28, height: 28, border: 'none', background: 'transparent',
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#626F86', borderRadius: 4,
      }}
      onMouseEnter={e => { e.currentTarget.style.background = '#F1F2F4'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
    >
      {children}
    </button>
  );
}
