/**
 * WikiAdminSyncTab — Sync pipeline 8-step visualization
 */
import React from 'react';
import { useWikiSyncRuns, useWikiAdminStats, useTriggerSync } from '@/hooks/useWikiAdminData';
import { SkeletonBlock } from '@/components/wiki/WikiTokens';
import { Play, Check, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

const PIPELINE_STEPS = [
  'Jira Fetch', 'Delta Detection', 'Chunking', 'Embedding',
  'Topic Extraction', 'Page Generation', 'Page Update', 'Cache Warm',
];

export function WikiAdminSyncTab() {
  const { data: runs, isLoading } = useWikiSyncRuns(5);
  const { data: stats } = useWikiAdminStats();
  const triggerSync = useTriggerSync();
  const latestRun = runs?.[0];

  if (isLoading) {
    return <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <SkeletonBlock height={48} />
      <SkeletonBlock height={200} />
    </div>;
  }

  const steps: Array<{ name: string; status: string; result: string; durationMs: number }> =
    latestRun?.steps && Array.isArray(latestRun.steps)
      ? (latestRun.steps as any[])
      : PIPELINE_STEPS.map((name, i) => ({ name, status: 'pending', result: '—', durationMs: 0 }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px', borderRadius: 6,
        background: 'var(--cp-bg-sunken, #F8FAFC)',
        border: '1px solid var(--cp-border-default, rgba(15,23,42,0.12))',
      }}>
        <div style={{ display: 'flex', gap: 24, fontFamily: 'Inter, sans-serif', fontSize: 13 }}>
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
          disabled={triggerSync.isPending}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 14px', borderRadius: 4,
            background: 'var(--cp-primary-60, #2563EB)',
            color: '#fff', border: 'none', cursor: 'pointer',
            fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 600,
            opacity: triggerSync.isPending ? 0.6 : 1,
          }}
        >
          {triggerSync.isPending ? <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} /> : <Play style={{ width: 14, height: 14 }} />}
          Run Sync Now
        </button>
      </div>

      {/* Pipeline steps */}
      <div style={{
        border: '1px solid var(--cp-border-default, rgba(15,23,42,0.12))',
        borderRadius: 6, overflow: 'hidden',
      }}>
        {steps.map((step, i) => {
          const isDone = step.status === 'done';
          const isActive = step.status === 'active';
          const isFailed = step.status === 'failed';
          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 16px',
              borderBottom: i < steps.length - 1 ? '1px solid var(--cp-border-default, rgba(15,23,42,0.08))' : undefined,
              background: isActive ? 'rgba(37,99,235,0.04)' : 'transparent',
            }}>
              {/* Step circle */}
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, fontSize: 11, fontWeight: 700,
                fontFamily: 'JetBrains Mono, monospace',
                background: isDone ? '#E3FCEF' : isFailed ? '#FEE2E2' : isActive ? '#DEEBFF' : '#F1F5F9',
                color: isDone ? '#006644' : isFailed ? '#DC2626' : isActive ? '#0747A6' : '#64748B',
                ...(isActive ? { boxShadow: '0 0 0 3px rgba(37,99,235,0.2)' } : {}),
              }}>
                {isDone ? <Check style={{ width: 14, height: 14 }} /> : (i + 1)}
              </div>
              {/* Label */}
              <span style={{
                fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 500,
                color: 'var(--cp-text-primary, #0F172A)', flex: 1,
              }}>
                {step.name}
              </span>
              {/* Result */}
              <span style={{
                fontFamily: 'Inter, sans-serif', fontSize: 12,
                color: 'var(--cp-text-tertiary, #64748B)',
                minWidth: 120,
              }}>
                {step.result}
              </span>
              {/* Duration */}
              <span style={{
                fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
                color: 'var(--cp-text-tertiary, #64748B)', minWidth: 60, textAlign: 'end',
              }}>
                {step.durationMs > 0 ? `${(step.durationMs / 1000).toFixed(1)}s` : '—'}
              </span>
            </div>
          );
        })}
      </div>

      {/* Summary banner */}
      {latestRun?.status === 'complete' && (
        <div style={{
          padding: '10px 16px', borderRadius: 6,
          background: '#E3FCEF', border: '1px solid rgba(0,102,68,0.15)',
          fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 500,
          color: '#006644',
        }}>
          ✓ Sync completed · {latestRun.total_duration_ms ? `${(latestRun.total_duration_ms / 1000).toFixed(0)}s` : '—'} · {latestRun.total_items_processed} items · {latestRun.new_pages} new · {latestRun.updated_pages} updated
        </div>
      )}

      {/* Recent runs table */}
      {runs && runs.length > 1 && (
        <div>
          <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 14, fontWeight: 600, color: 'var(--cp-text-primary, #0F172A)', marginBottom: 8 }}>
            Recent Runs
          </div>
          <div style={{ border: '1px solid var(--cp-border-default, rgba(15,23,42,0.12))', borderRadius: 4, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Inter, sans-serif', fontSize: 12 }}>
              <thead>
                <tr style={{ background: 'var(--cp-bg-sunken, #F8FAFC)' }}>
                  {['Started', 'Status', 'Duration', 'Items', 'New', 'Updated', 'Trigger'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'start', fontWeight: 650, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.03em', color: 'var(--cp-text-tertiary, #64748B)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {runs.slice(1).map(r => (
                  <tr key={r.id} style={{ borderTop: '1px solid var(--cp-border-default, rgba(15,23,42,0.08))' }}>
                    <td style={{ padding: '8px 12px', fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>{format(new Date(r.started_at), 'MMM d HH:mm')}</td>
                    <td style={{ padding: '8px 12px' }}><StatusLoz status={r.status} /></td>
                    <td style={{ padding: '8px 12px', fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>{r.total_duration_ms ? `${(r.total_duration_ms / 1000).toFixed(0)}s` : '—'}</td>
                    <td style={{ padding: '8px 12px', fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>{r.total_items_processed}</td>
                    <td style={{ padding: '8px 12px', fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>{r.new_pages}</td>
                    <td style={{ padding: '8px 12px', fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>{r.updated_pages}</td>
                    <td style={{ padding: '8px 12px', fontSize: 11 }}>{r.triggered_by}</td>
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

function StatusLoz({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    complete: { bg: '#E3FCEF', color: '#006644' },
    running: { bg: '#DEEBFF', color: '#0747A6' },
    failed: { bg: '#DFE1E6', color: '#44546F' },
    partial: { bg: '#DFE1E6', color: '#44546F' },
  };
  const s = map[status] ?? map.failed;
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 3,
      background: s.bg, color: s.color,
      fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em',
    }}>
      {status}
    </span>
  );
}
