/**
 * BulkMoveModal — Searchable tree for selecting a new parent
 * F6: Bulk move (change parent)
 */

import { useState, useMemo } from 'react';
import { X, Search, ChevronRight, ChevronDown } from 'lucide-react';
import { createPortal } from 'react-dom';
import type { WorkItem } from '@/types/hierarchy';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';

interface BulkMoveModalProps {
  items: WorkItem[];
  selectedKeys: string[];
  onConfirm: (parentKey: string) => void;
  onClose: () => void;
}

function flattenForSearch(items: WorkItem[], depth = 0): Array<{ item: WorkItem; depth: number; hasChildren: boolean }> {
  const result: Array<{ item: WorkItem; depth: number; hasChildren: boolean }> = [];
  for (const item of items) {
    result.push({ item, depth, hasChildren: item.children.length > 0 });
    result.push(...flattenForSearch(item.children, depth + 1));
  }
  return result;
}

export function BulkMoveModal({ items, selectedKeys, onConfirm, onClose }: BulkMoveModalProps) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const flatItems = useMemo(() => flattenForSearch(items), [items]);

  const filtered = useMemo(() => {
    if (!search) return flatItems;
    const q = search.toLowerCase();
    return flatItems.filter(r =>
      r.item.key.toLowerCase().includes(q) || r.item.title.toLowerCase().includes(q)
    );
  }, [flatItems, search]);

  const toggle = (id: string) => {
    setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  // In search mode, show flat; otherwise show tree-aware (only expanded)
  const visibleRows = search
    ? filtered
    : flatItems.filter((r, i) => {
        if (r.depth === 0) return true;
        // Check all ancestors are expanded
        let d = r.depth;
        for (let j = i - 1; j >= 0 && d > 0; j--) {
          if (flatItems[j].depth === d - 1) {
            if (!expanded.has(flatItems[j].item.id)) return false;
            d--;
          }
        }
        return true;
      });

  return createPortal(
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100000, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.4)', fontFamily: 'var(--ds-font-family-body)',
    }} onClick={onClose}>
      <div style={{
        width: 480, maxHeight: '70vh', background: 'var(--cp-float)', borderRadius: 8,
        boxShadow: '0 16px 48px rgba(0,0,0,0.20)', display: 'flex', flexDirection: 'column',
      }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--divider)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--fg-1)' }}>Move Items</h3>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--fg-3)' }}>
              Select a new parent for {selectedKeys.length} item{selectedKeys.length > 1 ? 's' : ''}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <X size={18} color="#64748B" />
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: '8px 20px' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '0 8px',
            height: 32, background: 'var(--bg-1)', border: '1px solid var(--divider)', borderRadius: 6,
          }}>
            <Search size={14} color="#94A3B8" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by key or title..."
              autoFocus
              style={{
                flex: 1, border: 'none', background: 'transparent', outline: 'none',
                fontSize: 13, color: 'var(--fg-1)',
              }}
            />
          </div>
        </div>

        {/* Tree */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 4px' }}>
          {visibleRows.map(({ item, depth, hasChildren }) => {
            const isDisabled = selectedKeys.includes(item.key);
            const isSelected = selected === item.key;

            return (
              <div key={item.id}
                onClick={() => !isDisabled && setSelected(item.key)}
                style={{
                  height: 50, display: 'flex', alignItems: 'center', gap: 6,
                  paddingLeft: (search ? 0 : depth * 20) + 16, paddingRight: 16,
                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                  background: isSelected ? 'var(--cp-primary-5)' : undefined,
                  opacity: isDisabled ? 0.4 : 1,
                  borderRadius: 4,
                }}
                onMouseEnter={e => { if (!isDisabled && !isSelected) e.currentTarget.style.background = 'var(--bg-1)'; }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = ''; }}
              >
                {!search && hasChildren ? (
                  <button onClick={e => { e.stopPropagation(); toggle(item.id); }}
                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex' }}>
                    {expanded.has(item.id)
                      ? <ChevronDown size={14} color="#94A3B8" />
                      : <ChevronRight size={14} color="#94A3B8" />}
                  </button>
                ) : <div style={{ width: 14 }} />}

                {item.issueType && <JiraIssueTypeIcon type={item.issueType} size={14} />}
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--cp-blue)', flexShrink: 0 }}>{item.key}</span>
                <span style={{
                  fontSize: 12, color: 'var(--fg-1)', overflow: 'hidden',
                  textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
                }}>{item.title}</span>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 20px', borderTop: '1px solid var(--divider)',
          display: 'flex', justifyContent: 'flex-end', gap: 8,
        }}>
          <button onClick={onClose} style={{
            height: 32, padding: '0 14px', fontSize: 13, fontWeight: 500,
            color: 'var(--fg-3)', background: 'var(--bg-app)', border: '1px solid var(--divider)',
            borderRadius: 6, cursor: 'pointer',
          }}>Cancel</button>
          <button
            onClick={() => selected && onConfirm(selected)}
            disabled={!selected}
            style={{
              height: 32, padding: '0 14px', fontSize: 13, fontWeight: 600,
              color: '#FFFFFF', background: selected ? 'var(--cp-blue)' : 'var(--fg-4)',
              border: 'none', borderRadius: 6, cursor: selected ? 'pointer' : 'not-allowed',
            }}>
            Move here
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
