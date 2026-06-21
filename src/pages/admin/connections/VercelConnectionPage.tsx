import { useCallback, useEffect, useRef, useState } from 'react';
import Button from '@atlaskit/button/new';
import Lozenge from '@atlaskit/lozenge';
import Spinner from '@atlaskit/spinner';
import Toggle from '@atlaskit/toggle';
import ProgressBar from '@atlaskit/progress-bar';
import Textfield from '@atlaskit/textfield';
import SectionMessage from '@atlaskit/section-message';
import { supabase } from '@/integrations/supabase/client';
import { AdminGuard } from '@/components/admin/AdminGuard';

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

const FONT =
  '"Atlassian Sans", ui-sans-serif, -apple-system, system-ui, "Segoe UI", Ubuntu, "Helvetica Neue", sans-serif';

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

  const toggle = useCallback(async (enabled: boolean) => {
    setToggling(true);
    try {
      await call('POST', { action: 'toggle', enabled });
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
  if (!conclusion || conclusion === 'success' || conclusion === 'skipped') return null;
  if (conclusion === 'failure') return 'Build failed';
  if (conclusion === 'cancelled') return 'Cancelled';
  if (conclusion === 'timed_out') return 'Timed out';
  if (conclusion === 'startup_failure') return 'Startup failure';
  return conclusion;
}

function RunStatusBadge({ status, conclusion }: { status: string; conclusion: string | null }) {
  if (status === 'in_progress' || status === 'queued' || status === 'waiting') {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
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

// ─── Live progress ────────────────────────────────────────────────────────────

function StepIcon({ status, conclusion }: { status: string; conclusion: string | null }) {
  if (status === 'in_progress') return <Spinner size="small" />;
  if (status === 'completed' && conclusion === 'success')
    return <span style={{ color: 'var(--ds-text-success, #1F845A)', fontWeight: 700 }}>✓</span>;
  if (status === 'completed' && conclusion === 'failure')
    return <span style={{ color: 'var(--ds-text-danger, #AE2A19)', fontWeight: 700 }}>✗</span>;
  if (status === 'completed')
    return <span style={{ color: 'var(--ds-text-subtlest, #6B778C)' }}>—</span>;
  return <span style={{ color: 'var(--ds-text-subtlest, #6B778C)' }}>○</span>;
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
        if (!cancelled) { setJobs(result.jobs ?? []); setFetchError(false); }
      } catch {
        if (!cancelled) setFetchError(true);
      }
    };
    poll();
    const t = setInterval(poll, 5000);
    return () => { cancelled = true; clearInterval(t); };
  }, [run.id, call]);

  const deployJob = jobs.find((j) => j.name === 'deploy') ?? jobs.find((j) => j.steps.length > 0);
  const allSteps = deployJob?.steps ?? [];
  const visibleSteps = allSteps.filter((s) => !['Set up job', 'Complete job'].includes(s.name));
  const completedCount = visibleSteps.filter((s) => s.status === 'completed').length;
  const progress = visibleSteps.length > 0 ? completedCount / visibleSteps.length : 0;

  return (
    <div
      style={{
        background: 'var(--ds-surface, #FFFFFF)',
        border: '2px solid var(--ds-border-brand, #0052CC)',
        borderRadius: 4,
        padding: '16px 20px',
        marginBottom: 20,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <Spinner size="medium" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ds-text, #292A2E)' }}>
            Deploying to production
          </div>
          <div style={{ fontSize: 12, color: 'var(--ds-text-subtle, #505258)', marginTop: 2 }}>
            <code style={{ fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace', fontSize: 11 }}>
              {run.head_sha}
            </code>
            {' — '}
            {run.head_commit_message.split('\n')[0].slice(0, 80)}
          </div>
        </div>
        <a
          href={run.html_url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: 12, color: 'var(--ds-link, #0052CC)', textDecoration: 'none', flexShrink: 0 }}
        >
          View on GitHub ↗
        </a>
      </div>

      <div style={{ marginBottom: visibleSteps.length > 0 ? 12 : 0 }}>
        <ProgressBar value={progress} isIndeterminate={visibleSteps.length === 0} />
      </div>

      {fetchError && (
        <div style={{ fontSize: 12, color: 'var(--ds-text-subtlest, #6B778C)' }}>
          Step data unavailable — check GitHub Actions directly
        </div>
      )}

      {visibleSteps.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
          {visibleSteps.map((step) => (
            <div key={step.number} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 13 }}>
                <StepIcon status={step.status} conclusion={step.conclusion} />
              </div>
              <span
                style={{
                  fontSize: 13,
                  color: step.status === 'in_progress' ? 'var(--ds-text, #292A2E)' : 'var(--ds-text-subtle, #505258)',
                  fontWeight: step.status === 'in_progress' ? 500 : 400,
                  flex: 1,
                }}
              >
                {step.name}
              </span>
              {step.status === 'completed' && step.started_at && step.completed_at && (
                <span style={{ fontSize: 11, color: 'var(--ds-text-subtlest, #6B778C)' }}>
                  {fmtDuration(new Date(step.completed_at).getTime() - new Date(step.started_at).getTime())}
                </span>
              )}
              {step.status === 'in_progress' && step.started_at && (
                <span style={{ fontSize: 11, color: 'var(--ds-text-subtlest, #6B778C)' }}>
                  {fmtDuration(Date.now() - new Date(step.started_at).getTime())}…
                </span>
              )}
            </div>
          ))}
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 560 }}>
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ds-text-subtle, #505258)', marginBottom: 4 }}>
          GitHub personal access token{' '}
          {config.github_pat_set && <span style={{ color: 'var(--ds-text-success, #1F845A)' }}>✓ saved</span>}
        </div>
        <div style={{ fontSize: 11, color: 'var(--ds-text-subtlest, #6B778C)', marginBottom: 6 }}>
          Needs <code>actions:write</code> scope — for listing runs and triggering deploys
        </div>
        <Textfield
          ref={patRef}
          type="password"
          placeholder={config.github_pat_set ? '••••••••••••••••••••' : 'ghp_xxxxxxxxxxxxxxxxxxxx'}
        />
      </div>

      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ds-text-subtle, #505258)', marginBottom: 4 }}>
          Vercel API token{' '}
          {config.vercel_token_set && <span style={{ color: 'var(--ds-text-success, #1F845A)' }}>✓ saved</span>}
        </div>
        <div style={{ fontSize: 11, color: 'var(--ds-text-subtlest, #6B778C)', marginBottom: 6 }}>
          From vercel.com → Settings → Tokens
        </div>
        <Textfield
          ref={tokenRef}
          type="password"
          placeholder={config.vercel_token_set ? '••••••••••••••••••••' : 'xxxxxxxxxxxxxxxxxxxx'}
        />
      </div>

      <div>
        <Button
          appearance="primary"
          isLoading={saving}
          onClick={() => onSave(
            (patRef.current as HTMLInputElement | null)?.value || undefined,
            (tokenRef.current as HTMLInputElement | null)?.value || undefined,
          )}
        >
          Save credentials
        </Button>
      </div>
    </div>
  );
}

// ─── Section label ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 12,
        fontWeight: 653,
        color: 'var(--ds-text-subtle, #505258)',
        padding: '20px 0 8px',
        borderBottom: '1.67px solid var(--ds-border, rgba(11,18,14,0.14))',
        marginBottom: 12,
      }}
    >
      {children}
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
      <AdminGuard>
        <div style={{ padding: 48, display: 'flex', alignItems: 'center', gap: 12, color: 'var(--ds-text-subtle, #505258)', fontFamily: FONT }}>
          <Spinner size="medium" />
          <span style={{ fontSize: 14 }}>Loading deployment status…</span>
        </div>
      </AdminGuard>
    );
  }

  if (error) {
    return (
      <AdminGuard>
        <div style={{ padding: '24px 32px', fontFamily: FONT }}>
          <SectionMessage appearance="error" title="Failed to load">{error}</SectionMessage>
          <div style={{ marginTop: 16 }}><Button onClick={refresh}>Retry</Button></div>
        </div>
      </AdminGuard>
    );
  }

  const { gate, config, runs, deployments, stats } = data!;
  const latestRun = runs[0] ?? null;
  const latestDeployment = deployments[0] ?? null;
  const isRunInProgress = latestRun?.status === 'in_progress' || latestRun?.status === 'queued';

  const TH: React.CSSProperties = {
    textAlign: 'left',
    fontSize: 12,
    fontWeight: 653,
    color: 'var(--ds-text-subtle, #505258)',
    padding: '8px 12px 8px 0',
    borderBottom: '1.67px solid var(--ds-border, rgba(11,18,14,0.14))',
    letterSpacing: 'normal',
    lineHeight: '16px',
    whiteSpace: 'nowrap',
  };
  const TD: React.CSSProperties = {
    fontSize: 14,
    color: 'var(--ds-text, #292A2E)',
    padding: '10px 12px 10px 0',
    borderBottom: '1px solid var(--ds-border-subtle, rgba(11,18,14,0.08))',
    verticalAlign: 'middle',
  };
  const TD_MUTED: React.CSSProperties = { ...TD, color: 'var(--ds-text-subtle, #505258)', fontSize: 13 };
  const MONO: React.CSSProperties = {
    fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
    fontSize: 12,
  };

  return (
    <AdminGuard>
      <div
        style={{
          padding: '24px 32px 48px',
          maxWidth: 1280,
          color: 'var(--ds-text, #292A2E)',
          fontFamily: FONT,
        }}
      >
        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 6,
                background: '#000000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
                color: '#FFFFFF',
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              ▲
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 653, lineHeight: '28px', color: 'var(--ds-text, #292A2E)', margin: 0 }}>
              Production deploys
            </h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {config.github_pat_set
              ? <Lozenge appearance="success">GitHub ✓</Lozenge>
              : <Lozenge appearance="default">GitHub — no PAT</Lozenge>}
            {config.vercel_token_set
              ? <Lozenge appearance="success">Vercel ✓</Lozenge>
              : <Lozenge appearance="default">Vercel — no token</Lozenge>}
            <Button appearance="subtle" onClick={refresh} spacing="compact">Refresh</Button>
          </div>
        </div>

        <p style={{ fontSize: 14, color: 'var(--ds-text-subtle, #505258)', margin: '0 0 4px', lineHeight: '20px' }}>
          {config.production_url} · {config.github_repo}
        </p>
        {lastRefreshed && (
          <p style={{ fontSize: 12, color: 'var(--ds-text-subtlest, #6B778C)', margin: '0 0 24px' }}>
            Updated {fmtRelative(lastRefreshed.toISOString())} · auto-refreshes every 30s
          </p>
        )}

        {/* ── Vercel token warning ── */}
        {!config.vercel_token_set && (
          <div style={{ marginBottom: 20 }}>
            <SectionMessage appearance="warning" title="VERCEL_TOKEN not configured">
              Deploys will fail at the "Deploy to Vercel" step. Add it in Configuration below, then set it as a{' '}
              <a
                href={`https://github.com/${config.github_repo}/settings/secrets/actions`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'inherit', fontWeight: 600 }}
              >
                GitHub secret
              </a>
              {' '}named <code>VERCEL_TOKEN</code>.
            </SectionMessage>
          </div>
        )}

        {/* ── Deploy gate ── */}
        <div
          style={{
            background: 'var(--ds-surface, #FFFFFF)',
            border: `1px solid ${gate.production_deploy_enabled ? 'var(--ds-border-success, #1F845A)' : 'var(--ds-border, #DCDFE4)'}`,
            borderRadius: 4,
            padding: '16px 20px',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 16,
          }}
        >
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ds-text, #292A2E)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
              Deploy gate
              {gate.production_deploy_enabled && <Lozenge appearance="success">Active</Lozenge>}
            </div>
            <div style={{ fontSize: 13, color: 'var(--ds-text-subtle, #505258)', lineHeight: '18px' }}>
              {gate.production_deploy_enabled
                ? 'Gate ON — each push to main triggers a production build on GitHub Actions'
                : 'Gate OFF — pushes to main are ignored. Enable when you want to deploy.'}
            </div>
            {!gate.production_deploy_enabled && gate.disabled_at && (
              <div style={{ fontSize: 12, color: 'var(--ds-text-subtlest, #6B778C)', marginTop: 4 }}>
                Disabled {fmtRelative(gate.disabled_at)}
                {gate.disabled_by_email ? ` by ${gate.disabled_by_email}` : ''}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, paddingTop: 2 }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: gate.production_deploy_enabled ? 'var(--ds-text-success, #1F845A)' : 'var(--ds-text-subtlest, #6B778C)' }}>
              {gate.production_deploy_enabled ? 'ON' : 'OFF'}
            </span>
            {toggling ? <Spinner size="small" /> : (
              <Toggle
                id="deploy-gate"
                isChecked={gate.production_deploy_enabled}
                onChange={(e) => toggle(e.target.checked)}
                size="large"
              />
            )}
          </div>
        </div>

        {/* ── Live progress ── */}
        {isRunInProgress && latestRun && <LiveProgress run={latestRun} call={call} />}

        {/* ── Actions ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <Button
            appearance="primary"
            isDisabled={!gate.production_deploy_enabled || !config.github_pat_set || triggering || isRunInProgress}
            isLoading={triggering}
            onClick={triggerDeploy}
          >
            Deploy to production now
          </Button>
          {!gate.production_deploy_enabled && (
            <span style={{ fontSize: 12, color: 'var(--ds-text-subtlest, #6B778C)' }}>
              Enable the deploy gate above to deploy
            </span>
          )}
          {gate.production_deploy_enabled && !config.github_pat_set && (
            <span style={{ fontSize: 12, color: 'var(--ds-text-subtlest, #6B778C)' }}>
              Add GitHub PAT in Configuration below to enable
            </span>
          )}
          {gate.production_deploy_enabled && config.github_pat_set && isRunInProgress && (
            <span style={{ fontSize: 12, color: 'var(--ds-text-subtlest, #6B778C)' }}>
              Deploy in progress…
            </span>
          )}
          <a
            href={`https://github.com/${config.github_repo}/actions`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--ds-link, #0052CC)', textDecoration: 'none' }}
          >
            View GitHub Actions ↗
          </a>
        </div>

        {/* ── Stats ── */}
        <div
          style={{
            display: 'flex',
            gap: 0,
            marginBottom: 24,
            border: '1px solid var(--ds-border, #DCDFE4)',
            borderRadius: 4,
            overflow: 'hidden',
            background: 'var(--ds-surface, #FFFFFF)',
          }}
        >
          {[
            { label: 'Today', value: stats.today, sub: 'deploys triggered', accent: undefined as string | undefined },
            { label: 'Succeeded', value: stats.success, sub: `of ${stats.total} runs`, accent: stats.success > 0 ? 'var(--ds-text-success, #1F845A)' : undefined },
            { label: 'Failed', value: stats.failed, sub: `of ${stats.total} runs`, accent: stats.failed > 0 ? 'var(--ds-text-danger, #AE2A19)' : undefined },
          ].map((s, i) => (
            <div
              key={s.label}
              style={{
                flex: 1,
                padding: '16px 20px',
                borderLeft: i > 0 ? '1px solid var(--ds-border, #DCDFE4)' : 'none',
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 653, color: 'var(--ds-text-subtlest, #6B778C)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
                {s.label}
              </div>
              <div style={{ fontSize: 28, fontWeight: 653, lineHeight: 1, color: s.accent ?? 'var(--ds-text, #292A2E)' }}>
                {s.value}
              </div>
              <div style={{ fontSize: 12, color: 'var(--ds-text-subtlest, #6B778C)', marginTop: 4 }}>
                {s.sub}
              </div>
            </div>
          ))}
        </div>

        {/* ── Current production ── */}
        {(latestRun || latestDeployment) && (
          <div
            style={{
              background: 'var(--ds-surface, #FFFFFF)',
              border: '1px solid var(--ds-border, #DCDFE4)',
              borderRadius: 4,
              padding: '12px 16px',
              marginBottom: 24,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <span style={{ fontSize: 11, fontWeight: 653, color: 'var(--ds-text-subtlest, #6B778C)', textTransform: 'uppercase', letterSpacing: '0.04em', flexShrink: 0 }}>
              Production now
            </span>
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
                  <code style={{ ...MONO, color: 'var(--ds-text-subtle, #505258)' }}>
                    {latestDeployment.meta.github_commit_sha.slice(0, 7)}
                  </code>
                )}
                {latestDeployment.meta.github_commit_message && (
                  <span style={{ fontSize: 13, color: 'var(--ds-text, #292A2E)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
                <code style={{ ...MONO, color: 'var(--ds-text-subtle, #505258)' }}>{latestRun.head_sha}</code>
                <span style={{ fontSize: 13, color: 'var(--ds-text, #292A2E)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
        <SectionLabel>
          Deploy history
          {!config.github_pat_set && (
            <span style={{ fontWeight: 400, marginLeft: 8, color: 'var(--ds-text-subtlest, #6B778C)' }}>
              — add GitHub PAT in Configuration below
            </span>
          )}
        </SectionLabel>

        {runs.length === 0 ? (
          <div style={{ padding: '32px 0', textAlign: 'center', fontSize: 14, color: 'var(--ds-text-subtlest, #6B778C)' }}>
            {config.github_pat_set ? 'No runs found for this workflow' : 'Configure a GitHub PAT to see live run history'}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead style={{ position: 'sticky', top: 0, background: 'var(--ds-surface, #FFFFFF)', zIndex: 1 }}>
                <tr>
                  <th style={TH}>Status</th>
                  <th style={TH}>Commit</th>
                  <th style={{ ...TH, width: '40%' }}>What shipped</th>
                  <th style={TH}>Error</th>
                  <th style={TH}>Duration</th>
                  <th style={TH}>When</th>
                  <th style={TH}>By</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => {
                  const errLabel = errorLabel(run.conclusion);
                  return (
                    <tr key={run.id}>
                      <td style={TD}><RunStatusBadge status={run.status} conclusion={run.conclusion} /></td>
                      <td style={TD}>
                        <a
                          href={run.html_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ ...MONO, color: 'var(--ds-link, #0052CC)', textDecoration: 'none' }}
                        >
                          {run.head_sha}
                        </a>
                      </td>
                      <td style={{ ...TD, maxWidth: 360 }}>
                        {run.summary ? (
                          <span style={{ fontSize: 13 }}>{run.summary}</span>
                        ) : (
                          <span style={{ ...MONO, color: 'var(--ds-text-subtle, #505258)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {run.head_commit_message.split('\n')[0]}
                          </span>
                        )}
                      </td>
                      <td style={TD}>
                        {errLabel
                          ? <Lozenge appearance={run.conclusion === 'failure' ? 'removed' : 'default'}>{errLabel}</Lozenge>
                          : <span style={{ color: 'var(--ds-text-subtlest, #6B778C)' }}>—</span>}
                      </td>
                      <td style={TD_MUTED}>{fmtDuration(run.duration_ms)}</td>
                      <td style={{ ...TD_MUTED, whiteSpace: 'nowrap' }}>{fmtRelative(run.created_at)}</td>
                      <td style={TD_MUTED}>{run.trigger || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Vercel deployments ── */}
        {deployments.length > 0 && (
          <>
            <SectionLabel>Vercel deployments</SectionLabel>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead style={{ position: 'sticky', top: 0, background: 'var(--ds-surface, #FFFFFF)', zIndex: 1 }}>
                  <tr>
                    <th style={TH}>Status</th>
                    <th style={TH}>URL</th>
                    <th style={TH}>Commit</th>
                    <th style={TH}>Build time</th>
                    <th style={TH}>When</th>
                  </tr>
                </thead>
                <tbody>
                  {deployments.map((d) => (
                    <tr key={d.uid}>
                      <td style={TD}><VercelStateBadge state={d.state} /></td>
                      <td style={TD}>
                        <a
                          href={`https://${d.url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ fontSize: 13, color: 'var(--ds-link, #0052CC)', textDecoration: 'none' }}
                        >
                          {d.url}
                        </a>
                      </td>
                      <td style={TD}>
                        <code style={{ ...MONO, color: 'var(--ds-text-subtle, #505258)' }}>
                          {d.meta.github_commit_sha?.slice(0, 7) ?? '—'}
                        </code>
                      </td>
                      <td style={TD_MUTED}>{fmtDuration(d.build_duration_ms)}</td>
                      <td style={{ ...TD_MUTED, whiteSpace: 'nowrap' }}>{fmtRelative(d.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ── Configuration ── */}
        <SectionLabel>
          <button
            onClick={() => setShowConfig((v) => !v)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 653,
              color: 'var(--ds-text-subtle, #505258)',
              padding: 0,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontFamily: FONT,
            }}
          >
            {showConfig ? '▼' : '▶'} Configuration
          </button>
        </SectionLabel>
        {showConfig && <ConfigPanel config={config} saving={savingConfig} onSave={saveConfig} />}
      </div>
    </AdminGuard>
  );
}
