import { useCallback, useEffect, useRef, useState } from 'react';
import Button from '@atlaskit/button/new';
import Lozenge from '@atlaskit/lozenge';
import Spinner from '@atlaskit/spinner';
import Toggle from '@atlaskit/toggle';
import ProgressBar from '@atlaskit/progress-bar';
import { supabase } from '@/integrations/supabase/client';

// ─── Types ───────────────────────────────────────────────────────────────────

interface GateStatus {
  production_deploy_enabled: boolean;
  disabled_at: string | null;
  disabled_by_email: string | null;
  disabled_reason: string | null;
}

interface DeployConfig {
  github_pat_set: boolean;
  vercel_token_set: boolean;
  github_repo: string;
  github_workflow_id: string;
  vercel_project_id: string;
  production_url: string;
}

interface GitHubRun {
  id: number;
  status: string;
  conclusion: string | null;
  head_sha: string;
  head_commit_message: string;
  created_at: string;
  updated_at: string;
  html_url: string;
  trigger: string;
  duration_ms: number | null;
  summary: string | null;
}

interface VercelDeployment {
  uid: string;
  url: string;
  state: string;
  created_at: number;
  ready_at: number | null;
  build_duration_ms: number | null;
  meta: {
    github_commit_sha?: string;
    github_commit_message?: string;
    github_commit_author_name?: string;
  };
}

interface Stats {
  today: number;
  total: number;
  success: number;
  failed: number;
  avg_duration_ms: number | null;
}

interface DeployStatus {
  gate: GateStatus;
  config: DeployConfig;
  runs: GitHubRun[];
  deployments: VercelDeployment[];
  stats: Stats;
}

interface JobStep {
  name: string;
  status: string;
  conclusion: string | null;
  number: number;
  started_at: string | null;
  completed_at: string | null;
}

interface JobInfo {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  steps: JobStep[];
}

// ─── Hook ────────────────────────────────────────────────────────────────────

function useDeployControl() {
  const [data, setData] = useState<DeployStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const call = useCallback(async (method: string, body?: unknown) => {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/deploy-control`,
      {
        method,
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: body ? JSON.stringify(body) : undefined,
      },
    );
    if (!res.ok) {
      const e = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(e.error ?? 'Unknown error');
    }
    return res.json();
  }, []);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const result = await call('GET');
      setData(result);
      setLastRefreshed(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [call]);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 30_000);
    return () => clearInterval(t);
  }, [refresh]);

  const toggle = useCallback(async (enabled: boolean, reason?: string) => {
    setToggling(true);
    try {
      await call('POST', { action: 'toggle', enabled, reason });
      setData((prev) =>
        prev
          ? {
              ...prev,
              gate: {
                ...prev.gate,
                production_deploy_enabled: enabled,
                disabled_at: enabled ? null : new Date().toISOString(),
              },
            }
          : prev,
      );
    } finally {
      setToggling(false);
    }
  }, [call]);

  const triggerDeploy = useCallback(async () => {
    setTriggering(true);
    try {
      await call('POST', { action: 'trigger' });
      setTimeout(refresh, 3000);
    } finally {
      setTriggering(false);
    }
  }, [call, refresh]);

  const saveConfig = useCallback(async (github_pat?: string, vercel_token?: string) => {
    setSavingConfig(true);
    try {
      await call('POST', { action: 'save_config', github_pat, vercel_token });
      await refresh();
    } finally {
      setSavingConfig(false);
    }
  }, [call, refresh]);

  return { data, loading, toggling, triggering, savingConfig, error, lastRefreshed, toggle, triggerDeploy, saveConfig, refresh, call };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDuration(ms: number | null) {
  if (!ms) return '—';
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

function fmtRelative(iso: string | number | null) {
  if (!iso) return '—';
  const ms = typeof iso === 'number' ? iso : new Date(iso).getTime();
  const diff = Date.now() - ms;
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)}h ago`;
  return `${Math.round(diff / 86_400_000)}d ago`;
}

function errorLabel(conclusion: string | null): string | null {
  if (!conclusion || conclusion === 'success') return null;
  if (conclusion === 'failure') return 'Build failed';
  if (conclusion === 'cancelled') return 'Cancelled';
  if (conclusion === 'timed_out') return 'Timed out';
  if (conclusion === 'startup_failure') return 'Startup failure';
  if (conclusion === 'skipped') return 'Skipped';
  return conclusion;
}

function RunStatusBadge({ status, conclusion }: { status: string; conclusion: string | null }) {
  if (status === 'in_progress' || status === 'queued' || status === 'waiting') {
    return (
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Spinner size="small" />
        <Lozenge appearance="inprogress">Running</Lozenge>
      </span>
    );
  }
  if (conclusion === 'success') return <Lozenge appearance="success">Success</Lozenge>;
  if (conclusion === 'failure') return <Lozenge appearance="removed">Failed</Lozenge>;
  if (conclusion === 'cancelled') return <Lozenge appearance="default">Cancelled</Lozenge>;
  if (conclusion === 'skipped') return <Lozenge appearance="default">Skipped</Lozenge>;
  return <Lozenge appearance="default">{conclusion ?? status}</Lozenge>;
}

function VercelStateBadge({ state }: { state: string }) {
  if (state === 'READY') return <Lozenge appearance="success">Ready</Lozenge>;
  if (state === 'ERROR') return <Lozenge appearance="removed">Error</Lozenge>;
  if (state === 'BUILDING') return <Lozenge appearance="inprogress">Building</Lozenge>;
  if (state === 'CANCELED') return <Lozenge appearance="default">Cancelled</Lozenge>;
  return <Lozenge appearance="default">{state}</Lozenge>;
}

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: 'success' | 'danger' | 'neutral';
}) {
  const accentColor =
    accent === 'success'
      ? 'var(--ds-text-success, #1F845A)'
      : accent === 'danger'
      ? 'var(--ds-text-danger, #AE2A19)'
      : 'var(--ds-text, #172B4D)';
  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        padding: '16px 20px',
        background: 'var(--ds-surface, #FFFFFF)',
        border: '1px solid var(--ds-border, #DFE1E6)',
        borderRadius: 8,
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ds-text-subtlest, #6B778C)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 653, color: accentColor, lineHeight: 1 }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 12, color: 'var(--ds-text-subtlest, #6B778C)', marginTop: 4 }}>
          {sub}
        </div>
      )}
    </div>
  );
}

// ─── Live progress ────────────────────────────────────────────────────────────

function StepIcon({ status, conclusion }: { status: string; conclusion: string | null }) {
  if (status === 'in_progress') return <Spinner size="small" />;
  if (status === 'completed' && conclusion === 'success') {
    return <span style={{ color: 'var(--ds-text-success, #1F845A)', fontWeight: 700, fontSize: 14 }}>✓</span>;
  }
  if (status === 'completed' && conclusion === 'failure') {
    return <span style={{ color: 'var(--ds-text-danger, #AE2A19)', fontWeight: 700, fontSize: 14 }}>✗</span>;
  }
  if (status === 'completed' && conclusion === 'skipped') {
    return <span style={{ color: 'var(--ds-text-subtlest, #6B778C)', fontSize: 14 }}>—</span>;
  }
  return <span style={{ color: 'var(--ds-text-subtlest, #6B778C)', fontSize: 14 }}>○</span>;
}

function LiveProgress({
  run,
  call,
}: {
  run: GitHubRun;
  call: (method: string, body?: unknown) => Promise<unknown>;
}) {
  const [jobs, setJobs] = useState<JobInfo[]>([]);
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      try {
        const result = await call('POST', { action: 'get_run_jobs', run_id: run.id }) as { jobs?: JobInfo[] };
        if (!cancelled) {
          setJobs(result.jobs ?? []);
          setFetchError(false);
        }
      } catch {
        if (!cancelled) setFetchError(true);
      }
    };

    poll();
    const t = setInterval(poll, 5000);
    return () => { cancelled = true; clearInterval(t); };
  }, [run.id, call]);

  const deployJob = jobs.find((j) => j.name === 'deploy') ?? jobs.find((j) => j.steps.length > 0);
  const allSteps: JobStep[] = deployJob?.steps ?? [];
  const visibleSteps = allSteps.filter((s) => !['Set up job', 'Complete job'].includes(s.name));
  const completedCount = visibleSteps.filter((s) => s.status === 'completed').length;
  const progress = visibleSteps.length > 0 ? completedCount / visibleSteps.length : 0;

  const runningStep = visibleSteps.find((s) => s.status === 'in_progress');

  return (
    <div
      style={{
        background: 'var(--ds-surface, #FFFFFF)',
        border: '2px solid var(--ds-border-brand, #0052CC)',
        borderRadius: 8,
        padding: '20px 24px',
        marginBottom: 24,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <Spinner size="medium" />
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ds-text, #172B4D)' }}>
            Deploying to production
          </div>
          <div style={{ fontSize: 12, color: 'var(--ds-text-subtle, #42526E)', marginTop: 2 }}>
            <code style={{ fontFamily: 'var(--ds-font-family-code, monospace)' }}>{run.head_sha}</code>
            {' — '}
            {run.head_commit_message.split('\n')[0].slice(0, 80)}
          </div>
        </div>
        <a
          href={run.html_url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--ds-link, #0052CC)', textDecoration: 'none', flexShrink: 0 }}
        >
          View on GitHub ↗
        </a>
      </div>

      <div style={{ marginBottom: 12 }}>
        <ProgressBar value={progress} isIndeterminate={visibleSteps.length === 0} />
      </div>

      {fetchError && (
        <div style={{ fontSize: 12, color: 'var(--ds-text-subtlest, #6B778C)', marginBottom: 8 }}>
          Could not load step details — check GitHub Actions directly
        </div>
      )}

      {visibleSteps.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {visibleSteps.map((step) => (
            <div key={step.number} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <StepIcon status={step.status} conclusion={step.conclusion} />
              </div>
              <span
                style={{
                  fontSize: 13,
                  color: step.status === 'in_progress'
                    ? 'var(--ds-text, #172B4D)'
                    : step.status === 'completed'
                    ? 'var(--ds-text-subtle, #42526E)'
                    : 'var(--ds-text-subtlest, #6B778C)',
                  fontWeight: step.status === 'in_progress' ? 500 : 400,
                }}
              >
                {step.name}
              </span>
              {step.status === 'completed' && step.started_at && step.completed_at && (
                <span style={{ fontSize: 11, color: 'var(--ds-text-subtlest, #6B778C)', marginLeft: 'auto' }}>
                  {fmtDuration(new Date(step.completed_at).getTime() - new Date(step.started_at).getTime())}
                </span>
              )}
              {step.status === 'in_progress' && step.started_at && (
                <span style={{ fontSize: 11, color: 'var(--ds-text-subtlest, #6B778C)', marginLeft: 'auto' }}>
                  {fmtDuration(Date.now() - new Date(step.started_at).getTime())}…
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {runningStep && visibleSteps.length === 0 && (
        <div style={{ fontSize: 13, color: 'var(--ds-text-subtle, #42526E)' }}>
          {runningStep.name}…
        </div>
      )}
    </div>
  );
}

// ─── Config panel ─────────────────────────────────────────────────────────────

function ConfigPanel({
  config,
  saving,
  onSave,
}: {
  config: DeployConfig;
  saving: boolean;
  onSave: (pat?: string, token?: string) => void;
}) {
  const patRef = useRef<HTMLInputElement>(null);
  const tokenRef = useRef<HTMLInputElement>(null);

  return (
    <div
      style={{
        background: 'var(--ds-surface, #FFFFFF)',
        border: '1px solid var(--ds-border, #DFE1E6)',
        borderRadius: 8,
        padding: '20px 24px',
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ds-text, #172B4D)', marginBottom: 16 }}>
        API credentials
      </div>
      <div style={{ fontSize: 12, color: 'var(--ds-text-subtle, #42526E)', marginBottom: 20, lineHeight: '18px' }}>
        Stored securely in Supabase. Required for live run history and manual deploy trigger.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ds-text-subtle, #42526E)', marginBottom: 4 }}>
            GitHub personal access token
            {config.github_pat_set && (
              <span style={{ marginLeft: 8, color: 'var(--ds-text-success, #1F845A)' }}>✓ Saved</span>
            )}
          </label>
          <div style={{ fontSize: 11, color: 'var(--ds-text-subtlest, #6B778C)', marginBottom: 6 }}>
            Needs <code>actions:write</code> scope — for listing runs and triggering deploys
          </div>
          <input
            ref={patRef}
            type="password"
            placeholder={config.github_pat_set ? '••••••••••••••••••••' : 'ghp_xxxxxxxxxxxxxxxxxxxx'}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '8px 10px',
              fontSize: 13,
              border: '2px solid var(--ds-border, #DFE1E6)',
              borderRadius: 4,
              background: 'var(--ds-surface, #FFFFFF)',
              color: 'var(--ds-text, #172B4D)',
              outline: 'none',
              fontFamily: 'var(--ds-font-family-code, monospace)',
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ds-text-subtle, #42526E)', marginBottom: 4 }}>
            Vercel API token
            {config.vercel_token_set && (
              <span style={{ marginLeft: 8, color: 'var(--ds-text-success, #1F845A)' }}>✓ Saved</span>
            )}
          </label>
          <div style={{ fontSize: 11, color: 'var(--ds-text-subtlest, #6B778C)', marginBottom: 6 }}>
            From vercel.com → Settings → Tokens — for live Vercel deployment status
          </div>
          <input
            ref={tokenRef}
            type="password"
            placeholder={config.vercel_token_set ? '••••••••••••••••••••' : 'xxxxxxxxxxxxxxxxxxxx'}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '8px 10px',
              fontSize: 13,
              border: '2px solid var(--ds-border, #DFE1E6)',
              borderRadius: 4,
              background: 'var(--ds-surface, #FFFFFF)',
              color: 'var(--ds-text, #172B4D)',
              outline: 'none',
              fontFamily: 'var(--ds-font-family-code, monospace)',
            }}
          />
        </div>

        <div>
          <Button
            appearance="primary"
            isLoading={saving}
            onClick={() =>
              onSave(patRef.current?.value || undefined, tokenRef.current?.value || undefined)
            }
          >
            Save credentials
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VercelConnectionPage() {
  const {
    data,
    loading,
    toggling,
    triggering,
    savingConfig,
    error,
    lastRefreshed,
    toggle,
    triggerDeploy,
    saveConfig,
    refresh,
    call,
  } = useDeployControl();

  const [showConfig, setShowConfig] = useState(false);

  if (loading) {
    return (
      <div style={{ padding: '48px', display: 'flex', alignItems: 'center', gap: 12, color: 'var(--ds-text-subtle, #42526E)' }}>
        <Spinner size="medium" />
        <span>Loading deployment status…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 32 }}>
        <div
          style={{
            padding: '12px 16px',
            background: 'var(--ds-background-danger, #FFEDEB)',
            border: '1px solid var(--ds-border-danger, #FF5630)',
            borderRadius: 4,
            fontSize: 14,
            color: 'var(--ds-text-danger, #AE2A19)',
            marginBottom: 16,
          }}
        >
          {error}
        </div>
        <Button onClick={refresh}>Retry</Button>
      </div>
    );
  }

  const { gate, config, runs, deployments, stats } = data!;
  const latestRun = runs[0] ?? null;
  const latestDeployment = deployments[0] ?? null;
  const isRunInProgress = latestRun?.status === 'in_progress' || latestRun?.status === 'queued';

  return (
    <div style={{ padding: '32px 40px', maxWidth: 920 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 8,
            background: '#000000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            color: '#FFFFFF',
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          ▲
        </div>
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: 24,
              fontWeight: 653,
              color: 'var(--ds-text, #172B4D)',
              lineHeight: '28px',
            }}
          >
            Production deploys
          </h1>
          <div style={{ fontSize: 13, color: 'var(--ds-text-subtle, #42526E)', marginTop: 2 }}>
            {config.production_url} · {config.github_repo}
          </div>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          {config.github_pat_set ? (
            <Lozenge appearance="success">GitHub ✓</Lozenge>
          ) : (
            <Lozenge appearance="default">GitHub — no PAT</Lozenge>
          )}
          {config.vercel_token_set ? (
            <Lozenge appearance="success">Vercel ✓</Lozenge>
          ) : (
            <Lozenge appearance="default">Vercel — no token</Lozenge>
          )}
          <Button appearance="subtle" onClick={refresh} spacing="compact">
            Refresh
          </Button>
        </div>
      </div>

      {lastRefreshed && (
        <div style={{ fontSize: 11, color: 'var(--ds-text-subtlest, #6B778C)', marginBottom: 24 }}>
          Updated {fmtRelative(lastRefreshed.toISOString())} · auto-refreshes every 30s
        </div>
      )}

      {/* ── Deploy gate ── */}
      <div
        style={{
          background: 'var(--ds-surface, #FFFFFF)',
          border: `1px solid ${gate.production_deploy_enabled ? 'var(--ds-border-success, #1F845A)' : 'var(--ds-border, #DFE1E6)'}`,
          borderRadius: 8,
          padding: '20px 24px',
          marginBottom: 24,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--ds-text, #172B4D)', marginBottom: 4 }}>
              Deploy gate
            </div>
            <div style={{ fontSize: 13, color: 'var(--ds-text-subtle, #42526E)', lineHeight: '18px' }}>
              {gate.production_deploy_enabled
                ? 'Gate is ON — each push to main will trigger a production build on GitHub Actions'
                : 'Gate is OFF (default) — pushes to main are ignored. Enable when you want to deploy.'}
            </div>
            {!gate.production_deploy_enabled && gate.disabled_at && (
              <div style={{ fontSize: 12, color: 'var(--ds-text-subtlest, #6B778C)', marginTop: 4 }}>
                Disabled {fmtRelative(gate.disabled_at)}
                {gate.disabled_by_email ? ` by ${gate.disabled_by_email}` : ''}
              </div>
            )}
            {gate.production_deploy_enabled && (
              <div style={{ marginTop: 8 }}>
                <Lozenge appearance="success">Active</Lozenge>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            <span
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: gate.production_deploy_enabled
                  ? 'var(--ds-text-success, #1F845A)'
                  : 'var(--ds-text-subtlest, #6B778C)',
              }}
            >
              {gate.production_deploy_enabled ? 'ON' : 'OFF'}
            </span>
            {toggling ? (
              <Spinner size="small" />
            ) : (
              <Toggle
                id="deploy-gate"
                isChecked={gate.production_deploy_enabled}
                onChange={(e) => toggle(e.target.checked)}
                size="large"
              />
            )}
          </div>
        </div>
      </div>

      {/* ── Live deployment progress ── */}
      {isRunInProgress && latestRun && (
        <LiveProgress run={latestRun} call={call} />
      )}

      {/* ── Actions ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <Button
          appearance="primary"
          isDisabled={!config.github_pat_set || triggering}
          isLoading={triggering}
          onClick={triggerDeploy}
        >
          Deploy to production now
        </Button>
        {!config.github_pat_set && (
          <span style={{ fontSize: 12, color: 'var(--ds-text-subtlest, #6B778C)' }}>
            Add GitHub PAT in configuration below to enable
          </span>
        )}
        <a
          href={`https://github.com/${config.github_repo}/actions`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: 13, color: 'var(--ds-link, #0052CC)', textDecoration: 'none', marginLeft: 'auto' }}
        >
          View GitHub Actions ↗
        </a>
      </div>

      {/* ── Vercel token warning ── */}
      {!config.vercel_token_set && (
        <div
          style={{
            marginBottom: 24,
            padding: '12px 16px',
            background: 'var(--ds-background-danger, #FFEDEB)',
            border: '1px solid var(--ds-border-danger, #AE2A19)',
            borderRadius: 6,
            fontSize: 13,
            color: 'var(--ds-text-danger, #AE2A19)',
            lineHeight: '18px',
          }}
        >
          <strong>VERCEL_TOKEN not configured.</strong> Deploys will fail at the "Deploy to Vercel" step.{' '}
          Add it at{' '}
          <a
            href={`https://github.com/${config.github_repo}/settings/secrets/actions`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'inherit', fontWeight: 600 }}
          >
            GitHub → Secrets → VERCEL_TOKEN
          </a>
          {'. Get token from '}
          <a
            href="https://vercel.com/account/tokens"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'inherit', fontWeight: 600 }}
          >
            vercel.com/account/tokens
          </a>.
        </div>
      )}

      {/* ── Stats ── */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        <StatCard label="Today" value={stats.today} sub="deploys triggered" />
        <StatCard
          label="Succeeded"
          value={stats.success}
          sub={`of ${stats.total} runs`}
          accent={stats.success > 0 ? 'success' : 'neutral'}
        />
        <StatCard
          label="Failed"
          value={stats.failed}
          sub={`of ${stats.total} runs`}
          accent={stats.failed > 0 ? 'danger' : 'neutral'}
        />
      </div>

      {/* ── Current production ── */}
      {(latestRun || latestDeployment) && (
        <div
          style={{
            background: 'var(--ds-surface, #FFFFFF)',
            border: '1px solid var(--ds-border, #DFE1E6)',
            borderRadius: 8,
            padding: '16px 20px',
            marginBottom: 24,
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--ds-text-subtlest, #6B778C)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              flexShrink: 0,
            }}
          >
            Production now
          </div>

          {latestDeployment ? (
            <>
              <VercelStateBadge state={latestDeployment.state} />
              <a
                href={`https://${latestDeployment.url}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: 13, color: 'var(--ds-link, #0052CC)', textDecoration: 'none' }}
              >
                {latestDeployment.url}
              </a>
              {latestDeployment.meta.github_commit_sha && (
                <code style={{ fontSize: 12, color: 'var(--ds-text-subtle, #42526E)', fontFamily: 'var(--ds-font-family-code, monospace)' }}>
                  {latestDeployment.meta.github_commit_sha.slice(0, 7)}
                </code>
              )}
              {latestDeployment.meta.github_commit_message && (
                <span
                  style={{
                    fontSize: 13,
                    color: 'var(--ds-text, #172B4D)',
                    flex: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {latestDeployment.meta.github_commit_message.split('\n')[0]}
                </span>
              )}
              <span style={{ fontSize: 12, color: 'var(--ds-text-subtlest, #6B778C)', flexShrink: 0 }}>
                {fmtRelative(latestDeployment.ready_at ?? latestDeployment.created_at)}
              </span>
            </>
          ) : latestRun ? (
            <>
              <RunStatusBadge status={latestRun.status} conclusion={latestRun.conclusion} />
              <code style={{ fontSize: 12, color: 'var(--ds-text-subtle, #42526E)', fontFamily: 'var(--ds-font-family-code, monospace)' }}>
                {latestRun.head_sha}
              </code>
              <span
                style={{
                  fontSize: 13,
                  color: 'var(--ds-text, #172B4D)',
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {latestRun.head_commit_message.split('\n')[0]}
              </span>
              <span style={{ fontSize: 12, color: 'var(--ds-text-subtlest, #6B778C)', flexShrink: 0 }}>
                {fmtRelative(latestRun.updated_at)}
              </span>
            </>
          ) : null}
        </div>
      )}

      {/* ── Deploy history ── */}
      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--ds-text, #172B4D)',
            marginBottom: 12,
          }}
        >
          Deploy history
          {!config.github_pat_set && (
            <span style={{ fontWeight: 400, fontSize: 12, color: 'var(--ds-text-subtlest, #6B778C)', marginLeft: 8 }}>
              — add GitHub PAT in configuration below to load live runs
            </span>
          )}
        </div>
        {runs.length === 0 ? (
          <div
            style={{
              padding: '32px 24px',
              border: '1px solid var(--ds-border, #DFE1E6)',
              borderRadius: 8,
              textAlign: 'center',
              fontSize: 13,
              color: 'var(--ds-text-subtlest, #6B778C)',
            }}
          >
            {config.github_pat_set
              ? 'No runs found for this workflow'
              : 'Configure a GitHub PAT in the settings below to see live run history'}
          </div>
        ) : (
          <div style={{ border: '1px solid var(--ds-border, #DFE1E6)', borderRadius: 8, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--ds-border, #DFE1E6)' }}>
                  {['Status', 'Commit', 'What shipped', 'Error', 'Duration', 'When', 'By'].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: '8px 12px',
                        textAlign: 'left',
                        fontSize: 12,
                        fontWeight: 653,
                        color: 'var(--ds-text-subtle, #42526E)',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {runs.map((run, i) => {
                  const errLabel = errorLabel(run.conclusion);
                  return (
                    <tr
                      key={run.id}
                      style={{
                        borderBottom: i < runs.length - 1 ? '1px solid var(--ds-border, #DFE1E6)' : 'none',
                        background: run.conclusion === 'failure'
                          ? 'var(--ds-background-danger-hovered, #FFEDEB)'
                          : 'transparent',
                      }}
                    >
                      <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                        <RunStatusBadge status={run.status} conclusion={run.conclusion} />
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <a
                          href={run.html_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            fontFamily: 'var(--ds-font-family-code, monospace)',
                            fontSize: 12,
                            color: 'var(--ds-link, #0052CC)',
                            textDecoration: 'none',
                          }}
                        >
                          {run.head_sha}
                        </a>
                      </td>
                      <td style={{ padding: '10px 12px', maxWidth: 280 }}>
                        {run.summary ? (
                          <span style={{ color: 'var(--ds-text, #172B4D)', fontSize: 13 }}>
                            {run.summary}
                          </span>
                        ) : (
                          <span
                            style={{
                              color: 'var(--ds-text-subtle, #42526E)',
                              fontSize: 12,
                              fontFamily: 'var(--ds-font-family-code, monospace)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              display: 'block',
                            }}
                          >
                            {run.head_commit_message.split('\n')[0]}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                        {errLabel ? (
                          <Lozenge appearance={run.conclusion === 'failure' ? 'removed' : 'default'}>
                            {errLabel}
                          </Lozenge>
                        ) : '—'}
                      </td>
                      <td style={{ padding: '10px 12px', color: 'var(--ds-text-subtle, #42526E)', whiteSpace: 'nowrap' }}>
                        {fmtDuration(run.duration_ms)}
                      </td>
                      <td style={{ padding: '10px 12px', color: 'var(--ds-text-subtle, #42526E)', whiteSpace: 'nowrap' }}>
                        {fmtRelative(run.created_at)}
                      </td>
                      <td style={{ padding: '10px 12px', color: 'var(--ds-text-subtle, #42526E)' }}>
                        {run.trigger || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Vercel deployments ── */}
      {deployments.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ds-text, #172B4D)', marginBottom: 12 }}>
            Vercel deployments
          </div>
          <div style={{ border: '1px solid var(--ds-border, #DFE1E6)', borderRadius: 8, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--ds-border, #DFE1E6)' }}>
                  {['Status', 'URL', 'Commit', 'Build time', 'When'].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: '8px 12px',
                        textAlign: 'left',
                        fontSize: 12,
                        fontWeight: 653,
                        color: 'var(--ds-text-subtle, #42526E)',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {deployments.map((d, i) => (
                  <tr
                    key={d.uid}
                    style={{ borderBottom: i < deployments.length - 1 ? '1px solid var(--ds-border, #DFE1E6)' : 'none' }}
                  >
                    <td style={{ padding: '10px 12px' }}>
                      <VercelStateBadge state={d.state} />
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <a
                        href={`https://${d.url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: 12, color: 'var(--ds-link, #0052CC)', textDecoration: 'none' }}
                      >
                        {d.url}
                      </a>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <code style={{ fontSize: 12, color: 'var(--ds-text-subtle, #42526E)', fontFamily: 'var(--ds-font-family-code, monospace)' }}>
                        {d.meta.github_commit_sha?.slice(0, 7) ?? '—'}
                      </code>
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--ds-text-subtle, #42526E)' }}>
                      {fmtDuration(d.build_duration_ms)}
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--ds-text-subtle, #42526E)', whiteSpace: 'nowrap' }}>
                      {fmtRelative(d.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Configuration ── */}
      <div>
        <button
          onClick={() => setShowConfig((v) => !v)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--ds-link, #0052CC)',
            padding: '0 0 12px',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          {showConfig ? '▼' : '▶'} Configuration
        </button>
        {showConfig && (
          <ConfigPanel config={config} saving={savingConfig} onSave={saveConfig} />
        )}
      </div>
    </div>
  );
}
