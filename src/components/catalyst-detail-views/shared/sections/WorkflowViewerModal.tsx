/**
 * WorkflowViewerModal — Shows the workflow diagram for a given issue type.
 *
 * Triggered by "View workflow" in CatalystStatusPill. Reads workflow
 * definitions from the WorkflowProvider (which merges /admin/workflow
 * overrides from localStorage on top of the hardcoded SDLC/Bug/Simple
 * defaults).
 *
 * Visual layout: linear state chain with arrows + verb labels.
 * anyToThis/anyFromThis states shown with dashed "any" connectors.
 * Current status highlighted with a bold border.
 *
 * Atlaskit: @atlaskit/modal-dialog, @atlaskit/lozenge, @atlaskit/tokens.
 */
import React from 'react';
import Modal, {
  ModalTransition,
  ModalHeader,
  ModalTitle,
  ModalBody,
  ModalFooter,
} from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/new';
import Lozenge from '@atlaskit/lozenge';
import { token } from '@atlaskit/tokens';
import { useWorkflows } from '@/lib/workflows';
import { statusToLozenge } from '@/modules/project-work-hub/utils/statusToLozenge';
import type { Workflow, WorkflowState } from '@/lib/workflows';

interface WorkflowViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  issueType?: string | null;
  currentStatus?: string | null;
}

/** Arrow between state nodes */
function Arrow({ label }: { label?: string }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', flexShrink: 0, minWidth: 48,
    }}>
      {label && (
        <span style={{
          fontSize: 10, fontWeight: 500,
          color: token('color.text.subtle', '#505258'),
          marginBottom: 2, whiteSpace: 'nowrap', maxWidth: 80,
          overflow: 'hidden', textOverflow: 'ellipsis',
          textAlign: 'center',
        }}>
          {label}
        </span>
      )}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 0,
        color: token('color.text.subtle', '#505258'),
      }}>
        <div style={{ height: 2, width: 28, background: 'currentColor' }} />
        <span style={{ fontSize: 12, marginLeft: -1 }}>▶</span>
      </div>
    </div>
  );
}

/** Single state node */
function StateNode({
  state,
  isCurrent,
  isInitial,
  isAnyHub,
}: {
  state: WorkflowState;
  isCurrent: boolean;
  isInitial: boolean;
  isAnyHub: boolean;
}) {
  const appearance = statusToLozenge(state.name);
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
      flexShrink: 0,
    }}>
      {isInitial && (
        <span style={{
          fontSize: 10, color: token('color.text.subtle', '#505258'),
          fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em',
        }}>Start</span>
      )}
      <div style={{
        padding: isCurrent ? '3px 6px' : '2px 4px',
        border: isCurrent
          ? `2px solid ${token('color.border.focused', '#388BFF')}`
          : isAnyHub
          ? `2px dashed ${token('color.border', '#DFE1E6')}`
          : '2px solid transparent',
        borderRadius: 6,
        background: isCurrent ? token('color.background.selected', '#E9F2FF') : 'transparent',
      }}>
        <span data-cp-lozenge-jira-parity style={{ display: 'inline-block' }}>
          <Lozenge
            appearance={appearance}
            isBold={appearance !== 'default'}
            testId={`catalyst-workflow-viewer.state.${state.id}`}
          >
            {state.name}
          </Lozenge>
        </span>
      </div>
      {isAnyHub && (
        <span style={{
          fontSize: 9, color: token('color.text.subtlest', '#8590A2'),
          textAlign: 'center',
        }}>any → here</span>
      )}
    </div>
  );
}

/** Build a simple linearised ordered list of states by following explicit transitions */
function lineariseStates(workflow: Workflow): WorkflowState[] {
  if (workflow.states.length === 0) return [];

  // If any-to-any (Simple workflow), just return states as-is
  const allAny = workflow.states.every(s => s.anyToThis);
  if (allAny) return workflow.states;

  // Walk the explicit transition chain starting from initialState
  const visited = new Set<string>();
  const ordered: WorkflowState[] = [];
  const stateMap = new Map(workflow.states.map(s => [s.id, s]));

  // Build adjacency list for forward transitions
  const forwardEdges = new Map<string, string[]>();
  for (const t of workflow.transitions) {
    const list = forwardEdges.get(t.from) ?? [];
    list.push(t.to);
    forwardEdges.set(t.from, list);
  }

  // BFS starting from initial state — take the first (primary) forward edge each time
  let current = workflow.initialStateId;
  while (current && !visited.has(current)) {
    visited.add(current);
    const s = stateMap.get(current);
    if (s) ordered.push(s);
    const nexts = (forwardEdges.get(current) ?? []).filter(id => !visited.has(id));
    current = nexts[0] ?? '';
  }

  // Append any states not yet visited (alternative paths, anyToThis hubs)
  for (const s of workflow.states) {
    if (!visited.has(s.id)) ordered.push(s);
  }

  return ordered;
}

/** Get the primary transition verb between two consecutive states */
function getTransitionVerb(workflow: Workflow, fromId: string, toId: string): string | undefined {
  return workflow.transitions.find(t => t.from === fromId && t.to === toId)?.verb;
}

export function WorkflowViewerModal({
  isOpen, onClose, issueType, currentStatus,
}: WorkflowViewerModalProps) {
  const workflowCtx = useWorkflows();
  const workflow = (issueType && workflowCtx?.getWorkflowForIssueType)
    ? workflowCtx.getWorkflowForIssueType(issueType)
    : undefined;

  return (
    <ModalTransition>
      {isOpen && (
        <Modal
          onClose={onClose}
          testId="catalyst-workflow-viewer-modal"
          width="x-large"
        >
          <ModalHeader>
            <ModalTitle>
              {workflow ? `${workflow.name} workflow` : 'Workflow'}
              {issueType && (
                <span style={{
                  marginLeft: 8, fontSize: 13,
                  color: token('color.text.subtle', '#505258'),
                  fontWeight: 400,
                }}>
                  · {issueType}
                </span>
              )}
            </ModalTitle>
          </ModalHeader>
          <ModalBody>
            {!workflow ? (
              <div style={{
                padding: 24, textAlign: 'center',
                color: token('color.text.subtle', '#505258'),
                fontSize: 14,
              }}>
                No workflow found for issue type "{issueType ?? 'unknown'}".
                Configure workflows at{' '}
                <a
                  href="/admin/workhub/jira-activity-sync"
                  style={{ color: token('color.text.brand', '#0C66E4') }}
                  target="_blank"
                  rel="noreferrer"
                >
                  /admin/workhub/jira-activity-sync
                </a>.
              </div>
            ) : (
              <div style={{ padding: '16px 0' }}>
                {/* Header info */}
                <div style={{
                  marginBottom: 20,
                  padding: '10px 14px',
                  background: token('color.background.neutral', '#F4F5F7'),
                  borderRadius: 6,
                  fontSize: 13,
                  color: token('color.text.subtle', '#505258'),
                  display: 'flex', gap: 24, flexWrap: 'wrap',
                }}>
                  <span><strong>Workflow:</strong> {workflow.name}</span>
                  <span><strong>States:</strong> {workflow.states.length}</span>
                  <span><strong>Transitions:</strong> {
                    workflow.transitions.length > 0
                      ? workflow.transitions.length
                      : 'Any → Any'
                  }</span>
                  <span><strong>Applies to:</strong> {workflow.issueTypes.join(', ')}</span>
                </div>

                {/* Flow diagram — horizontal scroll when states overflow */}
                <div style={{
                  overflowX: 'auto',
                  paddingBottom: 16,
                }}>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0,
                    padding: '16px 20px',
                    minWidth: 'max-content',
                    background: token('elevation.surface.sunken', '#F7F8F9'),
                    borderRadius: 8,
                    border: `1px solid ${token('color.border', '#DFE1E6')}`,
                  }}>
                    {(() => {
                      const ordered = lineariseStates(workflow);
                      const allAny = workflow.states.every(s => s.anyToThis);
                      return ordered.map((state, idx) => {
                        const isCurrent = !!currentStatus &&
                          state.name.toLowerCase() === currentStatus.toLowerCase();
                        const isInitial = state.id === workflow.initialStateId;
                        const isAnyHub = !!state.anyToThis;
                        const prevState = idx > 0 ? ordered[idx - 1] : null;
                        const verb = prevState
                          ? getTransitionVerb(workflow, prevState.id, state.id)
                          : undefined;

                        return (
                          <React.Fragment key={state.id}>
                            {idx > 0 && (
                              <Arrow label={allAny ? '↔' : verb} />
                            )}
                            <StateNode
                              state={state}
                              isCurrent={isCurrent}
                              isInitial={isInitial}
                              isAnyHub={isAnyHub && !allAny}
                            />
                          </React.Fragment>
                        );
                      });
                    })()}
                  </div>
                </div>

                {/* Transitions table */}
                {workflow.transitions.length > 0 && (
                  <div style={{ marginTop: 20 }}>
                    <div style={{
                      fontSize: 12, fontWeight: 700,
                      color: token('color.text.subtle', '#505258'),
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      marginBottom: 8,
                    }}>Transitions</div>
                    <div style={{
                      border: `1px solid ${token('color.border', '#DFE1E6')}`,
                      borderRadius: 6, overflow: 'hidden',
                    }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                          <tr style={{ background: token('color.background.neutral', '#F4F5F7') }}>
                            <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: token('color.text', '#292A2E'), borderBottom: `1px solid ${token('color.border', '#DFE1E6')}` }}>Action</th>
                            <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: token('color.text', '#292A2E'), borderBottom: `1px solid ${token('color.border', '#DFE1E6')}` }}>From</th>
                            <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: token('color.text', '#292A2E'), borderBottom: `1px solid ${token('color.border', '#DFE1E6')}` }}>→ To</th>
                          </tr>
                        </thead>
                        <tbody>
                          {workflow.transitions.map((t, i) => {
                            const fromState = workflow.states.find(s => s.id === t.from);
                            const toState = workflow.states.find(s => s.id === t.to);
                            return (
                              <tr
                                key={`${t.from}-${t.to}-${i}`}
                                style={{
                                  borderBottom: i < workflow.transitions.length - 1
                                    ? `1px solid ${token('color.border', '#DFE1E6')}`
                                    : 'none',
                                }}
                              >
                                <td style={{ padding: '8px 12px', color: token('color.text', '#292A2E'), fontWeight: 500 }}>{t.verb}</td>
                                <td style={{ padding: '8px 12px' }}>
                                  {fromState && (
                                    <span data-cp-lozenge-jira-parity style={{ display: 'inline-block' }}>
                                      <Lozenge appearance={statusToLozenge(fromState.name)}>{fromState.name}</Lozenge>
                                    </span>
                                  )}
                                </td>
                                <td style={{ padding: '8px 12px' }}>
                                  {toState && (
                                    <span data-cp-lozenge-jira-parity style={{ display: 'inline-block' }}>
                                      <Lozenge
                                        appearance={statusToLozenge(toState.name)}
                                        isBold={statusToLozenge(toState.name) !== 'default'}
                                      >
                                        {toState.name}
                                      </Lozenge>
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Configure link */}
                <div style={{
                  marginTop: 16, fontSize: 12,
                  color: token('color.text.subtle', '#505258'),
                }}>
                  <a
                    href="/admin/workhub/jira-activity-sync"
                    style={{ color: token('color.text.brand', '#0C66E4') }}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Configure workflows in Admin
                  </a>
                </div>
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button appearance="subtle" onClick={onClose}>Close</Button>
          </ModalFooter>
        </Modal>
      )}
    </ModalTransition>
  );
}
