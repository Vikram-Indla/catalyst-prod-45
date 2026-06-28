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
  staging_runs: GitHubRun[];
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

interface EnvironmentsData {
  mainBranch: { sha: string | null; message: string | null; date: string | null } | null;
  prodBranch: { sha: string | null; message: string | null; date: string | null } | null;
}

interface DiffCommit {
  sha: string;
  message: string;
  author: string;
  date: string;
}

interface BranchItem {
  name: string;
  sha: string | null;
}

interface FileGroup {
  label: string;
  count: number;
  emoji: string;
}

interface BranchSummary {
  ahead_by: number;
  behind_by: number;
  commits: DiffCommit[];
  has_migrations: boolean;
  migration_files: string[];
  file_groups: FileGroup[];
  total_files_changed: number;
  ai_summary: string | null;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const FONT =
  '"Atlassian Sans", ui-sans-serif, -apple-system, system-ui, "Segoe UI", Ubuntu, "Helvetica Neue", sans-serif';
const STAGING_DB_REF = 'cyijbdeuehohvhnsywig';
const PROD_DB_REF = 'lmqwtldpfacrrlvdnmld';

// ─── Stage status helpers ─────────────────────────────────────────────────────

type StageSt = 'idle' | 'running' | 'success' | 'failed';

function runSt(run?: GitHubRun | null): StageSt {
  if (!run) return 'idle';
  if (run.status === 'in_progress' || run.status === 'queued' || run.status === 'waiting') return 'running';
  if (run.conclusion === 'success') return 'success';
  if (run.conclusion === 'failure') return 'failed';
  return 'idle';
}

function vercelSt(dep?: VercelDeployment | null): StageSt {
  if (!dep) return 'idle';
  if (dep.state === 'READY') return 'success';
  if (dep.state === 'ERROR') return 'failed';
  if (dep.state === 'BUILDING' || dep.state === 'INITIALIZING') return 'running';
  return 'idle';
}

const ST_BORDER: Record<StageSt, string> = {
  idle: 'var(--ds-border)',
  running: 'var(--ds-border-brand)',
  success: 'var(--ds-border-success)',
  failed: 'var(--ds-border-danger)',
};

const ST_BG: Record<StageSt, string> = {
  idle: 'var(--ds-surface-sunken)',
  running: 'var(--ds-background-information-subtle)',
  success: 'var(--ds-background-success-subtle)',
  failed: 'var(--ds-background-danger-subtle)',
};

const ST_TEXT: Record<StageSt, string> = {
  idle: 'var(--ds-text-subtlest)',
  running: 'var(--ds-text-information)',
  success: 'var(--ds-text-success)',
  failed: 'var(--ds-text-danger)',
};

const ST_LABEL: Record<StageSt, string> = {
  idle: 'No deploys yet',
  running: 'Deploying',
  success: 'Ready',
  failed: 'Failed',
};

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
    const getToken = async (forceRefresh = false): Promise<string | null> => {
      if (forceRefresh) {
        const { data } = await supabase.auth.refreshSession();
        return data.session?.access_token ?? null;
      }
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) return session.access_token;
      const { data } = await supabase.auth.refreshSession();
      return data.session?.access_token ?? null;
    };

    const token = await getToken();
    if (!token) throw new Error('Not authenticated — please sign in again');

    const doFetch = (t: string) =>
      fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/deploy-control`, {
        method,
        headers: {
          Authorization: `Bearer ${t}`,
          'Content-Type': 'application/json',
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: body ? JSON.stringify(body) : undefined,
      });

    let res = await doFetch(token);
    if (res.status === 401) {
      const freshToken = await getToken(true);
      if (freshToken) res = await doFetch(freshToken);
    }

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

  const toggle = useCallback(
    async (enabled: boolean) => {
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
    },
    [call],
  );

  const triggerDeploy = useCallback(async () => {
    setTriggering(true);
    try {
      await call('POST', { action: 'trigger' });
      setTimeout(refresh, 3000);
    } finally {
      setTriggering(false);
    }
  }, [call, refresh]);

  const saveConfig = useCallback(
    async (github_pat?: string, vercel_token?: string) => {
      setSavingConfig(true);
      try {
        await call('POST', { action: 'save_config', github_pat, vercel_token });
        await refresh();
      } finally {
        setSavingConfig(false);
      }
    },
    [call, refresh],
  );

  return {
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
  };
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

// ─── Pipeline stage card ──────────────────────────────────────────────────────

function StageCard({
  index,
  title,
  subtitle,
  status,
  statusOverride,
  loading: cardLoading,
  rows,
  footer,
}: {
  index: number;
  title: string;
  subtitle: string;
  status: StageSt;
  statusOverride?: string;
  loading?: boolean;
  rows: { label: string; value: React.ReactNode; mono?: boolean }[];
  footer?: React.ReactNode;
}) {
  const label = statusOverride ?? ST_LABEL[status];
  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        border: `2px solid ${ST_BORDER[status]}`,
        borderRadius: 6,
        overflow: 'hidden',
        background: 'var(--ds-surface)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'border-color 0.2s',
      }}
    >
      <div
        style={{
          padding: '8px 16px',
          background: ST_BG[status],
          borderBottom: '1px solid var(--ds-border-subtle, rgba(11,18,14,0.08))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          minHeight: 48,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 22,
              height: 22,
              borderRadius: '50%',
              background: ST_TEXT[status],
              color: 'var(--ds-surface)',
              fontSize: 'var(--ds-font-size-100)',
              fontWeight: 700,
              flexShrink: 0,
              fontFamily: FONT,
            }}
          >
            {index}
          </span>
          <div>
            <div style={{ fontSize: 'var(--ds-font-size-300)', fontWeight: 600, color: 'var(--ds-text)', lineHeight: '16px' }}>
              {title}
            </div>
            <div style={{ fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-subtlest)', marginTop: 0 }}>{subtitle}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          {status === 'running' && cardLoading !== false ? (
            <Spinner size="small" />
          ) : (
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: ST_TEXT[status],
                display: 'inline-block',
                flexShrink: 0,
              }}
            />
          )}
          <span style={{ fontSize: 'var(--ds-font-size-200)', fontWeight: 500, color: ST_TEXT[status] }}>{label}</span>
        </div>
      </div>

      <div style={{ padding: '12px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rows.map((r) => (
          <div key={r.label}>
            <div
              style={{
                fontSize: 'var(--ds-font-size-50)',
                fontWeight: 653,
                color: 'var(--ds-text-subtlest)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                marginBottom: 4,
              }}
            >
              {r.label}
            </div>
            <div
              style={{
                fontSize: 'var(--ds-font-size-200)',
                color: 'var(--ds-text)',
                fontFamily: r.mono ? 'var(--ds-font-family-code)' : 'inherit',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {r.value ?? (
                <span style={{ color: 'var(--ds-text-subtlest)' }}>
                  {cardLoading ? 'Loading…' : '—'}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {footer && (
        <div
          style={{
            padding: '8px 16px',
            borderTop: '1px solid var(--ds-border-subtle, rgba(11,18,14,0.08))',
          }}
        >
          {footer}
        </div>
      )}
    </div>
  );
}

// ─── Pipeline connector ───────────────────────────────────────────────────────

function PipelineConnector({ active, label }: { active?: boolean; label?: string }) {
  const color = active ? 'var(--ds-border-brand)' : 'var(--ds-border)';
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        flexShrink: 0,
        padding: '24px 4px 0',
      }}
    >
      {label && (
        <div
          style={{
            fontSize: 'var(--ds-font-size-50)',
            color: 'var(--ds-text-subtlest)',
            whiteSpace: 'nowrap',
            textAlign: 'center',
            marginBottom: 0,
          }}
        >
          {label}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div style={{ width: 20, height: 2, background: color }} />
        <span style={{ fontSize: 'var(--ds-font-size-200)', color, lineHeight: 1, marginLeft: -1 }}>▶</span>
      </div>
    </div>
  );
}

// ─── Run status badge ─────────────────────────────────────────────────────────

function RunStatusBadge({ status, conclusion }: { status: string; conclusion: string | null }) {
  if (status === 'in_progress' || status === 'queued' || status === 'waiting') {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
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
  if (state === 'READY') return <Lozenge appearance="success">Live</Lozenge>;
  if (state === 'ERROR') return <Lozenge appearance="removed">Error</Lozenge>;
  if (state === 'BUILDING') return <Lozenge appearance="inprogress">Building</Lozenge>;
  if (state === 'CANCELED') return <Lozenge appearance="default">Cancelled</Lozenge>;
  return <Lozenge appearance="default">{state}</Lozenge>;
}

// ─── Live deploy progress ─────────────────────────────────────────────────────

function StepIcon({ status, conclusion }: { status: string; conclusion: string | null }) {
  if (status === 'in_progress') return <Spinner size="small" />;
  if (status === 'completed' && conclusion === 'success')
    return <span style={{ color: 'var(--ds-text-success)', fontWeight: 700 }}>✓</span>;
  if (status === 'completed' && conclusion === 'failure')
    return <span style={{ color: 'var(--ds-text-danger)', fontWeight: 700 }}>✗</span>;
  if (status === 'completed')
    return <span style={{ color: 'var(--ds-text-subtlest)' }}>—</span>;
  return <span style={{ color: 'var(--ds-text-subtlest)' }}>○</span>;
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
        const result = (await call('POST', {
          action: 'get_run_jobs',
          run_id: run.id,
        })) as { jobs?: JobInfo[] };
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
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [run.id, call]);

  const deployJob =
    jobs.find((j) => j.name === 'deploy') ?? jobs.find((j) => j.steps.length > 0);
  const allSteps = deployJob?.steps ?? [];
  const visibleSteps = allSteps.filter(
    (s) => !['Set up job', 'Complete job'].includes(s.name),
  );
  const completedCount = visibleSteps.filter((s) => s.status === 'completed').length;
  const progress = visibleSteps.length > 0 ? completedCount / visibleSteps.length : 0;

  return (
    <div
      style={{
        background: 'var(--ds-surface)',
        border: '2px solid var(--ds-border-brand)',
        borderRadius: 4,
        padding: '16px 20px',
        marginBottom: 16,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <Spinner size="medium" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 'var(--ds-font-size-400)', fontWeight: 600, color: 'var(--ds-text)' }}>
            Deploying to production
          </div>
          <div style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtle)', marginTop: 0 }}>
            <code
              style={{ fontFamily: 'var(--ds-font-family-code)', fontSize: 'var(--ds-font-size-100)' }}
            >
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
          style={{
            fontSize: 'var(--ds-font-size-200)',
            color: 'var(--ds-link)',
            textDecoration: 'none',
            flexShrink: 0,
          }}
        >
          View on GitHub ↗
        </a>
      </div>
      <div style={{ marginBottom: visibleSteps.length > 0 ? 12 : 0 }}>
        <ProgressBar value={progress} isIndeterminate={visibleSteps.length === 0} />
      </div>
      {fetchError && (
        <div style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtlest)' }}>
          Step data unavailable — check GitHub Actions directly
        </div>
      )}
      {visibleSteps.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
          {visibleSteps.map((step) => (
            <div key={step.number} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                style={{
                  width: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  fontSize: 'var(--ds-font-size-300)',
                }}
              >
                <StepIcon status={step.status} conclusion={step.conclusion} />
              </div>
              <span
                style={{
                  fontSize: 'var(--ds-font-size-300)',
                  color:
                    step.status === 'in_progress'
                      ? 'var(--ds-text)'
                      : 'var(--ds-text-subtle)',
                  fontWeight: step.status === 'in_progress' ? 500 : 400,
                  flex: 1,
                }}
              >
                {step.name}
              </span>
              {step.status === 'completed' && step.started_at && step.completed_at && (
                <span style={{ fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-subtlest)' }}>
                  {fmtDuration(
                    new Date(step.completed_at).getTime() -
                      new Date(step.started_at).getTime(),
                  )}
                </span>
              )}
              {step.status === 'in_progress' && step.started_at && (
                <span style={{ fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-subtlest)' }}>
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

// ─── Smart promote panel ──────────────────────────────────────────────────────

function SmartPromotePanel({
  call,
  onDone,
  gateEnabled,
}: {
  call: (method: string, body?: unknown) => Promise<unknown>;
  onDone: () => void;
  gateEnabled: boolean;
}) {
  const [branches, setBranches] = useState<BranchItem[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState('main');
  const [summary, setSummary] = useState<BranchSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [promoting, setPromoting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [showCommits, setShowCommits] = useState(false);

  const loadBranches = useCallback(async () => {
    setLoadingBranches(true);
    try {
      const res = (await call('POST', { action: 'list_branches' })) as {
        branches: BranchItem[];
      };
      setBranches(res.branches ?? []);
    } catch {
      // non-fatal
    } finally {
      setLoadingBranches(false);
    }
  }, [call]);

  useEffect(() => {
    loadBranches();
  }, [loadBranches]);

  const loadSummary = useCallback(
    async (branch: string) => {
      setSummary(null);
      setSummaryError(null);
      setLoadingSummary(true);
      try {
        const res = (await call('POST', {
          action: 'get_branch_summary',
          source_branch: branch,
        })) as BranchSummary;
        setSummary(res);
      } catch (e) {
        setSummaryError(e instanceof Error ? e.message : 'Failed to load summary');
      } finally {
        setLoadingSummary(false);
      }
    },
    [call],
  );

  useEffect(() => {
    setShowConfirm(false);
    setConfirmText('');
    setResult(null);
    setShowCommits(false);
    const t = setTimeout(() => loadSummary(selectedBranch), 400);
    return () => clearTimeout(t);
  }, [selectedBranch, loadSummary]);

  const handlePromote = useCallback(async () => {
    setPromoting(true);
    setResult(null);
    try {
      const res = (await call('POST', {
        action: 'promote_to_production',
        source_branch: selectedBranch,
      })) as { ok: boolean; message: string };
      setResult(res);
      setShowConfirm(false);
      if (res.ok) onDone();
    } catch (e) {
      setResult({ ok: false, message: e instanceof Error ? e.message : 'Promotion failed' });
    } finally {
      setPromoting(false);
    }
  }, [call, selectedBranch, onDone]);

  const canConfirm = summary?.has_migrations ? confirmText.trim().toLowerCase() === 'deploy' : true;

  const selectStyle: React.CSSProperties = {
    fontSize: 'var(--ds-font-size-400)',
    color: 'var(--ds-text)',
    background: 'var(--ds-surface)',
    border: '1px solid var(--ds-border)',
    borderRadius: 3,
    padding: '4px 10px',
    fontFamily: FONT,
    cursor: 'pointer',
    minWidth: 200,
  };

  const linkBtn: React.CSSProperties = {
    background: 'none',
    border: 'none',
    padding: 0,
    fontSize: 'var(--ds-font-size-300)',
    color: 'var(--ds-link)',
    cursor: 'pointer',
    fontFamily: FONT,
    textDecoration: 'none',
  };

  return (
    <div
      style={{
        border: '1px solid var(--ds-border)',
        borderRadius: 6,
        overflow: 'hidden',
        marginBottom: 16,
        background: 'var(--ds-surface)',
      }}
    >
      <div
        style={{
          padding: '12px 20px',
          background: 'var(--ds-surface-sunken)',
          borderBottom: '1px solid var(--ds-border)',
        }}
      >
        <div
          style={{
            fontSize: 'var(--ds-font-size-400)',
            fontWeight: 600,
            color: 'var(--ds-text)',
            marginBottom: 8,
          }}
        >
          Promote branch to production
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text-subtle)', whiteSpace: 'nowrap' }}>
            Source:
          </span>
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            style={selectStyle}
            disabled={loadingBranches}
          >
            {branches.length > 0
              ? branches.map((b) => (
                  <option key={b.name} value={b.name}>
                    {b.name}
                    {b.sha ? ` (${b.sha})` : ''}
                  </option>
                ))
              : <option value="main">main</option>}
          </select>
          {loadingBranches && <Spinner size="small" />}
          <span style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtlest)' }}>→</span>
          <code
            style={{
              fontSize: 'var(--ds-font-size-200)',
              color: 'var(--ds-text-subtle)',
              fontFamily: 'var(--ds-font-family-code)',
            }}
          >
            production
          </code>
          <span style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtlest)' }}>
            → GitHub CI → ksa-catalyst.com
          </span>
        </div>
      </div>

      {!gateEnabled && (
        <div
          style={{
            padding: '8px 20px',
            background: 'var(--ds-background-warning-subtle)',
            fontSize: 'var(--ds-font-size-300)',
            color: 'var(--ds-text-warning)',
          }}
        >
          ⚠ Deploy gate is OFF — enable it below before promoting
        </div>
      )}

      {result && (
        <div
          style={{
            padding: '12px 20px',
            fontSize: 'var(--ds-font-size-300)',
            color: result.ok
              ? 'var(--ds-text-success)'
              : 'var(--ds-text-danger)',
            background: result.ok
              ? 'var(--ds-background-success-subtle)'
              : 'var(--ds-background-danger-subtle)',
          }}
        >
          {result.ok ? '✓' : '✗'} {result.message}
        </div>
      )}

      {loadingSummary && (
        <div style={{ padding: '16px', display: 'flex', gap: 8, alignItems: 'center' }}>
          <Spinner size="small" />
          <span style={{ fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text-subtle)' }}>
            Analysing branch…
          </span>
        </div>
      )}

      {summaryError && !loadingSummary && (
        <div style={{ padding: '12px 20px', fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text-danger)' }}>
          Could not load summary: {summaryError}
        </div>
      )}

      {summary && !loadingSummary && (
        <div style={{ padding: '16px 20px' }}>
          {summary.ahead_by === 0 ? (
            <div style={{ fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text-subtlest)' }}>
              ✓ Production is up to date — no new commits to promote from{' '}
              <code style={{ fontFamily: 'var(--ds-font-family-code)', fontSize: 'var(--ds-font-size-200)' }}>
                {selectedBranch}
              </code>
            </div>
          ) : (
            <>
              {summary.ai_summary && (
                <div
                  style={{
                    background: 'var(--ds-background-information-subtle)',
                    border: '1px solid var(--ds-border-information)',
                    borderRadius: 4,
                    padding: '12px 14px',
                    marginBottom: 16,
                  }}
                >
                  <div
                    style={{
                      fontSize: 'var(--ds-font-size-100)',
                      fontWeight: 600,
                      color: 'var(--ds-text-information)',
                      marginBottom: 4,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    What changes for users
                  </div>
                  <div
                    style={{
                      fontSize: 'var(--ds-font-size-400)',
                      color: 'var(--ds-text)',
                      lineHeight: '20px',
                    }}
                  >
                    {summary.ai_summary}
                  </div>
                </div>
              )}

              {summary.has_migrations && (
                <div
                  style={{
                    background: 'var(--ds-background-danger-subtle)',
                    border: '1px solid var(--ds-border-danger)',
                    borderRadius: 4,
                    padding: '12px 14px',
                    marginBottom: 16,
                  }}
                >
                  <div
                    style={{
                      fontSize: 'var(--ds-font-size-300)',
                      fontWeight: 600,
                      color: 'var(--ds-text-danger)',
                      marginBottom: 4,
                    }}
                  >
                    ⚠ Database changes included — cannot be automatically undone
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 16 }}>
                    {summary.migration_files.map((f) => (
                      <li
                        key={f}
                        style={{
                          fontSize: 'var(--ds-font-size-200)',
                          color: 'var(--ds-text-subtle)',
                          fontFamily: 'var(--ds-font-family-code)',
                          marginBottom: 0,
                        }}
                      >
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 12,
                  flexWrap: 'wrap',
                }}
              >
                <span
                  style={{ fontSize: 'var(--ds-font-size-300)', fontWeight: 600, color: 'var(--ds-text)' }}
                >
                  {summary.ahead_by} commit{summary.ahead_by !== 1 ? 's' : ''} ahead of
                  production
                </span>
                {summary.file_groups.map((g) => (
                  <span
                    key={g.label}
                    style={{
                      fontSize: 'var(--ds-font-size-200)',
                      color: 'var(--ds-text-subtle)',
                      background: 'var(--ds-background-neutral)',
                      borderRadius: 3,
                      padding: '0px 8px',
                    }}
                  >
                    {g.emoji} {g.label} {g.count}
                  </span>
                ))}
              </div>

              <button onClick={() => setShowCommits((v) => !v)} style={linkBtn}>
                {showCommits ? '▼' : '▶'} {showCommits ? 'Hide' : 'View'} {summary.ahead_by}{' '}
                commit{summary.ahead_by !== 1 ? 's' : ''}
              </button>

              {showCommits && (
                <div style={{ marginTop: 8, marginBottom: 8 }}>
                  {summary.commits.slice(0, 25).map((c, i) => (
                    <div
                      key={c.sha}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 8,
                        padding: '4px 0',
                        borderBottom:
                          i < Math.min(summary.commits.length, 25) - 1
                            ? '1px solid var(--ds-border-subtle, rgba(11,18,14,0.06))'
                            : 'none',
                      }}
                    >
                      <code
                        style={{
                          fontSize: 'var(--ds-font-size-100)',
                          color: 'var(--ds-link)',
                          fontFamily: 'var(--ds-font-family-code)',
                          flexShrink: 0,
                          marginTop: 0,
                          minWidth: 48,
                        }}
                      >
                        {c.sha}
                      </code>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 'var(--ds-font-size-300)',
                            color: 'var(--ds-text)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {c.message}
                        </div>
                        <div
                          style={{
                            fontSize: 'var(--ds-font-size-100)',
                            color: 'var(--ds-text-subtlest)',
                            marginTop: 0,
                          }}
                        >
                          {c.author} · {fmtRelative(c.date)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!showConfirm && !result && (
                <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    appearance="primary"
                    onClick={() => setShowConfirm(true)}
                    isDisabled={!gateEnabled}
                  >
                    Promote {selectedBranch} → production
                  </Button>
                </div>
              )}

              {showConfirm && !result && (
                <div
                  style={{
                    marginTop: 16,
                    background: 'var(--ds-surface-sunken)',
                    border: '1px solid var(--ds-border)',
                    borderRadius: 4,
                    padding: '16px 18px',
                  }}
                >
                  <div
                    style={{
                      fontSize: 'var(--ds-font-size-400)',
                      fontWeight: 600,
                      color: 'var(--ds-text)',
                      marginBottom: 12,
                    }}
                  >
                    What will happen:
                  </div>
                  <ul
                    style={{
                      listStyle: 'none',
                      padding: 0,
                      margin: '0 0 16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                    }}
                  >
                    <li
                      style={{
                        fontSize: 'var(--ds-font-size-300)',
                        color: 'var(--ds-text)',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 8,
                      }}
                    >
                      <span
                        style={{
                          color: 'var(--ds-text-success)',
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        ✓
                      </span>
                      <span>
                        Branch{' '}
                        <code
                          style={{
                            fontFamily: 'var(--ds-font-family-code)',
                            fontSize: 'var(--ds-font-size-200)',
                          }}
                        >
                          {selectedBranch}
                        </code>{' '}
                        merges into{' '}
                        <code
                          style={{
                            fontFamily: 'var(--ds-font-family-code)',
                            fontSize: 'var(--ds-font-size-200)',
                          }}
                        >
                          production
                        </code>{' '}
                        on GitHub
                      </span>
                    </li>
                    {summary.has_migrations && (
                      <li
                        style={{
                          fontSize: 'var(--ds-font-size-300)',
                          color: 'var(--ds-text)',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 8,
                        }}
                      >
                        <span
                          style={{
                            color: 'var(--ds-text-success)',
                            fontWeight: 700,
                            flexShrink: 0,
                          }}
                        >
                          ✓
                        </span>
                        <span>
                          GitHub CI applies {summary.migration_files.length} DB migration
                          {summary.migration_files.length !== 1 ? 's' : ''} to production database
                        </span>
                      </li>
                    )}
                    <li
                      style={{
                        fontSize: 'var(--ds-font-size-300)',
                        color: 'var(--ds-text)',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 8,
                      }}
                    >
                      <span
                        style={{
                          color: 'var(--ds-text-success)',
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        ✓
                      </span>
                      <span>Vercel builds and deploys to ksa-catalyst.com</span>
                    </li>
                    {summary.has_migrations && (
                      <li
                        style={{
                          fontSize: 'var(--ds-font-size-300)',
                          color: 'var(--ds-text-danger)',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 8,
                        }}
                      >
                        <span style={{ fontWeight: 700, flexShrink: 0 }}>⚠</span>
                        <span>Database migrations cannot be automatically rolled back</span>
                      </li>
                    )}
                  </ul>

                  {summary.has_migrations && (
                    <div style={{ marginBottom: 16 }}>
                      <div
                        style={{
                          fontSize: 'var(--ds-font-size-300)',
                          color: 'var(--ds-text)',
                          marginBottom: 4,
                        }}
                      >
                        Type <strong>deploy</strong> to confirm:
                      </div>
                      <input
                        value={confirmText}
                        onChange={(e) => setConfirmText(e.target.value)}
                        placeholder='Type "deploy" to confirm'
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && canConfirm && !promoting) handlePromote();
                        }}
                        style={{
                          fontSize: 'var(--ds-font-size-400)',
                          fontFamily: FONT,
                          color: 'var(--ds-text)',
                          background: 'var(--ds-surface)',
                          border: '1px solid var(--ds-border)',
                          borderRadius: 3,
                          padding: '8px 10px',
                          width: '100%',
                          boxSizing: 'border-box',
                          outline: 'none',
                        }}
                        autoFocus
                      />
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <Button
                      appearance="subtle"
                      onClick={() => {
                        setShowConfirm(false);
                        setConfirmText('');
                      }}
                      isDisabled={promoting}
                    >
                      Cancel
                    </Button>
                    <Button
                      appearance="primary"
                      onClick={handlePromote}
                      isDisabled={!canConfirm || promoting || !gateEnabled}
                      isLoading={promoting}
                    >
                      Confirm & deploy to production
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 560 }}>
      <div>
        <div
          style={{
            fontSize: 'var(--ds-font-size-200)',
            fontWeight: 600,
            color: 'var(--ds-text-subtle)',
            marginBottom: 4,
          }}
        >
          GitHub personal access token{' '}
          {config.github_pat_set && (
            <span style={{ color: 'var(--ds-text-success)' }}>✓ saved</span>
          )}
        </div>
        <div
          style={{
            fontSize: 'var(--ds-font-size-100)',
            color: 'var(--ds-text-subtlest)',
            marginBottom: 4,
          }}
        >
          Needs <code>actions:write</code> scope — for run history, diff, and triggering deploys
        </div>
        <Textfield
          ref={patRef}
          type="password"
          placeholder={
            config.github_pat_set ? '••••••••••••••••••••' : 'ghp_xxxxxxxxxxxxxxxxxxxx'
          }
        />
      </div>
      <div>
        <div
          style={{
            fontSize: 'var(--ds-font-size-200)',
            fontWeight: 600,
            color: 'var(--ds-text-subtle)',
            marginBottom: 4,
          }}
        >
          Vercel API token{' '}
          {config.vercel_token_set && (
            <span style={{ color: 'var(--ds-text-success)' }}>✓ saved</span>
          )}
        </div>
        <div
          style={{
            fontSize: 'var(--ds-font-size-100)',
            color: 'var(--ds-text-subtlest)',
            marginBottom: 4,
          }}
        >
          From vercel.com → Settings → Tokens
        </div>
        <Textfield
          ref={tokenRef}
          type="password"
          placeholder={config.vercel_token_set ? '••••••••••••••••••••' : 'xxxxxxxxxxxxxxxxxxxx'}
        />
      </div>
      <Button
        appearance="primary"
        isLoading={saving}
        onClick={() =>
          onSave(
            (patRef.current as HTMLInputElement | null)?.value || undefined,
            (tokenRef.current as HTMLInputElement | null)?.value || undefined,
          )
        }
      >
        Save credentials
      </Button>
    </div>
  );
}

// ─── Section label ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 'var(--ds-font-size-200)',
        fontWeight: 653,
        color: 'var(--ds-text-subtle)',
        padding: '16px 0 8px',
        borderBottom: '1.67px solid var(--ds-border, rgba(11,18,14,0.14))',
        marginBottom: 12,
      }}
    >
      {children}
    </div>
  );
}

// ─── Table styles ─────────────────────────────────────────────────────────────

const TH: React.CSSProperties = {
  textAlign: 'left',
  fontSize: 'var(--ds-font-size-200)',
  fontWeight: 653,
  color: 'var(--ds-text-subtle)',
  padding: '8px 12px 8px 0',
  borderBottom: '1.67px solid var(--ds-border, rgba(11,18,14,0.14))',
  whiteSpace: 'nowrap',
};
const TD: React.CSSProperties = {
  fontSize: 'var(--ds-font-size-400)',
  color: 'var(--ds-text)',
  padding: '8px 12px 10px 0',
  borderBottom: '1px solid var(--ds-border-subtle, rgba(11,18,14,0.08))',
  verticalAlign: 'middle',
};
const TD_MUTED: React.CSSProperties = {
  ...TD,
  color: 'var(--ds-text-subtle)',
  fontSize: 'var(--ds-font-size-300)',
};
const MONO: React.CSSProperties = {
  fontFamily: 'var(--ds-font-family-code)',
  fontSize: 'var(--ds-font-size-200)',
};

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
  const [envs, setEnvs] = useState<EnvironmentsData | null>(null);
  const [envsLoading, setEnvsLoading] = useState(true);
  const [historyTab, setHistoryTab] = useState<'ci' | 'staging' | 'vercel'>('ci');

  const refreshEnvs = useCallback(async () => {
    setEnvsLoading(true);
    try {
      const result = (await call('POST', { action: 'get_environments' })) as EnvironmentsData;
      setEnvs(result);
    } catch {
      // non-fatal
    } finally {
      setEnvsLoading(false);
    }
  }, [call]);

  useEffect(() => {
    if (!loading) refreshEnvs();
  }, [loading, refreshEnvs]);

  if (loading) {
    return (
      <AdminGuard>
        <div
          style={{
            padding: 48,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            color: 'var(--ds-text-subtle)',
            fontFamily: FONT,
          }}
        >
          <Spinner size="medium" />
          <span style={{ fontSize: 'var(--ds-font-size-400)' }}>Loading deployment status…</span>
        </div>
      </AdminGuard>
    );
  }

  if (error) {
    return (
      <AdminGuard>
        <div style={{ padding: '24px 32px', fontFamily: FONT }}>
          <SectionMessage appearance="error" title="Failed to load">
            {error}
          </SectionMessage>
          <div style={{ marginTop: 16 }}>
            <Button onClick={refresh}>Retry</Button>
          </div>
        </div>
      </AdminGuard>
    );
  }

  if (!data) {
    return (
      <AdminGuard>
        <div
          style={{
            padding: 48,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            color: 'var(--ds-text-subtle)',
            fontFamily: FONT,
          }}
        >
          <Spinner size="medium" />
        </div>
      </AdminGuard>
    );
  }

  const { gate, config, runs, staging_runs, deployments, stats } = data;
  const latestRun = runs[0] ?? null;
  const latestStagingRun = staging_runs?.[0] ?? null;
  const latestDeployment = deployments[0] ?? null;
  const isRunInProgress =
    latestRun?.status === 'in_progress' || latestRun?.status === 'queued';

  const stagingStatus = runSt(latestStagingRun);
  const prodCiStatus = runSt(latestRun);
  const prodVercelStatus = vercelSt(latestDeployment);
  const prodStatus: StageSt =
    prodVercelStatus === 'success'
      ? 'success'
      : prodCiStatus === 'failed' || prodVercelStatus === 'failed'
      ? 'failed'
      : prodCiStatus;

  return (
    <AdminGuard>
      <div
        style={{
          padding: '24px 32px 48px',
          maxWidth: 1280,
          color: 'var(--ds-text)',
          fontFamily: FONT,
        }}
      >
        {/* ── Page header ──────────────────────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 16,
            marginBottom: 4,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 6,
                background: 'var(--ds-text)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 'var(--ds-font-size-600)',
                color: 'var(--ds-surface)',
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              ▲
            </div>
            <h1
              style={{
                fontSize: 'var(--ds-font-size-800)',
                fontWeight: 653,
                lineHeight: '28px',
                color: 'var(--ds-text)',
                margin: 0,
              }}
            >
              Deployment pipeline
            </h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
            <Button
              appearance="subtle"
              onClick={() => {
                refresh();
                refreshEnvs();
              }}
              spacing="compact"
            >
              Refresh
            </Button>
          </div>
        </div>

        <p
          style={{
            fontSize: 'var(--ds-font-size-400)',
            color: 'var(--ds-text-subtle)',
            margin: '0 0 4px',
            lineHeight: '20px',
          }}
        >
          {config.production_url} · {config.github_repo}
        </p>
        {lastRefreshed && (
          <p
            style={{
              fontSize: 'var(--ds-font-size-200)',
              color: 'var(--ds-text-subtlest)',
              margin: '0 0 28px',
            }}
          >
            Updated {fmtRelative(lastRefreshed.toISOString())} · auto-refreshes every 30s
          </p>
        )}

        {/* ── Pipeline stages ───────────────────────────────────────────────── */}
        <SectionLabel>Pipeline</SectionLabel>

        <div style={{ display: 'flex', alignItems: 'stretch', gap: 0, marginBottom: 24 }}>
          {/* Stage 1: Development */}
          <StageCard
            index={1}
            title="Development"
            subtitle="localhost:8080"
            status="idle"
            statusOverride="Local"
            loading={envsLoading}
            rows={[
              {
                label: 'Frontend',
                value: (
                  <a
                    href="http://localhost:8080"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: 'var(--ds-link)',
                      textDecoration: 'none',
                      fontFamily: 'var(--ds-font-family-code)',
                    }}
                  >
                    localhost:8080
                  </a>
                ),
              },
              {
                label: 'Database',
                value: `Staging DB · ${STAGING_DB_REF.slice(0, 8)}…`,
              },
              {
                label: 'Commit',
                value: envs?.mainBranch?.sha ? (
                  <>
                    <code
                      style={{
                        fontFamily: 'var(--ds-font-family-code)',
                        color: 'var(--ds-text-subtle)',
                      }}
                    >
                      {envs.mainBranch.sha}
                    </code>
                    {envs.mainBranch.message && (
                      <span
                        style={{
                          display: 'block',
                          fontSize: 'var(--ds-font-size-100)',
                          marginTop: 0,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {envs.mainBranch.message.slice(0, 52)}
                      </span>
                    )}
                  </>
                ) : null,
              },
            ]}
            footer={
              <a
                href="http://localhost:8080"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: 'var(--ds-font-size-200)',
                  color: 'var(--ds-link)',
                  textDecoration: 'none',
                }}
              >
                Open dev server ↗
              </a>
            }
          />

          <PipelineConnector
            label="push to main"
            active={stagingStatus === 'success' || stagingStatus === 'running'}
          />

          {/* Stage 2: Staging */}
          <StageCard
            index={2}
            title="Staging"
            subtitle="Edge functions + DB"
            status={stagingStatus}
            loading={!latestStagingRun}
            rows={[
              {
                label: 'Supabase ref',
                value: `${STAGING_DB_REF.slice(0, 12)}…`,
                mono: true,
              },
              {
                label: 'Last CI run',
                value: latestStagingRun ? (
                  <a
                    href={latestStagingRun.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'var(--ds-link)', textDecoration: 'none' }}
                  >
                    {fmtRelative(latestStagingRun.created_at)} ·{' '}
                    {fmtDuration(latestStagingRun.duration_ms)}
                  </a>
                ) : null,
              },
              {
                label: 'Commit',
                value: latestStagingRun?.head_sha ? (
                  <>
                    <code
                      style={{
                        fontFamily: 'var(--ds-font-family-code)',
                        color: 'var(--ds-text-subtle)',
                      }}
                    >
                      {latestStagingRun.head_sha}
                    </code>
                    {latestStagingRun.head_commit_message && (
                      <span
                        style={{
                          display: 'block',
                          fontSize: 'var(--ds-font-size-100)',
                          marginTop: 0,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {latestStagingRun.head_commit_message.slice(0, 52)}
                      </span>
                    )}
                  </>
                ) : null,
              },
            ]}
            footer={
              latestStagingRun ? (
                <a
                  href={latestStagingRun.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: 'var(--ds-font-size-200)',
                    color: 'var(--ds-link)',
                    textDecoration: 'none',
                  }}
                >
                  View staging CI ↗
                </a>
              ) : undefined
            }
          />

          <PipelineConnector
            label="promote"
            active={gate.production_deploy_enabled && stagingStatus === 'success'}
          />

          {/* Stage 3: Production */}
          <StageCard
            index={3}
            title="Production"
            subtitle="ksa-catalyst.com"
            status={prodStatus}
            statusOverride={
              latestDeployment?.state === 'READY'
                ? 'Live'
                : prodStatus === 'running'
                ? 'Deploying'
                : ST_LABEL[prodStatus]
            }
            loading={!latestRun && !latestDeployment}
            rows={[
              {
                label: 'Frontend',
                value: (
                  <a
                    href={config.production_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: 'var(--ds-link)',
                      textDecoration: 'none',
                      fontFamily: 'var(--ds-font-family-code)',
                    }}
                  >
                    {latestDeployment?.url ?? config.production_url}
                  </a>
                ),
              },
              {
                label: 'Database',
                value: `Prod DB · ${PROD_DB_REF.slice(0, 8)}…`,
              },
              {
                label: 'Commit',
                value:
                  latestDeployment?.meta.github_commit_sha ?? envs?.prodBranch?.sha ? (
                    <>
                      <code
                        style={{
                          fontFamily: 'var(--ds-font-family-code)',
                          color: 'var(--ds-text-subtle)',
                        }}
                      >
                        {latestDeployment?.meta.github_commit_sha?.slice(0, 7) ??
                          envs?.prodBranch?.sha}
                      </code>
                      {(latestDeployment?.meta.github_commit_message ??
                        envs?.prodBranch?.message) && (
                        <span
                          style={{
                            display: 'block',
                            fontSize: 'var(--ds-font-size-100)',
                            marginTop: 0,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {(
                            latestDeployment?.meta.github_commit_message ??
                            envs?.prodBranch?.message ??
                            ''
                          ).slice(0, 52)}
                        </span>
                      )}
                      <span
                        style={{
                          display: 'block',
                          fontSize: 'var(--ds-font-size-100)',
                          color: 'var(--ds-text-subtlest)',
                          marginTop: 0,
                        }}
                      >
                        {fmtRelative(
                          latestDeployment
                            ? String(latestDeployment.ready_at ?? latestDeployment.created_at)
                            : envs?.prodBranch?.date ?? null,
                        )}
                      </span>
                    </>
                  ) : null,
              },
            ]}
            footer={
              <div style={{ display: 'flex', gap: 12 }}>
                <a
                  href={config.production_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: 'var(--ds-font-size-200)',
                    color: 'var(--ds-link)',
                    textDecoration: 'none',
                  }}
                >
                  Open site ↗
                </a>
                {latestRun && (
                  <a
                    href={latestRun.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: 'var(--ds-font-size-200)',
                      color: 'var(--ds-link)',
                      textDecoration: 'none',
                    }}
                  >
                    View prod CI ↗
                  </a>
                )}
              </div>
            }
          />
        </div>

        {/* ── Promote panel ─────────────────────────────────────────────────── */}
        <SmartPromotePanel
          call={call}
          onDone={() => {
            refresh();
            refreshEnvs();
          }}
          gateEnabled={gate.production_deploy_enabled}
        />

        {!config.vercel_token_set && (
          <div style={{ marginBottom: 16 }}>
            <SectionMessage appearance="warning" title="VERCEL_TOKEN not configured">
              Deploys will fail. Add it below then set as a{' '}
              <a
                href={`https://github.com/${config.github_repo}/settings/secrets/actions`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'inherit', fontWeight: 600 }}
              >
                GitHub Actions secret
              </a>{' '}
              named <code>VERCEL_TOKEN</code>.
            </SectionMessage>
          </div>
        )}

        {/* ── Deploy gate ───────────────────────────────────────────────────── */}
        <div
          style={{
            background: 'var(--ds-surface)',
            border: `1px solid ${gate.production_deploy_enabled ? 'var(--ds-border-success)' : 'var(--ds-border)'}`,
            borderRadius: 4,
            padding: '16px 20px',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 16,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 'var(--ds-font-size-400)',
                fontWeight: 600,
                color: 'var(--ds-text)',
                marginBottom: 4,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              Deploy gate
              {gate.production_deploy_enabled && <Lozenge appearance="success">Active</Lozenge>}
            </div>
            <div
              style={{
                fontSize: 'var(--ds-font-size-300)',
                color: 'var(--ds-text-subtle)',
                lineHeight: '18px',
              }}
            >
              {gate.production_deploy_enabled
                ? 'ON — promote button unlocked. Disable to freeze production.'
                : 'OFF — promote button locked. Enable when ready to deploy.'}
            </div>
            {!gate.production_deploy_enabled && gate.disabled_at && (
              <div
                style={{
                  fontSize: 'var(--ds-font-size-200)',
                  color: 'var(--ds-text-subtlest)',
                  marginTop: 4,
                }}
              >
                Disabled {fmtRelative(gate.disabled_at)}
                {gate.disabled_by_email ? ` by ${gate.disabled_by_email}` : ''}
              </div>
            )}
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              flexShrink: 0,
              paddingTop: 0,
            }}
          >
            <span
              style={{
                fontSize: 'var(--ds-font-size-300)',
                fontWeight: 500,
                color: gate.production_deploy_enabled
                  ? 'var(--ds-text-success)'
                  : 'var(--ds-text-subtlest)',
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

        {/* ── Live progress ─────────────────────────────────────────────────── */}
        {isRunInProgress && latestRun && (
          <LiveProgress run={latestRun} call={call} />
        )}

        {/* ── Redeploy + external links ─────────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 24,
            flexWrap: 'wrap',
          }}
        >
          <Button
            appearance="default"
            isDisabled={
              !gate.production_deploy_enabled ||
              !config.github_pat_set ||
              triggering ||
              isRunInProgress
            }
            isLoading={triggering}
            onClick={triggerDeploy}
          >
            Redeploy current production commit
          </Button>
          <span style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtlest)' }}>
            Re-runs Vercel build without changing commit
          </span>
          <a
            href={`https://github.com/${config.github_repo}/actions`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              marginLeft: 'auto',
              fontSize: 'var(--ds-font-size-300)',
              color: 'var(--ds-link)',
              textDecoration: 'none',
              flexShrink: 0,
            }}
          >
            GitHub Actions ↗
          </a>
        </div>

        {/* ── Stats bar ─────────────────────────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            gap: 0,
            marginBottom: 24,
            border: '1px solid var(--ds-border)',
            borderRadius: 4,
            overflow: 'hidden',
            background: 'var(--ds-surface)',
          }}
        >
          {(
            [
              {
                label: 'Today',
                value: stats.today,
                sub: 'prod deploys',
                accent: undefined as string | undefined,
              },
              {
                label: 'Succeeded',
                value: stats.success,
                sub: `of ${stats.total} runs`,
                accent: stats.success > 0 ? 'var(--ds-text-success)' : undefined,
              },
              {
                label: 'Failed',
                value: stats.failed,
                sub: `of ${stats.total} runs`,
                accent: stats.failed > 0 ? 'var(--ds-text-danger)' : undefined,
              },
              {
                label: 'Staging CI',
                value: staging_runs?.length ?? 0,
                sub: 'runs fetched',
                accent: undefined,
              },
            ] as const
          ).map((s, i) => (
            <div
              key={s.label}
              style={{
                flex: 1,
                padding: '16px 20px',
                borderLeft:
                  i > 0 ? '1px solid var(--ds-border)' : 'none',
              }}
            >
              <div
                style={{
                  fontSize: 'var(--ds-font-size-100)',
                  fontWeight: 653,
                  color: 'var(--ds-text-subtlest)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  marginBottom: 4,
                }}
              >
                {s.label}
              </div>
              <div
                style={{
                  fontSize: 'var(--ds-font-size-800)',
                  fontWeight: 653,
                  lineHeight: 1,
                  color: s.accent ?? 'var(--ds-text)',
                }}
              >
                {s.value}
              </div>
              <div
                style={{
                  fontSize: 'var(--ds-font-size-200)',
                  color: 'var(--ds-text-subtlest)',
                  marginTop: 4,
                }}
              >
                {s.sub}
              </div>
            </div>
          ))}
        </div>

        {/* ── History tabs ──────────────────────────────────────────────────── */}
        <SectionLabel>History</SectionLabel>

        <div
          style={{
            display: 'flex',
            gap: 0,
            borderBottom: '1px solid var(--ds-border)',
            marginBottom: 16,
          }}
        >
          {(
            [
              { key: 'ci', label: `Production CI (${runs.length})` },
              { key: 'staging', label: `Staging CI (${staging_runs?.length ?? 0})` },
              { key: 'vercel', label: `Vercel (${deployments.length})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setHistoryTab(tab.key)}
              style={{
                padding: '8px 16px',
                fontSize: 'var(--ds-font-size-300)',
                fontWeight: historyTab === tab.key ? 600 : 400,
                color:
                  historyTab === tab.key
                    ? 'var(--ds-text)'
                    : 'var(--ds-text-subtle)',
                background: 'none',
                border: 'none',
                borderBottom:
                  historyTab === tab.key
                    ? '2px solid var(--ds-link)'
                    : '2px solid transparent',
                cursor: 'pointer',
                fontFamily: FONT,
                marginBottom: -1,
                outline: 'none',
                transition: 'color 0.1s',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab: Production CI */}
        {historyTab === 'ci' &&
          (runs.length === 0 ? (
            <div
              style={{
                padding: '32px 0',
                textAlign: 'center',
                fontSize: 'var(--ds-font-size-400)',
                color: 'var(--ds-text-subtlest)',
              }}
            >
              {config.github_pat_set
                ? 'No runs found'
                : 'Configure GitHub PAT to see live run history'}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--ds-font-size-400)' }}>
                <thead
                  style={{
                    position: 'sticky',
                    top: 0,
                    background: 'var(--ds-surface)',
                    zIndex: 1,
                  }}
                >
                  <tr>
                    <th style={TH}>Status</th>
                    <th style={TH}>Commit</th>
                    <th style={{ ...TH, width: '40%' }}>What shipped</th>
                    <th style={TH}>Duration</th>
                    <th style={TH}>When</th>
                    <th style={TH}>By</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((run) => (
                    <tr key={run.id}>
                      <td style={TD}>
                        <RunStatusBadge status={run.status} conclusion={run.conclusion} />
                      </td>
                      <td style={TD}>
                        <a
                          href={run.html_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            ...MONO,
                            color: 'var(--ds-link)',
                            textDecoration: 'none',
                          }}
                        >
                          {run.head_sha}
                        </a>
                      </td>
                      <td style={{ ...TD, maxWidth: 360 }}>
                        {run.summary ? (
                          <span style={{ fontSize: 'var(--ds-font-size-300)' }}>{run.summary}</span>
                        ) : (
                          <span
                            style={{
                              ...MONO,
                              color: 'var(--ds-text-subtle)',
                              display: 'block',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {run.head_commit_message.split('\n')[0]}
                          </span>
                        )}
                      </td>
                      <td style={TD_MUTED}>{fmtDuration(run.duration_ms)}</td>
                      <td style={{ ...TD_MUTED, whiteSpace: 'nowrap' }}>
                        {fmtRelative(run.created_at)}
                      </td>
                      <td style={TD_MUTED}>{run.trigger || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}

        {/* Tab: Staging CI */}
        {historyTab === 'staging' &&
          (!staging_runs || staging_runs.length === 0 ? (
            <div
              style={{
                padding: '32px 0',
                textAlign: 'center',
                fontSize: 'var(--ds-font-size-400)',
                color: 'var(--ds-text-subtlest)',
              }}
            >
              {config.github_pat_set
                ? 'No staging CI runs found'
                : 'Configure GitHub PAT to see staging run history'}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--ds-font-size-400)' }}>
                <thead
                  style={{
                    position: 'sticky',
                    top: 0,
                    background: 'var(--ds-surface)',
                    zIndex: 1,
                  }}
                >
                  <tr>
                    <th style={TH}>Status</th>
                    <th style={TH}>Commit</th>
                    <th style={{ ...TH, width: '45%' }}>Message</th>
                    <th style={TH}>Duration</th>
                    <th style={TH}>When</th>
                    <th style={TH}>By</th>
                  </tr>
                </thead>
                <tbody>
                  {staging_runs.map((run) => (
                    <tr key={run.id}>
                      <td style={TD}>
                        <RunStatusBadge status={run.status} conclusion={run.conclusion} />
                      </td>
                      <td style={TD}>
                        <a
                          href={run.html_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            ...MONO,
                            color: 'var(--ds-link)',
                            textDecoration: 'none',
                          }}
                        >
                          {run.head_sha}
                        </a>
                      </td>
                      <td style={{ ...TD, maxWidth: 400 }}>
                        <span
                          style={{
                            ...MONO,
                            color: 'var(--ds-text-subtle)',
                            display: 'block',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {run.head_commit_message}
                        </span>
                      </td>
                      <td style={TD_MUTED}>{fmtDuration(run.duration_ms)}</td>
                      <td style={{ ...TD_MUTED, whiteSpace: 'nowrap' }}>
                        {fmtRelative(run.created_at)}
                      </td>
                      <td style={TD_MUTED}>{run.trigger || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}

        {/* Tab: Vercel deployments */}
        {historyTab === 'vercel' &&
          (deployments.length === 0 ? (
            <div
              style={{
                padding: '32px 0',
                textAlign: 'center',
                fontSize: 'var(--ds-font-size-400)',
                color: 'var(--ds-text-subtlest)',
              }}
            >
              {config.vercel_token_set
                ? 'No Vercel deployments found'
                : 'Configure Vercel token to see deployment history'}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--ds-font-size-400)' }}>
                <thead
                  style={{
                    position: 'sticky',
                    top: 0,
                    background: 'var(--ds-surface)',
                    zIndex: 1,
                  }}
                >
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
                      <td style={TD}>
                        <VercelStateBadge state={d.state} />
                      </td>
                      <td style={TD}>
                        <a
                          href={`https://${d.url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            fontSize: 'var(--ds-font-size-300)',
                            color: 'var(--ds-link)',
                            textDecoration: 'none',
                          }}
                        >
                          {d.url}
                        </a>
                      </td>
                      <td style={TD}>
                        <code style={{ ...MONO, color: 'var(--ds-text-subtle)' }}>
                          {d.meta.github_commit_sha?.slice(0, 7) ?? '—'}
                        </code>
                      </td>
                      <td style={TD_MUTED}>{fmtDuration(d.build_duration_ms)}</td>
                      <td style={{ ...TD_MUTED, whiteSpace: 'nowrap' }}>
                        {fmtRelative(d.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}

        {/* ── Configuration ─────────────────────────────────────────────────── */}
        <SectionLabel>
          <button
            onClick={() => setShowConfig((v) => !v)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 'var(--ds-font-size-200)',
              fontWeight: 653,
              color: 'var(--ds-text-subtle)',
              padding: 0,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontFamily: FONT,
            }}
          >
            {showConfig ? '▼' : '▶'} Configuration
          </button>
        </SectionLabel>
        {showConfig && (
          <ConfigPanel config={config} saving={savingConfig} onSave={saveConfig} />
        )}
      </div>
    </AdminGuard>
  );
}
