import React, { useState } from 'react';
import Button from '@atlaskit/button';
import Toggle from '@atlaskit/toggle';
import Spinner from '@atlaskit/spinner';
import { supabase } from '@/integrations/supabase/client';
import { DEFAULT_THEATRE_CONFIG } from '@/lib/replay/theatre/theatreTypes';

// Displayed transition count + date-range backfill trigger for the Replay engine.

// ─── Theatre config state ──────────────────────────────────────────────────────

interface TheatreAdminConfig {
  globalEnabled: boolean;
  productHubEnabled: boolean;
  projectHubEnabled: boolean;
  releaseHubEnabled: boolean;
  minTransitionCount: number;
  defaultSpeed: 1 | 2;
  showRegressions: boolean;
  showBoomerangs: boolean;
  showLateAdditions: boolean;
  excludedTypes: string[];
}

const ALL_SUBTASK_TYPES = ['Sub-task', 'Backend', 'Frontend', 'Integration', 'API Requirement', 'BRD Task', 'Figma'];

const DEFAULT_THEATRE: TheatreAdminConfig = {
  globalEnabled: DEFAULT_THEATRE_CONFIG.enableProductReplay,
  productHubEnabled: DEFAULT_THEATRE_CONFIG.enableProductReplay,
  projectHubEnabled: DEFAULT_THEATRE_CONFIG.enableProjectReplay,
  releaseHubEnabled: DEFAULT_THEATRE_CONFIG.enableReleaseReplay,
  minTransitionCount: DEFAULT_THEATRE_CONFIG.minTransitionCount,
  defaultSpeed: 1,
  showRegressions: DEFAULT_THEATRE_CONFIG.showRegressions,
  showBoomerangs: DEFAULT_THEATRE_CONFIG.showBoomerangs,
  showLateAdditions: DEFAULT_THEATRE_CONFIG.showLateAdditions,
  excludedTypes: DEFAULT_THEATRE_CONFIG.subtaskTypes,
};

interface BackfillState {
  status: 'idle' | 'running' | 'done' | 'error';
  message: string;
  count: number;
}

export default function ReplayAdminPage() {
  const [theatre, setTheatre] = useState<TheatreAdminConfig>(DEFAULT_THEATRE);
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

      {/* ── Theatre settings ────────────────────────────────────────────────── */}
      <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--ds-text, #172B4D)', margin: '8px 0 24px', fontFamily: "'Atlassian Sans', ui-sans-serif, system-ui, sans-serif" }}>
        Theatre settings
      </h2>
      <p style={{ fontSize: 14, color: 'var(--ds-text-subtle, #44546F)', marginBottom: 24, fontFamily: "'Atlassian Sans', ui-sans-serif, system-ui, sans-serif" }}>
        Configure which hubs show Replay Theatre and how playback behaves.
      </p>

      {/* Enable/disable */}
      <div style={cardStyle}>
        <div style={{ ...labelStyle, marginBottom: 12 }}>Visibility</div>
        {([
          ['globalEnabled', 'Enable Replay Theatre globally', 'When off, all Replay entry points are hidden.'],
          ['productHubEnabled', 'Product Hub', 'Business Request detail view and dashboard widget.'],
          ['projectHubEnabled', 'Project Hub', 'Epic detail view and sidebar widget.'],
          ['releaseHubEnabled', 'Release Hub', 'Release detail view and release dashboard card.'],
        ] as [keyof TheatreAdminConfig, string, string][]).map(([key, label, desc]) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--ds-border, #DCDFE4)' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ds-text, #172B4D)', fontFamily: "'Atlassian Sans', ui-sans-serif, system-ui, sans-serif" }}>{label}</div>
              <div style={{ fontSize: 12, color: 'var(--ds-text-subtlest, #626F86)', fontFamily: "'Atlassian Sans', ui-sans-serif, system-ui, sans-serif" }}>{desc}</div>
            </div>
            <Toggle
              isChecked={theatre[key] as boolean}
              onChange={() => setTheatre((prev) => ({ ...prev, [key]: !prev[key] }))}
            />
          </div>
        ))}
      </div>

      {/* Eligibility + speed */}
      <div style={cardStyle}>
        <div style={{ ...labelStyle, marginBottom: 12 }}>Playback defaults</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--ds-border, #DCDFE4)' }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ds-text, #172B4D)', fontFamily: "'Atlassian Sans', ui-sans-serif, system-ui, sans-serif" }}>Min status transitions for eligibility</div>
          <input
            type="number"
            min={1}
            max={20}
            value={theatre.minTransitionCount}
            onChange={(e) => setTheatre((prev) => ({ ...prev, minTransitionCount: Number(e.target.value) }))}
            style={{ width: 64, padding: '4px 8px', border: '1px solid var(--ds-border, #DCDFE4)', borderRadius: 4, fontSize: 14, color: 'var(--ds-text, #172B4D)', background: 'var(--ds-surface, #FFFFFF)', fontFamily: "'Atlassian Sans', ui-sans-serif, system-ui, sans-serif" }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--ds-border, #DCDFE4)' }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ds-text, #172B4D)', fontFamily: "'Atlassian Sans', ui-sans-serif, system-ui, sans-serif" }}>Default speed</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {([1, 2] as const).map((s) => (
              <button key={s} onClick={() => setTheatre((prev) => ({ ...prev, defaultSpeed: s }))} style={{ padding: '4px 14px', borderRadius: 4, border: theatre.defaultSpeed === s ? '2px solid #2E63D5' : '1px solid var(--ds-border, #DCDFE4)', background: theatre.defaultSpeed === s ? '#EEF2FF' : 'var(--ds-surface, #FFFFFF)', color: theatre.defaultSpeed === s ? '#2E63D5' : 'var(--ds-text, #172B4D)', fontWeight: theatre.defaultSpeed === s ? 600 : 400, fontSize: 14, cursor: 'pointer', fontFamily: "'Atlassian Sans', ui-sans-serif, system-ui, sans-serif" }}>
                {s}×
              </button>
            ))}
          </div>
        </div>
        {([
          ['showRegressions', 'Show regressions'],
          ['showBoomerangs', 'Show boomerangs'],
          ['showLateAdditions', 'Show late additions'],
        ] as [keyof TheatreAdminConfig, string][]).map(([key, label]) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--ds-border, #DCDFE4)' }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ds-text, #172B4D)', fontFamily: "'Atlassian Sans', ui-sans-serif, system-ui, sans-serif" }}>{label}</div>
            <Toggle isChecked={theatre[key] as boolean} onChange={() => setTheatre((prev) => ({ ...prev, [key]: !prev[key] }))} />
          </div>
        ))}
      </div>

      {/* Excluded types */}
      <div style={cardStyle}>
        <div style={{ ...labelStyle, marginBottom: 12 }}>Excluded work item types (subtask-level)</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          {ALL_SUBTASK_TYPES.map((type) => (
            <label key={type} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={theatre.excludedTypes.includes(type)}
                onChange={() => setTheatre((prev) => ({ ...prev, excludedTypes: prev.excludedTypes.includes(type) ? prev.excludedTypes.filter((t) => t !== type) : [...prev.excludedTypes, type] }))}
              />
              <span style={{ fontSize: 14, color: 'var(--ds-text, #172B4D)', fontFamily: "'Atlassian Sans', ui-sans-serif, system-ui, sans-serif" }}>{type}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Demo preview */}
      <div style={cardStyle}>
        <div style={{ ...labelStyle, marginBottom: 8 }}>Demo mode</div>
        <p style={{ fontSize: 13, color: 'var(--ds-text-subtle, #44546F)', marginBottom: 16 }}>
          Preview Replay Theatre with the MDT-742 demo seed script — no live Jira data required.
        </p>
        <Button appearance="default" isDisabled>
          Preview Replay (portal removed — use dashboard widget)
        </Button>
      </div>
    </div>
  );
}
