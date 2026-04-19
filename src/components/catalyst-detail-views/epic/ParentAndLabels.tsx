/**
 * ParentAndLabels — Above-description Parent row for the Epic detail view.
 *
 * Uses the canonical AddParentPicker (Story-parity styling) but with parentSource="business_request",
 * so only Business Requests are selectable. Visual UX is identical to the Story view (BAU-5398).
 *
 * Jira-parity rule (2026-04-19): when no parent is set, hide this body-level
 * row entirely. The sidebar Key Details retains its own "Add parent" trigger,
 * and the breadcrumb SquarePen is always available at the top. Rendering an
 * empty "Parent" row inline with Description creates a double dead-end — Jira
 * does not do this.
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
  // Jira parity: suppress the body Parent row when there's no parent — the
  // sidebar + breadcrumb already provide two Add-parent entry points.
  if (!issue.parent_key) return null;

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
