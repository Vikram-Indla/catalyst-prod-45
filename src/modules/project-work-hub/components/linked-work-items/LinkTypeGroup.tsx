/**
 * LinkTypeGroup — renders all linked rows for a single link type.
 *
 * Uses @atlaskit/dynamic-table for a semantic <table> structure matching
 * Jira's native-issue-table layout (jira-compare DC4 2026-05-11).
 *
 * jira-compare: Jira linked work items renders aria-rowgroup / <tbody> rows
 * with 4 sortable columns (Work, Priority, Assignee, Status). DynamicTable
 * is the closest public Atlaskit equivalent (@atlaskit/dynamic-table@^18.4.0).
 * Column headers are visually hidden to match Jira's compact linked-items
 * presentation, but remain in the DOM for assistive technology.
 */
import React from 'react';
import DynamicTable from '@atlaskit/dynamic-table';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/lib/catalystToast';
import CatalystAvatar from '@/components/shared/CatalystAvatar';
import CloseIcon from '@atlaskit/icon/core/close';
import PersonIcon from '@atlaskit/icon/glyph/person';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { StatusLozengeDropdown } from '@/components/shared/StatusLozenge';
import { EditablePriority } from '../dialogs/story-detail-modules/EditableFields';
import type { LinkedWorkItem } from './types';

function isDone(category: string | null | undefined): boolean {
  return (category ?? '').toLowerCase() === 'done';
}

const HEAD = {
  cells: [
    { key: 'type', content: <span className="lwi-dt-head">Type</span>, width: 4 },
    { key: 'key', content: <span className="lwi-dt-head">Key</span>, width: 8 },
    { key: 'summary', content: <span className="lwi-dt-head">Summary</span> },
    /* 20 units: at 15 the cell clipped the longest workflow lozenge
       ("READY FOR DEVELOPM…") on the work-item detail page. */
    { key: 'status', content: <span className="lwi-dt-head">Status</span>, width: 20 },
    { key: 'assignee', content: <span className="lwi-dt-head">Assignee</span>, width: 5 },
    { key: 'priority', content: <span className="lwi-dt-head">Priority</span>, width: 5 },
    { key: 'actions', content: <span className="lwi-dt-head">Actions</span>, width: 5 },
  ],
};

export interface LinkTypeGroupProps {
  linkType: string;
  links: LinkedWorkItem[];
  onOpen: (link: LinkedWorkItem) => void;
  onCopyKey: (link: LinkedWorkItem) => void;
  onUnlink: (link: LinkedWorkItem) => void;
  pendingUnlinkIds?: Set<string>;
  readOnly?: boolean;
  /** Source issue key — used to invalidate the linked-issues query after
   *  a row-level status / priority edit. When omitted (rare), edits are
   *  fire-and-forget and the parent query refetches on its own cadence. */
  sourceIssueKey?: string;
}

export function LinkTypeGroup({
  linkType,
  links,
  onOpen,
  onCopyKey,
  onUnlink,
  pendingUnlinkIds,
  readOnly,
  sourceIssueKey,
}: LinkTypeGroupProps) {
  const queryClient = useQueryClient();
  const invalidate = React.useCallback(() => {
    if (sourceIssueKey) {
      queryClient.invalidateQueries({ queryKey: ['linkedIssues', sourceIssueKey] });
    }
  }, [queryClient, sourceIssueKey]);

  const statusMutation = useMutation({
    mutationFn: async ({ issueKey, status }: { issueKey: string; status: string }) => {
      const { error } = await supabase
        .from('ph_issues')
        .update({ status } as any)
        .eq('issue_key', issueKey);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (err: any) => catalystToast.error('Failed to update status', err?.message),
  });

  const rows = links.map((link) => {
    const { target } = link;
    const isPending = pendingUnlinkIds?.has(link.id);
    const done = isDone(target.status_category);

    return {
      key: link.id,
      cells: [
        {
          key: 'type',
          content: (
            <span className="lwi-row__icon" aria-hidden>
              <JiraIssueTypeIcon type={target.issue_type} size={16} />
            </span>
          ),
        },
        {
          key: 'key',
          content: (
            <button
              type="button"
              className="lwi-row__key"
              data-done={done ? 'true' : undefined}
              onClick={() => onOpen(link)}
              aria-label={`Open ${target.issue_key} — ${target.summary}`}
            >
              {target.issue_key}
            </button>
          ),
        },
        {
          key: 'summary',
          content: (
            <button
              type="button"
              className="lwi-row__summary"
              onClick={() => onOpen(link)}
              title={target.summary}
            >
              {target.summary}
            </button>
          ),
        },
        {
          key: 'status',
          content: (
            <span className="lwi-row__status" onClick={(e) => e.stopPropagation()}>
              <StatusLozengeDropdown
                status={target.status}
                statusCategory={target.status_category}
                issueType={target.issue_type}
                interactive={!readOnly}
                size="sm"
                lockWhenDone
                onStatusChange={(next) => statusMutation.mutate({ issueKey: target.issue_key, status: next })}
              />
            </span>
          ),
        },
        {
          key: 'assignee',
          content: (
            <span className="lwi-row__assignee">
              {target.assignee_display_name ? (
                <CatalystAvatar
                  size="small"
                  name={target.assignee_display_name}
                  borderColor="transparent"
                />
              ) : (
                <span className="lwi-row__avatar-empty" aria-label="Unassigned">
                  <PersonIcon label="" primaryColor="var(--ds-text-subtle)" size="small" />
                </span>
              )}
            </span>
          ),
        },
        {
          key: 'priority',
          content: (
            <span
              className="lwi-row__priority"
              aria-label={`Priority: ${target.priority ?? 'None'}`}
              onClick={(e) => e.stopPropagation()}
            >
              {readOnly ? (
                <span aria-hidden style={{ opacity: 0.9 }}>{target.priority ?? '—'}</span>
              ) : (
                <EditablePriority
                  issueKey={target.issue_key}
                  currentPriority={target.priority ?? ''}
                  onUpdate={invalidate}
                  hideClear
                />
              )}
            </span>
          ),
        },
        {
          key: 'actions',
          content: (
            <span
              className="lwi-row__actions"
              data-state={isPending ? 'pending' : 'rest'}
            >
              {!readOnly && (
                <button
                  type="button"
                  className="lwi-row__action-btn"
                  onClick={() => onUnlink(link)}
                  disabled={isPending}
                  aria-label={`Unlink ${target.issue_key}`}
                  title="Unlink work item"
                >
                  <CloseIcon label="" size="small" />
                </button>
              )}
            </span>
          ),
        },
      ],
    };
  });

  return (
    <div className="lwi-group">
      <div className="lwi-group__header" id={`lwi-group-${linkType}`}>
        {linkType}
      </div>
      <div className="lwi-group__rows" aria-labelledby={`lwi-group-${linkType}`}>
        <DynamicTable
          head={HEAD}
          rows={rows}
          isFixedSize
        />
      </div>
    </div>
  );
}
