/**
 * IncidentsSection — extracted from StoryDetailModal
 *
 * Phase 5 (Apr 2026): added inline "Log incident" CTA + source-aware create
 * (Catalyst-parent → catalyst_issues; Jira-parent → ph_issues). Soft-delete
 * also probes both tables so unlink works regardless of source.
 */
import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { CornerDownLeft, Loader2, Plus } from 'lucide-react';
import type { ColumnConfig, PhIssueRow } from './types';
import { DEFAULT_COLUMNS } from './constants';
import { nextPos } from './helpers';
import { SectionBlock, IssueRow, ColumnPicker, SkeletonRows, EmptyState } from './shared-components';
import { ConfirmDialog } from './ConfirmDialog';
import { createChildIssue, type WorkItemSource } from '../../../lib/workItemRepo';
import { toast } from 'sonner';

export function IncidentsSection({
  storyKey,
  projectKey,
  parentSource = 'jira',
  parentProjectId = null,
}: {
  storyKey: string;
  projectKey?: string;
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

  const { data: incidents = [], isLoading } = useQuery({
    queryKey: ['incidents', storyKey],
    queryFn: async () => {
      const [phRes, catRes] = await Promise.all([
        (supabase as any).from('ph_issues')
          .select('id,issue_key,summary,status,status_category,issue_type,assignee_account_id,assignee_display_name,priority,position,jira_created_at,jira_updated_at,deleted_at')
          .eq('parent_key', storyKey).eq('issue_type', 'Production Incident').is('deleted_at', null).is('archived_at', null)
          .order('jira_created_at', { ascending: false }),
        (supabase as any).from('catalyst_issues')
          .select('id,issue_key,title,status,issue_type,assignee_id,priority,parent_key,created_at,updated_at')
          .eq('parent_key', storyKey).eq('issue_type', 'Production Incident').is('deleted_at', null)
          .order('created_at', { ascending: false }),
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
      if (!projectKey) throw new Error('projectKey is required to log incidents');
      await createChildIssue({
        parent: { source: parentSource, id: '', issueKey: storyKey, projectKey },
        summary,
        issueType: 'Production Incident',
        projectKey,
        projectId: parentProjectId,
        reporterId: user?.id ?? null,
        priority: 'High',
        position: nextPos(incidents),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents', storyKey] });
      setDraftSummary('');
      setTimeout(() => createRef.current?.focus(), 50);
    },
    onError: (err) => toast.error('Failed to log incident', { description: (err as Error).message }),
  });

  // Source-aware soft-delete: try ph_issues first; fall back to catalyst_issues.
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const ts = new Date().toISOString();
      const phRes = await supabase.from('ph_issues').update({ deleted_at: ts }).eq('id', id).select('id');
      if (phRes.data && phRes.data.length > 0) return;
      const catRes = await supabase.from('catalyst_issues').update({ deleted_at: ts }).eq('id', id).select('id');
      if (catRes.error) throw catRes.error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['incidents', storyKey] }),
  });

  useEffect(() => { if (creating) setTimeout(() => createRef.current?.focus(), 50); }, [creating]);
  const doneCount = incidents.filter(i => i.status_category === 'done').length;

  return (
    <>
      <SectionBlock title="Production Incidents" count={incidents.length} doneCount={doneCount} defaultExpanded={incidents.length > 0} headerRight={
        <>
          <ColumnPicker columns={columns} onChange={setColumns} />
          <button onClick={() => setCreating(true)} title="Log incident" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 24, height: 24, border: 'none', borderRadius: 3, background: 'transparent',
            cursor: 'pointer', color: 'var(--ds-text-subtlest, var(--ds-text-subtlest, #6B778C))', transition: 'background 0.15s, color 0.15s',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--ds-surface-sunken, var(--ds-surface-sunken, #F4F5F7))'; e.currentTarget.style.color = 'var(--ds-text, var(--ds-text, #172B4D))'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--ds-text-subtlest, var(--ds-text-subtlest, #6B778C))'; }}
          >
            <Plus size={16} strokeWidth={2} />
          </button>
        </>
      }>
        {isLoading && <SkeletonRows count={1} />}
        {!isLoading && incidents.length === 0 && <EmptyState heading="No production incidents" sub="Incidents linked to this story will appear here" cta="+ Log incident" onCta={() => setCreating(true)} />}
        {!isLoading && incidents.length > 0 && (
          <div className="sdm-child-list" role="list">
            {incidents.map(item => (
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
            background: 'var(--ds-surface, var(--ds-surface, var(--ds-surface, #fff)))', overflow: 'hidden',
          }}>
            <input ref={createRef} type="text" placeholder="Describe the incident…" value={draftSummary}
              onChange={e => setDraftSummary(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && draftSummary.trim()) { e.preventDefault(); createMutation.mutate(draftSummary); } if (e.key === 'Escape') { setCreating(false); setDraftSummary(''); } }}
              maxLength={255}
              style={{ flex: 1, height: 36, padding: '0 12px', border: 'none', outline: 'none', fontSize: 14, color: 'var(--ds-text, var(--ds-text, #172B4D))', fontFamily: 'inherit', background: 'transparent' }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '0 8px', borderLeft: '1px solid #DFE1E6' }}>
              <button onClick={() => { if (draftSummary.trim()) createMutation.mutate(draftSummary); }}
                disabled={!draftSummary.trim() || createMutation.isPending} title="Create (Enter)"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, border: '1px solid #DFE1E6', borderRadius: 3, background: 'var(--ds-surface-sunken, var(--ds-surface-sunken, #F4F5F7))', cursor: draftSummary.trim() ? 'pointer' : 'not-allowed', color: 'var(--ds-text-subtlest, var(--ds-text-subtlest, #6B778C))', opacity: draftSummary.trim() ? 1 : 0.5 }}
              >
                {createMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <CornerDownLeft size={14} />}
              </button>
            </div>
          </div>
        )}
        {creating && (
          <div style={{ textAlign: 'right', padding: '6px 0 2px' }}>
            <button onClick={() => { setCreating(false); setDraftSummary(''); }}
              style={{ background: 'none', border: 'none', fontSize: 13, color: 'var(--ds-text-subtlest, var(--ds-text-subtlest, #6B778C))', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
          </div>
        )}
      </SectionBlock>
      <ConfirmDialog
        open={!!deleteTarget}
        title={`Unlink ${deleteTarget?.key ?? ''}?`}
        message="This incident will be unlinked from the story."
        confirmLabel="Unlink"
        onConfirm={() => { if (deleteTarget) deleteMutation.mutate(deleteTarget.id); setDeleteTarget(null); }}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
