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
      {/* Top bar: Search work | Filter
          (Ask AI removed 2026-04-18 per directive — not used on All Work.) */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 12px', borderBottom: '1px solid #DFE1E6', background: 'transparent',
        flexWrap: 'nowrap',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0,
          border: '1px solid #DFE1E6', borderRadius: 6, padding: '0 8px', height: 32,
          background: 'transparent',
        }}>
          <Search size={14} style={{ opacity: 0.5, flexShrink: 0 }} />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search work"
            style={{
              border: 'none', outline: 'none', boxShadow: 'none', width: '100%', fontSize: 14,
              fontFamily: "'Atlassian Sans', -apple-system, sans-serif",
              background: 'transparent', color: '#172B4D',
            }}
          />
        </div>

        <button style={{
          height: 32, padding: '0 10px', border: '1px solid #DFE1E6',
          background: 'transparent', borderRadius: 6, cursor: 'pointer',
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
        padding: '8px 12px', borderBottom: '1px solid #DFE1E6', background: 'transparent',
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
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 8px', minHeight: 0, background: 'transparent' }}>
        {filtered.map(item => {
          const selected = item.id === selectedKey;
          const rtl = /[\u0600-\u06FF]/.test(item.summary);
          return (
            <button
              key={item.id}
              onClick={() => onSelect(item.id)}
              style={{
                // Jira parity (measured 2026-04-18, BAU-5500):
                //   - NO hard border (was 1px/#DFE1E6)
                //   - Double shadow: 0 1px 1px rgba(30,31,33,0.25), 0 0 1px rgba(30,31,33,0.31)
                //   - 4px radius (was 8px)
                //   - Selected: #E9F2FE bg + 1px blue inner-shadow ring (no outline)
                //   - 2px margin between cards (was 8px)
                width: '100%', textAlign: 'left', display: 'block',
                border: 'none',
                background: selected ? '#E9F2FE' : '#FFFFFF',
                borderRadius: 4,
                padding: 12,
                margin: '2px 0',
                cursor: 'pointer',
                boxShadow: selected
                  ? 'rgba(24, 104, 219, 0.4) 0px 0px 0px 1px, rgba(30, 31, 33, 0.18) 0px 1px 1px 0px'
                  : 'rgba(30, 31, 33, 0.25) 0px 1px 1px 0px, rgba(30, 31, 33, 0.31) 0px 0px 1px 0px',
                transition: 'background 80ms, box-shadow 80ms',
              }}
              onMouseEnter={e => { if (!selected) { e.currentTarget.style.background = '#F8F9FA'; } }}
              onMouseLeave={e => { if (!selected) { e.currentTarget.style.background = '#FFFFFF'; } }}
            >
              <div
                dir={rtl ? 'rtl' : 'ltr'}
                style={{
                  // Jira card title: Atlassian Sans 14/400/#292A2E (weight 400, not 600).
                  // Selected state tints the title blue (#1868DB).
                  fontWeight: 400, color: selected ? '#1868DB' : '#292A2E',
                  marginBottom: 8, lineHeight: '20px', fontSize: 14,
                  fontFamily: "'Atlassian Sans', -apple-system, sans-serif",
                  overflow: 'hidden', textOverflow: 'ellipsis',
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                }}
              >
                {item.summary || '(No title)'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{
                  // Issue key in card: Atlassian Sans 12/400/#505258 (NOT monospace —
                  // Jira uses the same family as body, just smaller).
                  fontSize: 12, color: '#505258', display: 'inline-flex',
                  alignItems: 'center', gap: 6,
                  fontFamily: "'Atlassian Sans', -apple-system, sans-serif", fontWeight: 400,
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
