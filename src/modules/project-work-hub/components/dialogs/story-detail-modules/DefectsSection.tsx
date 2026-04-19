/**
 * DefectsSection — extracted from StoryDetailModal
 */
import React, { useState, useEffect, useRef } from 'react';
import { CornerDownLeft, Loader2, Plus } from 'lucide-react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { ColumnConfig, PhIssueRow } from './types';
import { DEFAULT_COLUMNS } from './constants';
import { nextPos } from './helpers';
import { SectionBlock, IssueRow, ColumnPicker, SkeletonRows, EmptyState } from './shared-components';
import { ConfirmDialog } from './ConfirmDialog';

export function DefectsSection({ storyKey, projectKey }: { storyKey: string; projectKey: string }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [columns, setColumns] = useState<ColumnConfig>(DEFAULT_COLUMNS);
  const [creating, setCreating] = useState(false);
  const [draftSummary, setDraftSummary] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; key: string } | null>(null);
  const createRef = useRef<HTMLInputElement>(null);

  const { data: defects = [], isLoading } = useQuery({
    queryKey: ['defects', storyKey],
    queryFn: async () => {
      const { data, error } = await supabase.from('ph_issues')
        .select('id,issue_key,summary,status,status_category,issue_type,assignee_account_id,assignee_display_name,priority,position,jira_created_at,jira_updated_at,deleted_at')
        .eq('parent_key', storyKey).in('issue_type', ['QA Bug', 'Defect']).is('deleted_at', null).is('archived_at', null)
        .order('position', { ascending: true });
      if (error) throw error;
      return (data ?? []) as PhIssueRow[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (summary: string) => {
      const tempKey = `${projectKey}-DEF-${Date.now()}`;
      const { error } = await supabase.from('ph_issues').insert({
        issue_key: tempKey, summary: summary.trim(), issue_type: 'Defect',
        parent_key: storyKey, project_key: projectKey, status: 'To Do',
        status_category: 'todo', priority: 'High', position: nextPos(defects),
        reporter_account_id: user?.id, source: 'catalyst',
      });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['defects', storyKey] }); setDraftSummary(''); setTimeout(() => createRef.current?.focus(), 50); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('ph_issues').update({ deleted_at: new Date().toISOString() }).eq('id', id); if (error) throw error; },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['defects', storyKey] }),
  });

  useEffect(() => { if (creating) setTimeout(() => createRef.current?.focus(), 50); }, [creating]);
  const doneCount = defects.filter(d => d.status_category === 'done').length;

  return (
    <>
      <SectionBlock title="Defects" count={defects.length} doneCount={doneCount} defaultExpanded={defects.length > 0} headerRight={
        <>
          <ColumnPicker columns={columns} onChange={setColumns} />
          <button onClick={() => setCreating(true)} title="Log defect" style={{
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
        {isLoading && <SkeletonRows count={2} />}
        {!isLoading && defects.length === 0 && <EmptyState heading="No defects logged" sub="Log defects found during testing" cta="+ Log defect" onCta={() => setCreating(true)} />}
        {!isLoading && defects.length > 0 && (
          <div className="sdm-child-list" role="list">
            {defects.map(item => (
              <IssueRow key={item.id} item={item} columns={columns}
                onDelete={() => setDeleteTarget({ id: item.id, key: item.issue_key })}
                onCopyLink={() => navigator.clipboard.writeText(`${window.location.origin}/issues/${item.issue_key}`)} />
            ))}
          </div>
        )}
        {creating && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 0,
            border: '2px solid #4C9AFF', borderRadius: 3, margin: '4px 0 0',
            background: '#fff', overflow: 'hidden',
          }}>
            <input ref={createRef} type="text" placeholder="Describe the defect…" value={draftSummary}
              onChange={e => setDraftSummary(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && draftSummary.trim()) { e.preventDefault(); createMutation.mutate(draftSummary); } if (e.key === 'Escape') { setCreating(false); setDraftSummary(''); } }}
              maxLength={255}
              style={{ flex: 1, height: 36, padding: '0 12px', border: 'none', outline: 'none', fontSize: 14, color: '#172B4D', fontFamily: 'inherit', background: 'transparent' }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '0 8px', borderLeft: '1px solid #DFE1E6' }}>
              <button onClick={() => { if (draftSummary.trim()) createMutation.mutate(draftSummary); }}
                disabled={!draftSummary.trim() || createMutation.isPending} title="Create (Enter)"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, border: '1px solid #DFE1E6', borderRadius: 3, background: '#F4F5F7', cursor: draftSummary.trim() ? 'pointer' : 'not-allowed', color: '#6B778C', opacity: draftSummary.trim() ? 1 : 0.5 }}
              >
                {createMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <CornerDownLeft size={14} />}
              </button>
            </div>
          </div>
        )}
        {creating && (
          <div style={{ textAlign: 'right', padding: '6px 0 2px' }}>
            <button onClick={() => { setCreating(false); setDraftSummary(''); }}
              style={{ background: 'none', border: 'none', fontSize: 13, color: '#6B778C', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
          </div>
        )}
      </SectionBlock>
      <ConfirmDialog
        open={!!deleteTarget}
        title={`Delete ${deleteTarget?.key ?? ''}?`}
        message="This defect will be soft-deleted. It can be restored within 30 days."
        confirmLabel="Delete"
        onConfirm={() => { if (deleteTarget) deleteMutation.mutate(deleteTarget.id); setDeleteTarget(null); }}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}