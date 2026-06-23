/**
 * Jira Integration Admin — Enterprise full-width sync, webhooks, field mapping, backups.
 * Route: /admin/connections/jira
 *
 * Persistent header with connection status + 6 tabs (Overview, Sync Control, Projects, Field Mapping, Type Mapping, Backup & Logs)
 * Environment-aware: Staging and production Supabase fully isolated.
 * Design: Atlaskit components only, full-width layout, ADS tokens.
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Button from '@atlaskit/button/new';
import Tabs, { Tab, TabList, TabPanel } from '@atlaskit/tabs';
import SectionMessage from '@atlaskit/section-message';
import Toggle from '@atlaskit/toggle';
import Textfield from '@atlaskit/textfield';
import Select from '@atlaskit/select';
import Lozenge from '@atlaskit/lozenge';
import Spinner from '@atlaskit/spinner';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { supabase } from '@/integrations/supabase/client';
import { AdminGuard } from '@/components/admin/AdminGuard';
import { useJiraConnection } from '@/modules/workhub/admin/hooks/useJiraConnection';
import { useSyncHealth, useSyncLogs, useAvailableProjects } from '@/modules/workhub/admin/hooks/useSyncEngine';
import { formatDistanceToNow } from 'date-fns';
import {
  resolveJiraEnvironment,
  getEnvironmentLabel,
} from '@/lib/jira-integration/environmentResolver';
import {
  useManualSyncMutation,
  useRefreshDataMutation,
  useWebhookToggleMutation,
} from '@/lib/jira-integration/useJiraSyncMutations';

const T = {
  surface: 'var(--ds-surface, #FFFFFF)',
  surfaceSunken: 'var(--ds-surface-sunken, #F7F8F9)',
  text: 'var(--ds-text, #172B4D)',
  textSubtle: 'var(--ds-text-subtle, #42526E)',
  border: 'var(--ds-border, #DFE1E6)',
  success: 'var(--ds-background-success, #E3FCEF)',
  successText: 'var(--ds-text-success, #006644)',
  danger: 'var(--ds-background-danger, #FFEBE6)',
  dangerText: 'var(--ds-text-danger, #AE2A19)',
  info: 'var(--ds-background-information, #DEEBFF)',
  infoText: 'var(--ds-text-information, #0747A6)',
} as const;

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
      {/* Full-width header */}
      <div style={{ background: T.surface, borderBottom: `1px solid ${T.border}`, padding: '24px 40px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24 }}>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontFamily: 'var(--ds-font-family-heading)', fontSize: 28, fontWeight: 600, color: T.text, margin: '0 0 8px 0' }}>
              Jira Integration
            </h1>
            <p style={{ fontFamily: 'var(--ds-font-family-body)', fontSize: 14, color: T.textSubtle, margin: 0 }}>
              Sync configuration, webhooks, field mapping, and backups. Read-only integration.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: T.surfaceSunken, borderRadius: 8, minWidth: 300 }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: isConnected ? T.successText : '#999',
            }} />
            <div>
              <div style={{ fontFamily: 'var(--ds-font-family-body)', fontSize: 12, fontWeight: 600, color: T.text }}>
                {isConnected ? '✓ Connected' : '✗ Disconnected'}
              </div>
              {isConnected && (
                <div style={{ fontFamily: 'var(--ds-font-family-body)', fontSize: 11, color: T.textSubtle }}>
                  {connection?.site_url}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Environment banner */}
      <div style={{ padding: '0 40px', paddingTop: 24 }}>
        <SectionMessage
          appearance={env.isProductionRuntime ? 'error' : 'information'}
          title={getEnvironmentLabel(env.environment)}
        >
          <div style={{ fontFamily: 'var(--ds-font-family-body)', fontSize: 13 }}>
            Project: <code style={{ fontFamily: 'var(--ds-font-family-code)', fontSize: 11 }}>{env.supabaseProjectRef}</code>
            {env.isProductionRuntime && (
              <div style={{ marginTop: 8, fontWeight: 500 }}>All operations affect PRODUCTION data</div>
            )}
          </div>
        </SectionMessage>
      </div>

      {/* Full-width tabs */}
      <div style={{ padding: '24px 40px' }}>
        <Tabs id="jira-admin" selectedIndex={selectedTab} onChange={setSelectedTab}>
          <TabList>
            <Tab>Overview</Tab>
            <Tab>Sync Control</Tab>
            <Tab>Projects ({projects.length})</Tab>
            <Tab>Type Mapping</Tab>
            <Tab>Backup & Logs</Tab>
          </TabList>

          <TabPanel>
            <OverviewTab connection={connection} health={health} projects={projects} />
          </TabPanel>
          <TabPanel>
            <SyncControlTab connection={connection} env={env} />
          </TabPanel>
          <TabPanel>
            <ProjectsTab projects={projects} />
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
        .select('project_key, name, sync_enabled')
        .order('project_key');
      return data || [];
    },
  });

  const syncedCount = jiraProjects.filter(p => p.sync_enabled).length;
  const totalIssues = health?.issueCachedCount || 0;

  const lastSyncStr = health?.lastSync?.started_at
    ? formatDistanceToNow(new Date(health.lastSync.started_at), { addSuffix: true })
    : 'Never';

  const stats = [
    { label: 'Accessible Projects', value: projects.length, color: T.info },
    { label: 'Projects Synced', value: syncedCount, color: T.success },
    { label: 'Issues Cached', value: totalIssues.toLocaleString(), color: T.infoText },
    { label: 'Last Sync', value: lastSyncStr, color: T.textSubtle },
  ];

  return (
    <div style={{ marginTop: 24 }}>
      {/* Stats grid — 2 columns compact */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 24 }}>
        {stats.map(({ label, value, color }) => (
          <div key={label} style={{
            background: T.surfaceSunken, border: `1px solid ${T.border}`, borderRadius: 8,
            padding: '16px 12px', textAlign: 'center',
          }}>
            <div style={{ fontFamily: 'var(--ds-font-family-body)', fontSize: 20, fontWeight: 600, color: T.text, marginBottom: 4 }}>
              {value}
            </div>
            <div style={{ fontFamily: 'var(--ds-font-family-body)', fontSize: 11, color: T.textSubtle }}>
              {label}
            </div>
          </div>
        ))}
      </div>

      {/* Synced projects list */}
      <div>
        <h3 style={{ fontFamily: 'var(--ds-font-family-heading)', fontSize: 16, fontWeight: 600, color: T.text, marginBottom: 12 }}>
          Sync Status ({syncedCount} of {projects.length})
        </h3>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12,
        }}>
          {projects.map((p: any) => {
            const proj = jiraProjects.find(j => j.project_key === p.key);
            const isSynced = proj?.sync_enabled;
            return (
              <div key={p.key} style={{
                background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: 16,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{
                    width: 10, height: 10, borderRadius: '50%',
                    background: isSynced ? T.successText : '#CCC',
                  }} />
                  <span style={{ fontFamily: 'var(--ds-font-family-body)', fontSize: 13, fontWeight: 600, color: T.text }}>
                    {p.key}
                  </span>
                </div>
                <div style={{ fontFamily: 'var(--ds-font-family-body)', fontSize: 12, color: T.textSubtle }}>
                  {p.name}
                </div>
                {isSynced && (
                  <Lozenge appearance="success" style={{ marginTop: 8 }}>Synced</Lozenge>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SyncControlTab({ connection, env }: { connection: any; env: any }) {
  const manualSync = useManualSyncMutation();
  const refreshData = useRefreshDataMutation();
  const [refreshMode, setRefreshMode] = useState<'dry-run' | 'confirmed'>('dry-run');
  const [confirmPhrase, setConfirmPhrase] = useState('');

  return (
    <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
      {/* Manual sync */}
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: 24 }}>
        <h3 style={{ fontFamily: 'var(--ds-font-family-heading)', fontSize: 16, fontWeight: 600, color: T.text, marginBottom: 12 }}>
          Manual Sync
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Button appearance="primary" onClick={() => manualSync.mutate({ mode: 'full' })} isLoading={manualSync.isPending}>
            {manualSync.isPending ? 'Syncing…' : 'Run Full Sync'}
          </Button>
          <Button onClick={() => manualSync.mutate({ mode: 'incremental' })} isLoading={manualSync.isPending}>
            {manualSync.isPending ? 'Syncing…' : 'Run Incremental'}
          </Button>
        </div>
        {manualSync.isSuccess && (
          <SectionMessage appearance="success" title="Sync complete" style={{ marginTop: 16 }}>
            <div style={{ fontFamily: 'var(--ds-font-family-body)', fontSize: 12 }}>
              {manualSync.data?.recordsAdded} records added
            </div>
          </SectionMessage>
        )}
      </div>

      {/* Refresh data */}
      <div style={{ background: env.isProductionRuntime ? T.danger : T.info, border: `1px solid ${env.isProductionRuntime ? T.dangerText : T.infoText}`, borderRadius: 8, padding: 24 }}>
        <h3 style={{ fontFamily: 'var(--ds-font-family-heading)', fontSize: 16, fontWeight: 600, color: env.isProductionRuntime ? T.dangerText : T.infoText, marginBottom: 12 }}>
          ⚠️ Refresh All Data
        </h3>
        <div style={{ fontFamily: 'var(--ds-font-family-body)', fontSize: 12, color: env.isProductionRuntime ? T.dangerText : T.infoText, marginBottom: 16 }}>
          Delete and reload from Jira. Catalyst data preserved.
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <Button
            appearance={refreshMode === 'dry-run' ? 'primary' : 'default'}
            onClick={() => setRefreshMode('dry-run')}
            isSelected={refreshMode === 'dry-run'}
          >
            Dry Run
          </Button>
          <Button
            appearance={refreshMode === 'confirmed' ? 'danger' : 'default'}
            onClick={() => setRefreshMode('confirmed')}
            isSelected={refreshMode === 'confirmed'}
          >
            Confirmed
          </Button>
        </div>
        {refreshMode === 'confirmed' && (
          <div style={{ marginBottom: 12 }}>
            <Textfield
              placeholder={env.isProductionRuntime ? 'REFRESH PRODUCTION JIRA DATA' : 'REFRESH STAGING JIRA DATA'}
              value={confirmPhrase}
              onChange={e => setConfirmPhrase(e.target.value)}
            />
            <div style={{ fontFamily: 'var(--ds-font-family-body)', fontSize: 11, color: env.isProductionRuntime ? T.dangerText : T.infoText, marginTop: 4 }}>
              Type: {env.isProductionRuntime ? 'REFRESH PRODUCTION JIRA DATA' : 'REFRESH STAGING JIRA DATA'}
            </div>
          </div>
        )}
        <Button
          appearance={refreshMode === 'confirmed' ? 'danger' : 'default'}
          onClick={() => refreshData.mutate({ projectKeys: [], confirmationPhrase: confirmPhrase, mode: refreshMode })}
          isLoading={refreshData.isPending}
        >
          {refreshData.isPending ? 'Processing…' : 'Start Refresh'}
        </Button>
      </div>
    </div>
  );
}

function ProjectsTab({ projects }: { projects: any[] }) {
  return (
    <div style={{ marginTop: 24 }}>
      <h3 style={{ fontFamily: 'var(--ds-font-family-heading)', fontSize: 16, fontWeight: 600, color: T.text, marginBottom: 12 }}>
        Projects ({projects.length})
      </h3>
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: 16 }}>
        {projects.length === 0 ? (
          <div style={{ fontFamily: 'var(--ds-font-family-body)', fontSize: 14, color: T.textSubtle, textAlign: 'center', padding: '40px 20px' }}>
            No projects available
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {projects.map((p: any) => (
              <div key={p.key} style={{ background: T.surfaceSunken, border: `1px solid ${T.border}`, borderRadius: 6, padding: 12 }}>
                <div style={{ fontFamily: 'var(--ds-font-family-body)', fontSize: 13, fontWeight: 600, color: T.text }}>
                  {p.key}
                </div>
                <div style={{ fontFamily: 'var(--ds-font-family-body)', fontSize: 12, color: T.textSubtle, marginTop: 4 }}>
                  {p.name}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TypeMappingTab() {
  const ISSUE_TYPES = [
    'Story', 'Epic', 'Feature', 'Task', 'Sub-task',
    'QA Bug', 'Production Incident', 'Change Request',
    'Business Request', 'Business Gap', 'Backend', 'Frontend',
    'Integration', 'Idea',
  ];

  return (
    <div style={{ marginTop: 24 }}>
      <h3 style={{ fontFamily: 'var(--ds-font-family-heading)', fontSize: 16, fontWeight: 600, color: T.text, marginBottom: 12 }}>
        Canonical Issue Types ({ISSUE_TYPES.length})
      </h3>
      <p style={{ fontFamily: 'var(--ds-font-family-body)', fontSize: 12, color: T.textSubtle, marginBottom: 16 }}>
        Each Catalyst work item type has a canonical icon from Jira metadata. Field presence per type is queried on-demand.
      </p>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12,
      }}>
        {ISSUE_TYPES.map(type => (
          <div key={type} style={{
            background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: 12,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <JiraIssueTypeIcon type={type as any} size={16} />
            <span style={{ fontFamily: 'var(--ds-font-family-body)', fontSize: 12, fontWeight: 500, color: T.text }}>
              {type}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BackupAndLogsTab({ syncLogs }: { syncLogs: any[] }) {
  return (
    <div style={{ marginTop: 24 }}>
      <h3 style={{ fontFamily: 'var(--ds-font-family-heading)', fontSize: 16, fontWeight: 600, color: T.text, marginBottom: 12 }}>
        Sync History (Last 20)
      </h3>
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: 16 }}>
        {syncLogs.length === 0 ? (
          <div style={{ fontFamily: 'var(--ds-font-family-body)', fontSize: 14, color: T.textSubtle, textAlign: 'center', padding: '40px 20px' }}>
            No sync history
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                  <th style={{ fontFamily: 'var(--ds-font-family-body)', fontSize: 11, fontWeight: 600, textAlign: 'left', padding: '8px', color: T.textSubtle }}>When</th>
                  <th style={{ fontFamily: 'var(--ds-font-family-body)', fontSize: 11, fontWeight: 600, textAlign: 'left', padding: '8px', color: T.textSubtle }}>Type</th>
                  <th style={{ fontFamily: 'var(--ds-font-family-body)', fontSize: 11, fontWeight: 600, textAlign: 'left', padding: '8px', color: T.textSubtle }}>Status</th>
                  <th style={{ fontFamily: 'var(--ds-font-family-body)', fontSize: 11, fontWeight: 600, textAlign: 'left', padding: '8px', color: T.textSubtle }}>Count</th>
                </tr>
              </thead>
              <tbody>
                {syncLogs.map((log: any, i: number) => {
                  const logTime = log.created_at ? formatDistanceToNow(new Date(log.created_at), { addSuffix: true }) : '—';
                  return (
                  <tr key={i} style={{ borderBottom: `1px solid ${T.border}` }}>
                    <td style={{ fontFamily: 'var(--ds-font-family-body)', fontSize: 12, padding: '8px', color: T.text }}>
                      {logTime}
                    </td>
                    <td style={{ fontFamily: 'var(--ds-font-family-body)', fontSize: 12, padding: '8px' }}>
                      <Lozenge appearance="default">{log.operation_type}</Lozenge>
                    </td>
                    <td style={{ fontFamily: 'var(--ds-font-family-body)', fontSize: 12, padding: '8px' }}>
                      <Lozenge appearance={log.status === 'completed' ? 'success' : 'default'}>{log.status}</Lozenge>
                    </td>
                    <td style={{ fontFamily: 'var(--ds-font-family-body)', fontSize: 12, padding: '8px', color: T.text }}>
                      {log.records_reloaded || log.records_deleted || 0}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
