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

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Button from '@atlaskit/button/new';
import Tabs, { Tab, TabList, TabPanel } from '@atlaskit/tabs';
import Lozenge from '@atlaskit/lozenge';
import SectionMessage from '@atlaskit/section-message';
import Textfield from '@atlaskit/textfield';
import Spinner from '@atlaskit/spinner';
import Modal, { ModalTransition } from '@atlaskit/modal-dialog';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { supabase } from '@/integrations/supabase/client';
import { AdminGuard } from '@/components/admin/AdminGuard';
import { useJiraConnection, useUpdateJiraConnection, useTestConnection } from '@/modules/workhub/admin/hooks/useJiraConnection';
import { useSyncHealth, useSyncLogs, useAvailableProjects } from '@/modules/workhub/admin/hooks/useSyncEngine';
import { formatDistanceToNow } from 'date-fns';
import { resolveJiraEnvironment, getEnvironmentLabel } from '@/lib/jira-integration/environmentResolver';
import { useManualSyncMutation, useRefreshDataMutation } from '@/lib/jira-integration/useJiraSyncMutations';

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

// Canonical Jira → Catalyst type mapping (convention; both render via JiraIssueTypeIcon)
const TYPE_MAP: Array<{ jira: string; catalyst: string }> = [
  { jira: 'Epic', catalyst: 'Epic' },
  { jira: 'Story', catalyst: 'Story' },
  { jira: 'Task', catalyst: 'Task' },
  { jira: 'Sub-task', catalyst: 'Sub-task' },
  { jira: 'Bug', catalyst: 'QA Bug' },
  { jira: 'Change Request', catalyst: 'Change Request' },
  { jira: 'Incident', catalyst: 'Production Incident' },
];

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
  const { data: syncLogs = [] } = useSyncLogs(20);

  // Backend readiness (spec §11/§17) — authoritative when reachable.
  const { data: backendReadiness } = useQuery({
    queryKey: ['jira-sync-readiness', env.environment],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('jira-sync-readiness');
      if (error) return null;
      return data as { readiness: Readiness; allowedActions: Record<string, boolean>; reasons: string[] } | null;
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

  const projects = Array.from(allKeys).sort().map((key) => {
    const ap = accessibleProjects.find((p: any) => p.key === key);
    const sp = syncProjects.find((s: any) => s.project_key === key);
    const cfg = (sp?.sync_config && typeof sp.sync_config === 'object') ? sp.sync_config as any : {};
    const cached = issueCounts[key] || 0;
    return {
      key,
      name: ap?.name || sp?.name || key,
      // A project is effectively synced if it has cached jira data OR config marks it active.
      sync_enabled: cached > 0 || (sp?.is_active ?? false),
      module_target: cfg.module_target ?? null,
      last_synced_at: sp?.last_synced_at ?? null,
      issues_cached: cached,
    };
  });

  const isConnected = connection?.status === 'connected';
  const enabledProjects = projects.filter(p => p.sync_enabled);
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
            background: isConnected ? C.bgSuccess : C.neutral,
            border: `1px solid ${isConnected ? C.textSuccess : C.border}`,
          }}>
            <span style={{ fontWeight: 600, fontFamily: FB, color: isConnected ? C.textSuccess : C.textSubtle }}>
              {isConnected ? '✓ Connected' : 'Not configured'}
            </span>
            {connection?.site_url && (
              <code style={{ fontSize: 12, fontFamily: FC, background: C.neutral, padding: '2px 6px', borderRadius: 3 }}>
                {connection.site_url}
              </code>
            )}
            {connection?.last_tested_at && (
              <span style={{ color: C.textSubtle, marginLeft: 'auto', fontSize: 12, fontFamily: FB }}>
                Last tested {formatDistanceToNow(new Date(connection.last_tested_at), { addSuffix: true })}
              </span>
            )}
          </div>
        )}

        <Tabs id="jira-admin" selectedIndex={selectedTab} onChange={setSelectedTab}>
          <TabList>
            <Tab>Connection</Tab>
            <Tab>Overview</Tab>
            <Tab>Sync Control</Tab>
            <Tab>Projects ({projects.length})</Tab>
            <Tab>Type Mapping</Tab>
            <Tab>Status Mapping</Tab>
            <Tab>Field Mapping</Tab>
            <Tab>Database Schema</Tab>
            <Tab>Backup & Logs</Tab>
          </TabList>

          <TabPanel>
            <ConnectionTab connection={connection} health={health} env={env} />
          </TabPanel>
          <TabPanel>
            <OverviewTab projects={projects} health={health} readiness={readiness} isConnected={isConnected} totalJiraIssues={totalJiraIssues} env={env} onConfigure={() => setSelectedTab(0)} />
          </TabPanel>
          <TabPanel>
            <SyncControlTab readiness={readiness} isConnected={isConnected} syncAllowed={syncAllowed} env={env} onRefreshClick={() => setRefreshOpen(true)} onConfigure={() => setSelectedTab(0)} />
          </TabPanel>
          <TabPanel>
            <ProjectsTab projects={projects} onManage={setProjectDetailKey} />
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

function ConnectionTab({ connection, health, env }: any) {
  const testConn = useTestConnection();
  const saveConn = useUpdateJiraConnection();
  const isConnected = connection?.status === 'connected';
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ site_url: connection?.site_url || '', auth_email: connection?.auth_email || '', auth_token: '' });

  const rows: Array<[string, string]> = [
    ['Status', isConnected ? 'Connected' : (connection?.status || 'Not configured')],
    ['Site URL', connection?.site_url || '—'],
    ['Auth email', connection?.auth_email || '—'],
    ['Auth method', connection?.auth_method || '—'],
    ['Accessible projects', String(connection?.project_count ?? '—')],
    ['Issues cached', (health?.issueCachedCount ?? 0).toLocaleString()],
    ['Last tested', connection?.last_tested_at ? formatDistanceToNow(new Date(connection.last_tested_at), { addSuffix: true }) : 'Never'],
  ];

  return (
    <div style={{ marginTop: 20 }}>
      {/* Status card */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: 24, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: isConnected ? C.textSuccess : C.textSubtlest }} />
          <h3 style={{ fontSize: 16, fontWeight: 600, color: C.text, margin: 0, fontFamily: FH }}>
            {isConnected ? 'Connected to Jira' : 'Jira not configured'}
          </h3>
          <Lozenge appearance={isConnected ? 'success' : 'default'}>{getEnvironmentLabel(env.environment)}</Lozenge>
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
          <Button appearance="primary" isDisabled={!isConnected || testConn.isPending} onClick={() => testConn.mutate()}>
            {testConn.isPending ? 'Testing…' : 'Test Connection'}
          </Button>
          <Button onClick={() => setEditing(e => !e)}>{editing ? 'Cancel' : isConnected ? 'Reconfigure' : 'Configure'}</Button>
        </div>

        {testConn.isSuccess && (
          <SectionMessage appearance="success" style={{ marginTop: 16 }}><p style={{ fontFamily: FB, fontSize: 12 }}>Connection test passed.</p></SectionMessage>
        )}
        {testConn.isError && (
          <SectionMessage appearance="error" style={{ marginTop: 16 }}><p style={{ fontFamily: FB, fontSize: 12 }}>{testConn.error instanceof Error ? testConn.error.message : 'Test failed'}</p></SectionMessage>
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

function OverviewTab({ projects, health, readiness, isConnected, totalJiraIssues, env, onConfigure }: any) {
  const r = READINESS_LABEL[readiness as Readiness];
  const syncedCount = isConnected ? projects.filter((p: any) => p.sync_enabled).length : 0;
  const lastSync = health?.lastSync?.started_at
    ? formatDistanceToNow(new Date(health.lastSync.started_at), { addSuffix: true })
    : 'Never';
  // Cached count is only meaningful when connected. When not, it is stale cache — label it so.
  const cachedLabel = isConnected ? 'Issues Cached' : 'Issues Cached (stale)';

  return (
    <div style={{ marginTop: 20 }}>
      {/* Readiness — single source of truth; cannot show ready unless backend state says so */}
      <div style={{
        background: r.ok ? C.bgSuccess : C.bgDanger, border: `1px solid ${r.ok ? C.textSuccess : C.textDanger}`,
        borderRadius: 8, padding: 24, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 16,
      }}>
        <div style={{ fontSize: 32 }}>{r.ok ? '✓' : '⚠'}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 600, fontFamily: FB, color: r.ok ? C.textSuccess : C.textDanger }}>{r.title}</div>
          <div style={{ fontSize: 12, color: r.ok ? C.textSuccess : C.textDanger, marginTop: 4, fontFamily: FB }}>{r.detail}</div>
        </div>
        {!isConnected && <Button appearance="primary" onClick={onConfigure}>Configure</Button>}
      </div>

      {/* Metrics — honest. No "synced" when not connected. */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
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
      <h3 style={{ fontSize: 16, fontWeight: 600, color: C.text, marginBottom: 16, fontFamily: FH }}>Sync Scope</h3>
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
              {['Project', 'Catalyst Target', 'Sync', 'Issues Cached', 'Status'].map(h => <th key={h} style={TH}>{h}</th>)}
            </tr></thead>
            <tbody>
              {projects.map((p: any, i: number) => (
                <tr key={p.key} style={{ borderBottom: i < projects.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                  <td style={TD}><code style={{ fontSize: 11, fontFamily: FC, background: C.neutral, padding: '2px 6px', borderRadius: 3 }}>{p.key}</code> <span style={{ color: C.textSubtle }}>{p.name}</span></td>
                  <td style={{ ...TD, color: C.textSubtle }}>{p.module_target || '—'}</td>
                  <td style={TD}><Lozenge appearance={p.sync_enabled ? 'success' : 'default'}>{p.sync_enabled ? 'ON' : 'OFF'}</Lozenge></td>
                  <td style={TD}>{p.issues_cached > 0 ? p.issues_cached.toLocaleString() : '—'}</td>
                  <td style={TD}><Lozenge appearance={p.issues_cached > 0 ? 'success' : 'removed'}>{p.issues_cached > 0 ? 'Synced' : 'No data'}</Lozenge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SyncControlTab({ readiness, isConnected, syncAllowed, env, onRefreshClick, onConfigure }: any) {
  const manualSync = useManualSyncMutation();
  const r = READINESS_LABEL[readiness as Readiness];

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
        <h3 style={{ fontSize: 16, fontWeight: 600, color: C.text, margin: '0 0 12px 0', fontFamily: FH }}>Manual Sync</h3>
        <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
          <Button appearance="primary" isDisabled={!isConnected || !syncAllowed || manualSync.isPending} onClick={() => manualSync.mutate({ mode: 'full' })}>
            {manualSync.isPending ? 'Syncing…' : 'Run Full Sync'}
          </Button>
          <Button isDisabled={!isConnected || manualSync.isPending} onClick={() => manualSync.mutate({ mode: 'incremental' })}>Run Incremental</Button>
          <Button isDisabled={!isConnected || manualSync.isPending} onClick={() => manualSync.mutate({ mode: 'dry-run' })}>Dry Run</Button>
        </div>
        {manualSync.isSuccess && (
          <SectionMessage appearance="success">
            <p style={{ fontFamily: FB, fontSize: 12 }}>
              {manualSync.data?.estimatedCount != null
                ? `Dry run: ${manualSync.data.estimatedCount.toLocaleString()} records would sync`
                : `${manualSync.data?.recordsAdded ?? 0} records synced`}
            </p>
          </SectionMessage>
        )}
        {manualSync.isError && (
          <SectionMessage appearance="error"><p style={{ fontFamily: FB, fontSize: 12 }}>{manualSync.error instanceof Error ? manualSync.error.message : 'Sync failed'}</p></SectionMessage>
        )}
      </div>

      {/* Refresh data — destructive, blocked unless connected */}
      <div style={{ background: C.bgDanger, border: `1px solid ${C.textDanger}`, borderRadius: 8, padding: 24, opacity: isConnected ? 1 : 0.6 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: C.textDanger, margin: '0 0 12px 0', fontFamily: FH }}>⚠ Refresh Data</h3>
        <p style={{ fontSize: 12, color: C.textDanger, margin: '0 0 16px 0', fontFamily: FB }}>
          Delete Jira-origin rows and reload fresh from Jira. Catalyst-native records preserved. Cannot be undone.
        </p>
        <Button appearance="danger" isDisabled={!isConnected} onClick={onRefreshClick}>Refresh Data…</Button>
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
              {['Key', 'Name', 'Sync', 'Catalyst Target', 'Issues Cached', 'Manage', 'Status'].map(h => <th key={h} style={TH}>{h}</th>)}
            </tr></thead>
            <tbody>
              {filtered.map((p: any, i: number) => (
                <tr key={p.key} style={{ borderBottom: i < filtered.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                  <td style={TD}><code style={{ fontSize: 11, fontFamily: FC, background: C.neutral, padding: '2px 6px', borderRadius: 3 }}>{p.key}</code></td>
                  <td style={TD}>{p.name}</td>
                  <td style={TD}><Lozenge appearance={p.sync_enabled ? 'success' : 'default'}>{p.sync_enabled ? 'ON' : 'OFF'}</Lozenge></td>
                  <td style={{ ...TD, color: C.textSubtle }}>{p.module_target || '—'}</td>
                  <td style={TD}>{p.issues_cached > 0 ? p.issues_cached.toLocaleString() : '—'}</td>
                  <td style={TD}><Button appearance="subtle" onClick={() => onManage(p.key)}>Manage</Button></td>
                  <td style={TD}><Lozenge appearance={p.issues_cached > 0 ? 'success' : 'removed'}>{p.issues_cached > 0 ? 'Synced' : 'No data'}</Lozenge></td>
                </tr>
              ))}
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
        <p style={{ fontFamily: FB, fontSize: 12 }}>Jira issue types map to Catalyst work item types. All land in <code style={{ fontFamily: FC }}>ph_issues</code>; the type drives icon, hierarchy, and field availability.</p>
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
                <td style={{ ...TD, fontFamily: FC, fontSize: 12, color: C.textSubtle }}>ph_issues</td>
                <td style={TD}><Lozenge appearance="success">Mapped</Lozenge></td>
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
                <td style={TD}><Lozenge appearance={s.terminal ? 'success' : 'default'}>{s.terminal ? 'Yes' : 'No'}</Lozenge></td>
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
                <td style={TD}><Lozenge appearance={f.mapped ? 'success' : 'default'}>{f.mapped ? 'Mapped' : 'Raw JSON'}</Lozenge></td>
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
                    <td style={TD}><Lozenge appearance="default">{log.sync_type || 'sync'}</Lozenge></td>
                    <td style={TD}><Lozenge appearance={log.status === 'success' ? 'success' : log.status === 'warning' ? 'moved' : 'removed'}>{log.status}</Lozenge></td>
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
  return (
    <ModalTransition>
      {projectKey && project && (
        <Modal onClose={onClose} width="large">
          <div style={{ padding: 24 }}>
            <h2 style={{ fontSize: 20, fontWeight: 600, color: C.text, margin: '0 0 4px 0', fontFamily: FH }}>
              {project.key} — {project.name}
            </h2>
            <p style={{ fontSize: 12, color: C.textSubtle, margin: '0 0 24px 0', fontFamily: FB }}>
              {project.issues_cached > 0 ? `${project.issues_cached.toLocaleString()} issues cached` : 'No issues cached'} · Target: {project.module_target || 'unmapped'}
            </p>
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: C.text, margin: '0 0 12px 0', fontFamily: FH }}>Date Filter</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                <div>
                  <label style={{ fontSize: 12, color: C.textSubtle, display: 'block', marginBottom: 4, fontFamily: FB }}>Date Mode</label>
                  <select style={{ width: '100%', padding: 8, borderRadius: 4, border: `1px solid ${C.border}`, fontSize: 13, fontFamily: FB }}>
                    <option>Last 30 days</option><option>All time</option><option>Year 2026</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: C.textSubtle, display: 'block', marginBottom: 4, fontFamily: FB }}>Date Basis</label>
                  <select style={{ width: '100%', padding: 8, borderRadius: 4, border: `1px solid ${C.border}`, fontSize: 13, fontFamily: FB }}>
                    <option>Created date</option><option>Updated date</option>
                  </select>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <Button appearance="primary" onClick={onClose}>Save Filters</Button>
              <Button appearance="subtle" onClick={onClose}>Cancel</Button>
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
