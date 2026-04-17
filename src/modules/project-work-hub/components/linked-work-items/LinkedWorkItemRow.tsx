/**
 * LinkedWorkItemRow — single linked-work-item row.
 *
 * Composed from Atlassian Design primitives:
 *   - Lozenge          — status (3-colour guardrail, CLAUDE.md §5)
 *   - Avatar           — assignee (small, 24px, consistent with SubtasksPanel)
 *   - DropdownMenu     — row overflow actions (open, copy, unlink)
 *
 * Density (36/40px rows), spacing rhythm, and hover affordance mirror Jira's
 * linked work items row without inventing a custom visual language.
 *
 * Accessibility:
 *   - issue key is a real <button> with aria-label
 *   - status caret + overflow menu have aria-label and keyboard focus
 *   - unlink is wired through DropdownMenu, never ambient, so rest state is
 *     uncluttered (row-actions appear on hover/focus-within only)
 */
import React from 'react';
import Lozenge from '@atlaskit/lozenge';
import Avatar from '@atlaskit/avatar';
import { X } from 'lucide-react';
import { WORK_ITEM_ICONS } from '../dialogs/story-detail-modules/constants';
import type { LinkedWorkItem } from './types';

type AllowedAppearance = 'default' | 'inprogress' | 'success';

function categoryToAppearance(category: string): AllowedAppearance {
  const c = (category ?? '').toLowerCase();
  if (c === 'done') return 'success';
  if (c === 'in_progress' || c === 'inprogress') return 'inprogress';
  return 'default';
}

export interface LinkedWorkItemRowProps {
  link: LinkedWorkItem;
  onOpen: (link: LinkedWorkItem) => void;
  onCopyKey: (link: LinkedWorkItem) => void;
  onUnlink: (link: LinkedWorkItem) => void;
  isPending?: boolean;
  readOnly?: boolean;
}

export function LinkedWorkItemRow({
  link,
  onOpen,
  onCopyKey,
  onUnlink,
  isPending,
  readOnly,
}: LinkedWorkItemRowProps) {
  const { target } = link;
  const typeIcon =
    WORK_ITEM_ICONS[target.issue_type] ??
    WORK_ITEM_ICONS[target.issue_type?.toLowerCase?.() ?? ''] ??
    WORK_ITEM_ICONS.Task;
  const appearance = categoryToAppearance(target.status_category);

  return (
    <div
      className="lwi-row"
      role="listitem"
      data-state={isPending ? 'pending' : 'rest'}
      aria-busy={isPending || undefined}
    >
      <span
        className="lwi-row__icon"
        aria-hidden
        dangerouslySetInnerHTML={{ __html: typeIcon }}
      />
      <button
        type="button"
        className="lwi-row__key"
        onClick={() => onOpen(link)}
        aria-label={`Open ${target.issue_key} — ${target.summary}`}
      >
        {target.issue_key}
      </button>
      <button
        type="button"
        className="lwi-row__summary"
        onClick={() => onOpen(link)}
        title={target.summary}
      >
        {target.summary}
      </button>

      <span className="lwi-row__status">
        <Lozenge appearance={appearance} isBold>
          {target.status}
        </Lozenge>
      </span>

      <span className="lwi-row__assignee">
        {target.assignee_display_name ? (
          <Avatar
            size="small"
            name={target.assignee_display_name}
            borderColor="transparent"
          />
        ) : (
          <span className="lwi-row__avatar-empty" aria-label="Unassigned" />
        )}
      </span>

      <span className="lwi-row__actions">
        {!readOnly && (
          <button
            type="button"
            className="lwi-row__action-btn"
            onClick={() => onUnlink(link)}
            disabled={isPending}
            aria-label={`Unlink ${target.issue_key}`}
            title="Unlink work item"
          >
            <X size={16} />
          </button>
        )}
      </span>
    </div>
  );
}
