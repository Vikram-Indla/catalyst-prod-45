/**
 * ParentAndLabels — Above-description metadata strip for the Epic detail view.
 *
 * Parent rendering is imported verbatim from the Story detail view (BAU-5398 /
 * StoryDetailModal "Key details → Parent" row): the canonical `AddParentPicker`
 * with `variant="field"`, the same 100px label column, the same row layout, and
 * the same `handleParentChange` write-path (ph_issues update + jira write-back).
 *
 * Labels: read-only chip strip sourced from `ph_issues.labels`.
 */
import React, { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AddParentPicker } from '@/components/shared/AddParentPicker';
import type { PhIssue } from '../shared/types';
import type { CatalystItemType } from '../shared/types';

interface ParentAndLabelsProps {
  issue: PhIssue | null;
  itemId: string;
  itemType: CatalystItemType;
  projectKey?: string;
  onOpenItem?: (itemId: string) => void;
}

const LABEL_CHIP: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  height: 22,
  padding: '0 8px',
  borderRadius: 3,
  background: '#F1F2F4',
  color: '#44546F',
  fontSize: 12,
  fontWeight: 500,
  whiteSpace: 'nowrap',
};

export function ParentAndLabels({
  issue,
  itemId,
  projectKey,
}: ParentAndLabelsProps) {
  const queryClient = useQueryClient();
  const labels = (issue?.labels ?? []).filter(Boolean);

  // Mirror StoryDetailModal handleParentChange (lines 544-547)
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
      {/* Parent — exact row style from StoryDetailModal Key Details */}
      <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 12, minHeight: 28 }}>
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

      {/* Labels — same row rhythm */}
      <div style={{ display: 'flex', alignItems: 'flex-start', minHeight: 28 }}>
        <span style={{ width: 100, flexShrink: 0, fontSize: 13, color: '#5E6C84', paddingTop: 4 }}>
          Labels
        </span>
        <div style={{ flex: 1, paddingTop: 2 }}>
          {labels.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {labels.map((l) => (
                <span key={l} style={LABEL_CHIP}>
                  {l}
                </span>
              ))}
            </div>
          ) : (
            <span style={{ fontSize: 13, color: '#7A869A' }}>None</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default ParentAndLabels;
