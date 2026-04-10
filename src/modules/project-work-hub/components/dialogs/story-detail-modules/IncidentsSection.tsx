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

export function IncidentsSection({ storyKey }: { storyKey: string }) {
  const queryClient = useQueryClient();
  const [columns, setColumns] = useState<ColumnConfig>(DEFAULT_COLUMNS);

  const { data: incidents = [], isLoading } = useQuery({
    queryKey: ['incidents', storyKey],
    queryFn: async () => {
      const { data, error } = await supabase.from('ph_issues')
        .select('id,issue_key,summary,status,status_category,issue_type,assignee_account_id,assignee_display_name,priority,position,jira_created_at,jira_updated_at,deleted_at')
        .eq('parent_key', storyKey).eq('issue_type', 'Production Incident').is('deleted_at', null)
        .order('jira_created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as PhIssueRow[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('ph_issues').update({ deleted_at: new Date().toISOString() }).eq('id', id); if (error) throw error; },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['incidents', storyKey] }),
  });

  const doneCount = incidents.filter(i => i.status_category === 'done').length;

  return (
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
              onDelete={() => { if (confirm(`Unlink ${item.issue_key}?`)) deleteMutation.mutate(item.id); }}
              onCopyLink={() => navigator.clipboard.writeText(`${window.location.origin}/issues/${item.issue_key}`)} />
          ))}
        </div>
      )}
    </SectionBlock>
  );
}
