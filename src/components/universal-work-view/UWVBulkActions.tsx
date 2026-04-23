// @ts-nocheck
/**
 * UWVBulkActions — appears as a 40px bar replacing the filter row when
 * one or more rows are selected. Bulk-changes status / assignee in ph_issues.
 */

import React from 'react';
import Select from '@atlaskit/select';
import Button from '@atlaskit/button/new';
import { token } from '@atlaskit/tokens';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUWVStatuses, useUWVAssignees } from './useUWVData';
import type { UWVItem } from './uwv.types';

interface Props {
  selectedIds: Set<string>;
  allItems: UWVItem[];
  project: string;
  onClear: () => void;
}

export function UWVBulkActions({ selectedIds, allItems, project, onClear }: Props) {
  const qc = useQueryClient();
  const { data: statusGroups = [] } = useUWVStatuses(project);
  const { data: assignees = [] } = useUWVAssignees(project);

  const selectedItems = allItems.filter((i) => selectedIds.has(i.id));
  const projectHubIds = selectedItems
    .filter((i) => i.hubSource === 'projecthub')
    .map((i) => i.id);

  const bulkUpdateStatus = async (newStatus: string) => {
    if (projectHubIds.length === 0 || !newStatus) return;
    const { error } = await (supabase as any)
      .from('ph_issues')
      .update({ status: newStatus })
      .in('id', projectHubIds);
    if (!error) {
      qc.invalidateQueries({ queryKey: ['uwv-data'] });
      onClear();
    }
  };

  const bulkUpdateAssignee = async (assigneeId: string | null) => {
    if (projectHubIds.length === 0) return;
    const { error } = await (supabase as any)
      .from('ph_issues')
      .update({ assignee_user_id: assigneeId })
      .in('id', projectHubIds);
    if (!error) {
      qc.invalidateQueries({ queryKey: ['uwv-data'] });
      onClear();
    }
  };

  return (
    <div
      style={{
        height: 40,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '0 16px',
        background: token('color.background.selected', '#E9F2FF'),
        borderBottom: '1px solid #DFE1E6',
      }}
    >
      <span style={{ fontSize: 13, fontWeight: 600, color: '#0747A6' }}>
        {selectedIds.size} selected
      </span>

      <div style={{ width: 180 }}>
        <Select
          spacing="compact"
          placeholder="Change status"
          options={statusGroups}
          onChange={(opt: any) => bulkUpdateStatus(opt?.value)}
          isClearable={false}
        />
      </div>

      <div style={{ width: 180 }}>
        <Select
          spacing="compact"
          placeholder="Assign to"
          options={[
            { label: 'Unassigned', value: null },
            ...assignees.map((a: any) => ({ label: a.name, value: a.id })),
          ]}
          onChange={(opt: any) => bulkUpdateAssignee(opt?.value ?? null)}
          isClearable={false}
        />
      </div>

      <div style={{ marginLeft: 'auto' }}>
        <Button appearance="subtle" spacing="compact" onClick={onClear}>
          Clear selection
        </Button>
      </div>
    </div>
  );
}
