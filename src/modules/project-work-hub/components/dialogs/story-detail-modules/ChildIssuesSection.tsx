/**
 * ChildIssuesSection — Jira-parity rebuild
 * + button reveals AI suggest bar + inline "What needs to be done?" input
 */
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Plus, Eye, EyeOff, ChevronDown, Check, Loader2, CornerDownLeft, Sparkles } from 'lucide-react';
import type { ColumnConfig, PhIssueRow } from './types';
import { DEFAULT_COLUMNS, WORK_ITEM_ICONS } from './constants';
import { nextPos } from './helpers';
import { SectionBlock, IssueRow, ColumnPicker, SkeletonRows, EmptyState } from './shared-components';
import { ConfirmDialog } from './ConfirmDialog';

/* ── Type selector dropdown (Sub-task / Bug etc.) ── */
const TYPE_OPTIONS = [
  { key: 'Sub-task', label: 'Sub-task', icon: WORK_ITEM_ICONS['Sub-task'] },
  { key: 'bug', label: 'Bug', icon: WORK_ITEM_ICONS.bug },
  { key: 'task', label: 'Task', icon: WORK_ITEM_ICONS.task },
];

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
        <span dangerouslySetInnerHTML={{ __html: current.icon }} style={{ display: 'flex', width: 16, height: 16 }} />
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
              <span dangerouslySetInnerHTML={{ __html: opt.icon }} style={{ display: 'flex', width: 16, height: 16 }} />
              <span>{opt.label}</span>
              {opt.key === value && <Check size={12} color="#0052CC" style={{ marginLeft: 'auto' }} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ChildIssuesSection({ storyKey, storyId, projectKey }: { storyKey: string; storyId: string; projectKey: string }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [columns, setColumns] = useState<ColumnConfig>(DEFAULT_COLUMNS);
  const [showDone, setShowDone] = useState(true);
  const [creating, setCreating] = useState(false);
  const [draftSummary, setDraftSummary] = useState('');
  const [draftType, setDraftType] = useState('Sub-task');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; key: string } | null>(null);
  const createRef = useRef<HTMLInputElement>(null);

  const { data: children = [], isLoading } = useQuery({
    queryKey: ['childIssues', storyKey],
    queryFn: async () => {
      const { data, error } = await supabase.from('ph_issues')
        .select('id,issue_key,summary,status,status_category,issue_type,assignee_account_id,assignee_display_name,priority,position,jira_created_at,jira_updated_at,deleted_at')
        .eq('parent_key', storyKey).in('issue_type', ['task', 'Sub-task']).is('deleted_at', null)
        .order('position', { ascending: true });
      if (error) throw error;
      return (data ?? []) as PhIssueRow[];
    },
  });

  const visible = useMemo(() => showDone ? children : children.filter(c => c.status_category !== 'done'), [children, showDone]);
  const doneCount = children.filter(c => c.status_category === 'done').length;
  const donePercent = children.length ? Math.round((doneCount / children.length) * 100) : 0;

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

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('ph_issues').update({ deleted_at: new Date().toISOString() }).eq('id', id); if (error) throw error; },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['childIssues', storyKey] }),
  });

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
        {/* AI suggest bar — Jira parity */}
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

        {/* Progress bar — Jira parity */}
        {children.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0 6px', marginBottom: 2 }}>
            <div style={{ flex: 1, height: 6, borderRadius: 3, background: '#DFE1E6', overflow: 'hidden' }}>
              <div style={{ width: `${donePercent}%`, height: '100%', borderRadius: 3, background: donePercent === 100 ? '#36B37E' : '#36B37E', transition: 'width 0.3s ease' }} />
            </div>
            <span style={{ fontSize: 12, color: '#6B778C', flexShrink: 0, fontWeight: 500 }}>{donePercent}% Done</span>
          </div>
        )}

        {/* Table header */}
        {visible.length > 0 && (
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 80px 80px 80px',
            padding: '6px 12px', borderBottom: '1px solid #DFE1E6',
            fontSize: 11, fontWeight: 700, color: '#6B778C', textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}>
            <span>Work</span>
            {columns.priority && <span style={{ textAlign: 'center' }}>Priority</span>}
            {columns.assignee && <span style={{ textAlign: 'center' }}>Assignee</span>}
            {columns.status && <span style={{ textAlign: 'right' }}>Status</span>}
          </div>
        )}

        {isLoading && <SkeletonRows />}
        {!isLoading && children.length === 0 && !creating && (
          <EmptyState heading="No sub-tasks yet" sub="Break this story into sub-tasks to track progress" cta="+ Create sub-task" onCta={() => setCreating(true)} />
        )}
        {!isLoading && visible.length > 0 && (
          <div className="sdm-child-list" role="list">
            {visible.map(item => (
              <IssueRow key={item.id} item={item} columns={columns}
                onDelete={() => setDeleteTarget({ id: item.id, key: item.issue_key })}
                onCopyLink={() => navigator.clipboard.writeText(`${window.location.origin}/issues/${item.issue_key}`)} />
            ))}
          </div>
        )}

        {/* Inline create — Jira parity: bordered input with type selector */}
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
