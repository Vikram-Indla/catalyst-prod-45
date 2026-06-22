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

interface BranchInfo {
  sha: string | null;
  message: string | null;
  date: string | null;
}

interface EnvironmentsData {
  mainBranch: BranchInfo | null;
  prodBranch: BranchInfo | null;
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

const FONT =
  '"Atlassian Sans", ui-sans-serif, -apple-system, system-ui, "Segoe UI", Ubuntu, "Helvetica Neue", sans-serif';

const STAGING_DB_REF = 'cyijbdeuehohvhnsywig';
const PROD_DB_REF = 'lmqwtldpfacrrlvdnmld';

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
      // No cached session — attempt refresh before failing
      const { data } = await supabase.auth.refreshSession();
      return data.session?.access_token ?? null;
    };

    const token = await getToken();
    if (!token) throw new Error('Not authenticated — please sign in again');

    const doFetch = (t: string) => fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/deploy-control`,
      {
        method,
        headers: {
          Authorization: `Bearer ${t}`,
          'Content-Type': 'application/json',
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: body ? JSON.stringify(body) : undefined,
      },
    );

    let res = await doFetch(token);

    if (res.status === 401) {
      // Server rejected token (stale JWT) — force refresh and retry once
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
  if (state === 'READY') return <Lozenge appearance="success">Live</Lozenge>;
  if (state === 'ERROR') return <Lozenge appearance="removed">Error</Lozenge>;
  if (state === 'BUILDING') return <Lozenge appearance="inprogress">Building</Lozenge>;
  if (state === 'CANCELED') return <Lozenge appearance="default">Cancelled</Lozenge>;
  return <Lozenge appearance="default">{state}</Lozenge>;
}

// ─── Environment card ─────────────────────────────────────────────────────────

function EnvCard({
  label,
  sublabel,
  dbRef,
  dbLabel,
  frontendUrl,
  frontendLabel,
  commit,
  commitMsg,
  deployedAt,
  stateChip,
  accent,
  loading: cardLoading,
}: {
  label: string;
  sublabel: string;
  dbRef: string;
  dbLabel: string;
  frontendUrl: string | null;
  frontendLabel: string;
  commit: string | null;
  commitMsg: string | null;
  deployedAt: string | null;
  stateChip?: React.ReactNode;
  accent?: string;
  loading?: boolean;
}) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        border: `1.5px solid ${accent ?? 'var(--ds-border, #DCDFE4)'}`,
        borderRadius: 6,
        padding: '16px 18px',
        background: 'var(--ds-surface, #FFFFFF)',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ds-text, #292A2E)' }}>{label}</div>
          <div style={{ fontSize: 11, color: 'var(--ds-text-subtlest, #6B778C)', marginTop: 2 }}>{sublabel}</div>
        </div>
        {cardLoading ? <Spinner size="small" /> : stateChip}
      </div>

      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ds-text-subtlest, #6B778C)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Frontend
        </div>
        {frontendUrl ? (
          <a
            href={frontendUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: 12, color: 'var(--ds-link, #0052CC)', textDecoration: 'none', fontFamily: 'var(--ds-font-family-code)', wordBreak: 'break-all' }}
          >
            {frontendLabel}
          </a>
        ) : (
          <span style={{ fontSize: 12, color: 'var(--ds-text-subtle, #505258)', fontFamily: 'var(--ds-font-family-code)' }}>{frontendLabel}</span>
        )}
      </div>

      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ds-text-subtlest, #6B778C)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Database
        </div>
        <div style={{ fontSize: 12, color: 'var(--ds-text-subtle, #505258)' }}>
          {dbLabel}{' '}
          <code style={{ fontSize: 10, color: 'var(--ds-text-subtlest, #6B778C)', fontFamily: 'var(--ds-font-family-code)' }}>
            {dbRef.slice(0, 8)}…
          </code>
        </div>
      </div>

      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ds-text-subtlest, #6B778C)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Git commit
        </div>
        {commit ? (
          <>
            <code style={{ fontSize: 11, color: 'var(--ds-text-subtle, #505258)', fontFamily: 'var(--ds-font-family-code)' }}>{commit}</code>
            {commitMsg && (
              <div style={{ fontSize: 12, color: 'var(--ds-text, #292A2E)', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {commitMsg.split('\n')[0].slice(0, 72)}
              </div>
            )}
            {deployedAt && (
              <div style={{ fontSize: 11, color: 'var(--ds-text-subtlest, #6B778C)', marginTop: 2 }}>{fmtRelative(deployedAt)}</div>
            )}
          </>
        ) : (
          <span style={{ fontSize: 12, color: 'var(--ds-text-subtlest, #6B778C)' }}>
            {cardLoading ? 'Loading…' : '—'}
          </span>
        )}
      </div>
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
      const res = await call('POST', { action: 'list_branches' }) as { branches: BranchItem[] };
      setBranches(res.branches ?? []);
    } catch {
      // non-fatal — fallback to default select
    } finally {
      setLoadingBranches(false);
    }
  }, [call]);

  useEffect(() => { loadBranches(); }, [loadBranches]);

  const loadSummary = useCallback(async (branch: string) => {
    setSummary(null);
    setSummaryError(null);
    setLoadingSummary(true);
    try {
      const res = await call('POST', { action: 'get_branch_summary', source_branch: branch }) as BranchSummary;
      setSummary(res);
    } catch (e) {
      setSummaryError(e instanceof Error ? e.message : 'Failed to load summary');
    } finally {
      setLoadingSummary(false);
    }
  }, [call]);

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
      const res = await call('POST', { action: 'promote_to_production', source_branch: selectedBranch }) as { ok: boolean; message: string };
      setResult(res);
      setShowConfirm(false);
      if (res.ok) onDone();
    } catch (e) {
      setResult({ ok: false, message: e instanceof Error ? e.message : 'Promotion failed' });
    } finally {
      setPromoting(false);
    }
  }, [call, selectedBranch, onDone]);

  const canConfirm = summary?.has_migrations
    ? confirmText.trim().toLowerCase() === 'deploy'
    : true;

  const selectStyle: React.CSSProperties = {
    fontSize: 14,
    color: 'var(--ds-text, #292A2E)',
    background: 'var(--ds-surface, #FFFFFF)',
    border: '1px solid var(--ds-border, #DCDFE4)',
    borderRadius: 3,
    padding: '5px 10px',
    fontFamily: FONT,
    cursor: 'pointer',
    minWidth: 200,
  };

  const linkBtn: React.CSSProperties = {
    background: 'none',
    border: 'none',
    padding: 0,
    fontSize: 13,
    color: 'var(--ds-link, #0052CC)',
    cursor: 'pointer',
    fontFamily: FONT,
    textDecoration: 'none',
  };

  return (
    <div
      style={{
        border: '1px solid var(--ds-border, #DCDFE4)',
        borderRadius: 6,
        overflow: 'hidden',
        marginBottom: 24,
        background: 'var(--ds-surface, #FFFFFF)',
      }}
    >
      {/* Header + branch selector */}
      <div
        style={{
          padding: '14px 18px',
          background: 'var(--ds-surface-sunken, #F7F8F9)',
          borderBottom: '1px solid var(--ds-border, #DCDFE4)',
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ds-text, #292A2E)', marginBottom: 10 }}>
          Promote branch to production
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: 'var(--ds-text-subtle, #505258)', whiteSpace: 'nowrap' }}>Branch to promote:</span>
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            style={selectStyle}
            disabled={loadingBranches}
          >
            {branches.length > 0
              ? branches.map((b) => (
                  <option key={b.name} value={b.name}>
                    {b.name}{b.sha ? ` (${b.sha})` : ''}
                  </option>
                ))
              : <option value="main">main</option>}
          </select>
          {loadingBranches && <Spinner size="small" />}
          <span style={{ fontSize: 12, color: 'var(--ds-text-subtlest, #6B778C)' }}>→</span>
          <code style={{ fontSize: 12, color: 'var(--ds-text-subtle, #505258)', fontFamily: 'var(--ds-font-family-code)' }}>production</code>
          <span style={{ fontSize: 12, color: 'var(--ds-text-subtlest, #6B778C)' }}>→ CI → ksa-catalyst.com</span>
        </div>
      </div>

      {!gateEnabled && (
        <div style={{ padding: '10px 18px', background: 'var(--ds-background-warning-subtle, #FFF7D6)', fontSize: 13, color: 'var(--ds-text-warning, #974F0C)' }}>
          Deploy gate is OFF — enable it below before promoting
        </div>
      )}

      {result && (
        <div
          style={{
            padding: '12px 18px',
            fontSize: 13,
            color: result.ok ? 'var(--ds-text-success, #1F845A)' : 'var(--ds-text-danger, #AE2A19)',
            background: result.ok ? 'var(--ds-background-success-subtle, #DCFFF1)' : 'var(--ds-background-danger-subtle, #FFECEB)',
          }}
        >
          {result.ok ? '✓' : '✗'} {result.message}
        </div>
      )}

      {loadingSummary && (
        <div style={{ padding: '20px 18px', display: 'flex', gap: 10, alignItems: 'center' }}>
          <Spinner size="small" />
          <span style={{ fontSize: 13, color: 'var(--ds-text-subtle, #505258)' }}>Analysing branch…</span>
        </div>
      )}

      {summaryError && !loadingSummary && (
        <div style={{ padding: '12px 18px', fontSize: 13, color: 'var(--ds-text-danger, #AE2A19)' }}>
          Could not load summary: {summaryError}
        </div>
      )}

      {summary && !loadingSummary && (
        <div style={{ padding: '16px 18px' }}>

          {summary.ahead_by === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--ds-text-subtlest, #6B778C)' }}>
              ✓ Production is up to date — no new commits to promote from{' '}
              <code style={{ fontFamily: 'var(--ds-font-family-code)', fontSize: 12 }}>{selectedBranch}</code>
            </div>
          ) : (
            <>
              {summary.ai_summary && (
                <div
                  style={{
                    background: 'var(--ds-background-information-subtle, #E9F2FF)',
                    border: '1px solid var(--ds-border-information, #579DFF)',
                    borderRadius: 4,
                    padding: '12px 14px',
                    marginBottom: 16,
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ds-text-information, #0055CC)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    What changes for users
                  </div>
                  <div style={{ fontSize: 14, color: 'var(--ds-text, #292A2E)', lineHeight: '20px' }}>
                    {summary.ai_summary}
                  </div>
                </div>
              )}

              {summary.has_migrations && (
                <div
                  style={{
                    background: 'var(--ds-background-danger-subtle, #FFECEB)',
                    border: '1px solid var(--ds-border-danger, #F87168)',
                    borderRadius: 4,
                    padding: '12px 14px',
                    marginBottom: 16,
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ds-text-danger, #AE2A19)', marginBottom: 6 }}>
                    ⚠ Database changes included — cannot be automatically undone
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--ds-text, #292A2E)', marginBottom: 8 }}>
                    These database migrations will run automatically on the production database:
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {summary.migration_files.map((f) => (
                      <li
                        key={f}
                        style={{ fontSize: 12, color: 'var(--ds-text-subtle, #505258)', fontFamily: 'var(--ds-font-family-code)', marginBottom: 2 }}
                      >
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ds-text, #292A2E)' }}>
                  {summary.ahead_by} commit{summary.ahead_by !== 1 ? 's' : ''} ahead of production
                </span>
                {summary.file_groups.map((g) => (
                  <span
                    key={g.label}
                    style={{
                      fontSize: 12,
                      color: 'var(--ds-text-subtle, #505258)',
                      background: 'var(--ds-background-neutral, #F1F2F4)',
                      borderRadius: 3,
                      padding: '2px 8px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {g.emoji} {g.label} {g.count}
                  </span>
                ))}
              </div>

              <button onClick={() => setShowCommits((v) => !v)} style={linkBtn}>
                {showCommits ? '▼' : '▶'} {showCommits ? 'Hide' : 'View'} {summary.ahead_by} commit{summary.ahead_by !== 1 ? 's' : ''}
              </button>

              {showCommits && (
                <div style={{ marginTop: 10, marginBottom: 8 }}>
                  {summary.commits.slice(0, 25).map((c, i) => (
                    <div
                      key={c.sha}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 10,
                        padding: '6px 0',
                        borderBottom: i < Math.min(summary.commits.length, 25) - 1
                          ? '1px solid var(--ds-border-subtle, rgba(11,18,14,0.06))'
                          : 'none',
                      }}
                    >
                      <code style={{ fontSize: 11, color: 'var(--ds-link, #0052CC)', fontFamily: 'var(--ds-font-family-code)', flexShrink: 0, marginTop: 1, minWidth: 48 }}>
                        {c.sha}
                      </code>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, color: 'var(--ds-text, #292A2E)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {c.message}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--ds-text-subtlest, #6B778C)', marginTop: 1 }}>
                          {c.author} · {fmtRelative(c.date)}
                        </div>
                      </div>
                    </div>
                  ))}
                  {summary.ahead_by > 25 && (
                    <div style={{ fontSize: 12, color: 'var(--ds-text-subtlest, #6B778C)', paddingTop: 8 }}>
                      +{summary.ahead_by - 25} more not shown
                    </div>
                  )}
                </div>
              )}

              {!showConfirm && !result && (
                <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    appearance="primary"
                    onClick={() => setShowConfirm(true)}
                    isDisabled={!gateEnabled}
                  >
                    Promote {selectedBranch} to production
                  </Button>
                </div>
              )}

              {showConfirm && !result && (
                <div
                  style={{
                    marginTop: 16,
                    background: 'var(--ds-surface-sunken, #F7F8F9)',
                    border: '1px solid var(--ds-border, #DCDFE4)',
                    borderRadius: 4,
                    padding: '16px 18px',
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ds-text, #292A2E)', marginBottom: 12 }}>
                    What will happen:
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <li style={{ fontSize: 13, color: 'var(--ds-text, #292A2E)', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <span style={{ color: 'var(--ds-text-success, #1F845A)', fontWeight: 700, flexShrink: 0 }}>✓</span>
                      <span>Branch <code style={{ fontFamily: 'var(--ds-font-family-code)', fontSize: 12 }}>{selectedBranch}</code> will merge into <code style={{ fontFamily: 'var(--ds-font-family-code)', fontSize: 12 }}>production</code> on GitHub</span>
                    </li>
                    {summary.has_migrations && (
                      <li style={{ fontSize: 13, color: 'var(--ds-text, #292A2E)', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                        <span style={{ color: 'var(--ds-text-success, #1F845A)', fontWeight: 700, flexShrink: 0 }}>✓</span>
                        <span>GitHub CI will apply {summary.migration_files.length} database migration{summary.migration_files.length !== 1 ? 's' : ''} to the production database</span>
                      </li>
                    )}
                    <li style={{ fontSize: 13, color: 'var(--ds-text, #292A2E)', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <span style={{ color: 'var(--ds-text-success, #1F845A)', fontWeight: 700, flexShrink: 0 }}>✓</span>
                      <span>Vercel will build and deploy the new version to ksa-catalyst.com</span>
                    </li>
                    {summary.has_migrations && (
                      <li style={{ fontSize: 13, color: 'var(--ds-text-danger, #AE2A19)', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                        <span style={{ fontWeight: 700, flexShrink: 0 }}>⚠</span>
                        <span>Database migrations cannot be automatically rolled back</span>
                      </li>
                    )}
                  </ul>

                  {summary.has_migrations && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 13, color: 'var(--ds-text, #292A2E)', marginBottom: 6 }}>
                        Type <strong>deploy</strong> to confirm the database changes:
                      </div>
                      <input
                        value={confirmText}
                        onChange={(e) => setConfirmText(e.target.value)}
                        placeholder='Type "deploy" to confirm'
                        onKeyDown={(e) => { if (e.key === 'Enter' && canConfirm && !promoting) handlePromote(); }}
                        style={{
                          fontSize: 14,
                          fontFamily: FONT,
                          color: 'var(--ds-text, #292A2E)',
                          background: 'var(--ds-surface, #FFFFFF)',
                          border: '1px solid var(--ds-border, #DCDFE4)',
                          borderRadius: 3,
                          padding: '7px 10px',
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
                      onClick={() => { setShowConfirm(false); setConfirmText(''); }}
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
            <code style={{ fontFamily: 'var(--ds-font-family-code)', fontSize: 11 }}>
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
          Needs <code>actions:write</code> scope — for run history, diff, and triggering deploys
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
  const [envs, setEnvs] = useState<EnvironmentsData | null>(null);
  const [envsLoading, setEnvsLoading] = useState(true);

  const refreshEnvs = useCallback(async () => {
    setEnvsLoading(true);
    try {
      const result = await call('POST', { action: 'get_environments' }) as EnvironmentsData;
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
  const MONO: React.CSSProperties = { fontFamily: 'var(--ds-font-family-code)', fontSize: 12 };

  return (
    <AdminGuard>
      <div style={{ padding: '24px 32px 48px', maxWidth: 1280, color: 'var(--ds-text, #292A2E)', fontFamily: FONT }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 6, background: '#000000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: '#FFFFFF', fontWeight: 700, flexShrink: 0 }}>
              ▲
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 653, lineHeight: '28px', color: 'var(--ds-text, #292A2E)', margin: 0 }}>
              Environment control
            </h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {config.github_pat_set
              ? <Lozenge appearance="success">GitHub ✓</Lozenge>
              : <Lozenge appearance="default">GitHub — no PAT</Lozenge>}
            {config.vercel_token_set
              ? <Lozenge appearance="success">Vercel ✓</Lozenge>
              : <Lozenge appearance="default">Vercel — no token</Lozenge>}
            <Button appearance="subtle" onClick={() => { refresh(); refreshEnvs(); }} spacing="compact">Refresh</Button>
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

        {/* 2-Environment cards */}
        <SectionLabel>Environments</SectionLabel>

        <div style={{ display: 'flex', gap: 16, marginBottom: 24, alignItems: 'stretch' }}>
          <EnvCard
            label="Local (your machine)"
            sublabel="Development — npm run dev"
            dbRef={STAGING_DB_REF}
            dbLabel="Staging DB"
            frontendUrl="http://localhost:8080"
            frontendLabel="localhost:8080"
            commit={envs?.mainBranch?.sha ?? null}
            commitMsg={envs?.mainBranch?.message ?? null}
            deployedAt={envs?.mainBranch?.date ?? null}
            loading={envsLoading}
            stateChip={<Lozenge appearance="inprogress">Dev</Lozenge>}
            accent="var(--ds-border-brand, #0052CC)"
          />

          <div style={{ display: 'flex', alignItems: 'center', color: 'var(--ds-text-subtlest, #6B778C)', fontSize: 20, flexShrink: 0 }}>
            →
          </div>

          <EnvCard
            label="Production"
            sublabel="ksa-catalyst.com · live users"
            dbRef={PROD_DB_REF}
            dbLabel="Production DB"
            frontendUrl={latestDeployment ? `https://${latestDeployment.url}` : config.production_url}
            frontendLabel={latestDeployment?.url ?? config.production_url}
            commit={
              latestDeployment?.meta.github_commit_sha?.slice(0, 7) ??
              envs?.prodBranch?.sha ??
              null
            }
            commitMsg={
              latestDeployment?.meta.github_commit_message ??
              envs?.prodBranch?.message ??
              null
            }
            deployedAt={
              latestDeployment
                ? String(latestDeployment.ready_at ?? latestDeployment.created_at)
                : envs?.prodBranch?.date ?? null
            }
            loading={envsLoading && !latestDeployment}
            stateChip={
              latestDeployment
                ? <VercelStateBadge state={latestDeployment.state} />
                : <Lozenge appearance="default">No deploy</Lozenge>
            }
            accent="var(--ds-border-success, #1F845A)"
          />
        </div>

        {/* Smart promote panel */}
        <SmartPromotePanel
          call={call}
          onDone={() => { refresh(); refreshEnvs(); }}
          gateEnabled={gate.production_deploy_enabled}
        />

        {!config.vercel_token_set && (
          <div style={{ marginBottom: 20 }}>
            <SectionMessage appearance="warning" title="VERCEL_TOKEN not configured">
              Deploys will fail at the "Deploy to Vercel" step. Add it below, then set it as a{' '}
              <a
                href={`https://github.com/${config.github_repo}/settings/secrets/actions`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'inherit', fontWeight: 600 }}
              >
                GitHub Actions secret
              </a>
              {' '}named <code>VERCEL_TOKEN</code>.
            </SectionMessage>
          </div>
        )}

        {/* Deploy gate */}
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
                ? 'ON — promote button unlocked. Disable to freeze production.'
                : 'OFF — promote button locked. Enable when ready to deploy.'}
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

        {/* Live progress */}
        {isRunInProgress && latestRun && <LiveProgress run={latestRun} call={call} />}

        {/* Manual redeploy */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <Button
            appearance="default"
            isDisabled={!gate.production_deploy_enabled || !config.github_pat_set || triggering || isRunInProgress}
            isLoading={triggering}
            onClick={triggerDeploy}
          >
            Redeploy current production commit
          </Button>
          <span style={{ fontSize: 12, color: 'var(--ds-text-subtlest, #6B778C)' }}>
            Re-runs Vercel build without changing the commit — use to recover from a failed build
          </span>
          <a
            href={`https://github.com/${config.github_repo}/actions`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--ds-link, #0052CC)', textDecoration: 'none', flexShrink: 0 }}
          >
            View GitHub Actions ↗
          </a>
        </div>

        {/* Stats */}
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
              style={{ flex: 1, padding: '16px 20px', borderLeft: i > 0 ? '1px solid var(--ds-border, #DCDFE4)' : 'none' }}
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

        {/* Deploy history */}
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

        {/* Vercel deployments */}
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

        {/* Configuration */}
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
