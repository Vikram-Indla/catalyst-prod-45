/**
 * StatusTransitionDropdown — Jira-parity status picker for an issue.
 *
 * Trigger: the current-status Lozenge rendered as a 32px button (Jira-style).
 * Menu rows: action verb (left) → target lozenge (right), mirroring image 4
 * from the product brief. Footer: "View workflow" opens WorkflowDiagramModal.
 */
import React, { useCallback, useMemo, useState } from 'react';
import DropdownMenu, {
  DropdownItem,
  DropdownItemGroup,
} from '@atlaskit/dropdown-menu';
import Lozenge from '@atlaskit/lozenge';
import { useWorkflow } from '../../lib/workflows/WorkflowProvider';
import type { IssueType, Transition, WorkflowState, StatusCategory } from '../../lib/workflows/types';
import { JiraStatusLozenge } from './JiraStatusLozenge';
import { WorkflowDiagramModal } from './WorkflowDiagramModal';

const APPEARANCE_MAP: Record<StatusCategory, 'default' | 'inprogress' | 'success' | 'removed' | 'new' | 'moved'> = {
  default:    'default',
  inprogress: 'inprogress',
  success:    'success',
  removed:    'removed',
  new:        'new',
  moved:      'moved',
};

export interface StatusTransitionDropdownProps {
  /** Issue type — determines which workflow is used */
  issueType: IssueType | string;
  /** Current state ID (e.g. "under_implementation"). If unknown, falls back to initial state. */
  currentStateId: string;
  /** Called with the target state ID after the user picks a transition */
  onTransition?: (targetStateId: string, transition: Transition) => void;
  /** Disable the trigger (no menu opens) */
  isDisabled?: boolean;
  /** Compact trigger — smaller padding, suitable for table cells */
  size?: 'default' | 'compact';
}

export function StatusTransitionDropdown({
  issueType,
  currentStateId,
  onTransition,
  isDisabled,
  size = 'default',
}: StatusTransitionDropdownProps) {
  const workflow = useWorkflow(issueType);
  const [isWorkflowModalOpen, setIsWorkflowModalOpen] = useState(false);

  const currentState: WorkflowState | undefined = useMemo(() => {
    if (!workflow) return undefined;
    return workflow.states.find(s => s.id === currentStateId)
      ?? workflow.states.find(s => s.id === workflow.initialStateId);
  }, [workflow, currentStateId]);

  const availableTransitions: Transition[] = useMemo(() => {
    if (!workflow || !currentState) return [];
    const explicit = workflow.transitions.filter(t => t.from === currentState.id);

    // Any-to-Any logic for the Simple workflow
    const implicit: Transition[] = [];
    const allAnyToThis = workflow.states.every(s => s.anyToThis);
    if (allAnyToThis || currentState.anyFromThis) {
      workflow.states.forEach(target => {
        if (target.id === currentState.id) return;
        if (explicit.some(e => e.to === target.id)) return;
        implicit.push({ from: currentState.id, to: target.id, verb: target.name });
      });
    }
    return [...explicit, ...implicit];
  }, [workflow, currentState]);

  const handleSelect = useCallback(
    (transition: Transition) => {
      if (!workflow) return;
      const target = workflow.states.find(s => s.id === transition.to);
      if (!target) return;
      onTransition?.(target.id, transition);
    },
    [workflow, onTransition],
  );

  if (!workflow || !currentState) {
    // Fallback lozenge if the issue type is unmapped
    return (
      <Lozenge appearance="default" isBold>
        {currentStateId || 'Unknown'}
      </Lozenge>
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
            aria-label={`Status: ${currentState.name}. Click to change.`}
          >
            <JiraStatusLozenge
              category={currentState.category}
              name={currentState.name}
            />
            <span aria-hidden="true" style={{ fontSize: 10, color: '#44546F' }}>▾</span>
          </button>
        )}
        placement="bottom-start"
        spacing="compact"
      >
        <DropdownItemGroup>
          {availableTransitions.length === 0 && (
            <DropdownItem isDisabled>No transitions available</DropdownItem>
          )}
          {availableTransitions.map(tr => {
            const target = workflow.states.find(s => s.id === tr.to);
            if (!target) return null;
            return (
              <DropdownItem
                key={`${tr.from}->${tr.to}`}
                onClick={() => handleSelect(tr)}
              >
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto auto',
                    alignItems: 'center',
                    gap: 12,
                    minWidth: 220,
                  }}
                >
                  <span style={{ color: '#44546F' }}>{tr.verb}</span>
                  <span aria-hidden="true" style={{ color: '#8590A2' }}>→</span>
                  <Lozenge appearance={APPEARANCE_MAP[target.category]} isBold>
                    {target.name}
                  </Lozenge>
                </div>
              </DropdownItem>
            );
          })}
        </DropdownItemGroup>
        <DropdownItemGroup hasSeparator>
          <DropdownItem onClick={() => setIsWorkflowModalOpen(true)}>
            View workflow
          </DropdownItem>
        </DropdownItemGroup>
      </DropdownMenu>

      {isWorkflowModalOpen && (
        <WorkflowDiagramModal
          workflow={workflow}
          currentStateId={currentState.id}
          onClose={() => setIsWorkflowModalOpen(false)}
        />
      )}
    </>
  );
}
