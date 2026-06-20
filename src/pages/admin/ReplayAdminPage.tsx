import React, { useState } from 'react';
import Button from '@atlaskit/button';
import Spinner from '@atlaskit/spinner';
import { supabase } from '@/integrations/supabase/client';

// Displayed transition count + date-range backfill trigger for the Replay engine.

interface BackfillState {
  status: 'idle' | 'running' | 'done' | 'error';
  message: string;
  count: number;
}

export default function ReplayAdminPage() {
  const [transitionCount, setTransitionCount] = useState<number | null>(null);
  const [issueCount, setIssueCount] = useState<number | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [backfill, setBackfill] = useState<BackfillState>({ status: 'idle', message: '', count: 0 });
  const [dateFrom, setDateFrom] = useState('2026-01-01');
  const [dateTo, setDateTo] = useState('');

  async function loadStats() {
    setLoadingStats(true);
    const [{ count: tc }, { count: ic }] = await Promise.all([
      supabase.from('work_item_transitions').select('id', { count: 'exact', head: true }),
      supabase.from('ph_issues').select('id', { count: 'exact', head: true }),
    ]);
    setTransitionCount(tc ?? 0);
    setIssueCount(ic ?? 0);
    setLoadingStats(false);
  }

  React.useEffect(() => { loadStats(); }, []);

  async function runBackfill() {
    setBackfill({ status: 'running', message: 'Triggering backfill…', count: 0 });
    const body: Record<string, string> = {};
    if (dateFrom) body.date_from = dateFrom;
    if (dateTo) body.date_to = dateTo;

    const { data, error } = await supabase.functions.invoke('wh-jira-changelog-backfill', {
      body,
    });

    if (error) {
      setBackfill({ status: 'error', message: error.message, count: 0 });
      return;
    }

    const msg = data?.message ?? 'Done';
    const count = data?.transitions_upserted ?? data?.upserted ?? 0;
    setBackfill({ status: 'done', message: msg, count });
    await loadStats();
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--ds-text-subtlest, #626F86)',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    marginBottom: 4,
  };

  const cardStyle: React.CSSProperties = {
    background: 'var(--ds-surface, #FFFFFF)',
    border: '1px solid var(--ds-border, #DCDFE4)',
    borderRadius: 8,
    padding: 24,
    marginBottom: 24,
  };

  const statBoxStyle: React.CSSProperties = {
    background: 'var(--ds-surface-sunken, #F7F8F9)',
    border: '1px solid var(--ds-border, #DCDFE4)',
    borderRadius: 6,
    padding: '16px 24px',
    minWidth: 160,
    textAlign: 'center',
  };

  return (
    <div style={{ padding: '32px 40px', maxWidth: 860 }}>
      <h1 style={{ fontSize: 24, fontWeight: 653, color: 'var(--ds-text, #172B4D)', marginBottom: 4 }}>
        Catalyst Replay
      </h1>
      <p style={{ fontSize: 14, color: 'var(--ds-text-subtle, #44546F)', marginBottom: 32 }}>
        Flight-tracker lifecycle replay for work item hierarchies. Manage backfill and monitor transition data.
      </p>

      {/* Stats */}
      <div style={cardStyle}>
        <div style={{ ...labelStyle, marginBottom: 16 }}>Database stats</div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={statBoxStyle}>
            <div style={{ fontSize: 28, fontWeight: 653, color: 'var(--ds-text, #172B4D)' }}>
              {loadingStats ? <Spinner size="medium" /> : (transitionCount ?? '—').toLocaleString()}
            </div>
            <div style={{ fontSize: 12, color: 'var(--ds-text-subtle, #44546F)', marginTop: 4 }}>
              Transitions recorded
            </div>
          </div>
          <div style={statBoxStyle}>
            <div style={{ fontSize: 28, fontWeight: 653, color: 'var(--ds-text, #172B4D)' }}>
              {loadingStats ? <Spinner size="medium" /> : (issueCount ?? '—').toLocaleString()}
            </div>
            <div style={{ fontSize: 12, color: 'var(--ds-text-subtle, #44546F)', marginTop: 4 }}>
              Issues in ph_issues
            </div>
          </div>
          <Button appearance="subtle" onClick={loadStats} isDisabled={loadingStats}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Backfill */}
      <div style={cardStyle}>
        <div style={{ ...labelStyle, marginBottom: 4 }}>Changelog backfill</div>
        <p style={{ fontSize: 13, color: 'var(--ds-text-subtle, #44546F)', marginBottom: 16 }}>
          Fetches Jira changelog history for all 2026+ issues and upserts status transitions into{' '}
          <code style={{ fontSize: 12, background: 'var(--ds-surface-sunken, #F7F8F9)', padding: '2px 6px', borderRadius: 4 }}>
            work_item_transitions
          </code>
          . Leave dates blank to process all 2026+ issues.
        </p>

        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 16 }}>
          <div>
            <div style={labelStyle}>From date</div>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              style={{
                fontSize: 14,
                padding: '6px 10px',
                border: '1px solid var(--ds-border, #DCDFE4)',
                borderRadius: 4,
                color: 'var(--ds-text, #172B4D)',
                background: 'var(--ds-surface, #FFFFFF)',
              }}
            />
          </div>
          <div>
            <div style={labelStyle}>To date (optional)</div>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              style={{
                fontSize: 14,
                padding: '6px 10px',
                border: '1px solid var(--ds-border, #DCDFE4)',
                borderRadius: 4,
                color: 'var(--ds-text, #172B4D)',
                background: 'var(--ds-surface, #FFFFFF)',
              }}
            />
          </div>
          <Button
            appearance="primary"
            onClick={runBackfill}
            isLoading={backfill.status === 'running'}
            isDisabled={backfill.status === 'running'}
          >
            Run backfill
          </Button>
        </div>

        {backfill.status !== 'idle' && (
          <div style={{
            padding: '12px 16px',
            borderRadius: 6,
            background: backfill.status === 'error'
              ? 'var(--ds-background-danger, #FFEDEB)'
              : backfill.status === 'done'
              ? 'var(--ds-background-success, #DFFCF0)'
              : 'var(--ds-background-information, #E9F2FF)',
            color: backfill.status === 'error'
              ? 'var(--ds-text-danger, #AE2A19)'
              : 'var(--ds-text, #172B4D)',
            fontSize: 13,
          }}>
            {backfill.message}
            {backfill.status === 'done' && backfill.count > 0 && (
              <span style={{ marginLeft: 8, fontWeight: 600 }}>{backfill.count} transitions upserted.</span>
            )}
          </div>
        )}
      </div>

      {/* Navigate to Replay */}
      <div style={cardStyle}>
        <div style={{ ...labelStyle, marginBottom: 8 }}>Open Replay</div>
        <p style={{ fontSize: 13, color: 'var(--ds-text-subtle, #44546F)', marginBottom: 16 }}>
          Open the Replay visualisation for any Jira issue key (Epic, Story, Business Request, etc.).
        </p>
        <Button
          appearance="default"
          href="/replay"
          target="_blank"
          rel="noopener noreferrer"
        >
          Open Replay →
        </Button>
      </div>
    </div>
  );
}
