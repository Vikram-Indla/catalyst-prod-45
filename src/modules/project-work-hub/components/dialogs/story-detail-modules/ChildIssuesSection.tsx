/**
 * ChildIssuesSection — extracted from StoryDetailModal
 */
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Plus, Eye, EyeOff } from 'lucide-react';
import type { ColumnConfig, PhIssueRow } from './types';
import { DEFAULT_COLUMNS, WORK_ITEM_ICONS } from './constants';
import { nextPos } from './helpers';
import { SectionBlock, IssueRow, ColumnPicker, InlineCreateRow, SkeletonRows, EmptyState } from './shared-components';

export function ChildIssuesSection({ storyKey, storyId, projectKey }: { storyKey: string; storyId: string; projectKey: string }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [columns, setColumns] = useState<ColumnConfig>(DEFAULT_COLUMNS);
  const [showDone, setShowDone] = useState(true);
  const [creating, setCreating] = useState(false);
  const [draftSummary, setDraftSummary] = useState('');
  const [draftType, setDraftType] = useState<'task' | 'bug'>('task');
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
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['childIssues', storyKey] }); setDraftSummary(''); setTimeout(() => createRef.current?.focus(), 50); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('ph_issues').update({ deleted_at: new Date().toISOString() }).eq('id', id); if (error) throw error; },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['childIssues', storyKey] }),
  });

  useEffect(() => { if (creating) setTimeout(() => createRef.current?.focus(), 50); }, [creating]);

  return (
    <SectionBlock title="Child Issues" count={children.length} doneCount={doneCount} defaultExpanded headerRight={
      <>
        {doneCount > 0 && (
          <button className="sdm-visibility-btn" onClick={() => setShowDone(s => !s)}>
            {showDone ? <><Eye size={11} /> Hide done</> : <><EyeOff size={11} /> Show done ({doneCount})</>}
          </button>
        )}
        <ColumnPicker columns={columns} onChange={setColumns} />
        <button className="sdm-create-btn" onClick={() => setCreating(true)}><Plus size={11} strokeWidth={2.5} /> Create child</button>
      </>
    }>
      {isLoading && <SkeletonRows />}
      {!isLoading && children.length === 0 && <EmptyState heading="No child issues yet" sub="Break this story into tasks to track progress" cta="+ Create child issue" onCta={() => setCreating(true)} />}
      {!isLoading && visible.length > 0 && (
        <div className="sdm-child-list" role="list">
          {visible.map(item => (
            <IssueRow key={item.id} item={item} columns={columns}
              onDelete={() => { if (confirm(`Delete ${item.issue_key}?`)) deleteMutation.mutate(item.id); }}
              onCopyLink={() => navigator.clipboard.writeText(`${window.location.origin}/issues/${item.issue_key}`)} />
          ))}
        </div>
      )}
      {creating && (
        <InlineCreateRow ref={createRef} value={draftSummary} onChange={setDraftSummary}
          onSubmit={() => { if (draftSummary.trim()) createMutation.mutate(draftSummary); }}
          onCancel={() => { setCreating(false); setDraftSummary(''); }}
          pending={createMutation.isPending} typeIcon={WORK_ITEM_ICONS[draftType]} onTypeToggle={() => setDraftType(t => t === 'task' ? 'bug' : 'task')} placeholder="What needs to be done?" />
      )}
    </SectionBlock>
  );
}
