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
import CatalystAvatar from '@/components/shared/CatalystAvatar';
import CloseIcon from '@atlaskit/icon/core/close';
import { PriorityBars, normalisePriority } from '@/components/shared/PriorityIndicator';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { StatusLozengeDropdown } from '@/components/shared/StatusLozenge';
import { resolveAvatarUrl } from '@/lib/avatars';
import type { LinkedWorkItem } from './types';

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

  return (
    <div
      className="lwi-row"
      role="listitem"
      data-state={isPending ? 'pending' : 'rest'}
      aria-busy={isPending || undefined}
    >
      <span className="lwi-row__icon" aria-hidden>
        <JiraIssueTypeIcon type={target.issue_type} size={16} />
      </span>
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
        <StatusLozengeDropdown
          status={target.status}
          statusCategory={target.status_category}
          issueType={target.issue_type}
          interactive={false}
          size="sm"
        />
      </span>

      <span className="lwi-row__assignee">
        {target.assignee_display_name ? (
          <CatalystAvatar
            size="small"
            name={target.assignee_display_name}
            src={resolveAvatarUrl(target.assignee_display_name) /* §19 chokepoint: never pass external URL */}
            borderColor="transparent"
          />
        ) : (
          <span className="lwi-row__avatar-empty" aria-label="Unassigned" />
        )}
      </span>

      <span className="lwi-row__priority" aria-label={`Priority: ${target.priority ?? 'None'}`}>
        <PriorityBars priority={normalisePriority(target.priority)} />
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
            <CloseIcon label="" size="small" />
          </button>
        )}
      </span>
    </div>
  );
}
