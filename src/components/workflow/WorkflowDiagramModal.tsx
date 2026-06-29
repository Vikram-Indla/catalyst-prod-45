/**
 * WorkflowDiagramModal — Atlaskit Modal showing the full state transition
 * diagram for a given workflow. Highlights the current state.
 *
 * Opened from the "View workflow" footer row in StatusTransitionDropdown.
 */
import React from 'react';
import Modal, {
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  ModalTransition,
} from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button';
import type { Workflow, WorkflowState, StatusCategory } from '../../lib/workflows/types';
import { StatusLozenge, type LozengeAppearance } from '@/components/shared/StatusLozenge';

const WF_CAT_TO_APPEARANCE: Record<StatusCategory, LozengeAppearance> = {
  default: 'default', inprogress: 'inprogress', success: 'success',
  removed: 'removed', new: 'new', moved: 'moved',
};

interface Props {
  workflow: Workflow;
  currentStateId: string;
  onClose: () => void;
}

const CATEGORY_BG: Record<StatusCategory, string> = {
  default:    'var(--ds-border)',
  inprogress: 'var(--ds-background-information)',
  success:    'var(--ds-background-success-bold)',
  removed:    '#FD9891', // ads-scanner:ignore-line — intentional design color, no ADS token equivalent
  new:        '#D8A0F7', // ads-scanner:ignore-line — intentional design color, no ADS token equivalent
  moved:      '#F9C84E', // ads-scanner:ignore-line — intentional design color, no ADS token equivalent
};

export function WorkflowDiagramModal({ workflow, currentStateId, onClose }: Props) {
  const allAnyToThis = workflow.states.every(s => s.anyToThis);

  return (
    <ModalTransition>
      <Modal onClose={onClose} width="x-large">
        <ModalHeader>
          <ModalTitle>{workflow.name} workflow</ModalTitle>
        </ModalHeader>
        <ModalBody>
          <p style={{ color: 'var(--cp-text-secondary, var(--cp-text-secondary))', margin: '0 0 16px 0', fontSize: 'var(--ds-font-size-400)' }}>
            Bound to issue types: <strong>{workflow.issueTypes.join(', ')}</strong>.
            {allAnyToThis && ' Every state can transition to every other state (Any-to-Any).'}
          </p>

          {/* Visual diagram — simple row of state pills with arrows between */}
          <WorkflowSvg workflow={workflow} currentStateId={currentStateId} />

          {/* Detailed transition table below */}
          <h4 style={{ fontSize: 'var(--ds-font-size-200)', textTransform: 'uppercase', color: 'var(--ds-text-subtlest, var(--cp-text-secondary))', margin: '24px 0 8px' }}>
            Transitions
          </h4>
          <TransitionTable workflow={workflow} />
        </ModalBody>
        <ModalFooter>
          <Button appearance="primary" onClick={onClose}>
            Close
          </Button>
        </ModalFooter>
      </Modal>
    </ModalTransition>
  );
}

function WorkflowSvg({ workflow, currentStateId }: { workflow: Workflow; currentStateId: string }) {
  // Lay states out in rows of 4 for readability.
  const cols = 4;
  const cellW = 200;
  const cellH = 56;
  const gapX = 32;
  const gapY = 80;
  const padding = 20;

  const positions = new Map<string, { x: number; y: number }>();
  workflow.states.forEach((s, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    positions.set(s.id, {
      x: padding + col * (cellW + gapX),
      y: padding + row * (cellH + gapY),
    });
  });

  const width = padding * 2 + cols * cellW + (cols - 1) * gapX;
  const rows = Math.ceil(workflow.states.length / cols);
  const height = padding * 2 + rows * cellH + (rows - 1) * gapY;

  const allAnyToThis = workflow.states.every(s => s.anyToThis);

  return (
    <div style={{ overflowX: 'auto', border: '1px solid var(--cp-lozenge-grey-bg, var(--cp-border-neutral))', borderRadius: 6, padding: 8, background: 'var(--ds-surface-sunken)' }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} xmlns="http://www.w3.org/2000/svg">
        <defs>
          <marker id="wf-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--ds-text-disabled)" />
          </marker>
        </defs>

        {/* Transitions */}
        {workflow.transitions.map((t, i) => {
          const from = positions.get(t.from);
          const to = positions.get(t.to);
          if (!from || !to) return null;
          const x1 = from.x + cellW / 2;
          const y1 = from.y + cellH;
          const x2 = to.x + cellW / 2;
          const y2 = to.y;
          return (
            <line key={`${t.from}-${t.to}-${i}`}
              x1={x1} y1={y1} x2={x2} y2={y2}
              stroke="var(--ds-text-disabled)" strokeWidth={1}
              markerEnd="url(#wf-arrow)"
              opacity={0.5}
            />
          );
        })}

        {/* Any-to-Any hint: draw a dashed bounding rect */}
        {allAnyToThis && (
          <rect
            x={padding - 4}
            y={padding - 4}
            width={width - padding * 2 + 8}
            height={height - padding * 2 + 8}
            fill="none"
            stroke="var(--ds-border-disabled)"
            strokeWidth={1}
            strokeDasharray="4 4"
            rx={8}
          />
        )}

        {/* States */}
        {workflow.states.map(state => {
          const pos = positions.get(state.id)!;
          const isCurrent = state.id === currentStateId;
          return (
            <g key={state.id} transform={`translate(${pos.x}, ${pos.y})`}>
              <rect
                width={cellW}
                height={cellH}
                rx={8}
                fill={CATEGORY_BG[state.category]}
                stroke={isCurrent ? 'var(--ds-link)' : 'transparent'}
                strokeWidth={isCurrent ? 2 : 0}
              />
              <text
                x={cellW / 2}
                y={cellH / 2 + 5}
                fontFamily='"Atlassian Sans", -apple-system, "Segoe UI", sans-serif'
                fontSize={'var(--ds-font-size-400)'}
                fontWeight={600}
                textAnchor="middle"
                fill="var(--ds-text)"
              >
                {state.name}
              </text>
              {isCurrent && (
                <text x={cellW / 2} y={cellH + 14}
                  fontFamily='"Atlassian Sans", sans-serif'
                  fontSize={'var(--ds-font-size-50)'}
                  fontWeight={700}
                  textAnchor="middle"
                  fill="var(--ds-link)"
                >
                  CURRENT
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function TransitionTable({ workflow }: { workflow: Workflow }) {
  const byId = new Map(workflow.states.map(s => [s.id, s]));
  if (workflow.transitions.length === 0) {
    return (
      <p style={{ fontSize: 'var(--ds-font-size-300)', color: 'var(--cp-text-secondary, var(--cp-text-secondary))' }}>
        No explicit transitions — this workflow uses Any-to-Any.
      </p>
    );
  }
  return (
    <div style={{ border: '1px solid var(--cp-lozenge-grey-bg, var(--cp-border-neutral))', borderRadius: 6, overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--ds-font-size-300)' }}>
        <thead>
          <tr style={{ background: 'var(--ds-surface-sunken, var(--cp-bg-sunken))', textAlign: 'left' }}>
            <th style={{ padding: '8px 12px', color: 'var(--ds-text-subtlest, var(--cp-text-secondary))', fontSize: 'var(--ds-font-size-100)', textTransform: 'uppercase', fontWeight: 700 }}>From</th>
            <th style={{ padding: '8px 12px', color: 'var(--ds-text-subtlest, var(--cp-text-secondary))', fontSize: 'var(--ds-font-size-100)', textTransform: 'uppercase', fontWeight: 700 }}>Verb</th>
            <th style={{ padding: '8px 12px', color: 'var(--ds-text-subtlest, var(--cp-text-secondary))', fontSize: 'var(--ds-font-size-100)', textTransform: 'uppercase', fontWeight: 700 }}>To</th>
          </tr>
        </thead>
        <tbody>
          {workflow.transitions.map((t, i) => {
            const from = byId.get(t.from);
            const to = byId.get(t.to);
            if (!from || !to) return null;
            return (
              <tr key={`${t.from}-${t.to}-${i}`} style={{ borderTop: '1px solid var(--ds-border)' }}>
                <td style={{ padding: '8px 12px' }}>
                  <StatusLozenge status={from.name} appearance={WF_CAT_TO_APPEARANCE[from.category]} />
                </td>
                <td style={{ padding: '8px 12px', color: 'var(--cp-text-secondary, var(--cp-text-secondary))' }}>{t.verb}</td>
                <td style={{ padding: '8px 12px' }}>
                  <StatusLozenge status={to.name} appearance={WF_CAT_TO_APPEARANCE[to.category]} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
