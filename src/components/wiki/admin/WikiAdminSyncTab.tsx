/**
 * WikiAdminSyncTab — Sync pipeline with real-time progress visibility
 */
import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '@/hooks/useTheme';
import { useWikiSyncRuns, useWikiAdminStats, useTriggerSync, useWikiSyncRunsPolling } from '@/hooks/useWikiAdminData';
import { SkeletonBlock } from '@/components/wiki/WikiTokens';
import { Play, Check, Loader2, AlertTriangle, RefreshCw, Clock, Activity } from 'lucide-react';
import { format } from 'date-fns';

const PIPELINE_STEPS = [
  { name: 'Jira Fetch', desc: 'Fetching records from connected sources' },
  { name: 'Delta Detection', desc: 'Identifying new and updated records' },
  { name: 'Chunking', desc: 'Splitting content into semantic chunks' },
  { name: 'Embedding', desc: 'Generating vector embeddings via OpenAI' },
  { name: 'Topic Extraction', desc: 'Classifying chunks by domain' },
  { name: 'Page Generation', desc: 'Generating wiki article content' },
  { name: 'Page Update', desc: 'Updating existing wiki pages' },
  { name: 'Cache Warm', desc: 'Pre-warming the query cache' },
];

function ElapsedTimer({ startedAt }: { startedAt: string }) {
  const [elapsed, setElapsed] = useState(0);
  const ref = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    const start = new Date(startedAt).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    ref.current = setInterval(tick, 1000);
    return () => clearInterval(ref.current);
  }, [startedAt]);

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  return (
    <span style={{ fontFamily: 'var(--cp-font-mono)', fontSize: 13, fontWeight: 600 }}>
      {mins > 0 ? `${mins}m ${secs}s` : `${secs}s`}
    </span>
  );
}

export function WikiAdminSyncTab() {
  const { isDark } = useTheme();
  const { data: stats } = useWikiAdminStats();
  const triggerSync = useTriggerSync();

  const latestRuns = useWikiSyncRuns(5);

  // Client-side safety: treat runs older than 10 min as not running (orphan protection)
  const isActuallyRunning = (run: any) => {
    if (run?.status !== 'running') return false;
    const started = new Date(run.started_at).getTime();
    const tenMinAgo = Date.now() - 10 * 60 * 1000;
    return started > tenMinAgo;
  };

  const initialLatestRun = latestRuns.data?.[0] ?? null;
  const shouldPoll = isActuallyRunning(initialLatestRun);

  const polled = useWikiSyncRunsPolling(shouldPoll);
  const runs = shouldPoll ? (polled.data ?? latestRuns.data ?? []) : (latestRuns.data ?? []);
  const isLoading = latestRuns.isLoading;

  const latestRun = runs[0] ?? null;
  const isRunning = isActuallyRunning(latestRun);
  const isFailed = latestRun?.status === 'failed' || (latestRun?.status === 'running' && !isRunning);
  const isLatestRunning = isRunning;

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <SkeletonBlock height={48} />
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonBlock key={i} height={40} />
        ))}
      </div>
    );
  }

  const rawSteps = latestRun?.steps && Array.isArray(latestRun.steps) && latestRun.steps.length > 0
    ? (latestRun.steps as any[])
    : null;

  const steps = rawSteps ?? PIPELINE_STEPS.map((s) => ({ name: s.name, status: 'pending', result: '—', durationMs: 0 }));

  // Progress calculation
  const completedCount = steps.filter((s: any) => s.status === 'done' || s.status === 'failed').length;
  const activeStep = steps.find((s: any) => s.status === 'active');
  const activeStepIndex = steps.findIndex((s: any) => s.status === 'active');
  const currentStepNumber = activeStepIndex >= 0 ? activeStepIndex + 1 : Math.min(completedCount + 1, steps.length);
  const progressPct = Math.round((completedCount / steps.length) * 100);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px', borderRadius: 6,
        background: 'var(--cp-bg-sunken, #F8FAFC)',
        border: '1px solid var(--cp-border-default, rgba(15,23,42,0.12))',
      }}>
        <div style={{ display: 'flex', gap: 24, fontFamily: 'var(--cp-font-body)', fontSize: 13 }}>
          <span style={{ color: 'var(--cp-text-secondary, #334155)' }}>
            <strong>Last Sync:</strong>{' '}
            {stats?.last_sync ? format(new Date(stats.last_sync), 'MMM d, yyyy HH:mm') : 'Never'}
          </span>
          <span style={{ color: 'var(--cp-text-tertiary, #64748B)' }}>
            Next scheduled: Tonight 23:00 AST
          </span>
        </div>
        <button
          onClick={() => triggerSync.mutate()}
          disabled={triggerSync.isPending || isRunning}
          aria-label="Run sync now"
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 14px', borderRadius: 4,
            background: 'var(--cp-primary-60, #2563EB)',
            color: 'var(--ds-surface, #fff)', border: 'none', cursor: (triggerSync.isPending || isRunning) ? 'not-allowed' : 'pointer',
            fontFamily: 'var(--cp-font-body)', fontSize: 12, fontWeight: 600,
            opacity: (triggerSync.isPending || isRunning) ? 0.5 : 1,
            outline: 'none',
          }}
          onFocus={(e) => { e.currentTarget.style.boxShadow = '0 0 0 2px var(--cp-primary-60, #2563EB)'; }}
          onBlur={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
        >
          {(triggerSync.isPending || isRunning)
            ? <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} />
            : <Play style={{ width: 14, height: 14 }} />
          }
          {isRunning ? 'Sync Running…' : 'Run Sync Now'}
        </button>
      </div>

      {/* Running sync progress banner */}
      {isLatestRunning && latestRun && (
        <div style={{
          padding: '14px 18px', borderRadius: 6,
          background: 'linear-gradient(135deg, rgba(37,99,235,0.06), rgba(37,99,235,0.02))',
          border: '1px solid rgba(37,99,235,0.2)',
        }}>
          {/* Progress bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <Activity style={{ width: 16, height: 16, color: 'var(--cp-blue)', flexShrink: 0 }} />
            <span style={{ fontFamily: 'var(--cp-font-body)', fontSize: 13, fontWeight: 600, color: 'var(--cp-text-primary, #0F172A)' }}>
              Sync in progress
            </span>
            <span style={{ fontFamily: 'var(--cp-font-mono)', fontSize: 12, color: 'var(--cp-blue)', fontWeight: 700 }}>
              {progressPct}%
            </span>
            <div style={{ flex: 1 }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--cp-text-tertiary, #64748B)' }}>
              <Clock style={{ width: 13, height: 13 }} />
              <ElapsedTimer startedAt={latestRun.started_at} />
            </div>
          </div>
          {/* Progress bar visual */}
          <div style={{ height: 6, borderRadius: 4, background: 'rgba(37,99,235,0.1)', marginBottom: 8, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 4,
              background: 'var(--cp-primary-60, #2563EB)',
              width: `${progressPct}%`,
              transition: 'width 300ms ease',
            }} />
          </div>
          {/* Active step info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontFamily: 'var(--cp-font-body)', fontSize: 12 }}>
            <span style={{ color: 'var(--cp-text-tertiary, #64748B)' }}>
              Step {currentStepNumber} of {steps.length}
              {activeStep ? `: ${activeStep.name}` : rawSteps ? '' : ' — Initializing pipeline…'}
            </span>
            <span style={{ color: 'var(--cp-text-tertiary, #64748B)' }}>·</span>
            <span style={{ color: 'var(--cp-text-tertiary, #64748B)' }}>
              {latestRun.total_items_processed ?? 0} items processed
            </span>
            {(latestRun.new_chunks ?? 0) > 0 && (
              <>
                <span style={{ color: 'var(--cp-text-tertiary, #64748B)' }}>·</span>
                <span style={{ color: 'var(--cp-text-tertiary, #64748B)' }}>
                  {latestRun.new_chunks} new chunks
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Failed sync error banner */}
      {isFailed && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 16px', borderRadius: 6,
          background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)',
          fontFamily: 'var(--cp-font-body)', fontSize: 13, color: 'var(--sem-danger)',
        }}>
          <AlertTriangle style={{ width: 16, height: 16, flexShrink: 0 }} />
          <span style={{ flex: 1 }}>
            Sync failed{latestRun?.error_message ? `: ${latestRun.error_message}` : ''}
          </span>
          <button
            onClick={() => triggerSync.mutate()}
            disabled={triggerSync.isPending}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '4px 10px', borderRadius: 4,
              background: 'var(--sem-danger)', color: 'var(--ds-surface, #fff)', border: 'none', cursor: 'pointer',
              fontFamily: 'var(--cp-font-body)', fontSize: 11, fontWeight: 600,
            }}
          >
            <RefreshCw style={{ width: 12, height: 12 }} /> Retry
          </button>
        </div>
      )}

      {/* Empty state */}
      {!latestRun && (
        <EmptyState
          icon={<RefreshCw style={{ width: 28, height: 28, color: 'var(--cp-text-tertiary, #64748B)' }} />}
          message="No sync runs yet"
          sub="Click 'Run Sync Now' to start the first sync."
        />
      )}

      {/* Pipeline steps */}
      {latestRun && (
        <div style={{
          border: '1px solid var(--cp-border-default, rgba(15,23,42,0.12))',
          borderRadius: 4, overflow: 'hidden',
        }}>
          {/* Column headers */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '6px 16px',
            background: 'var(--cp-bg-sunken, #F8FAFC)',
            borderBottom: '0.75px solid var(--cp-border-default, rgba(15,23,42,0.12))',
            fontFamily: 'var(--cp-font-body)', fontSize: 10, fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.05em',
            color: 'var(--cp-text-tertiary, #64748B)',
          }}>
            <span style={{ width: 28 }}>#</span>
            <span style={{ flex: 1 }}>Step</span>
            <span style={{ minWidth: 140 }}>Status</span>
            <span style={{ minWidth: 120 }}>Result</span>
            <span style={{ minWidth: 60, textAlign: 'end' }}>Duration</span>
          </div>
          {steps.map((step: any, i: number) => {
            const isDone = step.status === 'done';
            const isActive = step.status === 'active';
            const isStepFailed = step.status === 'failed';
            const stepMeta = PIPELINE_STEPS[i];
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 16px', minHeight: 44, boxSizing: 'border-box',
                borderBottom: i < steps.length - 1 ? '0.75px solid var(--cp-border-default, rgba(15,23,42,0.08))' : undefined,
                background: isActive ? 'rgba(37,99,235,0.04)' : 'transparent',
                transition: 'background 200ms ease',
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, fontSize: 11, fontWeight: 700,
                  fontFamily: 'var(--cp-font-mono)',
                  background: isDone ? '#1B7F37' : isStepFailed ? 'rgba(220,38,38,0.08)' : isActive ? '#0C66E4' : (isDark ? 'var(--cp-bg-surface, #242528)' : 'var(--cp-bg-sunken, #F1F5F9)'),
                  color: isDone ? 'var(--ds-surface, #FFFFFF)' : isStepFailed ? 'var(--ds-text-danger, #DC2626)' : isActive ? 'var(--ds-surface, #FFFFFF)' : (isDark ? 'var(--ds-text-subtlest, #878787)' : 'var(--cp-text-tertiary, #64748B)'),
                  ...(isActive ? { boxShadow: '0 0 0 3px rgba(37,99,235,0.2)' } : {}),
                }}>
                  {isDone
                    ? <Check style={{ width: 14, height: 14 }} />
                    : isActive
                      ? <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} />
                      : (i + 1)
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{
                    fontFamily: 'var(--cp-font-body)', fontSize: 13, fontWeight: 500,
                    color: 'var(--cp-text-primary, #0F172A)',
                  }}>{step.name}</span>
                  {isActive && stepMeta && (
                    <div style={{
                      fontFamily: 'var(--cp-font-body)', fontSize: 11,
                      color: 'var(--cp-text-tertiary, #64748B)', marginTop: 1,
                    }}>
                      {stepMeta.desc}
                    </div>
                  )}
                </div>
                <span style={{
                  minWidth: 140, fontFamily: 'var(--cp-font-body)', fontSize: 11,
                }}>
                  {isActive && (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '2px 8px', borderRadius: 4,
                      background: '#0C66E4', color: 'var(--ds-surface, #FFFFFF)',
                      fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em',
                    }}>
                      <Loader2 style={{ width: 10, height: 10, animation: 'spin 1s linear infinite' }} />
                      Processing
                    </span>
                  )}
                  {isDone && (
                    <span style={{
                      padding: '2px 8px', borderRadius: 4,
                      background: '#1B7F37', color: 'var(--ds-surface, #FFFFFF)',
                      fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.03em',
                    }}>Complete</span>
                  )}
                  {isStepFailed && (
                    <span style={{
                      padding: '2px 8px', borderRadius: 4,
                      background: 'rgba(220,38,38,0.08)', color: 'var(--ds-text-danger, #DC2626)',
                      fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.03em',
                    }}>Failed</span>
                  )}
                  {!isActive && !isDone && !isStepFailed && (
                    <span style={{ color: 'var(--cp-text-tertiary, #94A3B8)', fontSize: 11 }}>Waiting</span>
                  )}
                </span>
                <span style={{
                  fontFamily: 'var(--cp-font-mono)', fontSize: 11,
                  color: 'var(--cp-text-tertiary, #64748B)', minWidth: 120,
                }}>{step.result ?? '—'}</span>
                <span style={{
                  fontFamily: 'var(--cp-font-mono)', fontSize: 11,
                  color: 'var(--cp-text-tertiary, #64748B)', minWidth: 60, textAlign: 'end',
                }}>{step.durationMs > 0 ? `${(step.durationMs / 1000).toFixed(1)}s` : '—'}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Completed summary banner */}
      {latestRun?.status === 'complete' && (
        <div style={{
          padding: '10px 16px', borderRadius: 6,
          background: 'var(--cp-success-light, #E3FCEF)', border: '1px solid rgba(13,115,49,0.15)',
          fontFamily: 'var(--cp-font-body)', fontSize: 13, fontWeight: 500,
          color: 'var(--cp-success-text, #006644)',
        }}>
          ✓ Sync completed · {latestRun.total_duration_ms ? `${(latestRun.total_duration_ms / 1000).toFixed(0)}s` : '—'} · {latestRun.total_items_processed ?? 0} items · {latestRun.new_pages ?? 0} new · {latestRun.updated_pages ?? 0} updated
        </div>
      )}

      {/* Recent runs table */}
      {runs.length > 1 && (
        <div>
          <div style={{ fontFamily: 'var(--cp-font-heading)', fontSize: 14, fontWeight: 600, color: 'var(--cp-text-primary, #0F172A)', marginBottom: 8 }}>
            Recent Runs
          </div>
          <div style={{ border: '1px solid var(--cp-border-default, rgba(15,23,42,0.12))', borderRadius: 4, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--cp-font-body)', fontSize: 12 }}>
              <thead>
                <tr style={{ background: 'var(--cp-bg-sunken, #F8FAFC)' }}>
                  {['Started', 'Status', 'Duration', 'Items', 'New', 'Updated', 'Trigger'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'start', fontWeight: 650, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.03em', color: 'var(--cp-text-tertiary, #64748B)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {runs.slice(1).map(r => (
                  <tr key={r.id} style={{ borderTop: '0.75px solid var(--cp-border-default, rgba(15,23,42,0.08))', height: 50 }}>
                    <td style={{ padding: '8px 12px', fontFamily: 'var(--cp-font-mono)', fontSize: 11 }}>{format(new Date(r.started_at), 'MMM d HH:mm')}</td>
                    <td style={{ padding: '8px 12px' }}><StatusLoz status={r.status} /></td>
                    <td style={{ padding: '8px 12px', fontFamily: 'var(--cp-font-mono)', fontSize: 11 }}>{r.total_duration_ms ? `${(r.total_duration_ms / 1000).toFixed(0)}s` : '—'}</td>
                    <td style={{ padding: '8px 12px', fontFamily: 'var(--cp-font-mono)', fontSize: 11 }}>{r.total_items_processed ?? 0}</td>
                    <td style={{ padding: '8px 12px', fontFamily: 'var(--cp-font-mono)', fontSize: 11 }}>{r.new_pages ?? 0}</td>
                    <td style={{ padding: '8px 12px', fontFamily: 'var(--cp-font-mono)', fontSize: 11 }}>{r.updated_pages ?? 0}</td>
                    <td style={{ padding: '8px 12px', fontSize: 11 }}>{r.triggered_by ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Shared sub-components ─── */

export function EmptyState({ icon, message, sub }: { icon: React.ReactNode; message: string; sub: string }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '48px 24px', gap: 8,
      border: '1px dashed var(--cp-border-default, rgba(15,23,42,0.15))',
      borderRadius: 6, background: 'var(--cp-bg-sunken, #F8FAFC)',
    }}>
      {icon}
      <span style={{ fontFamily: 'var(--cp-font-body)', fontSize: 14, fontWeight: 600, color: 'var(--cp-text-primary, #0F172A)' }}>{message}</span>
      <span style={{ fontFamily: 'var(--cp-font-body)', fontSize: 12, color: 'var(--cp-text-tertiary, #64748B)', textAlign: 'center', maxWidth: 320 }}>{sub}</span>
    </div>
  );
}

export function StatusLoz({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    complete: { bg: '#E3FCEF', color: '#006644' },
    running: { bg: '#0C66E4', color: 'var(--ds-surface, #FFFFFF)' },
    failed: { bg: 'rgba(220,38,38,0.08)', color: 'var(--ds-text-danger, #DC2626)' },
    partial: { bg: 'var(--ds-border, #DFE1E6)', color: '#44546F' },
  };
  const s = map[status] ?? map.failed;
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 4,
      background: s.bg, color: s.color,
      fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em',
    }}>
      {status ?? '—'}
    </span>
  );
}
