/**
 * TestHub Execution Page — View Mode (read-only execution history)
 * Extracted from TestHubExecutionPage.tsx
 */
import React from 'react';
import { ArrowLeft, Play, AlertTriangle } from 'lucide-react';

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

interface ExecutionViewModeProps {
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
  executionHistory: ExecutionHistoryRecord;
  isDark: boolean;
  statusConfig: Record<string, { icon: any; color: string; bg: string; label: string }>;
  onBack: () => void;
  onRerun: () => void;
}

export function ExecutionViewMode({
  testCase, currentStatus, isVersionDrifted, lockedVersion, currentVersion,
  executionHistory, isDark, statusConfig, onBack, onRerun,
}: ExecutionViewModeProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ padding: '16px 24px', borderBottom: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'hsl(var(--primary))', backgroundColor: 'hsl(var(--primary) / 0.1)', padding: '3px 10px', borderRadius: 5 }}>
              {testCase.case_key}
            </span>
            <span style={{
              fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6,
              color: statusConfig[currentStatus]?.color,
              backgroundColor: statusConfig[currentStatus]?.bg,
            }}>
              {statusConfig[currentStatus]?.label}
            </span>
            <span style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))', padding: '3px 8px', backgroundColor: 'hsl(var(--muted) / 0.3)', borderRadius: 6, textTransform: 'capitalize' }}>
              {testCase.priority?.name || 'Medium'}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onBack} style={{
              height: 34, padding: '8px 12px', border: '1px solid hsl(var(--border))', borderRadius: 6,
              backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--foreground))',
              fontSize: 12, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <ArrowLeft size={14} /> Back
            </button>
            <button onClick={onRerun} style={{
              height: 34, padding: '0 14px', border: 'none', borderRadius: 6,
              background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
              color: '#FFFFFF', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
              <Play size={13} /> Re-run
            </button>
          </div>
        </div>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'hsl(var(--foreground))', margin: 0, lineHeight: 1.3 }}>{testCase.title}</h2>
        {testCase.description && <p style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))', margin: '6px 0 0', lineHeight: 1.4 }}>{testCase.description}</p>}
        <p style={{ fontSize: 11, color: '#94A3B8', margin: '8px 0 0' }}>
          Run #{executionHistory.execution_number} · Executed {new Date(executionHistory.executed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          {executionHistory.executor?.full_name ? ` · ${executionHistory.executor.full_name}` : ''}
        </p>
        {isVersionDrifted && (
          <div style={{
            marginTop: 10, padding: '8px 12px', borderRadius: 6,
            backgroundColor: isDark ? 'rgba(251,191,36,0.12)' : '#FFFBEB',
            border: `1px solid ${isDark ? 'rgba(251,191,36,0.2)' : '#FDE68A'}`,
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

      {/* Read-only step list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
        <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Preconditions */}
          {testCase.preconditions && (
            <div style={{ marginBottom: 12, padding: 14, backgroundColor: isDark ? 'rgba(251,191,36,0.12)' : '#FFFBEB', border: `1px solid ${isDark ? 'rgba(251,191,36,0.2)' : '#FDE68A'}`, borderRadius: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <AlertTriangle size={14} style={{ color: '#D97706' }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: '#92400E' }}>Preconditions</span>
              </div>
              <p style={{ fontSize: 13, color: '#92400E', margin: 0, lineHeight: 1.4 }}>{testCase.preconditions}</p>
            </div>
          )}

          {executionHistory.step_results.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'hsl(var(--muted-foreground))' }}>
              No step data recorded for this run.
            </div>
          ) : (
            executionHistory.step_results.map((step, i) => {
              const stepColors: Record<string, { text: string; bg: string; border: string }> = isDark ? {
                passed:  { text: '#16A34A', bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.3)' },
                failed:  { text: '#DC2626', bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.3)' },
                blocked: { text: '#D97706', bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.3)' },
                skipped: { text: '#878787', bg: '#1A1A1A', border: '#2E2E2E' },
                not_run: { text: '#878787', bg: '#1A1A1A', border: '#2E2E2E' },
              } : {
                passed:  { text: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0' },
                failed:  { text: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
                blocked: { text: '#D97706', bg: '#FFFBEB', border: '#FED7AA' },
                skipped: { text: '#475569', bg: '#F8FAFC', border: '#E2E8F0' },
                not_run: { text: '#64748B', bg: '#F1F5F9', border: '#E2E8F0' },
              };
              const colors = stepColors[step.status] || stepColors.not_run;
              return (
                <div key={i} style={{
                  padding: '12px 16px', backgroundColor: 'var(--cp-bg-elevated, #FFFFFF)',
                  border: `0.75px solid ${'var(--cp-border, #E2E8F0)'}`, borderRadius: 6,
                  borderLeft: `3px solid ${colors.border}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--foreground))' }}>
                      Step {step.step_number}
                    </span>
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
                      color: colors.text, backgroundColor: colors.bg, border: `1px solid ${colors.border}`,
                      textTransform: 'uppercase',
                    }}>
                      {step.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div style={{ marginBottom: 4 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase', letterSpacing: '0.06em' }}>ACTION</span>
                    <p style={{ fontSize: 13, color: 'hsl(var(--foreground))', margin: '4px 0 0', lineHeight: 1.5 }}>{step.title}</p>
                  </div>
                  {step.notes ? (
                    <div style={{ marginTop: 8, padding: '6px 10px', backgroundColor: 'var(--cp-bg-page, #F8FAFC)', borderRadius: 4 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase', letterSpacing: '0.06em' }}>NOTES</span>
                      <p style={{ fontSize: 12, color: 'hsl(var(--foreground))', margin: '2px 0 0' }}>{step.notes}</p>
                    </div>
                  ) : (
                    <p style={{ fontSize: 11, color: '#94A3B8', margin: '8px 0 0', fontStyle: 'italic' }}>No notes</p>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Bottom bar — view mode */}
      <div style={{
        padding: '12px 20px', backgroundColor: 'hsl(var(--card))',
        borderTop: '1px solid hsl(var(--border))', display: 'flex',
        alignItems: 'center', justifyContent: 'space-between',
      }}>
        <button onClick={onBack} style={{
          height: 50, padding: '0 14px', border: '1px solid hsl(var(--border))', borderRadius: 6,
          backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--foreground))',
          fontSize: 12, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
        }}>
          <ArrowLeft size={14} /> Back to Queue
        </button>
        <button onClick={onRerun} style={{
          height: 50, padding: '0 16px', border: 'none', borderRadius: 6,
          background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
          color: '#FFFFFF', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <Play size={14} /> Re-run
        </button>
      </div>
    </div>
  );
}
