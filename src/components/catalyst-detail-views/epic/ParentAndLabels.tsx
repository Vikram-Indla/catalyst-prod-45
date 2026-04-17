/**
 * ParentAndLabels — Above-description Parent row for the Epic detail view.
 *
 * Uses the canonical AddParentPicker (Story-parity styling) but with parentSource="business_request",
 * so only Business Requests are selectable. Visual UX is identical to the Story view (BAU-5398).
 */
import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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

  const updateParent = useMutation({
    mutationFn: async (newParentKey: string | null) => {
      await supabase.from('ph_issues').update({ parent_key: newParentKey }).eq('id', itemId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cv-issue-detail', itemId] });
      queryClient.invalidateQueries({ queryKey: ['ph-parent-summary'] });
    },
  });

  if (!issue) return null;

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, padding: '11px 0' }}>
      <span style={{ fontSize: 14, fontWeight: 500, lineHeight: '18.67px', color: '#505258', minWidth: 96, flexShrink: 0 }}>
        Parent
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <AddParentPicker
          issueKey={issue.issue_key}
          parentKey={issue.parent_key ?? null}
          projectKey={issue.project_key || projectKey || ''}
          parentSource="business_request"
          parentIssueType="Business Request"
          variant="field"
          onParentChange={(key) => updateParent.mutateAsync(key)}
        />
      </div>
    </div>
  );
}

export default ParentAndLabels;
