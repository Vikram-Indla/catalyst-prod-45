/**
 * DefectsSection — extracted from StoryDetailModal
 */
import React, { useState, useEffect, useRef } from 'react';
import { CornerDownLeft, Loader2, Plus } from 'lucide-react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {} from 'lucide-react';
import type { ColumnConfig, PhIssueRow } from './types';
import { DEFAULT_COLUMNS, WORK_ITEM_ICONS } from './constants';
import { nextPos } from './helpers';
import { SectionBlock, IssueRow, ColumnPicker, InlineCreateRow, SkeletonRows, EmptyState } from './shared-components';
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
        .eq('parent_key', storyKey).in('issue_type', ['QA Bug', 'Defect']).is('deleted_at', null)
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
          <button className="sdm-create-btn" onClick={() => setCreating(true)}><Plus size={11} strokeWidth={2.5} /> Log defect</button>
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
          <InlineCreateRow ref={createRef} value={draftSummary} onChange={setDraftSummary}
            onSubmit={() => { if (draftSummary.trim()) createMutation.mutate(draftSummary); }}
            onCancel={() => { setCreating(false); setDraftSummary(''); }}
            pending={createMutation.isPending} typeIcon={WORK_ITEM_ICONS.Defect} placeholder="Describe the defect…" />
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