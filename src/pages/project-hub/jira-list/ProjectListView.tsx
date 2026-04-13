/**
 * ProjectListView — List tab (epics table)
 * Stage E: Edge case guards, RTL support, design precision
 */
import React, { useState, useRef } from 'react';
import { Search, Filter, ChevronDown, MessageSquare, Plus, MoreHorizontal } from 'lucide-react';
import { WorkItemTypeIcon } from '@/components/icons/WorkItemTypeIcon';
import { JiraStatusLozenge } from '@/components/ui/JiraStatusLozenge';
import { useProjectListItems, useCreateWorkItem, useUpdateWorkItemStatus, useSearchWorkItems } from '@/hooks/useProjectListItems';

interface Props {
  projectKey: string;
  projectId?: string;
}

/* ── RTL detection ── */
const isRTL = (text: string) => /[\u0600-\u06FF]/.test(text);

/* ── Skeleton row ── */
const SkeletonRow = () => (
  <tr>
    {[36, 52, 110, 0, 140, 150, 120].map((w, i) => (
      <td key={i} style={{ width: w || undefined, lineHeight: 'normal' }}>
        <div style={{
          height: 14, borderRadius: 4,
          background: 'linear-gradient(90deg, #F1F5F9 25%, #E2E8F0 50%, #F1F5F9 75%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.5s infinite',
          width: w ? Math.round(w * 0.6) : '80%',
        }} />
      </td>
    ))}
  </tr>
);

export default function ProjectListView({ projectKey, projectId }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const { data: allItems = [], isLoading, error } = useProjectListItems(projectKey);
  const { data: searchResults } = useSearchWorkItems(projectKey, searchQuery);
  const { mutateAsync: createItem, isPending: isCreating } = useCreateWorkItem();
  const { mutate: updateStatus } = useUpdateWorkItemStatus();

  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [inlineCreate, setInlineCreate] = useState(false);
  const [newItemSummary, setNewItemSummary] = useState('');
  const newInputRef = useRef<HTMLInputElement>(null);

  const displayItems = searchQuery.length >= 2 ? (searchResults ?? []) : allItems;

  const nextKey = `${projectKey ?? 'CAT'}-${(allItems.length + 1).toString().padStart(3, '0')}`;

  const handleInlineCreate = async () => {
    if (!newItemSummary.trim() || !projectId) {
      setInlineCreate(false);
      setNewItemSummary('');
      return;
    }
    try {
      await createItem({
        projectId,
        type: 'epic',
        summary: newItemSummary.trim(),
        itemKey: nextKey,
      });
      setNewItemSummary('');
      setInlineCreate(false);
    } catch (err) {
      console.error('Failed to create work item:', err);
    }
  };

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
        padding: '8px 12px', borderBottom: '0.75px solid rgba(15, 23, 42, 0.08)',
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
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
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
                  onChange={e => setSelectedRows(e.target.checked ? new Set(displayItems.map(i => i.id)) : new Set())}
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
              Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
            ) : error ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--cp-text-tertiary)', lineHeight: 'normal' }}>
                Failed to load work items. Please try again.
              </td></tr>
            ) : displayItems.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ lineHeight: 'normal' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 24px', gap: 12 }}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--cp-border-default)" strokeWidth="1.5">
                      <rect x="3" y="3" width="18" height="18" rx="2"/>
                      <line x1="8" y1="8" x2="16" y2="8"/>
                      <line x1="8" y1="12" x2="16" y2="12"/>
                      <line x1="8" y1="16" x2="12" y2="16"/>
                    </svg>
                    <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--cp-text-primary)', margin: 0, fontFamily: 'Sora, sans-serif' }}>
                      No work items yet
                    </p>
                    <p style={{ fontSize: 14, color: 'var(--cp-text-tertiary)', margin: 0, textAlign: 'center' }}>
                      Create your first Epic to start tracking work in this project.
                    </p>
                    <button
                      onClick={() => setInlineCreate(true)}
                      style={{ height: 36, padding: '0 16px', borderRadius: 6, border: 'none', background: '#2563EB', color: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', gap: 6 }}>
                      + Create Epic
                    </button>
                  </div>
                </td>
              </tr>
            ) : displayItems.map(item => {
              // §1.1: Guard empty summary
              const summary = item.summary?.trim() || '';
              const rtl = isRTL(summary);
              return (
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
                  <td style={{ overflow: 'hidden', maxWidth: 0 }}>
                    {summary ? (
                      <span
                        dir={rtl ? 'rtl' : 'ltr'}
                        style={{
                          display: 'block', overflow: 'hidden',
                          textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          fontSize: 14, color: 'var(--cp-text-primary)',
                          fontFamily: 'Inter, sans-serif',
                          textAlign: rtl ? 'right' : 'left',
                        }}>
                        {summary}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--cp-text-tertiary)', fontStyle: 'italic', fontSize: 14 }}>(No title)</span>
                    )}
                  </td>
                  <td style={{ width: 140 }}>
                    <JiraStatusLozenge
                      status={item.status}
                      interactive
                      onStatusChange={(newStatus) => updateStatus({ id: item.id, status: newStatus })}
                    />
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
              );
            })}

            {inlineCreate && (
              <tr>
                <td style={{ textAlign: 'center' }} />
                <td style={{ textAlign: 'center' }}>
                  <WorkItemTypeIcon type="epic" size={16} />
                </td>
                <td>
                  <span style={{ fontSize: 13, color: 'var(--cp-text-tertiary)', fontFamily: "'JetBrains Mono', monospace" }}>
                    {nextKey}
                  </span>
                </td>
                <td colSpan={4} style={{ lineHeight: 'normal' }}>
                  <input
                    ref={newInputRef}
                    autoFocus
                    value={newItemSummary}
                    onChange={e => setNewItemSummary(e.target.value)}
                    onKeyDown={async e => {
                      if (e.key === 'Enter') await handleInlineCreate();
                      if (e.key === 'Escape') { setInlineCreate(false); setNewItemSummary(''); }
                    }}
                    onBlur={handleInlineCreate}
                    placeholder="What needs to be done?"
                    disabled={isCreating}
                    style={{
                      width: '100%', border: 'none', outline: '2px solid #2563EB',
                      borderRadius: 3, fontSize: 14, fontFamily: 'Inter, sans-serif',
                      padding: '4px 8px', background: 'var(--cp-bg-page)',
                      opacity: isCreating ? 0.6 : 1,
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
            borderTop: '0.75px solid rgba(15, 23, 42, 0.08)', fontFamily: 'Inter, sans-serif',
            transition: 'color 150ms, background 150ms',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.04)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
        >
          <Plus size={14} /> Create
        </button>
      </div>
    </div>
  );
}
