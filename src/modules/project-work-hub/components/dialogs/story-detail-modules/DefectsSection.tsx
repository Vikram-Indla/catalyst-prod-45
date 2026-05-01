/**
 * DefectsSection — extracted from StoryDetailModal
 *
 * Phase 5 (Apr 2026): source-aware create. When the parent story is a
 * Catalyst-native item, new defects land in catalyst_issues with parent_key
 * set. When the parent is Jira-synced, new defects land in ph_issues for
 * back-compat with the Jira write-back pipeline.
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
import { createChildIssue, type WorkItemSource } from '../../../lib/workItemRepo';
import { toast } from 'sonner';

export function DefectsSection({
  storyKey,
  projectKey,
  parentSource = 'jira',
  parentProjectId = null,
}: {
  storyKey: string;
  projectKey: string;
  parentSource?: WorkItemSource;
  parentProjectId?: string | null;
}) {
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
      const [phRes, catRes] = await Promise.all([
        (supabase as any).from('ph_issues')
          .select('id,issue_key,summary,status,status_category,issue_type,assignee_account_id,assignee_display_name,priority,position,jira_created_at,jira_updated_at,deleted_at')
          .eq('parent_key', storyKey).in('issue_type', ['QA Bug', 'Defect']).is('deleted_at', null).is('archived_at', null)
          .order('position', { ascending: true }),
        (supabase as any).from('catalyst_issues')
          .select('id,issue_key,title,status,issue_type,assignee_id,priority,parent_key,created_at,updated_at')
          .eq('parent_key', storyKey).in('issue_type', ['QA Bug', 'Defect'])
          .order('created_at', { ascending: true }),
      ]);
      if (phRes.error) throw phRes.error;
      const ph = (phRes.data ?? []) as PhIssueRow[];
      const seen = new Set(ph.map((r) => r.issue_key));
      const cat: PhIssueRow[] = (catRes.data ?? [])
        .filter((r: any) => r.issue_key && !seen.has(r.issue_key))
        .map((r: any) => ({
          id: r.id,
          issue_key: r.issue_key,
          summary: r.title,
          status: r.status,
          status_category: 'todo',
          issue_type: r.issue_type,
          assignee_account_id: r.assignee_id ?? null,
          assignee_display_name: null,
          priority: r.priority,
          position: null,
          jira_created_at: r.created_at,
          jira_updated_at: r.updated_at,
          deleted_at: null,
        }));
      return [...ph, ...cat];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (summary: string) => {
      await createChildIssue({
        parent: { source: parentSource, id: '', issueKey: storyKey, projectKey },
        summary,
        issueType: 'Defect',
        projectKey,
        projectId: parentProjectId,
        reporterId: user?.id ?? null,
        priority: 'High',
        position: nextPos(defects),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['defects', storyKey] });
      setDraftSummary('');
      setTimeout(() => createRef.current?.focus(), 50);
    },
    onError: (err) => toast.error('Failed to log defect', { description: (err as Error).message }),
  });

  // Source-aware soft-delete: try ph_issues first; if no row, try catalyst_issues.
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const ts = new Date().toISOString();
      const phRes = await supabase.from('ph_issues').update({ deleted_at: ts }).eq('id', id).select('id');
      if (phRes.data && phRes.data.length > 0) return;
      const catRes = await supabase.from('catalyst_issues').update({ deleted_at: ts }).eq('id', id).select('id');
      if (catRes.error) throw catRes.error;
    },
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
            cursor: 'pointer', color: 'var(--ds-text-subtlest, #6B778C)', transition: 'background 0.15s, color 0.15s',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--ds-surface-sunken, #F4F5F7)'; e.currentTarget.style.color = 'var(--ds-text, #172B4D)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--ds-text-subtlest, #6B778C)'; }}
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
            background: 'var(--ds-surface, #fff)', overflow: 'hidden',
          }}>
            <input ref={createRef} type="text" placeholder="Describe the defect…" value={draftSummary}
              onChange={e => setDraftSummary(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && draftSummary.trim()) { e.preventDefault(); createMutation.mutate(draftSummary); } if (e.key === 'Escape') { setCreating(false); setDraftSummary(''); } }}
              maxLength={255}
              style={{ flex: 1, height: 36, padding: '0 12px', border: 'none', outline: 'none', fontSize: 14, color: 'var(--ds-text, #172B4D)', fontFamily: 'inherit', background: 'transparent' }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '0 8px', borderLeft: '1px solid #DFE1E6' }}>
              <button onClick={() => { if (draftSummary.trim()) createMutation.mutate(draftSummary); }}
                disabled={!draftSummary.trim() || createMutation.isPending} title="Create (Enter)"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, border: '1px solid #DFE1E6', borderRadius: 3, background: 'var(--ds-surface-sunken, #F4F5F7)', cursor: draftSummary.trim() ? 'pointer' : 'not-allowed', color: 'var(--ds-text-subtlest, #6B778C)', opacity: draftSummary.trim() ? 1 : 0.5 }}
              >
                {createMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <CornerDownLeft size={14} />}
              </button>
            </div>
          </div>
        )}
        {creating && (
          <div style={{ textAlign: 'right', padding: '6px 0 2px' }}>
            <button onClick={() => { setCreating(false); setDraftSummary(''); }}
              style={{ background: 'none', border: 'none', fontSize: 13, color: 'var(--ds-text-subtlest, #6B778C)', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
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