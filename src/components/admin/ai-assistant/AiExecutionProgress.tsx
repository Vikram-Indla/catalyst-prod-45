import React from 'react';
import { Spinner, Lozenge } from '@/components/ads';
import { EXECUTION_STEPS, AssistantStatus, T } from './aiAdminAssistant.types';

type StepState = 'pending' | 'active' | 'done';

function getStepStates(status: AssistantStatus, completedStepIndex: number): StepState[] {
  if (status !== 'executing') return EXECUTION_STEPS.map(() => 'pending');
  return EXECUTION_STEPS.map((_, i) => {
    if (i < completedStepIndex) return 'done';
    if (i === completedStepIndex) return 'active';
    return 'pending';
  });
}

interface AiExecutionProgressProps {
  status: AssistantStatus;
  activeStepIndex?: number;
}

export function AiExecutionProgress({ status, activeStepIndex = 0 }: AiExecutionProgressProps) {
  if (status !== 'executing') return null;

  const states = getStepStates(status, activeStepIndex);

  return (
    <div
      style={{
        margin: '8px 16px',
        border: `1px solid ${T.border}`,
        borderRadius: 6,
        background: T.surface,
        overflow: 'hidden',
      }}
      aria-live="polite"
      aria-label="Execution in progress"
    >
      <div style={{ padding: '8px 12px', background: T.neutral, borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Spinner size="small" />
        <span style={{ fontSize: 12, fontWeight: 600, color: T.subtle }}>Executing plan</span>
      </div>
      <div style={{ padding: '4px 12px 8px' }}>
        {EXECUTION_STEPS.map((step, i) => {
          const state = states[i];
          return (
            <div
              key={step.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '5px 0',
                borderBottom: i < EXECUTION_STEPS.length - 1 ? `1px solid ${T.borderSubtle}` : 'none',
                opacity: state === 'pending' ? 0.45 : 1,
              }}
            >
              <span
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  background: state === 'done' ? T.bgSuccess : state === 'active' ? T.bgBrand : T.neutral,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 10,
                  color: state !== 'pending' ? T.inverse : T.subtle,
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {state === 'done' ? '✓' : i + 1}
              </span>
              <span style={{ flex: 1, fontSize: 12, color: T.text }}>{step.label}</span>
              {state === 'active' && (
                <span style={{ display: 'inline-block' }}>
                  <Lozenge appearance="inprogress">Running</Lozenge>
                </span>
              )}
              {state === 'done' && (
                <span style={{ display: 'inline-block' }}>
                  <Lozenge appearance="success">Done</Lozenge>
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
