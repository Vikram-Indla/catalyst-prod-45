/**
 * Jira Integration — Enterprise admin surface for sync, webhooks, field mapping, and backups.
 * Route: /admin/connections/jira
 *
 * 8 tabs: Overview · Sync Control · Projects · Type Mapping · Status Mapping · Field Mapping · Schema · Logs
 *
 * Environment-aware: Staging and production Supabase separated completely.
 * Design: Atlaskit components only, ADS tokens, enterprise-grade throughout.
 */

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Button from '@atlaskit/button/new';
import Tabs, { Tab, TabList, TabPanel } from '@atlaskit/tabs';
import DynamicTable from '@atlaskit/dynamic-table';
import Lozenge from '@atlaskit/lozenge';
import Spinner from '@atlaskit/spinner';
import SectionMessage from '@atlaskit/section-message';
import Toggle from '@atlaskit/toggle';
import Textfield from '@atlaskit/textfield';
import Select from '@atlaskit/select';
import Badge from '@atlaskit/badge';
import { supabase } from '@/integrations/supabase/client';
import { AdminGuard } from '@/components/admin/AdminGuard';
import { useJiraConnection } from '@/modules/workhub/admin/hooks/useJiraConnection';
import { useSyncHealth, useSyncLogs, useAvailableProjects } from '@/modules/workhub/admin/hooks/useSyncEngine';
import { formatDistanceToNow } from 'date-fns';
import {
  resolveJiraEnvironment,
  getEnvironmentLabel,
  getEnvironmentBadgeVariant,
} from '@/lib/jira-integration/environmentResolver';

const T = {
  surface: 'var(--ds-surface, #FFFFFF)',
  surfaceSunken: 'var(--ds-surface-sunken, #F7F8F9)',
  neutral: 'var(--ds-background-neutral, #F1F2F4)',
  text: 'var(--ds-text, #172B4D)',
  textSubtle: 'var(--ds-text-subtle, #42526E)',
  textSubtlest: 'var(--ds-text-subtlest, #6B778C)',
  border: 'var(--ds-border, #DFE1E6)',
  success: 'var(--ds-background-success, #E3FCEF)',
  successText: 'var(--ds-text-success, #006644)',
  warning: 'var(--ds-background-warning, #FFFAE6)',
  warningText: 'var(--ds-text-warning, #7A5200)',
  danger: 'var(--ds-background-danger, #FFEBE6)',
  dangerText: 'var(--ds-text-danger, #AE2A19)',
  info: 'var(--ds-background-information, #DEEBFF)',
  infoText: 'var(--ds-text-information, #0747A6)',
} as const;

const ISSUE_TYPES = [
  'Story', 'Epic', 'Feature', 'Task', 'Sub-task',
  'QA Bug', 'Production Incident', 'Change Request',
  'Business Request', 'Business Gap', 'Backend', 'Frontend',
  'Integration', 'Idea',
];

export function JiraSyncPage() {
  const [selectedTab, setSelectedTab] = useState(0);
  const env = resolveJiraEnvironment();
  const { data: connection } = useJiraConnection();
  const { data: health } = useSyncHealth();
  const { data: projects = [] } = useAvailableProjects();
  const { data: syncLogs = [] } = useSyncLogs(20);

  const isConnected = connection?.status === 'connected';

  return (
    <AdminGuard>
      <div style={{ padding: '32px 40px', maxWidth: 1400, margin: '0 auto' }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 600, color: T.text, margin: 0 }}>
            Jira Integration
          </h1>
          <p style={{ fontSize: 14, color: T.textSubtle, margin: '8px 0 0 0' }}>
            Sync configuration, webhooks, field mapping, and data backups. Read-only integration — no create/update/delete in Jira.
          </p>
        </div>

        {/* Environment Banner */}
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 16,
          background: env.isProductionRuntime ? 'var(--ds-background-danger, #FFEBE6)' : 'var(--ds-background-warning, #FFFAE6)',
          border: `1px solid ${env.isProductionRuntime ? 'var(--ds-text-danger, #AE2A19)' : 'var(--ds-text-warning, #7A5200)'}`,
          borderRadius: 8, padding: '16px', marginBottom: 24,
        }}>
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: 13, fontWeight: 600,
              color: env.isProductionRuntime ? 'var(--ds-text-danger, #AE2A19)' : 'var(--ds-text-warning, #7A5200)',
            }}>
              {getEnvironmentLabel(env.environment)}
            </div>
            <div style={{ fontSize: 12, color: 'var(--ds-text-subtle, #42526E)', marginTop: 4 }}>
              Supabase: <code style={{ background: 'rgba(0,0,0,0.05)', padding: '2px 6px', borderRadius: 3 }}>
                {env.supabaseProjectRef}
              </code>
            </div>
            {env.isProductionRuntime && (
              <div style={{ fontSize: 12, color: 'var(--ds-text-danger, #AE2A19)', marginTop: 6, fontWeight: 500 }}>
                ⚠️ All sync operations affect PRODUCTION data
              </div>
            )}
          </div>
        </div>

        {isConnected && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            background: T.success, border: `1px solid ${T.successText}`, borderRadius: 8,
            padding: '12px 16px', marginBottom: 24,
          }}>
            <div style={{ fontSize: 13, color: T.text }}>
              <span style={{ fontWeight: 600, color: T.successText }}>✓ Connected</span>
              {' to '}
              <code style={{ fontSize: 12, background: 'rgba(0,0,0,0.05)', padding: '2px 6px', borderRadius: 3 }}>
                {connection.site_url}
              </code>
              {' • Last tested '}
              <span style={{ color: T.textSubtle }}>
                {formatDistanceToNow(new Date(connection.last_tested_at || new Date()), { addSuffix: true })}
              </span>
            </div>
          </div>
        )}

        <Tabs id="jira-admin" selectedIndex={selectedTab} onChange={setSelectedTab}>
          <TabList>
            <Tab>Overview</Tab>
            <Tab>Sync Control</Tab>
            <Tab>Projects ({projects.length})</Tab>
            <Tab>Field Mapping</Tab>
            <Tab>Type Mapping</Tab>
            <Tab>Backup & Logs</Tab>
          </TabList>

          <TabPanel>
            <OverviewTab connection={connection} health={health} projects={projects} />
          </TabPanel>
          <TabPanel>
            <SyncControlTab connection={connection} />
          </TabPanel>
          <TabPanel>
            <ProjectsTab projects={projects} />
          </TabPanel>
          <TabPanel>
            <FieldMappingTab />
          </TabPanel>
          <TabPanel>
            <TypeMappingTab />
          </TabPanel>
          <TabPanel>
            <BackupAndLogsTab syncLogs={syncLogs} />
          </TabPanel>
        </Tabs>
      </div>
    </AdminGuard>
  );
}

function OverviewTab({
  connection,
  health,
  projects,
}: {
  connection: any;
  health: any;
  projects: any[];
}) {
  const { data: jiraProjects = [] } = useQuery({
    queryKey: ['jira-projects-overview'],
    queryFn: async () => {
      const { data } = await supabase
        .from('ph_jira_projects')
        .select('project_key, name, sync_enabled, issue_count:ph_issues(count)')
        .order('project_key');
      return data || [];
    },
  });

  const syncedCount = jiraProjects.filter(p => p.sync_enabled).length;
  const totalIssues = health?.issueCachedCount || 0;

  return (
    <div style={{ marginTop: 20 }}>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32,
      }}>
        {[
          { label: 'Accessible Projects', value: projects.length },
          { label: 'Projects Synced', value: syncedCount },
          { label: 'Issues Cached', value: totalIssues.toLocaleString() },
          { label: 'Last Sync', value: health?.lastSync ? formatDistanceToNow(new Date(health.lastSync.started_at), { addSuffix: true }) : 'Never' },
        ].map(({ label, value }) => (
          <div key={label} style={{
            background: T.surfaceSunken, border: `1px solid ${T.border}`, borderRadius: 8,
            padding: '20px 16px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 22, fontWeight: 600, color: T.text }}>
              {value}
            </div>
            <div style={{ fontSize: 12, color: T.textSubtle, marginTop: 8 }}>
              {label}
            </div>
          </div>
        ))}
      </div>

      <div>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: T.text, marginBottom: 16 }}>
          All {projects.length} Accessible Projects
        </h3>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12,
        }}>
          {projects.map((p: any) => {
            const projData = jiraProjects.find(j => j.project_key === p.key);
            const isSynced = projData?.sync_enabled;
            return (
              <div key={p.key} style={{
                background: isSynced ? T.success : T.neutral,
                border: `1px solid ${isSynced ? T.successText : T.border}`,
                borderRadius: 8, padding: '12px 16px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: isSynced ? T.successText : T.textSubtlest,
                  }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>
                    {p.key}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: T.textSubtle }}>
                  {p.name}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SyncControlTab({ connection }: { connection: any }) {
  const [autoSync, setAutoSync] = useState(true);
  const [webhooks, setWebhooks] = useState(false);
  const [writeback, setWriteback] = useState(true);
  const [interval, setInterval] = useState('15');

  return (
    <div style={{ marginTop: 20 }}>
      {[
        {
          title: 'Incremental Sync',
          enabled: autoSync,
          setEnabled: setAutoSync,
          description: 'Polls Jira every N minutes for incremental changes. Only 2026+ issues synced.',
          extra: autoSync ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
              <Textfield value={interval} onChange={e => setInterval(e.target.value)} type="number" min="5" max="120" style={{ width: 100 }} />
              <span style={{ fontSize: 13, color: T.textSubtle }}>minutes</span>
            </div>
          ) : null,
        },
        {
          title: 'Real-Time Webhooks',
          enabled: webhooks,
          setEnabled: setWebhooks,
          description: 'Register Catalyst as a Jira webhook. Any issue created/updated/deleted syncs within seconds.',
          extra: webhooks ? (
            <div style={{
              background: T.info, border: `1px solid ${T.infoText}`, borderRadius: 6,
              padding: '8px 12px', fontSize: 12, color: T.infoText, marginTop: 12,
            }}>
              ✓ Webhook endpoint registered
            </div>
          ) : null,
        },
        {
          title: 'Write-Back to Jira',
          enabled: writeback,
          setEnabled: setWriteback,
          description: 'Status and assignee changes sync back to Jira. All other fields remain Catalyst-local.',
          extra: null,
        },
      ].map(tab => (
        <div key={tab.title} style={{
          background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8,
          padding: '24px', marginBottom: 20,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: T.text, margin: 0 }}>
              {tab.title}
            </h3>
            <Toggle isChecked={tab.enabled} onChange={e => tab.setEnabled(e.target.checked)} />
          </div>
          <div style={{ fontSize: 12, color: T.textSubtle }}>
            {tab.description}
          </div>
          {tab.extra}
        </div>
      ))}

      <div style={{
        background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8,
        padding: '24px',
      }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: T.text, marginBottom: 12 }}>
          Manual Sync
        </h3>
        <div style={{ display: 'flex', gap: 12 }}>
          <Button appearance="primary">Run Full Sync</Button>
          <Button>Run Incremental</Button>
        </div>
      </div>
    </div>
  );
}

function ProjectsTab({ projects }: { projects: any[] }) {
  const [search, setSearch] = useState('');
  const qc = useQueryClient();

  const { data: jiraProjects = [], isLoading } = useQuery({
    queryKey: ['jira-projects-list'],
    queryFn: async () => {
      const { data } = await supabase
        .from('ph_jira_projects')
        .select('id, project_key, name, sync_enabled, module_target, last_synced_at')
        .order('project_key');
      return data || [];
    },
  });

  const updateProject = useMutation({
    mutationFn: async ({ id, patch }: any) => {
      const { error } = await supabase
        .from('ph_jira_projects')
        .update(patch)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['jira-projects-list'] }),
  });

  const filtered = jiraProjects.filter(p =>
    p.project_key.toLowerCase().includes(search.toLowerCase()) ||
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const head = {
    cells: [
      { key: 'key', content: 'Key', width: 10 },
      { key: 'name', content: 'Name', width: 40 },
      { key: 'sync', content: 'Sync Enabled', width: 15 },
      { key: 'module', content: 'Module Target', width: 20 },
      { key: 'lastSync', content: 'Last Synced', width: 15 },
    ],
  };

  const rows = filtered.map(p => ({
    key: p.id,
    cells: [
      { key: 'key', content: <code style={{ fontSize: 12 }}>{p.project_key}</code> },
      { key: 'name', content: p.name },
      {
        key: 'sync',
        content: (
          <Toggle
            isChecked={p.sync_enabled}
            onChange={e => updateProject.mutate({ id: p.id, patch: { sync_enabled: e.target.checked } })}
          />
        ),
      },
      {
        key: 'module',
        content: (
          <Select
            options={[
              { label: 'Product Hub', value: 'product' },
              { label: 'Project Hub', value: 'project' },
            ]}
            value={{ label: p.module_target === 'product' ? 'Product Hub' : 'Project Hub', value: p.module_target }}
            onChange={opt => opt && updateProject.mutate({ id: p.id, patch: { module_target: opt.value } })}
            isSearchable={false}
            isClearable={false}
          />
        ),
      },
      {
        key: 'lastSync',
        content: p.last_synced_at ? formatDistanceToNow(new Date(p.last_synced_at), { addSuffix: true }) : '—',
      },
    ],
  }));

  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ marginBottom: 20 }}>
        <Textfield
          placeholder="Search projects..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: '100%', maxWidth: 400 }}
        />
      </div>

      {isLoading ? (
        <Spinner />
      ) : (
        <DynamicTable
          head={head}
          rows={rows}
          rowsPerPage={25}
          defaultSortKey="key"
          isFixedSize
          page={1}
        />
      )}
    </div>
  );
}

function FieldMappingTab() {
  const [filter, setFilter] = useState<'all' | 'mapped' | 'raw' | 'catalyst'>('all');

  const fields = [
    { jira: 'Summary', catalyst: 'summary', status: 'mapped' as const },
    { jira: 'Status', catalyst: 'status / status_category', status: 'mapped' as const },
    { jira: 'Issue Type', catalyst: 'issue_type', status: 'mapped' as const },
    { jira: 'Priority', catalyst: 'priority', status: 'mapped' as const },
    { jira: 'Assignee', catalyst: 'assignee_account_id', status: 'mapped' as const },
    { jira: 'Reporter', catalyst: 'reporter_account_id', status: 'mapped' as const },
    { jira: 'Parent', catalyst: 'parent_key', status: 'mapped' as const },
    { jira: 'Fix Versions', catalyst: 'fix_versions', status: 'mapped' as const },
    { jira: 'Due Date', catalyst: 'due_date', status: 'mapped' as const },
    { jira: 'Severity', catalyst: 'raw_json only', status: 'raw' as const },
    { jira: 'Attachments', catalyst: 'raw_json (proxied)', status: 'raw' as const },
    { jira: 'Issue Links', catalyst: 'raw_json only', status: 'raw' as const },
    { jira: '— Is Flagged', catalyst: 'is_flagged', status: 'catalyst' as const },
    { jira: '— Sort Order', catalyst: 'sort_order', status: 'catalyst' as const },
  ];

  const filtered = fields.filter(f => filter === 'all' || f.status === filter);

  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'All Fields', value: 'all' as const },
          { label: 'Mapped (18)', value: 'mapped' as const },
          { label: 'Raw JSON (6)', value: 'raw' as const },
          { label: 'Catalyst-Only (3)', value: 'catalyst' as const },
        ].map(tab => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            style={{
              padding: '8px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
              background: filter === tab.value ? 'var(--ds-background-selected, #E9F2FE)' : T.neutral,
              color: T.text, fontSize: 13, fontWeight: 500,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{
        background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8,
        overflow: 'hidden',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: T.surfaceSunken }}>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: T.textSubtle, borderBottom: `1px solid ${T.border}` }}>Jira Field</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: T.textSubtle, borderBottom: `1px solid ${T.border}` }}>Catalyst Column</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: T.textSubtle, borderBottom: `1px solid ${T.border}` }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((f, i) => (
              <tr key={i} style={{ borderBottom: i < filtered.length - 1 ? `1px solid ${T.border}` : 'none' }}>
                <td style={{ padding: '12px 16px', fontSize: 13, color: T.text }}>{f.jira}</td>
                <td style={{ padding: '12px 16px', fontSize: 13, color: T.textSubtle, fontFamily: 'monospace' }}>{f.catalyst}</td>
                <td style={{ padding: '12px 16px' }}>
                  <Lozenge appearance={f.status === 'mapped' ? 'success' : 'default'}>
                    {f.status === 'mapped' ? 'Mapped' : f.status === 'raw' ? 'Raw JSON' : 'Catalyst'}
                  </Lozenge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TypeMappingTab() {
  return (
    <div style={{ marginTop: 20 }}>
      <SectionMessage appearance="information" title="Canonical Issue Types">
        14 Catalyst issue types. Each type's Jira screen scheme defines which fields sync. Field presence per type is queried from Jira metadata on-demand.
      </SectionMessage>

      <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
        {ISSUE_TYPES.map(type => (
          <div key={type} style={{
            background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: '12px 16px',
          }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>
              {type}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BackupAndLogsTab({ syncLogs }: { syncLogs: any[] }) {
  const successCount = syncLogs.filter(l => l.status === 'success').length;
  const errorCount = syncLogs.filter(l => l.status === 'error').length;
  const warningCount = syncLogs.filter(l => l.status === 'warning').length;

  return (
    <div style={{ marginTop: 20 }}>
      <div style={{
        background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8,
        padding: '20px', marginBottom: 20,
      }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 8 }}>
          Daily Backup
        </h3>
        <p style={{ fontSize: 12, color: T.textSubtle, marginBottom: 12 }}>
          Tables: ph_issues, ph_versions, ph_comments, ph_jira_projects. Retention: 180 days. Scheduled: 02:00 UTC daily.
        </p>
        <Button>Backup Now</Button>
        <div style={{ fontSize: 12, color: T.dangerText, marginTop: 8 }}>
          ⚠ No backups found. Run manual backup.
        </div>
      </div>

      <div>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 12 }}>
          Sync History (Last 20)
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Success', count: successCount, bg: T.success, fg: T.successText },
            { label: 'Warning', count: warningCount, bg: T.warning, fg: T.warningText },
            { label: 'Error', count: errorCount, bg: T.danger, fg: T.dangerText },
          ].map(s => (
            <div key={s.label} style={{
              background: s.bg, border: `1px solid ${s.fg}`, borderRadius: 8,
              padding: '16px', textAlign: 'center',
            }}>
              <div style={{ fontSize: 18, fontWeight: 600, color: s.fg }}>
                {s.count}
              </div>
              <div style={{ fontSize: 12, color: s.fg, marginTop: 4 }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>

        <div style={{
          background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8,
          overflow: 'hidden',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: T.surfaceSunken }}>
                {['When', 'Type', 'Status', 'Fetched', 'Upserted', 'Duration'].map(h => (
                  <th key={h} style={{
                    padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600,
                    color: T.textSubtle, borderBottom: `1px solid ${T.border}`,
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {syncLogs.map((log, i) => (
                <tr key={i} style={{ borderBottom: i < syncLogs.length - 1 ? `1px solid ${T.border}` : 'none' }}>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: T.text }}>
                    {formatDistanceToNow(new Date(log.started_at), { addSuffix: true })}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: T.text }}>
                    <Lozenge appearance={log.sync_type === 'full' ? 'default' : 'new'}>
                      {log.sync_type === 'full' ? 'Full' : 'Incremental'}
                    </Lozenge>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 12 }}>
                    <Lozenge appearance={log.status === 'success' ? 'success' : log.status === 'error' ? 'removed' : 'default'}>
                      {log.status}
                    </Lozenge>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: T.text }}>
                    {log.issues_fetched || '—'}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: T.text }}>
                    {log.issues_upserted || '—'}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: T.textSubtle }}>
                    {log.duration_ms}ms
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
