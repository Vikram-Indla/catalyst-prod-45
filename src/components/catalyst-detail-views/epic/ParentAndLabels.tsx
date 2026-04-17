/**
 * ParentAndLabels — Above-description Parent row for the Epic detail view.
 *
 * Parent rendering imported verbatim from the Story detail view (BAU-5398 /
 * StoryDetailModal "Key details → Parent" row): canonical `AddParentPicker`
 * with `variant="field"`, the same 100px label column, the same row layout,
 * and the same `handleParentChange` write-path.
 */
import React, { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AddParentPicker } from '@/components/shared/AddParentPicker';
import type { PhIssue, CatalystItemType } from '../shared/types';

interface ParentAndLabelsProps {
  issue: PhIssue | null;
  itemId: string;
  itemType: CatalystItemType;
  projectKey?: string;
  onOpenItem?: (itemId: string) => void;
}

export function ParentAndLabels({ issue, itemId, projectKey }: ParentAndLabelsProps) {
  const queryClient = useQueryClient();

  const handleParentChange = useCallback(
    async (newParentKey: string | null) => {
      await supabase.from('ph_issues').update({ parent_key: newParentKey }).eq('id', itemId);
      await supabase.from('jira_write_back_queue').insert({
        ph_issue_id: itemId,
        field_name: 'parent',
        new_value: newParentKey ?? '',
        status: 'approved',
      });
      queryClient.invalidateQueries({ queryKey: ['catalyst-issue', itemId] });
      queryClient.invalidateQueries({ queryKey: ['ph-issue-detail', itemId] });
    },
    [itemId, queryClient]
  );

  return (
    <div style={{ padding: '4px 0 16px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', minHeight: 28 }}>
        <span style={{ width: 100, flexShrink: 0, fontSize: 13, color: '#5E6C84', paddingTop: 4 }}>
          Parent
        </span>
        <div style={{ flex: 1, fontSize: 13, color: '#172B4D' }}>
          {issue && (
            <AddParentPicker
              issueKey={issue.issue_key}
              parentKey={issue.parent_key ?? null}
              projectKey={issue.project_key || projectKey || ''}
              onParentChange={handleParentChange}
              variant="field"
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default ParentAndLabels;
