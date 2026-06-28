/**
 * Jira Integration Admin — production sync, mapping validation, per-project config.
 * Route: /admin/connections/jira
 *
 * Lives INSIDE AdminLayout (renders into its <Outlet/>). NO own sidebar, NO fixed header,
 * NO height:100vh shell — those fight the admin shell and produce a nested-sidebar P0.
 *
 * Tabs: Overview · Sync Control · Projects · Type Mapping · Status Mapping · Field Mapping · Database Schema · Backup & Logs
 * Design contract: JiraSyncPageMockup.tsx (approved). Wired to real data here.
 * Icons: JiraIssueTypeIcon (canonical) — never emoji or coloured dots (CLAUDE.md).
 */

import { useState, Fragment } from 'react';
import { useQuery } from '@tanstack/react-query';
import Button from '@atlaskit/button/new';
import Tabs, { Tab, TabList, TabPanel } from '@atlaskit/tabs';
import SectionMessage from '@atlaskit/section-message';
import Textfield from '@atlaskit/textfield';
import Spinner from '@atlaskit/spinner';
import Select from '@atlaskit/select';
import ProgressBar from '@atlaskit/progress-bar';
import Modal, { ModalTransition } from '@atlaskit/modal-dialog';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { ProjectIcon } from '@/components/shared/ProjectIcon';
import { supabase } from '@/integrations/supabase/client';
import { AdminGuard } from '@/components/admin/AdminGuard';
import { useJiraConnection, useUpdateJiraConnection, useTestConnection, useDisconnectJiraConnection } from '@/modules/workhub/admin/hooks/useJiraConnection';
import { useSyncHealth, useSyncLogs, useAvailableProjects } from '@/modules/workhub/admin/hooks/useSyncEngine';
import { formatDistanceToNow } from 'date-fns';
import { resolveJiraEnvironment, getEnvironmentLabel } from '@/lib/jira-integration/environmentResolver';
import { useManualSyncMutation, useRefreshDataMutation, useSyncFilters, useSaveSyncFilterMutation, useFieldMappings, useSaveFieldMappingMutation, FIELD_MAP_TARGETS } from '@/lib/jira-integration/useJiraSyncMutations';

// Date Mode UI <-> engine lookback_months (engine always floors to 2026).
const DATE_MODE_TO_LOOKBACK: Record<string, number> = { 'Last 30 days': 1, 'Year 2026': 12, 'All time': 999 };
const lookbackToDateMode = (m: number): string => (m <= 1 ? 'Last 30 days' : m >= 999 ? 'All time' : 'Year 2026');
const SYNC_ISSUE_TYPES = ['Epic', 'Feature', 'Story', 'Task', 'Sub-task', 'QA Bug', 'Change Request', 'Production Incident', 'Business Gap'];

const C = {
  surface: 'var(--ds-surface, #FFFFFF)',
  surfaceOverlay: 'var(--ds-surface-overlay, #FFFFFF)',
  surfaceSunken: 'var(--ds-surface-sunken, #F7F8F9)',
  neutral: 'var(--ds-background-neutral, #F1F2F4)',
  bgSuccess: 'var(--ds-background-success, #DFFCF0)',
  bgDanger: 'var(--ds-background-danger, #FFECEB)',
  bgInfo: 'var(--ds-background-information, #DEEBFF)',
  text: 'var(--ds-text, #172B4D)',
  textSubtle: 'var(--ds-text-subtle, #42526E)',
  textSubtlest: 'var(--ds-text-subtlest, #6B778C)',
  textSuccess: 'var(--ds-text-success, #216E4E)',
  textDanger: 'var(--ds-text-danger, #AE2A19)',
  textInfo: 'var(--ds-text-information, #0747A6)',
  border: 'var(--ds-border, #DFE1E6)',
} as const;

const FH = 'var(--ds-font-family-heading)';
const FB = 'var(--ds-font-family-body)';
const FC = 'var(--ds-font-family-code)';

type Readiness = 'NOT_CONFIGURED' | 'CONNECTED_NOT_DISCOVERED' | 'NEEDS_MAPPING' | 'READY_TO_SYNC';

const READINESS_LABEL: Record<Readiness, { title: string; detail: string; ok: boolean }> = {
  NOT_CONFIGURED: { title: 'Not configured', detail: 'Configure and test the Jira connection before any sync or discovery.', ok: false },
  CONNECTED_NOT_DISCOVERED: { title: 'Connected — no projects', detail: 'Connection works. Run a sync to populate projects and issues.', ok: false },
  NEEDS_MAPPING: { title: 'No synced data', detail: 'No project carries synced Jira data yet. Run an incremental sync.', ok: false },
  READY_TO_SYNC: { title: 'Ready to sync', detail: 'Connected with synced data. Sync and refresh are available.', ok: true },
};

// Canonical Jira → Catalyst type mapping (convention; both render via JiraIssueTypeIcon).
// Most types land in ph_issues (Projects module). Business Request is the Products-module
// root — it routes to business_requests, NOT ph_issues (see PRODUCTS_MODULE_PROJECTS).
const TYPE_MAP: Array<{ jira: string; catalyst: string; table: string }> = [
  { jira: 'Epic', catalyst: 'Epic', table: 'ph_issues' },
  { jira: 'Story', catalyst: 'Story', table: 'ph_issues' },
  { jira: 'Task', catalyst: 'Task', table: 'ph_issues' },
  { jira: 'Sub-task', catalyst: 'Sub-task', table: 'ph_issues' },
  { jira: 'Bug', catalyst: 'QA Bug', table: 'ph_issues' },
  { jira: 'Change Request', catalyst: 'Change Request', table: 'ph_issues' },
  { jira: 'Incident', catalyst: 'Production Incident', table: 'ph_issues' },
  { jira: 'Business Request', catalyst: 'Business Request', table: 'business_requests' },
];

// Products-module projects: their Jira items are Business Requests routed to the Products
// module (business_requests), NEVER ph_issues. Mirrors wh-jira-sync PRODUCTS_MODULE_PROJECTS.
// Surfaced in Sync Scope so they are visible (mapped) rather than silently absent.
const PRODUCTS_MODULE_PROJECTS = new Set<string>(['MDT']);

// Canonical status-category mapping (Jira statusCategory → Catalyst status_category)
const STATUS_MAP: Array<{ category: string; catalyst: string; terminal: boolean }> = [
  { category: 'To Do', catalyst: 'to do', terminal: false },
  { category: 'In Progress', catalyst: 'in progress', terminal: false },
  { category: 'Done', catalyst: 'done', terminal: true },
];

// Canonical ph_issues column mappings (real columns)
const FIELD_MAP: Array<{ jira: string; catalyst: string; mapped: boolean }> = [
  { jira: 'Summary', catalyst: 'summary', mapped: true },
  { jira: 'Issue Type', catalyst: 'issue_type', mapped: true },
  { jira: 'Status', catalyst: 'status', mapped: true },
  { jira: 'Status Category', catalyst: 'status_category', mapped: true },
  { jira: 'Assignee', catalyst: 'assignee_account_id', mapped: true },
  { jira: 'Reporter', catalyst: 'reporter_account_id', mapped: true },
  { jira: 'Parent', catalyst: 'parent_key', mapped: true },
  { jira: 'Created', catalyst: 'jira_created_at', mapped: true },
  { jira: 'Updated', catalyst: 'jira_updated_at', mapped: true },
  { jira: 'Everything else', catalyst: 'raw_json', mapped: false },
];

export function JiraSyncPage() {
  const env = resolveJiraEnvironment();
  const [selectedTab, setSelectedTab] = useState(0);
  const [projectDetailKey, setProjectDetailKey] = useState<string | null>(null);
  const [refreshOpen, setRefreshOpen] = useState(false);

  const { data: connection, isLoading: connLoading } = useJiraConnection();
  const { data: health } = useSyncHealth();
  const { data: accessibleProjects = [] } = useAvailableProjects();
  const { data: syncFilters = [] } = useSyncFilters();
  const { data: syncLogs = [] } = useSyncLogs(20);

  // Backend readiness (spec §11/§17) — authoritative when reachable.
  const { data: backendReadiness } = useQuery({
    queryKey: ['jira-sync-readiness', env.environment],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('jira-sync-readiness');
      if (error) return null;
      return data as {
        readiness: Readiness; allowedActions: Record<string, boolean>; reasons: string[];
        connectionValid: boolean; siteUrl: string | null; lastTestedAt: string | null;
      } | null;
    },
    staleTime: 15_000,
  });

  // Per-project sync state from ph_jira_projects (config table — may be empty)
  const { data: syncProjects = [] } = useQuery({
    queryKey: ['jira-sync-projects', env.environment],
    queryFn: async () => {
      const { data } = await supabase
        .from('ph_jira_projects')
        .select('project_key, name, is_active, sync_config, last_synced_at')
        .order('project_key');
      return data || [];
    },
  });

  // GROUND TRUTH: distinct project_key + count from actual synced jira issues.
  // Config tables (ph_jira_projects, connection.accessible_projects) are often empty
  // even when ph_issues holds synced data — so the real project universe is here.
  const { data: issueCounts = {} } = useQuery({
    queryKey: ['jira-issue-project-counts', env.environment],
    queryFn: async () => {
      const { data } = await supabase
        .from('ph_issues')
        .select('project_key')
        .eq('source', 'jira')
        .limit(20000);
      const tally: Record<string, number> = {};
      for (const r of (data || [])) {
        const k = (r as any).project_key;
        if (k) tally[k] = (tally[k] || 0) + 1;
      }
      return tally;
    },
  });

  // Project universe = union of (issues with data) ∪ (accessible) ∪ (config rows).
  const allKeys = new Set<string>([
    ...Object.keys(issueCounts),
    ...accessibleProjects.map((p: any) => p.key),
    ...syncProjects.map((s: any) => s.project_key),
  ]);

  const filterMap = new Map(syncFilters.map((f) => [f.project_key, f]));

  const projects = Array.from(allKeys).sort().map((key) => {
    const ap = accessibleProjects.find((p: any) => p.key === key);
    const sp = syncProjects.find((s: any) => s.project_key === key);
    const cfg = (sp?.sync_config && typeof sp.sync_config === 'object') ? sp.sync_config as any : {};
    const cached = issueCounts[key] || 0;
    // module_target authority: jira_project_sync_filters (e.g. fixed MDT -> Investor Journey) over legacy sync_config.
    const moduleTarget = filterMap.get(key)?.module_target ?? cfg.module_target ?? null;
    return {
      key,
      name: ap?.name || sp?.name || key,
      // A project is effectively synced if it has cached jira data OR config marks it active.
      sync_enabled: cached > 0 || (sp?.is_active ?? false),
      module_target: moduleTarget,
      last_synced_at: sp?.last_synced_at ?? null,
      issues_cached: cached,
    };
  });

  // Connection status from the service-role readiness function (authoritative) — the
  // RLS-gated useJiraConnection read can be blocked for the admin user, falsely showing
  // "Not configured". Backend readiness reads it via service role. (spec §17)
  const isConnected = backendReadiness?.connectionValid ?? (connection?.status === 'connected');
  const connSiteUrl = connection?.site_url ?? backendReadiness?.siteUrl ?? null;
  const connLastTested = connection?.last_tested_at ?? backendReadiness?.lastTestedAt ?? null;
  const enabledProjects = projects.filter(p => p.sync_enabled);
  // Projects tab = projects with cached Jira data, PLUS Products-module projects (e.g. MDT →
  // Investor Journey) and any explicitly-mapped project (Vikram, 2026-06-24: MDT must be
  // visible, not silently excluded). Random no-data accessible projects are still hidden.
  const dataProjects = projects.filter(p => p.issues_cached > 0 || PRODUCTS_MODULE_PROJECTS.has(p.key) || p.module_target);
  const totalJiraIssues = Object.values(issueCounts).reduce((a: number, b: number) => a + b, 0);

  // Backend readiness is authoritative when reachable; client derivation is the fallback.
  const clientReadiness: Readiness =
    !isConnected ? 'NOT_CONFIGURED'
    : projects.length === 0 ? 'CONNECTED_NOT_DISCOVERED'
    : enabledProjects.length === 0 ? 'NEEDS_MAPPING'
    : 'READY_TO_SYNC';
  const readiness: Readiness = (backendReadiness?.readiness as Readiness) ?? clientReadiness;
  const syncAllowed = backendReadiness?.allowedActions?.fullSync ?? (readiness === 'READY_TO_SYNC');

  return (
    <AdminGuard>
      <div style={{ padding: '24px 32px', background: C.surfaceOverlay, minHeight: '100%' }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 28, fontWeight: 600, color: C.text, margin: 0, fontFamily: FH }}>
            Jira Integration
          </h1>
          <p style={{ fontSize: 14, color: C.textSubtle, margin: '8px 0 0 0', fontFamily: FB }}>
            {getEnvironmentLabel(env.environment)} · Sync Jira into Catalyst. Mapping-first: validate before sync; preserve existing data.
          </p>
        </div>

        {/* Connection banner */}
        {connLoading ? (
          <div style={{ marginBottom: 24 }}><Spinner size="small" /></div>
        ) : (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, padding: '12px 16px', borderRadius: 8,
            background: C.neutral,
            border: `1px solid ${C.border}`,
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: isConnected ? C.textSubtle : C.textSubtlest }} />
            <span style={{ fontWeight: 600, fontFamily: FB, color: C.text }}>
              {isConnected ? 'Connected' : 'Not configured'}
            </span>
            {connSiteUrl && (
              <code style={{ fontSize: 12, fontFamily: FC, background: C.neutral, padding: '2px 6px', borderRadius: 3 }}>
                {connSiteUrl}
              </code>
            )}
            {connLastTested && (
              <span style={{ color: C.textSubtle, marginLeft: 'auto', fontSize: 12, fontFamily: FB }}>
                Last tested {formatDistanceToNow(new Date(connLastTested), { addSuffix: true })}
              </span>
            )}
          </div>
        )}

        <Tabs id="jira-admin" selectedIndex={selectedTab} onChange={setSelectedTab}>
          <TabList>
            <Tab>Overview</Tab>
            <Tab>Sync Control</Tab>
            <Tab>Projects ({dataProjects.length})</Tab>
            <Tab>Type Mapping</Tab>
            <Tab>Status Mapping</Tab>
            <Tab>Field Mapping</Tab>
            <Tab>Database Schema</Tab>
            <Tab>Backup & Logs</Tab>
          </TabList>

          <TabPanel>
            <div style={{ width: '100%' }}>
              <ConnectionTab connection={connection} health={health} env={env} readiness={readiness} />
              <OverviewTab projects={projects} health={health} readiness={readiness} isConnected={isConnected} totalJiraIssues={totalJiraIssues} env={env} onConfigure={() => setSelectedTab(0)} />
            </div>
          </TabPanel>
          <TabPanel>
            <SyncControlTab readiness={readiness} isConnected={isConnected} syncAllowed={syncAllowed} env={env} projects={projects} onRefreshClick={() => setRefreshOpen(true)} onConfigure={() => setSelectedTab(0)} />
          </TabPanel>
          <TabPanel>
            <ProjectsTab projects={dataProjects} onManage={setProjectDetailKey} />
          </TabPanel>
          <TabPanel>
            <TypeMappingTab />
          </TabPanel>
          <TabPanel>
            <StatusMappingTab />
          </TabPanel>
          <TabPanel>
            <FieldMappingTab />
          </TabPanel>
          <TabPanel>
            <DatabaseSchemaTab />
          </TabPanel>
          <TabPanel>
            <BackupAndLogsTab syncLogs={syncLogs} />
          </TabPanel>
        </Tabs>

        <ProjectDetailModal
          projectKey={projectDetailKey}
          projects={projects}
          onClose={() => setProjectDetailKey(null)}
        />
        <RefreshDataModal
          isOpen={refreshOpen}
          env={env}
          enabledProjects={enabledProjects}
          onClose={() => setRefreshOpen(false)}
        />
      </div>
    </AdminGuard>
  );
}

const TH = { padding: '12px 16px', textAlign: 'left' as const, fontSize: 12, fontWeight: 600, color: C.textSubtle, borderBottom: `1px solid ${C.border}`, fontFamily: FB };
const TD = { padding: '12px 16px', fontSize: 13, fontFamily: FB, color: C.text };

// Neutral-enterprise status pill (Vikram 2026-06-24): no green/lime anywhere in the Jira
// integration — Atlaskit's stock success Lozenge resolves to lime (#EFFFD6/#4C6B1F). Status
// reads as restrained ADS neutral; red is reserved strictly for errors/danger. Labels stay
// sentence-case (ADS typography rule — never all-caps).
function StatusPill({ children, tone = 'neutral' }: { children: any; tone?: 'neutral' | 'danger' }) {
  const palette = {
    neutral: { bg: 'var(--ds-background-neutral, #DCDFE4)', fg: 'var(--ds-text-subtle, #44546F)' },
    danger: { bg: 'var(--ds-background-danger, #FFECEB)', fg: 'var(--ds-text-danger, #AE2A19)' },
  } as const;
  const c = palette[tone];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '0 8px', borderRadius: 3, background: c.bg, color: c.fg, fontFamily: FB, fontSize: 11, fontWeight: 600, lineHeight: '20px' }}>
      {children}
    </span>
  );
}

function ConnectionTab({ connection, health, env, readiness }: any) {
  const testConn = useTestConnection();
  const saveConn = useUpdateJiraConnection();
  const disconnect = useDisconnectJiraConnection();
  const isConnected = connection?.status === 'connected';
  const r = READINESS_LABEL[readiness as Readiness];
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ site_url: connection?.site_url || '', auth_email: connection?.auth_email || '', auth_token: '' });

  // 'Issues cached' lives in the metrics row below — kept out of here to avoid duplication.
  const rows: Array<[string, string]> = [
    ['Site URL', connection?.site_url || '—'],
    ['Auth email', connection?.auth_email || '—'],
    ['Auth method', connection?.auth_method || '—'],
    ['Accessible projects', String(connection?.project_count ?? '—')],
    ['Last tested', connection?.last_tested_at ? formatDistanceToNow(new Date(connection.last_tested_at), { addSuffix: true }) : 'Never'],
  ];

  return (
    <div style={{ marginTop: 20 }}>
      {/* Status card — folds in readiness so the standalone banner is no longer needed */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: 24, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: isConnected ? C.textSubtle : C.textSubtlest }} />
          <h3 style={{ fontSize: 16, fontWeight: 600, color: C.text, margin: 0, fontFamily: FH }}>
            {isConnected ? 'Connected to Jira' : 'Jira not configured'}
          </h3>
          <StatusPill>{getEnvironmentLabel(env.environment)}</StatusPill>
          {r && <StatusPill>{r.title}</StatusPill>}
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20 }}>
          <tbody>
            {rows.map(([k, v]) => (
              <tr key={k} style={{ borderBottom: `1px solid ${C.border}` }}>
                <td style={{ padding: '8px 0', fontSize: 12, color: C.textSubtle, fontFamily: FB, width: 180 }}>{k}</td>
                <td style={{ padding: '8px 0', fontSize: 13, color: C.text, fontFamily: k === 'Site URL' ? FC : FB }}>{v}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ display: 'flex', gap: 12 }}>
          {isConnected ? (
            <>
              <Button appearance="subtle" isDisabled={testConn.isPending} onClick={() => testConn.mutate()}>
                {testConn.isPending ? 'Testing…' : 'Test Connection'}
              </Button>
              <Button appearance="subtle" onClick={() => setEditing(e => !e)}>{editing ? 'Cancel' : 'Reconfigure'}</Button>
              <Button
                appearance="subtle"
                isDisabled={disconnect.isPending}
                onClick={() => { if (connection?.id) disconnect.mutate(connection.id); }}
              >
                <span style={{ color: C.textDanger }}>{disconnect.isPending ? 'Disconnecting…' : 'Disconnect'}</span>
              </Button>
            </>
          ) : (
            <Button appearance="primary" onClick={() => setEditing(e => !e)}>{editing ? 'Cancel' : 'Configure'}</Button>
          )}
        </div>

        {testConn.isSuccess && (
          <div style={{ marginTop: 16, fontSize: 12, color: C.textSubtle, fontFamily: FB }}>✓ Connection test passed.</div>
        )}
        {testConn.isError && (
          <SectionMessage appearance="error" style={{ marginTop: 16 }}><p style={{ fontFamily: FB, fontSize: 12 }}>{testConn.error instanceof Error ? testConn.error.message : 'Test failed'}</p></SectionMessage>
        )}
        {disconnect.isError && (
          <SectionMessage appearance="error" style={{ marginTop: 16 }}><p style={{ fontFamily: FB, fontSize: 12 }}>{disconnect.error instanceof Error ? disconnect.error.message : 'Disconnect failed'}</p></SectionMessage>
        )}
      </div>

      {/* Configure form */}
      {editing && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: C.text, margin: '0 0 16px 0', fontFamily: FH }}>Jira Credentials</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 520 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: C.text, display: 'block', marginBottom: 4, fontFamily: FB }}>Site URL</label>
              <Textfield placeholder="https://your-org.atlassian.net" value={form.site_url} onChange={e => setForm(f => ({ ...f, site_url: (e.target as HTMLInputElement).value }))} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: C.text, display: 'block', marginBottom: 4, fontFamily: FB }}>Auth email</label>
              <Textfield placeholder="you@org.com" value={form.auth_email} onChange={e => setForm(f => ({ ...f, auth_email: (e.target as HTMLInputElement).value }))} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: C.text, display: 'block', marginBottom: 4, fontFamily: FB }}>API token</label>
              <Textfield type="password" placeholder="Paste your Jira API token" value={form.auth_token} onChange={e => setForm(f => ({ ...f, auth_token: (e.target as HTMLInputElement).value }))} />
              <div style={{ fontSize: 11, color: C.textSubtlest, marginTop: 4, fontFamily: FB }}>Encrypted server-side via wh-save-connection. Never stored in the browser.</div>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <Button appearance="primary" isDisabled={!form.site_url || !form.auth_email || !form.auth_token || saveConn.isPending}
                onClick={() => saveConn.mutate({ site_url: form.site_url, auth_method: 'api_token', auth_email: form.auth_email, auth_token_encrypted: form.auth_token }, { onSuccess: () => setEditing(false) })}>
                {saveConn.isPending ? 'Saving…' : 'Save & Connect'}
              </Button>
              <Button onClick={() => setEditing(false)}>Cancel</Button>
            </div>
            {saveConn.isError && (
              <SectionMessage appearance="error"><p style={{ fontFamily: FB, fontSize: 12 }}>{saveConn.error instanceof Error ? saveConn.error.message : 'Save failed'}</p></SectionMessage>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function OverviewTab({ projects, health, isConnected, totalJiraIssues, env }: any) {
  const syncedCount = isConnected ? projects.filter((p: any) => p.sync_enabled).length : 0;
  const lastSync = health?.lastSync?.started_at
    ? formatDistanceToNow(new Date(health.lastSync.started_at), { addSuffix: true })
    : 'Never';
  // Cached count is only meaningful when connected. When not, it is stale cache — label it so.
  const cachedLabel = isConnected ? 'Issues Cached' : 'Issues Cached (stale)';

  return (
    <div>
      {/* Metrics — honest. No "synced" when not connected. (Readiness now shown in the connection card above.) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Environment', value: getEnvironmentLabel(env.environment).replace(/^[^ ]+ /, '') },
          { label: 'Projects', value: isConnected ? projects.length : 0 },
          { label: 'Sync Enabled', value: syncedCount },
          { label: cachedLabel, value: (totalJiraIssues ?? 0).toLocaleString() },
        ].map(({ label, value }) => (
          <div key={label} style={{ background: C.surfaceSunken, border: `1px solid ${C.border}`, borderRadius: 8, padding: '20px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 600, color: C.text, fontFamily: FB }}>{value}</div>
            <div style={{ fontSize: 12, color: C.textSubtle, marginTop: 8, fontFamily: FB }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Sync scope — only when connected; otherwise blocked state */}
      <h3 style={{ fontSize: 16, fontWeight: 600, color: C.text, marginBottom: 4, fontFamily: FH }}>Sync Scope</h3>
      <p style={{ fontSize: 12, color: C.textSubtle, margin: '0 0 16px 0', fontFamily: FB, maxWidth: 760 }}>
        <strong>Catalyst target</strong> is the Catalyst module a project's items route into. <strong>—</strong> means the project keeps its own Project Hub, keyed by its project code (the default). A named target means items are routed elsewhere — e.g. <code style={{ fontFamily: FC }}>MDT</code> is a Products-module project: its Jira items are Business Requests that land in <code style={{ fontFamily: FC }}>business_requests</code> (Investor Journey), never in <code style={{ fontFamily: FC }}>ph_issues</code>.
      </p>
      {!isConnected ? (
        <SectionMessage appearance="warning" title="Sync blocked — not configured">
          <p style={{ fontFamily: FB, fontSize: 12 }}>Configure and test the Jira connection on the Connection tab. No project can sync until then.</p>
        </SectionMessage>
      ) : projects.length === 0 ? (
        <SectionMessage appearance="information" title="No projects discovered">
          <p style={{ fontFamily: FB, fontSize: 12 }}>Connection works but no projects are cached yet. Run a sync on the Sync Control tab.</p>
        </SectionMessage>
      ) : (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{ background: C.surfaceSunken }}>
              {['Project', 'Catalyst target', 'Sync', 'Issues cached', 'Status'].map(h => <th key={h} style={TH}>{h}</th>)}
            </tr></thead>
            <tbody>
              {projects
                .filter((p: any) => p.issues_cached > 0 || PRODUCTS_MODULE_PROJECTS.has(p.key) || p.module_target)
                .map((p: any, i: number, arr: any[]) => {
                  const isProduct = PRODUCTS_MODULE_PROJECTS.has(p.key);
                  return (
                    <tr key={p.key} style={{ borderBottom: i < arr.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                      <td style={TD}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                          <ProjectIcon projectKey={p.key} name={p.name} size="xsmall" />
                          <span style={{ color: C.text, fontWeight: 500 }}>{p.name}</span>
                          <code style={{ fontSize: 11, fontFamily: FC, background: C.neutral, padding: '1px 5px', borderRadius: 3, color: C.textSubtle }}>{p.key}</code>
                        </span>
                      </td>
                      <td style={{ ...TD, color: C.textSubtle }}>{p.module_target || '—'}</td>
                      <td style={TD}><StatusPill>{isProduct ? 'Products' : (p.sync_enabled ? 'On' : 'Off')}</StatusPill></td>
                      <td style={TD}>{p.issues_cached > 0 ? p.issues_cached.toLocaleString() : '—'}</td>
                      <td style={TD}><StatusPill>{isProduct ? 'Products module' : (p.issues_cached > 0 ? 'Synced' : 'Not synced')}</StatusPill></td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SyncControlTab({ readiness, isConnected, syncAllowed, env, projects = [], onRefreshClick, onConfigure }: any) {
  const manualSync = useManualSyncMutation();
  const r = READINESS_LABEL[readiness as Readiness];
  const enabledProjects = projects.filter((p: any) => p.sync_enabled);

  const [selectedProjects, setSelectedProjects] = useState<Array<{ label: string; value: string }>>([]);
  const [dateOption, setDateOption] = useState<{ label: string; value: string }>({ label: 'Per-project (saved filters)', value: 'Per-project' });

  const projectOptions = enabledProjects.map((p: any) => ({ label: `${p.key} — ${p.name}`, value: p.key, count: p.issues_cached }));
  const dateOptions = [
    { label: 'Per-project (saved filters)', value: 'Per-project' },
    { label: 'Last 30 days', value: 'Last 30 days' },
    { label: 'Year 2026', value: 'Year 2026' },
    { label: 'All time', value: 'All time' },
  ];

  // Per-project run: full/incremental sync sequentially so the user sees which project is in
  // flight and a real percentage — not an indeterminate bar. Dry-run = single read-only estimate.
  const [run, setRun] = useState<any>(null);
  const syncing = !!run && !run.finished;

  const runSync = async (mode: 'full' | 'incremental' | 'dry-run') => {
    const lookbackOverride = dateOption.value === 'Per-project' ? undefined : (DATE_MODE_TO_LOOKBACK[dateOption.value] ?? undefined);
    const list = selectedProjects.length
      ? selectedProjects.map(o => ({ key: o.value, name: o.label.split(' — ')[1] || o.value }))
      : enabledProjects.map((p: any) => ({ key: p.key, name: p.name }));
    if (!list.length) return;

    if (mode === 'dry-run') {
      setRun({ mode, total: list.length, done: 0, currentKey: null, currentName: null, fetched: 0, updated: 0, failed: 0, finished: false });
      try {
        const res = await manualSync.mutateAsync({ mode, projectKeys: list.map(t => t.key), lookbackOverride });
        setRun((r0: any) => ({ ...r0, done: list.length, estimate: res?.estimatedCount ?? 0, finished: true }));
      } catch (e: any) {
        setRun((r0: any) => ({ ...r0, finished: true, error: e?.message ?? 'Dry run failed' }));
      }
      return;
    }

    setRun({ mode, total: list.length, done: 0, currentKey: list[0].key, currentName: list[0].name, fetched: 0, updated: 0, failed: 0, finished: false });
    let fetched = 0, updated = 0, failed = 0;
    for (let i = 0; i < list.length; i++) {
      const t = list[i];
      setRun((r0: any) => ({ ...r0, currentKey: t.key, currentName: t.name, done: i }));
      try {
        const res = await manualSync.mutateAsync({ mode, projectKeys: [t.key], lookbackOverride });
        fetched += res?.issuesFetched ?? 0;
        updated += res?.recordsAdded ?? 0;
      } catch { failed += 1; }
      setRun((r0: any) => ({ ...r0, done: i + 1, fetched, updated, failed }));
    }
    setRun((r0: any) => ({ ...r0, currentKey: null, currentName: null, finished: true }));
  };

  return (
    <div style={{ marginTop: 20 }}>
      {!isConnected ? (
        <SectionMessage appearance="error" title="Jira not configured">
          <p style={{ fontFamily: FB, fontSize: 12 }}>All sync actions are blocked until the Jira connection is configured and tested.</p>
          <div style={{ marginTop: 8 }}><Button appearance="primary" onClick={onConfigure}>Go to Connection</Button></div>
        </SectionMessage>
      ) : !syncAllowed && (
        <SectionMessage appearance="warning" title={r.title}>
          <p style={{ fontFamily: FB, fontSize: 12 }}>{r.detail}</p>
        </SectionMessage>
      )}

      {/* Manual sync — every Jira button disabled unless connected */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: 24, marginTop: 20, marginBottom: 20, opacity: isConnected ? 1 : 0.6 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: C.text, margin: '0 0 4px 0', fontFamily: FH }}>Manual Sync</h3>
        <p style={{ fontSize: 12, color: C.textSubtle, margin: '0 0 16px 0', fontFamily: FB }}>Pull issues from Jira into Catalyst. Choose scope, then run.</p>

        {/* Per-run scope: projects + date window */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: C.text, display: 'block', marginBottom: 6, fontFamily: FB }}>Projects</label>
            <Select
              isMulti
              isDisabled={!isConnected || syncing}
              options={projectOptions}
              value={selectedProjects}
              onChange={(v: any) => setSelectedProjects(v ? [...v] : [])}
              placeholder={`All enabled (${enabledProjects.length})`}
              spacing="compact"
              menuPortalTarget={typeof document !== 'undefined' ? document.body : undefined}
              styles={{ menuPortal: (base: any) => ({ ...base, zIndex: 9999 }) }}
              formatOptionLabel={(opt: any) => (
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ProjectIcon projectKey={opt.value} name={opt.label} size="xsmall" />
                  <span style={{ fontFamily: FB, fontSize: 13 }}>{opt.label}</span>
                  {opt.count != null && <span style={{ marginLeft: 'auto', color: C.textSubtlest, fontFamily: FB, fontSize: 12 }}>{opt.count.toLocaleString()}</span>}
                </span>
              )}
            />
            <p style={{ fontSize: 11, color: C.textSubtlest, margin: '6px 0 0 0', fontFamily: FB }}>Leave empty to sync all {enabledProjects.length} enabled projects.</p>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: C.text, display: 'block', marginBottom: 6, fontFamily: FB }}>Date window</label>
            <Select
              isDisabled={!isConnected || syncing}
              options={dateOptions}
              value={dateOption}
              onChange={(v: any) => setDateOption(v)}
              spacing="compact"
              menuPortalTarget={typeof document !== 'undefined' ? document.body : undefined}
              styles={{ menuPortal: (base: any) => ({ ...base, zIndex: 9999 }) }}
            />
            <p style={{ fontSize: 11, color: C.textSubtlest, margin: '6px 0 0 0', fontFamily: FB }}>"Per-project" uses each project's saved filter. Any other value overrides this run only. Always floored to 2026.</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Button appearance="primary" isDisabled={!isConnected || !syncAllowed || syncing} iconBefore={syncing && run?.mode === 'full' ? () => <Spinner size="small" appearance="invert" /> : undefined} onClick={() => runSync('full')}>
            {syncing && run?.mode === 'full' ? 'Syncing…' : 'Run Full Sync'}
          </Button>
          <Button isDisabled={!isConnected || syncing} onClick={() => runSync('incremental')}>Run Incremental</Button>
          <Button isDisabled={!isConnected || syncing} onClick={() => runSync('dry-run')}>Dry Run</Button>
        </div>

        {/* What each action does */}
        <div style={{ display: 'flex', gap: 24, marginTop: 16, flexWrap: 'wrap' }}>
          {[
            { t: 'Full sync', d: "Re-pulls every issue in scope using each project's saved filter (2026+). Use to backfill or after changing filters." },
            { t: 'Incremental', d: 'Only issues created or updated since the last successful sync. Fast — the routine refresh.' },
            { t: 'Dry run', d: 'Counts how many issues would sync. Reads only — writes nothing.' },
          ].map(x => (
            <div key={x.t} style={{ flex: '1 1 200px', minWidth: 200, maxWidth: 300 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.text, fontFamily: FB }}>{x.t}</div>
              <div style={{ fontSize: 11, color: C.textSubtlest, fontFamily: FB, marginTop: 4, lineHeight: 1.4 }}>{x.d}</div>
            </div>
          ))}
        </div>

        {/* Live per-project progress — which project is in flight + a real percentage */}
        {syncing && run?.mode !== 'dry-run' && (
          <div style={{ marginTop: 16, padding: 16, background: C.surfaceSunken, border: `1px solid ${C.border}`, borderRadius: 8 }} role="status" aria-live="polite">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              {run.currentKey && <ProjectIcon projectKey={run.currentKey} name={run.currentName || run.currentKey} size="xsmall" />}
              <span style={{ fontSize: 13, fontWeight: 600, color: C.text, fontFamily: FB }}>Syncing {run.currentName || '…'}</span>
              <span style={{ marginLeft: 'auto', fontSize: 12, color: C.textSubtle, fontFamily: FB, fontVariantNumeric: 'tabular-nums' }}>
                {Math.min(run.done + 1, run.total)} of {run.total} · {Math.round((run.done / run.total) * 100)}%
              </span>
            </div>
            <ProgressBar value={run.done / run.total} ariaLabel={`Sync progress ${Math.round((run.done / run.total) * 100)} percent`} />
            {(run.fetched > 0 || run.updated > 0) && (
              <div style={{ fontSize: 11, color: C.textSubtlest, fontFamily: FB, marginTop: 8 }}>
                {run.fetched.toLocaleString()} fetched · {run.updated.toLocaleString()} new or updated so far
              </div>
            )}
          </div>
        )}
        {syncing && run?.mode === 'dry-run' && (
          <div style={{ marginTop: 16 }} role="status" aria-live="polite">
            <div style={{ fontSize: 12, color: C.textSubtle, marginBottom: 8, fontFamily: FB }}>Estimating issues across {run.total} project{run.total === 1 ? '' : 's'}…</div>
            <ProgressBar isIndeterminate ariaLabel="Estimating" />
          </div>
        )}
        {/* Completion — neutral text for success (no green); red/amber only on failure */}
        {run?.finished && !run.error && !run.failed && (
          <div style={{ marginTop: 16, fontSize: 12, color: C.textSubtle, fontFamily: FB }}>
            {run.mode === 'dry-run'
              ? `Dry run: ${(run.estimate ?? 0).toLocaleString()} issue${run.estimate === 1 ? '' : 's'} would sync.`
              : (run.fetched === 0 && run.updated === 0
                  ? `Up to date — no new or changed issues across ${run.total} project${run.total === 1 ? '' : 's'}.`
                  : `Fetched ${run.fetched.toLocaleString()} issue${run.fetched === 1 ? '' : 's'} across ${run.total} project${run.total === 1 ? '' : 's'} · ${run.updated.toLocaleString()} new or updated.`)}
          </div>
        )}
        {run?.finished && !run.error && run.failed > 0 && (
          <SectionMessage appearance="warning">
            <p style={{ fontFamily: FB, fontSize: 12 }}>
              Synced {run.total - run.failed} of {run.total} project{run.total === 1 ? '' : 's'} · {run.updated.toLocaleString()} new or updated. {run.failed} project{run.failed === 1 ? '' : 's'} failed.
            </p>
          </SectionMessage>
        )}
        {run?.finished && run.error && (
          <SectionMessage appearance="error"><p style={{ fontFamily: FB, fontSize: 12 }}>{run.error}</p></SectionMessage>
        )}
      </div>

      {/* Refresh data — destructive. Enterprise "danger zone": neutral surface, danger accent only. */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderLeft: `3px solid ${C.textDanger}`, borderRadius: 8, padding: 24, opacity: isConnected ? 1 : 0.6 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: C.text, margin: '0 0 4px 0', fontFamily: FH }}>Danger zone</h3>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginTop: 8 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.text, fontFamily: FB }}>Refresh Data</div>
            <p style={{ fontSize: 12, color: C.textSubtle, margin: '2px 0 0 0', fontFamily: FB }}>
              Delete Jira-origin rows and reload fresh from Jira. Catalyst-native records preserved. Cannot be undone.
            </p>
          </div>
          <Button appearance="danger" isDisabled={!isConnected} onClick={onRefreshClick}>Refresh Data…</Button>
        </div>
      </div>
    </div>
  );
}

function ProjectsTab({ projects, onManage }: any) {
  const [search, setSearch] = useState('');
  const filtered = projects.filter((p: any) =>
    p.key.toLowerCase().includes(search.toLowerCase()) || p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ marginBottom: 20, maxWidth: 400 }}>
        <Textfield placeholder="Search projects…" value={search} onChange={e => setSearch((e.target as HTMLInputElement).value)} />
      </div>
      {projects.length === 0 ? (
        <SectionMessage appearance="information" title="No projects"><p style={{ fontFamily: FB, fontSize: 12 }}>Configure the connection to discover Jira projects.</p></SectionMessage>
      ) : (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{ background: C.surfaceSunken }}>
              {['Key', 'Name', 'Sync', 'Catalyst target', 'Issues cached', 'Manage', 'Status'].map(h => <th key={h} style={TH}>{h}</th>)}
            </tr></thead>
            <tbody>
              {filtered.map((p: any, i: number) => {
                const isProduct = PRODUCTS_MODULE_PROJECTS.has(p.key);
                return (
                  <tr key={p.key} style={{ borderBottom: i < filtered.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                    <td style={TD}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                        <ProjectIcon projectKey={p.key} name={p.name} size="xsmall" />
                        <code style={{ fontSize: 11, fontFamily: FC, background: C.neutral, padding: '1px 5px', borderRadius: 3, color: C.textSubtle }}>{p.key}</code>
                      </span>
                    </td>
                    <td style={{ ...TD, fontWeight: 500 }}>{p.name}</td>
                    <td style={TD}><StatusPill>{isProduct ? 'Products' : (p.sync_enabled ? 'On' : 'Off')}</StatusPill></td>
                    <td style={{ ...TD, color: C.textSubtle }}>{p.module_target || '—'}</td>
                    <td style={TD}>{p.issues_cached > 0 ? p.issues_cached.toLocaleString() : '—'}</td>
                    <td style={TD}><Button appearance="subtle" onClick={() => onManage(p.key)}>Manage</Button></td>
                    <td style={TD}><StatusPill>{isProduct ? 'Products module' : (p.issues_cached > 0 ? 'Synced' : 'No data')}</StatusPill></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function TypeMappingTab() {
  return (
    <div style={{ marginTop: 20 }}>
      <SectionMessage appearance="information" title="Type Mappings">
        <p style={{ fontFamily: FB, fontSize: 12 }}>Jira issue types map to Catalyst work item types. Most land in <code style={{ fontFamily: FC }}>ph_issues</code> (Projects module); the type drives icon, hierarchy, and field availability. <strong>Business Request</strong> is the exception — it is the Products-module root and routes to <code style={{ fontFamily: FC }}>business_requests</code>, never <code style={{ fontFamily: FC }}>ph_issues</code>.</p>
      </SectionMessage>
      <div style={{ marginTop: 20, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ background: C.surfaceSunken }}>
            {['Jira Type', 'Catalyst Type', 'Target Table', 'Status'].map(h => <th key={h} style={TH}>{h}</th>)}
          </tr></thead>
          <tbody>
            {TYPE_MAP.map((t, i) => (
              <tr key={t.jira} style={{ borderBottom: i < TYPE_MAP.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                <td style={TD}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><JiraIssueTypeIcon type={t.catalyst as any} size={16} />{t.jira}</span></td>
                <td style={TD}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><JiraIssueTypeIcon type={t.catalyst as any} size={16} />{t.catalyst}</span></td>
                <td style={{ ...TD, fontFamily: FC, fontSize: 12, color: C.textSubtle }}>{t.table}</td>
                <td style={TD}><StatusPill>Mapped</StatusPill></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusMappingTab() {
  return (
    <div style={{ marginTop: 20 }}>
      <SectionMessage appearance="information" title="Status Mappings">
        <p style={{ fontFamily: FB, fontSize: 12 }}>Jira status categories map to Catalyst <code style={{ fontFamily: FC }}>status_category</code>. The raw Jira status name is preserved in the <code style={{ fontFamily: FC }}>status</code> column.</p>
      </SectionMessage>
      <div style={{ marginTop: 20, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ background: C.surfaceSunken }}>
            {['Jira Category', 'Catalyst status_category', 'Terminal'].map(h => <th key={h} style={TH}>{h}</th>)}
          </tr></thead>
          <tbody>
            {STATUS_MAP.map((s, i) => (
              <tr key={s.category} style={{ borderBottom: i < STATUS_MAP.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                <td style={TD}>{s.category}</td>
                <td style={{ ...TD, fontFamily: FC, fontSize: 12, color: C.textSubtle }}>{s.catalyst}</td>
                <td style={TD}><StatusPill>{s.terminal ? 'Yes' : 'No'}</StatusPill></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FieldMappingTab() {
  const [filter, setFilter] = useState<'all' | 'mapped' | 'raw'>('all');
  const filtered = FIELD_MAP.filter(f => filter === 'all' || (filter === 'mapped' ? f.mapped : !f.mapped));
  const mappedCount = FIELD_MAP.filter(f => f.mapped).length;
  const rawCount = FIELD_MAP.length - mappedCount;

  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        {[{ label: 'All Fields', v: 'all' }, { label: `Mapped (${mappedCount})`, v: 'mapped' }, { label: `Raw JSON (${rawCount})`, v: 'raw' }].map(tab => (
          <button key={tab.v} onClick={() => setFilter(tab.v as any)} style={{ padding: '8px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontFamily: FB, fontSize: 13, fontWeight: 500, background: filter === tab.v ? C.bgInfo : C.neutral, color: filter === tab.v ? C.textInfo : C.text }}>
            {tab.label}
          </button>
        ))}
      </div>
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ background: C.surfaceSunken }}>
            {['Jira Field', 'Catalyst Column', 'Status'].map(h => <th key={h} style={TH}>{h}</th>)}
          </tr></thead>
          <tbody>
            {filtered.map((f, i) => (
              <tr key={f.jira} style={{ borderBottom: i < filtered.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                <td style={TD}>{f.jira}</td>
                <td style={{ ...TD, fontFamily: FC, fontSize: 12, color: C.textSubtle }}>{f.catalyst}</td>
                <td style={TD}><StatusPill>{f.mapped ? 'Mapped' : 'Raw JSON'}</StatusPill></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DatabaseSchemaTab() {
  return (
    <div style={{ marginTop: 20 }}>
      <SectionMessage appearance="information" title="Supabase Target Schema">
        <p style={{ fontFamily: FB, fontSize: 12 }}>All Jira work items land in <code style={{ fontFamily: FC }}>ph_issues</code> with <code style={{ fontFamily: FC }}>source='jira'</code>. Shown for transparency.</p>
      </SectionMessage>
      <div style={{ marginTop: 20, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ background: C.surfaceSunken }}>
            {['Entity', 'Table', 'Jira ID Column', 'Source Column'].map(h => <th key={h} style={TH}>{h}</th>)}
          </tr></thead>
          <tbody>
            {[
              { e: 'Work items', t: 'ph_issues', id: 'jira_issue_id', s: 'source' },
              { e: 'Comments', t: 'ph_comments', id: 'jira_comment_id', s: 'source' },
              { e: 'Projects', t: 'ph_jira_projects', id: 'project_key', s: '—' },
              { e: 'Connection', t: 'ph_jira_connection', id: '—', s: '—' },
            ].map((row, i, arr) => (
              <tr key={row.t} style={{ borderBottom: i < arr.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                <td style={TD}>{row.e}</td>
                <td style={{ ...TD, fontFamily: FC, fontSize: 12, color: C.textSubtle }}>{row.t}</td>
                <td style={{ ...TD, fontFamily: FC, fontSize: 12, color: C.textSubtle }}>{row.id}</td>
                <td style={{ ...TD, fontFamily: FC, fontSize: 12, color: C.textSubtle }}>{row.s}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BackupAndLogsTab({ syncLogs }: { syncLogs: any[] }) {
  return (
    <div style={{ marginTop: 20 }}>
      <h3 style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 12, fontFamily: FH }}>Sync History (last 20)</h3>
      {syncLogs.length === 0 ? (
        <SectionMessage appearance="information" title="No sync history"><p style={{ fontFamily: FB, fontSize: 12 }}>No syncs have run in this environment yet.</p></SectionMessage>
      ) : (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{ background: C.surfaceSunken }}>
              {['When', 'Type', 'Status', 'Records'].map(h => <th key={h} style={TH}>{h}</th>)}
            </tr></thead>
            <tbody>
              {syncLogs.map((log: any, i: number) => {
                const when = log.started_at ? formatDistanceToNow(new Date(log.started_at), { addSuffix: true }) : '—';
                return (
                  <tr key={log.id ?? i} style={{ borderBottom: i < syncLogs.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                    <td style={{ ...TD, fontSize: 12 }}>{when}</td>
                    <td style={TD}><StatusPill>{log.sync_type || 'sync'}</StatusPill></td>
                    <td style={TD}><StatusPill tone={log.status === 'error' || log.status === 'failed' ? 'danger' : 'neutral'}>{log.status}</StatusPill></td>
                    <td style={{ ...TD, fontSize: 12 }}>{log.issues_upserted ?? 0}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ProjectDetailModal({ projectKey, projects, onClose }: { projectKey: string | null; projects: any[]; onClose: () => void }) {
  const project = projects.find(p => p.key === projectKey);
  const { data: filters = [] } = useSyncFilters();
  const { data: allFieldMaps = [] } = useFieldMappings();
  const saveFilter = useSaveSyncFilterMutation();
  const saveFieldMap = useSaveFieldMappingMutation();
  const existing = filters.find(f => f.project_key === projectKey);

  const [dateMode, setDateMode] = useState('Year 2026');
  const [dateBasis, setDateBasis] = useState<'created' | 'updated'>('updated');
  const [types, setTypes] = useState<string[]>([]);
  const [fieldMap, setFieldMap] = useState<Record<string, string>>({});
  const [loadedFor, setLoadedFor] = useState<string | null>(null);

  // Hydrate form from the persisted rows when the modal opens for a project.
  if (projectKey && loadedFor !== projectKey) {
    setDateMode(existing ? lookbackToDateMode(existing.lookback_months) : 'Year 2026');
    setDateBasis((existing?.date_basis as 'created' | 'updated') ?? 'updated');
    setTypes(existing?.include_types ?? []);
    const fm: Record<string, string> = {};
    for (const m of allFieldMaps) if (m.project_key === projectKey) fm[m.target_column] = m.jira_field;
    setFieldMap(fm);
    setLoadedFor(projectKey);
  }

  const toggleType = (t: string) => setTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);

  const handleSave = async () => {
    if (!projectKey) return;
    await saveFilter.mutateAsync({
      project_key: projectKey,
      lookback_months: DATE_MODE_TO_LOOKBACK[dateMode] ?? 12,
      date_basis: dateBasis,
      include_types: types,
      include_statuses: existing?.include_statuses ?? [],
      sprint_release: existing?.sprint_release ?? [],
      module_target: existing?.module_target ?? project?.module_target ?? null,
    });
    // Persist only changed field mappings (empty value => delete).
    const prior: Record<string, string> = {};
    for (const m of allFieldMaps) if (m.project_key === projectKey) prior[m.target_column] = m.jira_field;
    for (const { value: target } of FIELD_MAP_TARGETS) {
      const next = (fieldMap[target] ?? '').trim();
      if (next !== (prior[target] ?? '')) {
        await saveFieldMap.mutateAsync({ project_key: projectKey, target_column: target, jira_field: next });
      }
    }
    setLoadedFor(null);
    onClose();
  };

  return (
    <ModalTransition>
      {projectKey && project && (
        <Modal onClose={() => { setLoadedFor(null); onClose(); }} width="large">
          <div style={{ padding: 24 }}>
            <h2 style={{ fontSize: 20, fontWeight: 600, color: C.text, margin: '0 0 4px 0', fontFamily: FH }}>
              {project.key} — {project.name}
            </h2>
            <p style={{ fontSize: 12, color: C.textSubtle, margin: '0 0 24px 0', fontFamily: FB }}>
              {project.issues_cached > 0 ? `${project.issues_cached.toLocaleString()} issues cached` : 'No issues cached'} · Target: {existing?.module_target || project.module_target || 'unmapped'}
            </p>
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: C.text, margin: '0 0 12px 0', fontFamily: FH }}>Date Filter</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                <div>
                  <label style={{ fontSize: 12, color: C.textSubtle, display: 'block', marginBottom: 4, fontFamily: FB }}>Date Mode</label>
                  <select value={dateMode} onChange={e => setDateMode(e.target.value)} style={{ width: '100%', padding: 8, borderRadius: 4, border: `1px solid ${C.border}`, fontSize: 13, fontFamily: FB }}>
                    <option>Last 30 days</option><option>Year 2026</option><option>All time</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: C.textSubtle, display: 'block', marginBottom: 4, fontFamily: FB }}>Date Basis</label>
                  <select value={dateBasis} onChange={e => setDateBasis(e.target.value as 'created' | 'updated')} style={{ width: '100%', padding: 8, borderRadius: 4, border: `1px solid ${C.border}`, fontSize: 13, fontFamily: FB }}>
                    <option value="created">Created date</option><option value="updated">Updated date</option>
                  </select>
                </div>
              </div>
              <p style={{ fontSize: 11, color: C.textSubtlest, margin: '8px 0 0 0', fontFamily: FB }}>
                Sync always floors to 2026 (data-integrity guard). Date Mode narrows the window within it.
              </p>
            </div>
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: C.text, margin: '0 0 12px 0', fontFamily: FH }}>Issue Types</h3>
              <p style={{ fontSize: 11, color: C.textSubtlest, margin: '0 0 8px 0', fontFamily: FB }}>None selected = all types.</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {SYNC_ISSUE_TYPES.map(t => (
                  <label key={t} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: types.includes(t) ? C.bgInfo : C.neutral, borderRadius: 6, cursor: 'pointer', fontSize: 12, fontFamily: FB }}>
                    <input type="checkbox" checked={types.includes(t)} onChange={() => toggleType(t)} />
                    {t}
                  </label>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: C.text, margin: '0 0 4px 0', fontFamily: FH }}>Field Mapping</h3>
              <p style={{ fontSize: 11, color: C.textSubtlest, margin: '0 0 12px 0', fontFamily: FB }}>
                Override which Jira field feeds each column for this project. Blank = engine default. Use the Jira field id (e.g. <code style={{ fontFamily: FC }}>priority</code>, <code style={{ fontFamily: FC }}>customfield_10125</code>, <code style={{ fontFamily: FC }}>duedate</code>).
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.4fr)', gap: '8px 16px', alignItems: 'center' }}>
                {FIELD_MAP_TARGETS.map(({ value, label }) => (
                  <Fragment key={value}>
                    <label htmlFor={`fm-${value}`} style={{ fontSize: 12, color: C.text, fontFamily: FB }}>
                      {label} <code style={{ fontSize: 10, fontFamily: FC, color: C.textSubtlest }}>({value})</code>
                    </label>
                    <input
                      id={`fm-${value}`}
                      value={fieldMap[value] ?? ''}
                      onChange={e => setFieldMap(prev => ({ ...prev, [value]: e.target.value }))}
                      placeholder="default"
                      style={{ width: '100%', padding: '6px 8px', borderRadius: 4, border: `1px solid ${C.border}`, fontSize: 12, fontFamily: FC, color: C.text, background: C.surface }}
                    />
                  </Fragment>
                ))}
              </div>
            </div>
            {(saveFilter.isError || saveFieldMap.isError) && (
              <SectionMessage appearance="error"><p style={{ fontFamily: FB, fontSize: 12 }}>{(saveFilter.error || saveFieldMap.error) instanceof Error ? ((saveFilter.error || saveFieldMap.error) as Error).message : 'Save failed'}</p></SectionMessage>
            )}
            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              <Button appearance="primary" isDisabled={saveFilter.isPending || saveFieldMap.isPending} onClick={handleSave}>{saveFilter.isPending || saveFieldMap.isPending ? 'Saving…' : 'Save'}</Button>
              <Button appearance="subtle" onClick={() => { setLoadedFor(null); onClose(); }}>Cancel</Button>
            </div>
          </div>
        </Modal>
      )}
    </ModalTransition>
  );
}

function RefreshDataModal({ isOpen, env, enabledProjects, onClose }: { isOpen: boolean; env: any; enabledProjects: any[]; onClose: () => void }) {
  const refreshData = useRefreshDataMutation();
  const [confirmPhrase, setConfirmPhrase] = useState('');
  const requiredPhrase = env.isProductionRuntime ? 'REFRESH PRODUCTION JIRA DATA' : 'REFRESH STAGING JIRA DATA';
  const canConfirm = confirmPhrase === requiredPhrase && enabledProjects.length > 0;
  const totalRecords = enabledProjects.reduce((sum, p) => sum + (p.issues_cached || 0), 0);

  const handleConfirm = async () => {
    await refreshData.mutateAsync({
      projectKeys: enabledProjects.map(p => p.key),
      confirmationPhrase: confirmPhrase,
      mode: 'confirmed',
    });
    onClose();
  };

  return (
    <ModalTransition>
      {isOpen && (
        <Modal onClose={onClose} width="large">
          <div style={{ padding: 24 }}>
            <h2 style={{ fontSize: 20, fontWeight: 600, color: C.textDanger, margin: '0 0 16px 0', fontFamily: FH }}>⚠ Refresh Data</h2>
            <p style={{ fontSize: 14, color: C.text, margin: '0 0 20px 0', fontFamily: FB }}>
              Deletes existing Jira-imported rows and reloads from Jira using each project's filters. Catalyst-native records preserved.
            </p>
            <div style={{ background: C.bgDanger, border: `1px solid ${C.textDanger}`, borderRadius: 8, padding: 16, marginBottom: 24 }}>
              <div style={{ fontSize: 12, color: C.textDanger, fontFamily: FB }}>
                <strong>⚠ Cannot be undone.</strong> Affects {enabledProjects.length} synced project(s): {enabledProjects.map(p => p.key).join(', ') || 'none'} — {totalRecords.toLocaleString()} Jira-origin records.
              </div>
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: C.text, display: 'block', marginBottom: 8, fontFamily: FB }}>
                Type to confirm: <code style={{ fontFamily: FC }}>{requiredPhrase}</code>
              </label>
              <input type="text" value={confirmPhrase} onChange={e => setConfirmPhrase(e.target.value)} placeholder="Type confirmation phrase"
                style={{ width: '100%', padding: '8px 12px', borderRadius: 4, border: `1px solid ${C.border}`, fontSize: 13, fontFamily: FC }} />
            </div>
            {refreshData.isError && (
              <SectionMessage appearance="error"><p style={{ fontFamily: FB, fontSize: 12 }}>{refreshData.error instanceof Error ? refreshData.error.message : 'Refresh failed'}</p></SectionMessage>
            )}
            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              <Button appearance="danger" isDisabled={!canConfirm || refreshData.isPending} onClick={handleConfirm}>
                {refreshData.isPending ? 'Refreshing…' : 'Confirm Refresh'}
              </Button>
              <Button appearance="subtle" onClick={onClose}>Cancel</Button>
            </div>
          </div>
        </Modal>
      )}
    </ModalTransition>
  );
}
