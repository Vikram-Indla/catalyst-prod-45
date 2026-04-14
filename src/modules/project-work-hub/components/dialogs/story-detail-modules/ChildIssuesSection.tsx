/**
 * ChildIssuesSection — Atlaskit DynamicTable parity
 * Sortable columns, inline status dropdown, linked issue keys, progress bar
 */
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Plus, Eye, EyeOff, ChevronDown, ChevronUp, Check, Loader2, CornerDownLeft, Sparkles, ArrowUpDown } from 'lucide-react';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { PriorityBars, normalisePriority } from '@/components/shared/PriorityIndicator';
import { CANONICAL_WORK_ITEM_OPTIONS } from '@/components/shared/canonicalWorkItemOptions';
import type { ColumnConfig, PhIssueRow, StatusCategory } from './types';
import { DEFAULT_COLUMNS, STATUS_OPTION_GROUPS, LOZENGE } from './constants';
import { nextPos, getAvatarColor, formatDateShort, resolveStatusCategory } from './helpers';
import { SectionBlock, IssueIcon, ColumnPicker, SkeletonRows, EmptyState } from './shared-components';
import { ConfirmDialog } from './ConfirmDialog';
import { toast } from 'sonner';

/* ── Sort types ── */
type SortKey = 'work' | 'priority' | 'assignee' | 'status';
type SortDir = 'asc' | 'desc' | null;

const PRIORITY_ORDER: Record<string, number> = { Highest: 0, High: 1, Medium: 2, Low: 3, Lowest: 4 };
const STATUS_CAT_ORDER: Record<string, number> = { done: 0, in_progress: 1, todo: 2 };

/* ── Type selector dropdown ── */
const TYPE_OPTIONS = CANONICAL_WORK_ITEM_OPTIONS.filter(option =>
  ['Sub-task', 'Frontend', 'Backend', 'Figma', 'Integration', 'Bug', 'Task'].includes(option.key)
);

function TypeSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = TYPE_OPTIONS.find(t => t.key === value) ?? TYPE_OPTIONS[0];

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <button onClick={() => setOpen(o => !o)} style={{
        display: 'flex', alignItems: 'center', gap: 4, height: 32, padding: '0 8px',
        border: '1px solid #DFE1E6', borderRadius: 3, background: '#fff', cursor: 'pointer',
        fontSize: 13, color: '#172B4D', fontFamily: 'inherit',
      }}>
        <span style={{ display: 'flex', width: 16, height: 16 }}>{current.icon}</span>
        <span>{current.label}</span>
        <ChevronDown size={12} color="#6B778C" />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 2px)', left: 0, minWidth: 160,
          background: '#fff', border: '1px solid #DFE1E6', borderRadius: 4,
          boxShadow: '0 4px 8px rgba(9,30,66,.25)', zIndex: 60, overflow: 'hidden',
        }}>
          {TYPE_OPTIONS.map(opt => (
            <div key={opt.key} onClick={() => { onChange(opt.key); setOpen(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, height: 36, padding: '0 12px',
                cursor: 'pointer', fontSize: 13, color: '#172B4D',
                background: opt.key === value ? '#DEEBFF' : 'transparent',
              }}
              onMouseEnter={e => { if (opt.key !== value) (e.currentTarget as HTMLElement).style.background = '#F4F5F7'; }}
              onMouseLeave={e => { if (opt.key !== value) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <span style={{ display: 'flex', width: 16, height: 16 }}>{opt.icon}</span>
              <span>{opt.label}</span>
              {opt.key === value && <Check size={12} color="#0052CC" style={{ marginLeft: 'auto' }} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Inline Status Dropdown ── */
function InlineStatusDropdown({ item, onUpdate }: { item: PhIssueRow; onUpdate: (id: string, status: string, category: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  const lozengeStyle = LOZENGE[item.status_category] ?? LOZENGE.todo;

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
        style={{
          ...lozengeStyle,
          display: 'inline-block', height: 20, lineHeight: '20px', fontSize: 11,
          fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em',
          borderRadius: 3, padding: '0 6px', whiteSpace: 'nowrap',
          border: 'none', cursor: 'pointer', fontFamily: 'inherit',
        }}
      >
        {item.status}
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', right: 0, minWidth: 200, maxHeight: 320, overflowY: 'auto',
          background: '#fff', border: '1px solid #DFE1E6', borderRadius: 6,
          boxShadow: '0 8px 24px rgba(9,30,66,.25)', zIndex: 80, padding: '4px 0',
        }}>
          {STATUS_OPTION_GROUPS.map(group => (
            <div key={group.groupLabel}>
              <div style={{
                fontSize: 10, fontWeight: 700, color: '#6B778C', textTransform: 'uppercase',
                letterSpacing: '0.06em', padding: '8px 12px 4px',
              }}>{group.groupLabel}</div>
              {group.statuses.map(s => {
                const isActive = item.status === s;
                return (
                  <div
                    key={s}
                    onClick={e => {
                      e.stopPropagation();
                      if (!isActive) onUpdate(item.id, s, group.category);
                      setOpen(false);
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px',
                      cursor: 'pointer', fontSize: 13, color: '#172B4D',
                      background: isActive ? '#DEEBFF' : 'transparent',
                    }}
                    onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = '#F4F5F7'; }}
                    onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    <span style={{ flex: 1 }}>{s}</span>
                    {isActive && <Check size={12} color="#0052CC" />}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Sortable Column Header ── */
function SortableHeader({ label, sortKey, currentSort, currentDir, onSort, align = 'left' }: {
  label: string; sortKey: SortKey; currentSort: SortKey | null; currentDir: SortDir; onSort: (k: SortKey) => void; align?: 'left' | 'center' | 'right';
}) {
  const isActive = currentSort === sortKey;
  return (
    <button
      onClick={() => onSort(sortKey)}
      style={{
        display: 'flex', alignItems: 'center', gap: 3, background: 'none', border: 'none',
        cursor: 'pointer', fontSize: 11, fontWeight: 700, color: isActive ? '#172B4D' : '#6B778C',
        textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: 'inherit', padding: 0,
        justifyContent: align === 'right' ? 'flex-end' : align === 'center' ? 'center' : 'flex-start',
        width: '100%',
      }}
    >
      <span>{label}</span>
      {isActive && currentDir === 'asc' && <ChevronUp size={10} strokeWidth={2.5} />}
      {isActive && currentDir === 'desc' && <ChevronDown size={10} strokeWidth={2.5} />}
      {!isActive && <ArrowUpDown size={9} style={{ opacity: 0.4 }} />}
    </button>
  );
}

/* ── DynamicTable Row ── */
function DynamicRow({ item, columns, onDelete, onCopyLink, onStatusUpdate, onClickKey }: {
  item: PhIssueRow; columns: ColumnConfig;
  onDelete: () => void; onCopyLink: () => void;
  onStatusUpdate: (id: string, status: string, category: string) => void;
  onClickKey: (id: string) => void;
}) {
  const isDone = item.status_category === 'done';
  const avatarColor = item.assignee_display_name ? getAvatarColor(item.assignee_display_name) : '#8993A4';
  const avatarInitial = item.assignee_display_name?.charAt(0).toUpperCase() ?? '?';

  return (
    <div className="sdm-child-row" role="listitem">
      {/* Work cell: icon + linked key + summary */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0, overflow: 'hidden' }}>
        <span className="sdm-type-icon"><JiraIssueTypeIcon type={item.issue_type} size={16} /></span>
        <button
          onClick={e => { e.stopPropagation(); onClickKey(item.id); }}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace",
            fontSize: 12, fontWeight: 500, color: '#2563EB', padding: 0, flexShrink: 0,
            textDecoration: 'none',
          }}
          onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
          onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
          title={`Open ${item.issue_key}`}
        >
          {item.issue_key}
        </button>
        <span style={{
          fontSize: 13, color: isDone ? 'rgba(9,30,66,0.4)' : '#172B4D',
          textDecoration: isDone ? 'line-through' : 'none',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{item.summary}</span>
      </div>

      {/* Priority */}
      {columns.priority && (
        <div style={{ width: 80, display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0 }}>
            <PriorityBars priority={normalisePriority(item.priority)} barWidth={3} barHeight={12} />
        </div>
      )}

      {/* Assignee */}
      {columns.assignee && (
        <div style={{ width: 80, display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0 }}>
          <div style={{
            width: 24, height: 24, borderRadius: '50%', background: avatarColor,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700, color: '#fff',
          }} title={item.assignee_display_name ?? 'Unassigned'}>
            {avatarInitial}
          </div>
        </div>
      )}

      {/* Status — clickable dropdown */}
      {columns.status && (
        <div style={{ width: 120, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', flexShrink: 0 }}>
          <InlineStatusDropdown item={item} onUpdate={onStatusUpdate} />
        </div>
      )}

      {/* Date columns */}
      {columns.created && <span className="sdm-date-col" title={item.jira_created_at ?? ''}>{formatDateShort(item.jira_created_at)}</span>}
      {columns.updated && <span className="sdm-date-col" title={item.jira_updated_at ?? ''}>{formatDateShort(item.jira_updated_at)}</span>}

      {/* Row actions (hover-reveal via CSS) */}
      <div className="sdm-row-actions">
        <button className="sdm-row-action-btn" title="Copy link" onClick={e => { e.stopPropagation(); onCopyLink(); }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
        </button>
        <button className="sdm-row-action-btn sdm-row-action-btn--danger" title="Delete" onClick={e => { e.stopPropagation(); onDelete(); }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
        </button>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════
   MAIN EXPORT — ChildIssuesSection
   ════════════════════════════════════════════════════ */
export function ChildIssuesSection({ storyKey, storyId, projectKey, onOpenItem }: {
  storyKey: string; storyId: string; projectKey: string; onOpenItem?: (itemId: string) => void;
}) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [columns, setColumns] = useState<ColumnConfig>(DEFAULT_COLUMNS);
  const [showDone, setShowDone] = useState(true);
  const [creating, setCreating] = useState(false);
  const [draftSummary, setDraftSummary] = useState('');
  const [draftType, setDraftType] = useState('Sub-task');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; key: string } | null>(null);
  const createRef = useRef<HTMLInputElement>(null);

  // Sort state
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);

  const handleSort = useCallback((key: SortKey) => {
    if (sortKey === key) {
      // Cycle: asc → desc → none
      if (sortDir === 'asc') setSortDir('desc');
      else if (sortDir === 'desc') { setSortKey(null); setSortDir(null); }
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }, [sortKey, sortDir]);

  const { data: children = [], isLoading } = useQuery({
    queryKey: ['childIssues', storyKey],
    queryFn: async () => {
      const { data, error } = await supabase.from('ph_issues')
        .select('id,issue_key,summary,status,status_category,issue_type,assignee_account_id,assignee_display_name,priority,position,jira_created_at,jira_updated_at,deleted_at')
        .eq('parent_key', storyKey).in('issue_type', ['task', 'Sub-task', 'Frontend', 'Backend', 'Figma', 'Integration']).is('deleted_at', null)
        .order('position', { ascending: true });
      if (error) throw error;
      return (data ?? []) as PhIssueRow[];
    },
  });

  // Filter + sort
  const sorted = useMemo(() => {
    let items = showDone ? children : children.filter(c => c.status_category !== 'done');
    if (sortKey && sortDir) {
      items = [...items].sort((a, b) => {
        let cmp = 0;
        switch (sortKey) {
          case 'work':
            cmp = (a.summary ?? '').localeCompare(b.summary ?? '');
            break;
          case 'priority':
            cmp = (PRIORITY_ORDER[a.priority] ?? 99) - (PRIORITY_ORDER[b.priority] ?? 99);
            break;
          case 'assignee':
            cmp = (a.assignee_display_name ?? 'zzz').localeCompare(b.assignee_display_name ?? 'zzz');
            break;
          case 'status':
            cmp = (STATUS_CAT_ORDER[a.status_category] ?? 99) - (STATUS_CAT_ORDER[b.status_category] ?? 99);
            break;
        }
        return sortDir === 'desc' ? -cmp : cmp;
      });
    }
    return items;
  }, [children, showDone, sortKey, sortDir]);

  const doneCount = children.filter(c => c.status_category === 'done').length;
  const donePercent = children.length ? Math.round((doneCount / children.length) * 100) : 0;

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (summary: string) => {
      const tempKey = `${projectKey}-NEW-${Date.now()}`;
      const { error } = await supabase.from('ph_issues').insert({
        issue_key: tempKey, summary: summary.trim(), issue_type: draftType,
        parent_key: storyKey, project_key: projectKey, status: 'To Do',
        status_category: 'todo', priority: 'Medium', position: nextPos(children),
        reporter_account_id: user?.id, source: 'catalyst',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['childIssues', storyKey] });
      setDraftSummary('');
      setTimeout(() => createRef.current?.focus(), 50);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ph_issues').update({ deleted_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['childIssues', storyKey] }),
  });

  // Status update mutation
  const statusMutation = useMutation({
    mutationFn: async ({ id, status, category }: { id: string; status: string; category: string }) => {
      const { error } = await supabase.from('ph_issues')
        .update({ status, status_category: category })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['childIssues', storyKey] });
      toast.success('Status updated');
    },
  });

  const handleStatusUpdate = useCallback((id: string, status: string, category: string) => {
    statusMutation.mutate({ id, status, category });
  }, [statusMutation]);

  const handleClickKey = useCallback((itemId: string) => {
    if (onOpenItem) onOpenItem(itemId);
  }, [onOpenItem]);

  useEffect(() => { if (creating) setTimeout(() => createRef.current?.focus(), 50); }, [creating]);

  return (
    <>
      <SectionBlock title="Sub-tasks" count={children.length} doneCount={doneCount} defaultExpanded={children.length > 0} headerRight={
        <>
          {doneCount > 0 && (
            <button className="sdm-visibility-btn" onClick={() => setShowDone(s => !s)}>
              {showDone ? <><Eye size={11} /> Hide done</> : <><EyeOff size={11} /> Show done ({doneCount})</>}
            </button>
          )}
          <ColumnPicker columns={columns} onChange={setColumns} />
          <button onClick={() => setCreating(true)} title="Create sub-task" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 24, height: 24, border: 'none', borderRadius: 3, background: 'transparent',
            cursor: 'pointer', color: '#6B778C', transition: 'background 0.15s, color 0.15s',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = '#F4F5F7'; e.currentTarget.style.color = '#172B4D'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#6B778C'; }}
          >
            <Plus size={16} strokeWidth={2} />
          </button>
        </>
      }>
        {/* AI suggest bar */}
        {creating && children.length > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
            border: '1px solid #DFE1E6', borderRadius: 8, margin: '0 0 4px 0',
            background: '#FAFBFC',
          }}>
            <Sparkles size={16} color="#6B778C" />
            <span style={{ fontSize: 13, color: '#172B4D', flex: 1 }}>Create suggested work items</span>
            <button style={{
              height: 28, padding: '0 12px', border: '1px solid #DFE1E6', borderRadius: 3,
              background: '#fff', cursor: 'pointer', fontSize: 13, color: '#172B4D', fontFamily: 'inherit',
            }}>Suggest</button>
          </div>
        )}

        {/* Progress bar */}
        {children.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0 6px', marginBottom: 2 }}>
            <div style={{ flex: 1, height: 6, borderRadius: 3, background: '#DFE1E6', overflow: 'hidden' }}>
              <div style={{ width: `${donePercent}%`, height: '100%', borderRadius: 3, background: '#36B37E', transition: 'width 0.3s ease' }} />
            </div>
            <span style={{ fontSize: 12, color: '#6B778C', flexShrink: 0, fontWeight: 500 }}>{donePercent}% Done</span>
          </div>
        )}

        {/* Sortable table header — Atlaskit DynamicTable parity */}
        {sorted.length > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center',
            padding: '6px 12px 6px 40px', borderBottom: '2px solid #DFE1E6',
          }}>
            <div style={{ flex: 1 }}>
              <SortableHeader label="Work" sortKey="work" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
            </div>
            {columns.priority && (
              <div style={{ width: 80 }}>
                <SortableHeader label="Priority" sortKey="priority" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} align="center" />
              </div>
            )}
            {columns.assignee && (
              <div style={{ width: 80 }}>
                <SortableHeader label="Assignee" sortKey="assignee" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} align="center" />
              </div>
            )}
            {columns.status && (
              <div style={{ width: 120 }}>
                <SortableHeader label="Status" sortKey="status" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} align="right" />
              </div>
            )}
            {/* spacer for row actions */}
            <div style={{ width: 60 }} />
          </div>
        )}

        {isLoading && <SkeletonRows />}
        {!isLoading && children.length === 0 && !creating && (
          <EmptyState heading="No sub-tasks yet" sub="Break this story into sub-tasks to track progress" cta="+ Create sub-task" onCta={() => setCreating(true)} />
        )}
        {!isLoading && sorted.length > 0 && (
          <div className="sdm-child-list" role="list">
            {sorted.map(item => (
              <DynamicRow
                key={item.id}
                item={item}
                columns={columns}
                onDelete={() => setDeleteTarget({ id: item.id, key: item.issue_key })}
                onCopyLink={() => { navigator.clipboard.writeText(`${window.location.origin}/issues/${item.issue_key}`); toast.success('Link copied'); }}
                onStatusUpdate={handleStatusUpdate}
                onClickKey={handleClickKey}
              />
            ))}
          </div>
        )}

        {/* Inline create */}
        {creating && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 0,
            border: '2px solid #4C9AFF', borderRadius: 3, margin: '4px 0 0',
            background: '#fff', overflow: 'hidden',
          }}>
            <input
              ref={createRef}
              type="text"
              placeholder="What needs to be done?"
              value={draftSummary}
              onChange={e => setDraftSummary(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && draftSummary.trim()) { e.preventDefault(); createMutation.mutate(draftSummary); }
                if (e.key === 'Escape') { setCreating(false); setDraftSummary(''); }
              }}
              maxLength={255}
              style={{
                flex: 1, height: 36, padding: '0 12px', border: 'none', outline: 'none',
                fontSize: 14, color: '#172B4D', fontFamily: 'inherit',
                background: 'transparent',
              }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '0 8px', borderLeft: '1px solid #DFE1E6' }}>
              <TypeSelector value={draftType} onChange={setDraftType} />
              <button
                onClick={() => { if (draftSummary.trim()) createMutation.mutate(draftSummary); }}
                disabled={!draftSummary.trim() || createMutation.isPending}
                title="Create (Enter)"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 28, height: 28, border: '1px solid #DFE1E6', borderRadius: 3,
                  background: '#F4F5F7', cursor: draftSummary.trim() ? 'pointer' : 'not-allowed',
                  color: '#6B778C', opacity: draftSummary.trim() ? 1 : 0.5,
                }}
              >
                {createMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <CornerDownLeft size={14} />}
              </button>
            </div>
          </div>
        )}
        {creating && (
          <div style={{ textAlign: 'right', padding: '6px 0 2px' }}>
            <button onClick={() => { setCreating(false); setDraftSummary(''); }}
              style={{ background: 'none', border: 'none', fontSize: 13, color: '#6B778C', cursor: 'pointer', fontFamily: 'inherit' }}>
              Cancel
            </button>
          </div>
        )}
      </SectionBlock>
      <ConfirmDialog
        open={!!deleteTarget}
        title={`Delete ${deleteTarget?.key ?? ''}?`}
        message="This item will be soft-deleted. It can be restored within 30 days."
        confirmLabel="Delete"
        onConfirm={() => { if (deleteTarget) deleteMutation.mutate(deleteTarget.id); setDeleteTarget(null); }}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
