/**
 * ProjectListView — List tab (epics table)
 * Stage C: Full pixel-perfect build
 */
import React, { useState } from 'react';
import { Search, Filter, ChevronDown, MessageSquare, Plus, MoreHorizontal } from 'lucide-react';
import { WorkItemTypeIcon } from '@/components/icons/WorkItemTypeIcon';
import { JiraStatusLozenge } from '@/components/ui/JiraStatusLozenge';
import { useProjectListItems } from '@/hooks/useProjectListItems';

interface Props {
  projectKey: string;
}

export default function ProjectListView({ projectKey }: Props) {
  const { data: items = [], isLoading } = useProjectListItems(projectKey);
  const [search, setSearch] = useState('');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [inlineCreate, setInlineCreate] = useState(false);
  const [newItemSummary, setNewItemSummary] = useState('');

  const filtered = items.filter(i =>
    i.summary.toLowerCase().includes(search.toLowerCase()) ||
    i.jiraKey.toLowerCase().includes(search.toLowerCase())
  );

  const toggleRow = (id: string) => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* ── LIST TOOLBAR ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '8px 12px', borderBottom: 'var(--ph-divider)',
        background: 'var(--cp-bg-page)', flexShrink: 0,
      }}>
        <div style={{
          height: 32, width: 180, border: '1px solid var(--cp-border-default)',
          borderRadius: 4, display: 'flex', alignItems: 'center', gap: 6,
          padding: '0 10px', fontSize: 14, color: 'var(--cp-text-tertiary)',
          background: 'var(--cp-bg-page)',
        }}>
          <Search size={13} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search list"
            style={{ border: 'none', outline: 'none', fontSize: 14,
              fontFamily: 'Inter, sans-serif', color: 'var(--cp-text-primary)',
              background: 'transparent', width: '100%' }}
          />
        </div>

        <div style={{
          width: 28, height: 28, borderRadius: '50%', background: '#6554C0',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, color: '#fff', fontWeight: 700, cursor: 'pointer', flexShrink: 0,
        }}>V</div>

        <button style={{
          height: 32, padding: '0 10px', borderRadius: 4,
          border: '1px solid var(--cp-border-default)', background: 'var(--cp-bg-page)',
          color: 'var(--cp-text-primary)', fontSize: 14,
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
          fontFamily: 'Inter, sans-serif',
        }}>
          <Filter size={13} />
          Filter
        </button>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
          <button style={{
            height: 32, padding: '0 10px', borderRadius: 4,
            border: '1px solid var(--cp-border-default)', background: 'var(--cp-bg-page)',
            color: 'var(--cp-text-primary)', fontSize: 14,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
            fontFamily: 'Inter, sans-serif', fontWeight: 500,
          }}>
            Group <ChevronDown size={12} />
          </button>
          <button className="ph-icon-btn" title="Manage columns">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <line x1="9" y1="3" x2="9" y2="21"/>
              <line x1="15" y1="3" x2="15" y2="21"/>
            </svg>
          </button>
          <button className="ph-icon-btn" title="More actions"><MoreHorizontal size={16} /></button>
        </div>
      </div>

      {/* ── LIST TABLE ── */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <table className="ph-list-table">
          <thead>
            <tr>
              <th style={{ width: 36, textAlign: 'center', padding: '0 8px' }}>
                <input type="checkbox" style={{ width: 14, height: 14, cursor: 'pointer' }}
                  onChange={e => setSelectedRows(e.target.checked ? new Set(filtered.map(i => i.id)) : new Set())}
                />
              </th>
              <th style={{ width: 52, textAlign: 'center' }}>TYPE</th>
              <th style={{ width: 120 }}>
                KEY
                <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" style={{ marginLeft: 4, verticalAlign: 'middle' }}>
                  <path d="M8 3l-5 5h10L8 3zm0 10l5-5H3l5 5z"/>
                </svg>
              </th>
              <th>SUMMARY</th>
              <th style={{ width: 140 }}>STATUS</th>
              <th style={{ width: 150 }}>COMMENTS</th>
              <th style={{ width: 120 }}>PARENT</th>
              <th style={{ width: 36, textAlign: 'center' }}>
                <button style={{
                  width: 22, height: 22, border: '1px dashed var(--cp-border-default)',
                  borderRadius: 3, background: 'transparent', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--cp-text-tertiary)', fontSize: 14,
                }}>+</button>
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 24, color: 'var(--cp-text-tertiary)' }}>Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--cp-text-tertiary)' }}>
                No items found
              </td></tr>
            ) : filtered.map(item => (
              <tr key={item.id} className={selectedRows.has(item.id) ? 'ph-row-selected' : ''}>
                <td style={{ textAlign: 'center', width: 36 }}>
                  <input type="checkbox" checked={selectedRows.has(item.id)}
                    onChange={() => toggleRow(item.id)}
                    style={{ width: 14, height: 14, cursor: 'pointer' }}
                  />
                </td>
                <td style={{ textAlign: 'center', width: 52 }}>
                  <WorkItemTypeIcon type={item.type} size={16} />
                </td>
                <td style={{ width: 120 }}>
                  <a className="ph-iss-key" href="#">
                    {item.jiraKey}
                  </a>
                </td>
                <td style={{ overflow: 'hidden', maxWidth: 1 }}>
                  <span style={{
                    display: 'block', overflow: 'hidden',
                    textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    fontSize: 14, color: 'var(--cp-text-primary)',
                    fontFamily: 'Inter, sans-serif',
                  }}>
                    {item.summary}
                  </span>
                </td>
                <td style={{ width: 140 }}>
                  <JiraStatusLozenge status={item.status} interactive />
                </td>
                <td style={{ width: 150 }}>
                  <span style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    color: 'var(--cp-text-tertiary)', fontSize: 13, cursor: 'pointer',
                  }}>
                    <MessageSquare size={13} style={{ flexShrink: 0 }} />
                    <span>{item.commentsCount > 0 ? `${item.commentsCount} comment${item.commentsCount > 1 ? 's' : ''}` : 'Add comment'}</span>
                  </span>
                </td>
                <td style={{ width: 120, color: 'var(--cp-text-tertiary)', fontSize: 13 }}>
                  {item.parentKey ?? '—'}
                </td>
                <td style={{ width: 36 }} />
              </tr>
            ))}

            {inlineCreate && (
              <tr>
                <td colSpan={2} />
                <td colSpan={5}>
                  <input
                    autoFocus
                    value={newItemSummary}
                    onChange={e => setNewItemSummary(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Escape') { setInlineCreate(false); setNewItemSummary(''); }
                    }}
                    placeholder="What needs to be done?"
                    style={{
                      width: '100%', border: 'none', outline: '2px solid var(--cp-primary)',
                      borderRadius: 3, fontSize: 14, fontFamily: 'Inter, sans-serif',
                      padding: '4px 8px', background: 'var(--cp-bg-page)',
                    }}
                  />
                </td>
                <td />
              </tr>
            )}
          </tbody>
        </table>

        <button
          onClick={() => setInlineCreate(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 12px', width: '100%', border: 'none',
            background: 'transparent', cursor: 'pointer',
            fontSize: 14, color: 'var(--cp-text-tertiary)',
            borderTop: 'var(--ph-divider)', fontFamily: 'Inter, sans-serif',
            transition: 'color 150ms, background 150ms',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--cp-bg-hover)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
        >
          <Plus size={14} /> Create
        </button>
      </div>
    </div>
  );
}
