/**
 * StatusTransitionDropdown — Jira-parity status picker for an issue.
 *
 * Trigger: the current-status Lozenge rendered as a 32px button (Jira-style).
 * Menu rows: target lozenge, grouped by category (todo / in_progress / done).
 * Footer: "View workflow" opens CatalystWorkflowModal.
 *
 * Source of truth: ph_workflow_* tables via useIssueTypeWorkflow —
 * the same data source that /admin/workflows manages.
 */
import React, { useCallback, useState } from 'react';
import DropdownMenu, {
  DropdownItem,
  DropdownItemGroup,
} from '@atlaskit/dropdown-menu';
import Lozenge from '@atlaskit/lozenge';
import { useIssueTypeWorkflow } from '@/hooks/useIssueTypeWorkflow';
import { JiraStatusLozenge } from './JiraStatusLozenge';
import { CatalystWorkflowModal } from '../catalyst-detail-views/shared/workflow/CatalystWorkflowModal';
import type { WorkItemType } from '@/hooks/useTypeWorkflow';

export interface StatusTransitionDropdownProps {
  /** Jira issue_type string — resolves via ALIASES in useIssueTypeWorkflow */
  issueType: string;
  /** Current status NAME (e.g. "In Progress") */
  currentStatusName: string | null | undefined;
  /** Called with the target status NAME after the user picks a transition */
  onTransition?: (targetStatusName: string) => void;
  /** Disable the trigger (no menu opens) */
  isDisabled?: boolean;
  /** Compact trigger — smaller padding, suitable for table cells */
  size?: 'default' | 'compact';
}

export function StatusTransitionDropdown({
  issueType,
  currentStatusName,
  onTransition,
  isDisabled,
  size = 'default',
}: StatusTransitionDropdownProps) {
  const { statusGroups, getAvailableStatuses, isLoading } = useIssueTypeWorkflow(issueType);
  const [isWorkflowModalOpen, setIsWorkflowModalOpen] = useState(false);

  // Find the current status in the groups to get its category
  const currentStatusEntry = statusGroups
    .flatMap(g => g.statuses.map(s => ({ name: s.name, category: g.category })))
    .find(s => s.name === currentStatusName);

  // All status names the user can transition to from the current status
  const availableStatusNames = getAvailableStatuses(currentStatusName);

  const handleSelect = useCallback(
    (targetName: string) => {
      onTransition?.(targetName);
    },
    [onTransition],
  );

  if (isLoading) {
    return (
      <span data-cp-lozenge-jira-parity style={{ display: 'inline-block' }}>
        <Lozenge appearance="default">{currentStatusName || '…'}</Lozenge>
      </span>
    );
  }

  if (!currentStatusEntry && !currentStatusName) {
    return (
      <span data-cp-lozenge-jira-parity style={{ display: 'inline-block' }}>
        <Lozenge appearance="default" isBold>Unknown</Lozenge>
      </span>
    );
  }

  const triggerPadding = size === 'compact' ? '2px 6px' : '0 10px';
  const triggerHeight = size === 'compact' ? 24 : 32;

  return (
    <>
      <DropdownMenu
        trigger={({ triggerRef, ...triggerProps }) => (
          <button
            type="button"
            {...triggerProps}
            ref={triggerRef as React.Ref<HTMLButtonElement>}
            disabled={isDisabled}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              height: triggerHeight,
              padding: triggerPadding,
              borderRadius: 3,
              border: 'none',
              cursor: isDisabled ? 'not-allowed' : 'pointer',
              background: 'transparent',
              font: 'inherit',
            }}
            aria-label={`Status: ${currentStatusName ?? 'Unknown'}. Click to change.`}
          >
            <JiraStatusLozenge
              category={currentStatusEntry?.category ?? 'default'}
              name={currentStatusName ?? '—'}
            />
            <span aria-hidden="true" style={{ fontSize: 10, color: 'var(--ds-text-subtlest, #44546F)' }}>▾</span>
          </button>
        )}
        placement="bottom-start"
        spacing="compact"
      >
        <DropdownItemGroup>
          {availableStatusNames.length === 0 && (
            <DropdownItem isDisabled>No transitions available</DropdownItem>
          )}
          {availableStatusNames
            .filter(name => name !== currentStatusName)
            .map(name => {
              const entry = statusGroups
                .flatMap(g => g.statuses.map(s => ({ name: s.name, category: g.category })))
                .find(s => s.name === name);
              return (
                <DropdownItem
                  key={name}
                  onClick={() => handleSelect(name)}
                >
                  <span data-cp-lozenge-jira-parity style={{ display: 'inline-block' }}>
                    <JiraStatusLozenge
                      category={entry?.category ?? 'default'}
                      name={name}
                      variant="subtle"
                    />
                  </span>
                </DropdownItem>
              );
            })
          }
        </DropdownItemGroup>
        <DropdownItemGroup hasSeparator>
          <DropdownItem onClick={() => setIsWorkflowModalOpen(true)}>
            View workflow
          </DropdownItem>
        </DropdownItemGroup>
      </DropdownMenu>

      {isWorkflowModalOpen && (
        <CatalystWorkflowModal
          issueTypeName={issueType as WorkItemType}
          currentStatusName={currentStatusName ?? undefined}
          onClose={() => setIsWorkflowModalOpen(false)}
        />
      )}
    </>
  );
}
