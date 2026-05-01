/**
 * TestHub Execution Page — Execution Run Mode (step-by-step)
 * Extracted from TestHubExecutionPage.tsx
 */
import React from 'react';
import {
  CheckCircle2, XCircle, AlertTriangle, SkipForward, Zap,
  ChevronLeft, ChevronRight, RotateCcw,
} from 'lucide-react';
import { StepProgressIndicator } from '@/components/testhub/execution/StepProgressIndicator';

interface ExecutionHistoryRecord {
  id: string;
  execution_number: number;
  result: string;
  executed_by: string | null;
  executed_at: string;
  step_results: Array<{
    step_number: number;
    title: string;
    status: string;
    notes: string;
  }>;
  executor?: { full_name: string } | null;
}

interface TestStep {
  id: string;
  step_number: number;
  action: string;
  expected_result?: string;
  shared_step_id?: string;
  test_case_id: string;
}

interface StepStatus {
  stepIndex: number;
  status: 'not_run' | 'passed' | 'failed' | 'blocked' | 'skipped';
}

const highlightVariables = (text: string) => {
  if (!text) return null;
  const parts = text.split(/(\{\{[^}]+\}\})/g);
  return parts.map((part, i) => {
    if (part.match(/^\{\{[^}]+\}\}$/)) {
      return <span key={i} style={{ backgroundColor: 'rgba(37,99,235,0.15)', color: '#2563EB', padding: '2px 6px', borderRadius: 4, fontFamily: 'monospace', fontSize: '0.9em' }}>{part}</span>;
    }
    return part;
  });
};

interface ExecutionRunModeProps {
  testCase: {
    case_key: string;
    title: string;
    description: string | null;
    preconditions: string | null;
    priority?: { id: string; name: string; color: string } | null;
  };
  currentStatus: string;
  isVersionDrifted: boolean;
  lockedVersion?: number | null;
  currentVersion?: number | null;
  isDark: boolean;
  statusConfig: Record<string, { icon: any; color: string; bg: string; label: string }>;
  fastTrackMode: boolean;
  previousRunData: ExecutionHistoryRecord | null;
  steps: TestStep[];
  currentStepIndex: number;
  setCurrentStepIndex: (i: number) => void;
  currentStepStatuses: StepStatus[];
  notes: string;
  setNotes: (v: string) => void;
  // Navigation
  currentIndex: number;
  filteredCount: number;
  canGoPrev: boolean;
  canGoNext: boolean;
  canGoPrevStep: boolean;
  canGoNextStep: boolean;
  isSubmitting: boolean;
  // Actions
  onPass: () => void;
  onFail: () => void;
  onBlocked: () => void;
  onSkip: () => void;
  onReset: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onPrevStep: () => void;
  onNextStep: () => void;
  onCompleteExecution: () => void;
  derivedStatus: string;
  anyStepMarked: boolean;
}

export function ExecutionRunMode({
  testCase, currentStatus, isVersionDrifted, lockedVersion, currentVersion,
  isDark, statusConfig, fastTrackMode, previousRunData,
  steps, currentStepIndex, setCurrentStepIndex, currentStepStatuses,
  notes, setNotes,
  currentIndex, filteredCount, canGoPrev, canGoNext,
  canGoPrevStep, canGoNextStep, isSubmitting,
  onPass, onFail, onBlocked, onSkip, onReset,
  onPrevious, onNext, onPrevStep, onNextStep,
  onCompleteExecution, derivedStatus, anyStepMarked,
}: ExecutionRunModeProps) {
  const currentStep = steps[currentStepIndex];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Test case header */}
      <div style={{ padding: '16px 24px', borderBottom: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'hsl(var(--primary))', backgroundColor: 'hsl(var(--primary) / 0.1)', padding: '3px 10px', borderRadius: 5 }}>
            {testCase.case_key}
          </span>
          <span style={{
            fontSize: 11, fontWeight: 500, padding: '3px 8px', borderRadius: 6,
            color: statusConfig[currentStatus]?.color,
            backgroundColor: statusConfig[currentStatus]?.bg,
          }}>
            {statusConfig[currentStatus]?.label}
          </span>
          <span style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))', padding: '3px 8px', backgroundColor: 'hsl(var(--muted) / 0.3)', borderRadius: 6, textTransform: 'capitalize' }}>
            {testCase.priority?.name || 'Medium'}
          </span>
          {fastTrackMode && (
            <span style={{ fontSize: 10, fontWeight: 700, color: '#D97706', backgroundColor: '#FEF3C7', padding: '3px 8px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 3 }}>
              <Zap size={10} /> FAST TRACK
            </span>
          )}
          {previousRunData && (
            <span style={{ fontSize: 10, fontWeight: 600, color: '#2563EB', backgroundColor: '#EFF6FF', padding: '3px 8px', borderRadius: 5 }}>
              RE-RUN (prev: Run #{previousRunData.execution_number})
            </span>
          )}
        </div>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'hsl(var(--foreground))', margin: 0, lineHeight: 1.3 }}>{testCase.title}</h2>
        {testCase.description && <p style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))', margin: '6px 0 0', lineHeight: 1.4 }}>{testCase.description}</p>}
        {isVersionDrifted && (
          <div style={{
            marginTop: 10, padding: '8px 12px', borderRadius: 6,
            backgroundColor: 'var(--cp-warning-light, #FFFBEB)',
            border: `1px solid ${'var(--cp-warning-light, #FDE68A)'}`,
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 12, color: 'var(--cp-warning-text, #92400E)',
          }}>
            <AlertTriangle size={14} style={{ color: '#D97706', flexShrink: 0 }} />
            <span>
              This test case has been updated since it was added to this cycle
              (locked v{lockedVersion} → current v{currentVersion}).
              Execution continues against the original scoped version.
            </span>
          </div>
        )}
      </div>

      {/* Step progress indicator */}
      {steps.length > 0 && !fastTrackMode && (
        <div style={{ padding: '10px 24px', borderBottom: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'hsl(var(--muted-foreground))' }}>
              Step {currentStepIndex + 1} of {steps.length}
            </span>
          </div>
          <StepProgressIndicator
            steps={currentStepStatuses.map((s, i) => ({ step_number: i + 1, status: s.status }))}
            currentIndex={currentStepIndex}
            onStepClick={setCurrentStepIndex}
          />
        </div>
      )}

      {/* Step content area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          {/* Preconditions */}
          {testCase.preconditions && (
            <div style={{ marginBottom: 20, padding: 14, backgroundColor: 'var(--cp-warning-light, #FFFBEB)', border: `1px solid ${'var(--cp-warning-light, #FDE68A)'}`, borderRadius: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <AlertTriangle size={14} style={{ color: '#D97706' }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: '#92400E' }}>Preconditions</span>
              </div>
              <p style={{ fontSize: 13, color: '#92400E', margin: 0, lineHeight: 1.4 }}>{highlightVariables(testCase.preconditions)}</p>
            </div>
          )}

          {/* Current step card or FastTrack view */}
          {fastTrackMode || steps.length === 0 ? (
            /* FastTrack: show all steps as read-only, whole-test P/F */
            <div>
              {steps.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {steps.map((step, i) => (
                    <div key={i} style={{ padding: '10px 14px', backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }}>
                      <div style={{ display: 'flex', gap: 10 }}>
                        <span style={{ width: 22, height: 22, borderRadius: '50%', backgroundColor: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {step.step_number || i + 1}
                        </span>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: 13, color: 'hsl(var(--foreground))', margin: 0 }}>{highlightVariables(step.action)}</p>
                          {step.expected_result && (
                            <p style={{ fontSize: 12, color: '#059669', margin: '6px 0 0', paddingLeft: 10, borderLeft: '2px solid #A7F3D0' }}>{highlightVariables(step.expected_result)}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: 32, textAlign: 'center', color: 'hsl(var(--muted-foreground))' }}>
                  No steps defined — mark test result directly.
                </div>
              )}
            </div>
           ) : currentStep ? (
             /* Step-by-step mode: show current step */
             <div id={`step-card-${currentStepIndex}`} style={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, overflow: 'hidden', transition: 'background-color 0.2s' }}>
               <div style={{ padding: '12px 16px', backgroundColor: 'hsl(var(--muted) / 0.3)', borderBottom: '1px solid hsl(var(--border))', display: 'flex', alignItems: 'center', gap: 10 }}>
                 <span style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                   {currentStep.step_number || currentStepIndex + 1}
                 </span>
                 <span style={{ fontSize: 14, fontWeight: 600, color: 'hsl(var(--foreground))' }}>
                   Step {currentStep.step_number || currentStepIndex + 1}
                 </span>
                 {currentStepStatuses[currentStepIndex]?.status !== 'not_run' && (
                   <span style={{
                     fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
                     color: statusConfig[currentStepStatuses[currentStepIndex].status]?.color,
                     backgroundColor: statusConfig[currentStepStatuses[currentStepIndex].status]?.bg,
                   }}>
                     {statusConfig[currentStepStatuses[currentStepIndex].status]?.label}
                   </span>
                 )}
               </div>
               <div style={{ padding: 20 }}>
                 <div style={{ marginBottom: 4 }}>
                   <span style={{ fontSize: 10, fontWeight: 700, color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase', letterSpacing: '0.06em' }}>ACTION</span>
                 </div>
                 <p style={{ fontSize: 15, color: 'hsl(var(--foreground))', margin: '6px 0 0', lineHeight: 1.6 }}>
                   {highlightVariables(currentStep.action)}
                 </p>

                 {currentStep.expected_result && (
                   <div style={{ marginTop: 16, padding: 14, backgroundColor: 'var(--cp-success-light, #ECFDF5)', borderRadius: 8, borderLeft: '3px solid #10B981' }}>
                     <span style={{ fontSize: 10, fontWeight: 700, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.06em' }}>EXPECTED</span>
                     <p style={{ fontSize: 14, color: 'var(--cp-success-text, #065F46)', margin: '4px 0 0', lineHeight: 1.5 }}>
                       {highlightVariables(currentStep.expected_result)}
                     </p>
                   </div>
                 )}
               </div>
             </div>
          ) : null}

          {/* Notes */}
           <div style={{ marginTop: 20 }}>
             <textarea
               id="notes-textarea"
               value={notes}
               onChange={e => setNotes(e.target.value)}
               placeholder="Add execution notes... (C to focus)"
               style={{
                 width: '100%', minHeight: 80, padding: 12, border: '1px solid hsl(var(--border))',
                 borderRadius: 8, fontSize: 13, color: 'hsl(var(--foreground))',
                 backgroundColor: 'hsl(var(--background))', resize: 'vertical', fontFamily: 'inherit',
               }}
             />
           </div>
        </div>
      </div>

      {/* ── Action bar ───────────────────────────────────────────── */}
      <div style={{
        padding: '12px 20px', backgroundColor: 'hsl(var(--card))',
        borderTop: '1px solid hsl(var(--border))', display: 'flex',
        alignItems: 'center', justifyContent: 'center', gap: 8, position: 'relative',
      }}>
        <div style={{ position: 'absolute', left: 20, fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>
          Test {currentIndex + 1} of {filteredCount}
        </div>

        {/* Navigation */}
        <button onClick={onPrevious} disabled={!canGoPrev || isSubmitting} style={{
          height: 38, padding: '8px 12px', border: '1px solid hsl(var(--border))', borderRadius: 6,
          backgroundColor: 'hsl(var(--card))', color: canGoPrev ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))',
          fontSize: 12, fontWeight: 500, cursor: canGoPrev ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: 4, opacity: canGoPrev ? 1 : 0.5,
        }}>
          <ChevronLeft size={16} /> Prev
        </button>

        {/* Status buttons */}
        {[
          { key: 'passed', label: 'Pass', shortcut: 'P', icon: CheckCircle2, onClick: onPass, color: '#059669', bg: 'var(--cp-success-light, #ECFDF5)', activeBg: 'linear-gradient(135deg, #10B981, #059669)' },
          { key: 'failed', label: 'Fail', shortcut: 'F', icon: XCircle, onClick: onFail, color: '#DC2626', bg: 'var(--cp-danger-light, #FEF2F2)', activeBg: 'linear-gradient(135deg, #EF4444, #DC2626)' },
          { key: 'blocked', label: 'Block', shortcut: 'B', icon: AlertTriangle, onClick: onBlocked, color: '#D97706', bg: 'var(--cp-warning-light, #FFFBEB)', activeBg: 'linear-gradient(135deg, #F59E0B, #D97706)' },
          { key: 'skipped', label: 'Skip', shortcut: 'S', icon: SkipForward, onClick: onSkip, color: 'var(--cp-text-tertiary, #64748B)', bg: 'hsl(var(--muted) / 0.3)', activeBg: 'linear-gradient(135deg, #64748B, #475569)' },
        ].map(btn => {
          const Icon = btn.icon;
          const isActive = currentStatus === btn.key;
          return (
            <button key={btn.key} onClick={btn.onClick} disabled={isSubmitting} title={`${btn.label} (${btn.shortcut})`} style={{
              height: 38, padding: '0 16px', border: isActive ? 'none' : `1px solid ${btn.color}30`,
              borderRadius: 6, background: isActive ? btn.activeBg : btn.bg,
              color: isActive ? 'var(--ds-text-inverse, #FFFFFF)' : btn.color, fontSize: 13, fontWeight: 600,
              cursor: isSubmitting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6,
              opacity: isSubmitting ? 0.7 : 1, boxShadow: isActive ? `0 2px 8px ${btn.color}40` : 'none',
            }}>
              <Icon size={15} /> {btn.label}
              <kbd style={{ fontSize: 10, opacity: 0.7, padding: '1px 5px', backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : `${btn.color}10`, borderRadius: 4, fontFamily: 'monospace' }}>
                {btn.shortcut}
              </kbd>
            </button>
          );
        })}

        {/* Reset */}
        {currentStatus !== 'not_run' && (
          <button onClick={onReset} disabled={isSubmitting} title="Reset (Ctrl+R)" style={{
            height: 38, padding: '0 10px', border: '1px solid hsl(var(--border))', borderRadius: 6,
            backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--muted-foreground))',
            cursor: isSubmitting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center',
          }}>
            <RotateCcw size={14} />
          </button>
        )}

        <button onClick={onNext} disabled={!canGoNext || isSubmitting} style={{
          height: 38, padding: '8px 12px', border: '1px solid hsl(var(--border))', borderRadius: 6,
          backgroundColor: 'hsl(var(--card))', color: canGoNext ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))',
          fontSize: 12, fontWeight: 500, cursor: canGoNext ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: 4, opacity: canGoNext ? 1 : 0.5,
        }}>
          Next <ChevronRight size={16} />
        </button>

        <div style={{ position: 'absolute', right: 20, display: 'flex', gap: 8 }}>
          {steps.length > 0 && !fastTrackMode && (() => {
            const isDisabled = !anyStepMarked || isSubmitting;
            const statusColors: Record<string, { bg: string; text: string }> = {
              passed:  { bg: '#16A34A', text: 'var(--ds-text-inverse, #FFFFFF)' },
              failed:  { bg: '#DC2626', text: 'var(--ds-text-inverse, #FFFFFF)' },
              blocked: { bg: '#D97706', text: 'var(--ds-text-inverse, #FFFFFF)' },
              skipped: { bg: '#475569', text: 'var(--ds-text-inverse, #FFFFFF)' },
              not_run: { bg: 'var(--cp-border, #E2E8F0)', text: 'var(--cp-text-tertiary, #64748B)' },
            };
            const colors = statusColors[derivedStatus] || statusColors.not_run;
            const label = derivedStatus !== 'not_run'
              ? `Complete → ${derivedStatus.toUpperCase()}`
              : 'Complete Execution';
            return (
              <button
                onClick={onCompleteExecution}
                disabled={isDisabled}
                title={!anyStepMarked ? 'Mark all steps before completing' : `Complete with status: ${derivedStatus}`}
                style={{
                  height: 34, padding: '0 14px', border: isDisabled ? `1px solid ${'var(--cp-border, #E2E8F0)'}` : 'none',
                  borderRadius: 6, backgroundColor: isDisabled ? ('var(--cp-bg-page, #F8FAFC)') : colors.bg,
                  color: isDisabled ? ('var(--cp-text-muted, #94A3B8)') : colors.text, fontSize: 12, fontWeight: 700,
                  cursor: isDisabled ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 5,
                  opacity: isDisabled ? 0.7 : 1, transition: 'all 150ms ease',
                  boxShadow: isDisabled ? 'none' : `0 2px 8px ${colors.bg}40`,
                  letterSpacing: '0.01em',
                }}
              >
                <CheckCircle2 size={13} /> {label}
              </button>
            );
          })()}
        </div>
      </div>

      {/* Step navigation (only in step mode) */}
      {steps.length > 1 && !fastTrackMode && (
        <div style={{
          padding: '8px 20px', backgroundColor: 'hsl(var(--muted) / 0.15)',
          borderTop: '1px solid hsl(var(--border))', display: 'flex',
          alignItems: 'center', justifyContent: 'center', gap: 16,
        }}>
          <button onClick={onPrevStep} disabled={!canGoPrevStep} style={{
            fontSize: 12, color: canGoPrevStep ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))',
            border: 'none', backgroundColor: 'transparent', cursor: canGoPrevStep ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', gap: 4, opacity: canGoPrevStep ? 1 : 0.4,
          }}>
            ← Prev Step
          </button>
          <span style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }}>
            Step {currentStepIndex + 1} / {steps.length}
          </span>
          <button onClick={onNextStep} disabled={!canGoNextStep} style={{
            fontSize: 12, color: canGoNextStep ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))',
            border: 'none', backgroundColor: 'transparent', cursor: canGoNextStep ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', gap: 4, opacity: canGoNextStep ? 1 : 0.4,
          }}>
            Next Step →
          </button>
        </div>
      )}
    </div>
  );
}
