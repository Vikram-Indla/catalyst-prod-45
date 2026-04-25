/**
 * IncidentsSection — extracted from StoryDetailModal
 */
import React, { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ExternalLink } from 'lucide-react';
import type { ColumnConfig, PhIssueRow } from './types';
import { DEFAULT_COLUMNS } from './constants';
import { SectionBlock, IssueRow, ColumnPicker, SkeletonRows, EmptyState } from './shared-components';
import { ConfirmDialog } from './ConfirmDialog';

export function IncidentsSection({ storyKey }: { storyKey: string }) {
  const queryClient = useQueryClient();
  const [columns, setColumns] = useState<ColumnConfig>(DEFAULT_COLUMNS);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; key: string } | null>(null);

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
          .eq('parent_key', storyKey).eq('issue_type', 'Production Incident')
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

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('ph_issues').update({ deleted_at: new Date().toISOString() }).eq('id', id); if (error) throw error; },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['incidents', storyKey] }),
  });

  const doneCount = incidents.filter(i => i.status_category === 'done').length;

  return (
    <>
      <SectionBlock title="Production Incidents" count={incidents.length} doneCount={doneCount} defaultExpanded={incidents.length > 0} headerRight={
        <>
          <ColumnPicker columns={columns} onChange={setColumns} />
          <button className="sdm-create-btn sdm-visibility-btn"><ExternalLink size={10} /> Link incident</button>
        </>
      }>
        {isLoading && <SkeletonRows count={1} />}
        {!isLoading && incidents.length === 0 && <EmptyState heading="No production incidents" sub="Incidents linked to this story will appear here" />}
        {!isLoading && incidents.length > 0 && (
          <div className="sdm-child-list" role="list">
            {incidents.map(item => (
              <IssueRow key={item.id} item={item} columns={columns}
                onDelete={() => setDeleteTarget({ id: item.id, key: item.issue_key })}
                onCopyLink={() => navigator.clipboard.writeText(`${window.location.origin}/issues/${item.issue_key}`)} />
            ))}
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