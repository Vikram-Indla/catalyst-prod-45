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
import Lozenge from '@atlaskit/lozenge';
import CatalystAvatar from '@/components/shared/CatalystAvatar';
import CloseIcon from '@atlaskit/icon/core/close';
import ChevronDownIcon from '@atlaskit/icon/utility/chevron-down';
import PersonIcon from '@atlaskit/icon/glyph/person';
import { PriorityIcon } from '@/components/icons/PriorityIcon';
import { WORK_ITEM_ICONS } from '../dialogs/story-detail-modules/constants';
import type { LinkedWorkItem } from './types';

type AllowedAppearance = 'default' | 'inprogress' | 'success';

function categoryToAppearance(category: string): AllowedAppearance {
  const c = (category ?? '').toLowerCase();
  if (c === 'done') return 'success';
  if (c === 'in_progress' || c === 'inprogress') return 'inprogress';
  return 'default';
}

const HEAD = {
  cells: [
    { key: 'type', content: <span className="lwi-dt-head">Type</span>, width: 4 },
    { key: 'key', content: <span className="lwi-dt-head">Key</span>, width: 10 },
    { key: 'summary', content: <span className="lwi-dt-head">Summary</span> },
    { key: 'status', content: <span className="lwi-dt-head">Status</span>, width: 15 },
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
}

export function LinkTypeGroup({
  linkType,
  links,
  onOpen,
  onCopyKey,
  onUnlink,
  pendingUnlinkIds,
  readOnly,
}: LinkTypeGroupProps) {
  const rows = links.map((link) => {
    const { target } = link;
    const isPending = pendingUnlinkIds?.has(link.id);
    const typeIcon =
      WORK_ITEM_ICONS[target.issue_type] ??
      WORK_ITEM_ICONS[target.issue_type?.toLowerCase?.() ?? ''] ??
      WORK_ITEM_ICONS.Task;
    const appearance = categoryToAppearance(target.status_category);

    return {
      key: link.id,
      cells: [
        {
          key: 'type',
          content: (
            <span
              className="lwi-row__icon"
              aria-hidden
              dangerouslySetInnerHTML={{ __html: typeIcon }}
            />
          ),
        },
        {
          key: 'key',
          content: (
            <button
              type="button"
              className="lwi-row__key"
              data-done={appearance === 'success' ? 'true' : undefined}
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
            <span className="lwi-row__status">
              <Lozenge appearance={appearance}>{target.status}</Lozenge>
              <span className="lwi-row__status-caret" aria-hidden>
                <ChevronDownIcon label="" color="currentColor" />
              </span>
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
            >
              <PriorityIcon level={target.priority} size={16} label="" />
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
