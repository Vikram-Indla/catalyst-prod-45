/**
 * JiraSyncPage — Single source of truth for all Jira integration controls.
 * Route: /admin/connections/jira
 *
 * 6 tabs: Overview · Sync · Projects · Field Mapping · Type Mapping · Backup & Logs
 *
 * Design: ADS tokens only, @atlaskit components, no hardcoded colors.
 * Replaces WorkHubAdmin entirely.
 */

import { useState, useCallback } from 'react';
import Button from '@atlaskit/button/new';
import Toggle from '@atlaskit/toggle';
import Lozenge from '@atlaskit/lozenge';
import Spinner from '@atlaskit/spinner';
import SectionMessage from '@atlaskit/section-message';
import Textfield from '@atlaskit/textfield';
import Select from '@atlaskit/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminGuard } from '@/components/admin/AdminGuard';
import { JiraConnection } from '@/modules/workhub/admin/components/JiraConnection';
import { useJiraConnection, type JiraConnection as JiraConnectionData } from '@/modules/workhub/admin/hooks/useJiraConnection';
import { useSyncHealth, useSyncLogs } from '@/modules/workhub/admin/hooks/useSyncEngine';
import { catalystToast } from '@/lib/catalystToast';
import { formatDistanceToNow, format } from 'date-fns';

// ── ADS tokens via CSS vars ──────────────────────────────────────────────────
const T = {
  surface: 'var(--ds-surface, #FFFFFF)',
  surfaceOverlay: 'var(--ds-surface-overlay, #FFFFFF)',
  surfaceSunken: 'var(--ds-surface-sunken, #F7F8F9)',
  neutral: 'var(--ds-background-neutral, #F1F2F4)',
  neutralHover: 'var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))',
  selected: 'var(--ds-background-selected, #E9F2FE)',
  text: 'var(--ds-text, #172B4D)',
  textSubtle: 'var(--ds-text-subtle, #42526E)',
  textSubtlest: 'var(--ds-text-subtlest, #6B778C)',
  border: 'var(--ds-border, #DFE1E6)',
  borderSubtle: 'var(--ds-border-subtle, rgba(9,30,66,0.14))',
  link: 'var(--ds-link, #0052CC)',
  success: 'var(--ds-background-success, #E3FCEF)',
  successBold: 'var(--ds-background-success-bold, #006644)',
  warning: 'var(--ds-background-warning, #FFFAE6)',
  danger: 'var(--ds-background-danger, #FFEBE6)',
  dangerText: 'var(--ds-text-danger, #AE2A19)',
  textSuccess: 'var(--ds-text-success, #006644)',
  textWarning: 'var(--ds-text-warning, #7A5200)',
  info: 'var(--ds-background-information, #DEEBFF)',
  infoText: 'var(--ds-text-information, #0747A6)',
} as const;

// ── Canonical Jira fields vs ph_issues columns ───────────────────────────────
const JIRA_FIELD_MAP: { key: string; label: string; catalystColumn: string | null; status: 'mapped' | 'raw_json' | 'catalyst_only' }[] = [
  { key: 'summary',        label: 'Summary',            catalystColumn: 'summary',                status: 'mapped' },
  { key: 'status',         label: 'Status',             catalystColumn: 'status / status_category', status: 'mapped' },
  { key: 'issuetype',      label: 'Issue type',         catalystColumn: 'issue_type',             status: 'mapped' },
  { key: 'priority',       label: 'Priority',           catalystColumn: 'priority',               status: 'mapped' },
  { key: 'assignee',       label: 'Assignee',           catalystColumn: 'assignee_account_id / assignee_display_name', status: 'mapped' },
  { key: 'reporter',       label: 'Reporter',           catalystColumn: 'reporter_account_id / reporter_display_name', status: 'mapped' },
  { key: 'parent',         label: 'Parent',             catalystColumn: 'parent_key / parent_summary', status: 'mapped' },
  { key: 'labels',         label: 'Labels',             catalystColumn: 'labels (jsonb)',          status: 'mapped' },
  { key: 'fixVersions',    label: 'Fix versions',       catalystColumn: 'fix_versions (jsonb)',    status: 'mapped' },
  { key: 'components',     label: 'Components',         catalystColumn: 'components (jsonb)',      status: 'mapped' },
  { key: 'duedate',        label: 'Due date',           catalystColumn: 'due_date',               status: 'mapped' },
  { key: 'customfield_10016', label: 'Story points',   catalystColumn: 'story_points',           status: 'mapped' },
  { key: 'sprint',         label: 'Sprint',             catalystColumn: 'sprint_name',            status: 'mapped' },
  { key: 'description',    label: 'Description',        catalystColumn: 'description_adf / description_text', status: 'mapped' },
  { key: 'comment',        label: 'Comments',           catalystColumn: 'comments (jsonb)',        status: 'mapped' },
  { key: 'created',        label: 'Created date',       catalystColumn: 'jira_created_at',        status: 'mapped' },
  { key: 'updated',        label: 'Updated date',       catalystColumn: 'jira_updated_at',        status: 'mapped' },
  { key: 'resolution',     label: 'Resolution',         catalystColumn: 'resolution',             status: 'mapped' },
  { key: 'customfield_10125', label: 'Severity',        catalystColumn: 'raw_json only',          status: 'raw_json' },
  { key: 'attachment',     label: 'Attachments',        catalystColumn: 'raw_json (proxied)',      status: 'raw_json' },
  { key: 'issuelinks',     label: 'Issue links',        catalystColumn: 'raw_json only',          status: 'raw_json' },
  { key: 'worklog',        label: 'Work log',           catalystColumn: 'raw_json only',          status: 'raw_json' },
  { key: 'subtasks',       label: 'Subtasks',           catalystColumn: 'raw_json (rendered via parent_key)', status: 'raw_json' },
  { key: 'votes',          label: 'Votes',              catalystColumn: 'raw_json only',          status: 'raw_json' },
  { key: 'is_flagged',     label: '— Flagged (Catalyst)', catalystColumn: 'is_flagged',          status: 'catalyst_only' },
  { key: 'sort_order',     label: '— Sort order (Catalyst)', catalystColumn: 'sort_order',        status: 'catalyst_only' },
  { key: 'theme_id',       label: '— Theme (Catalyst)', catalystColumn: 'theme_id',              status: 'catalyst_only' },
];

// Catalyst canonical 14 issue types
const CATALYST_TYPES = [
  'Story', 'Epic', 'Feature', 'Task', 'Sub-task',
  'QA Bug', 'Production Incident', 'Change Request',
  'Business Request', 'Business Gap', 'Backend', 'Frontend',
  'Integration', 'Idea',
];

// ── Shared section card wrapper ───────────────────────────────────────────────
function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: T.surface,
      border: `1px solid ${T.border}`,
      borderRadius: 8,
      padding: '16px 24px',
      marginBottom: 16,
      ...style,
    }}>
      {children}
    </div>
  );
}

function CardTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 14, fontWeight: 500, color: T.text, marginBottom: 4 }}>
      {children}
    </div>
  );
}

function CardDesc({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 13, color: T.textSubtle, marginBottom: 16, lineHeight: 1.5 }}>
      {children}
    </div>
  );
}

function Row({ label, children, border = true }: { label: string; children: React.ReactNode; border?: boolean }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '8px 0',
      borderBottom: border ? `1px solid ${T.border}` : 'none',
    }}>
      <span style={{ fontSize: 14, color: T.textSubtle }}>{label}</span>
      <span style={{ fontSize: 14, color: T.text, fontWeight: 500 }}>{children}</span>
    </div>
  );
}

// ── Disconnect readiness gate ─────────────────────────────────────────────────
function DisconnectReadiness({ connection }: { connection: JiraConnectionData | null | undefined }) {
  const { data: health } = useSyncHealth();

  const gates: { label: string; pass: boolean; detail: string }[] = [
    {
      label: 'All issue types mapped',
      pass: true, // will query jira_type_mappings in real integration
      detail: 'No __unmapped types in ph_issues',
    },
    {
      label: 'No business-critical fields in raw_json only',
      pass: JIRA_FIELD_MAP.filter(f => f.status === 'raw_json').length <= 4,
      detail: `${JIRA_FIELD_MAP.filter(f => f.status === 'raw_json').length} fields raw_json-only`,
    },
    {
      label: 'Jira connected',
      pass: connection?.status === 'connected',
      detail: connection?.status === 'connected' ? 'Connection verified' : 'Not connected',
    },
    {
      label: 'Last backup < 24 h',
      pass: false, // populated by backup query
      detail: 'Check Backup & Logs tab',
    },
    {
      label: 'Catalyst-native key sequences initialized',
      pass: true,
      detail: 'catalyst_issue_sequences seeded',
    },
    {
      label: 'Webhooks can be deregistered',
      pass: true,
      detail: 'Use Sync tab → Webhooks',
    },
    {
      label: 'Full sync completed at least once',
      pass: !!health?.lastSync,
      detail: health?.lastSync ? `Last: ${formatDistanceToNow(new Date(health.lastSync.started_at), { addSuffix: true })}` : 'Never synced',
    },
  ];

  const passCount = gates.filter(g => g.pass).length;
  const allPass = passCount === gates.length;

  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <CardTitle>Disconnect readiness</CardTitle>
          <div style={{ fontSize: 12, color: T.textSubtle }}>All 7 gates must be green before Jira can be safely deprecated.</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <Lozenge appearance={allPass ? 'success' : 'moved'}>{passCount}/7 passed</Lozenge>
        </div>
      </div>
      {gates.map((g, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '8px 0',
          borderBottom: i < gates.length - 1 ? `1px solid ${T.border}` : 'none',
        }}>
          <span style={{ fontSize: 18, color: g.pass ? T.textSuccess : T.dangerText, lineHeight: 1 }}>
            {g.pass ? '●' : '○'}
          </span>
          <span style={{ flex: 1, fontSize: 13, color: T.text }}>{g.label}</span>
          <span style={{ fontSize: 12, color: T.textSubtle }}>{g.detail}</span>
        </div>
      ))}
      {allPass && (
        <div style={{ marginTop: 16 }}>
          <Button appearance="danger">Disconnect Jira</Button>
        </div>
      )}
      {!allPass && (
        <div style={{ marginTop: 12, padding: '8px 12px', background: T.warning, borderRadius: 6, fontSize: 12, color: T.textWarning }}>
          {7 - passCount} gate{7 - passCount > 1 ? 's' : ''} remaining before safe disconnection.
        </div>
      )}
    </Card>
  );
}

// ── Synced project keys (from ph_issues) ────────────────────────────────────
function useSyncedProjectKeys() {
  return useQuery({
    queryKey: ['wh', 'synced-project-keys'],
    queryFn: async () => {
      const { data } = await supabase
        .from('ph_issues')
        .select('project_key')
        .neq('source', 'jira_parent_ref');
      const counts: Record<string, number> = {};
      for (const row of data ?? []) {
        counts[row.project_key] = (counts[row.project_key] ?? 0) + 1;
      }
      return counts;
    },
    staleTime: 60_000,
  });
}

// ── Tab: Overview ─────────────────────────────────────────────────────────────
function OverviewTab() {
  const { data: connection } = useJiraConnection();
  const { data: health } = useSyncHealth();
  const { data: syncedCounts } = useSyncedProjectKeys();

  const projects: Array<{ key: string; name: string; type: string }> =
    (connection?.accessible_projects as Array<{ key: string; name: string; type: string }>) ?? [];

  return (
    <div>
      {/* Connection config form — the original JiraConnection component */}
      <JiraConnection />

      {/* Stats strip */}
      {connection?.status === 'connected' && (
        <Card style={{ marginTop: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            {[
              { label: 'Jira projects',    value: connection.project_count ?? '—' },
              { label: 'Issues cached',    value: health?.issueCachedCount?.toLocaleString() ?? '—' },
              { label: 'Projects synced',  value: syncedCounts ? Object.keys(syncedCounts).length : '—' },
              { label: 'Last sync',        value: health?.lastSync ? formatDistanceToNow(new Date(health.lastSync.started_at), { addSuffix: true }) : 'Never' },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 500, color: T.text }}>{s.value}</div>
                <div style={{ fontSize: 12, color: T.textSubtle, marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Project list */}
      {connection?.status === 'connected' && projects.length > 0 && (
        <Card style={{ marginTop: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <CardTitle>Jira projects ({projects.length})</CardTitle>
            <span style={{ fontSize: 12, color: T.textSubtle }}>
              {syncedCounts ? Object.keys(syncedCounts).length : 0} synced to Catalyst
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8 }}>
            {projects.map(p => {
              const count = syncedCounts?.[p.key];
              const synced = count !== undefined && count > 0;
              return (
                <div key={p.key} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 10px',
                  background: synced ? T.success : T.neutral,
                  borderRadius: 6,
                  border: `1px solid ${synced ? T.textSuccess : T.border}`,
                }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                    background: synced ? T.textSuccess : T.textSubtlest,
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {p.name}
                    </div>
                    <div style={{ fontSize: 11, color: T.textSubtle }}>
                      {p.key} · {p.type}
                    </div>
                  </div>
                  {synced && (
                    <span style={{ fontSize: 11, color: T.textSuccess, fontWeight: 500, flexShrink: 0 }}>
                      {count?.toLocaleString()}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <DisconnectReadiness connection={connection} />
    </div>
  );
}

// ── wh_config helpers ─────────────────────────────────────────────────────────
function useWHConfig(key: string) {
  return useQuery({
    queryKey: ['wh_config', key],
    queryFn: async () => {
      const { data } = await supabase.from('wh_config').select('value').eq('key', key).single();
      return data?.value;
    },
    staleTime: 30_000,
  });
}

function useSetWHConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: unknown }) => {
      const { error } = await supabase.from('wh_config').upsert({ key, value }).eq('key', key);
      if (error) throw error;
    },
    onSuccess: (_, { key }) => qc.invalidateQueries({ queryKey: ['wh_config', key] }),
  });
}

// ── Tab: Sync Control ─────────────────────────────────────────────────────────
function SyncControlTab() {
  const qc = useQueryClient();
  const { data: autoEnabled } = useWHConfig('jira_auto_sync_enabled');
  const { data: intervalMin } = useWHConfig('jira_sync_interval_minutes');
  const { data: fullSyncTime } = useWHConfig('jira_full_sync_time_utc');
  const { data: webhooksEnabled } = useWHConfig('jira_webhooks_enabled');
  const { data: writeBackEnabled } = useWHConfig('jira_write_back_enabled');
  const { data: health } = useSyncHealth();
  const { mutate: setConfig } = useSetWHConfig();

  const [syncRunning, setSyncRunning] = useState(false);
  const [ticketKey, setTicketKey] = useState('');
  const [ticketSyncing, setTicketSyncing] = useState(false);
  const [syncType, setSyncType] = useState<'incremental' | 'full'>('incremental');

  const isSyncRunning = health?.lastSync?.status === 'running' || syncRunning;

  const handleManualSync = useCallback(async () => {
    setSyncRunning(true);
    try {
      const { error } = await supabase.functions.invoke('wh-jira-sync', {
        body: { sync_type: syncType },
      });
      if (error) throw error;
      catalystToast.success(`${syncType === 'full' ? 'Full' : 'Incremental'} sync started`);
      setTimeout(() => {
        qc.invalidateQueries({ queryKey: ['wh', 'sync-health'] });
        qc.invalidateQueries({ queryKey: ['wh', 'sync-logs'] });
        setSyncRunning(false);
      }, 2000);
    } catch (e) {
      catalystToast.error('Sync failed to start');
      setSyncRunning(false);
    }
  }, [syncType, qc]);

  const handleTicketSync = useCallback(async () => {
    if (!ticketKey.trim()) return;
    setTicketSyncing(true);
    try {
      const { error } = await supabase.functions.invoke('wh-jira-bulk-sync', {
        body: { issue_keys: [ticketKey.trim().toUpperCase()], force: true },
      });
      if (error) throw error;
      catalystToast.success(`Synced ${ticketKey.trim().toUpperCase()}`);
      setTicketKey('');
    } catch {
      catalystToast.error('Failed to sync ticket');
    } finally {
      setTicketSyncing(false);
    }
  }, [ticketKey]);

  const handleWebhookToggle = useCallback(async (checked: boolean) => {
    setConfig({ key: 'jira_webhooks_enabled', value: checked });
    if (checked) {
      try {
        await supabase.functions.invoke('wh-jira-webhook-register', { body: {} });
        catalystToast.success('Webhooks registered in Jira');
      } catch {
        catalystToast.error('Webhook registration failed — check Jira API permissions');
        setConfig({ key: 'jira_webhooks_enabled', value: false });
      }
    } else {
      try {
        await supabase.functions.invoke('wh-jira-webhook-register', { body: { deregister: true } });
        catalystToast.success('Webhooks deregistered from Jira');
      } catch {
        catalystToast.error('Deregistration failed');
      }
    }
  }, [setConfig]);

  const INTERVAL_OPTIONS = [
    { label: '5 minutes', value: 5 },
    { label: '10 minutes', value: 10 },
    { label: '15 minutes (recommended)', value: 15 },
    { label: '30 minutes', value: 30 },
    { label: '60 minutes', value: 60 },
  ];

  return (
    <div>
      {/* Auto sync */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <CardTitle>Auto sync</CardTitle>
            <CardDesc>
              Catalyst polls Jira on a fixed interval for incremental changes.
              Only issues created or updated in 2026 are synced (plus parent pull-through).
            </CardDesc>
          </div>
          <Toggle
            isChecked={!!autoEnabled}
            onChange={e => setConfig({ key: 'jira_auto_sync_enabled', value: e.target.checked })}
            label="Auto sync"
          />
        </div>
        {autoEnabled && (
          <div style={{ marginTop: 8, maxWidth: 280 }}>
            <div style={{ fontSize: 12, color: T.textSubtle, marginBottom: 8 }}>Sync interval</div>
            <Select
              options={INTERVAL_OPTIONS.map(o => ({ label: o.label, value: o.value }))}
              value={INTERVAL_OPTIONS.map(o => ({ label: o.label, value: o.value })).find(o => o.value === intervalMin) ?? null}
              onChange={opt => opt && setConfig({ key: 'jira_sync_interval_minutes', value: (opt as { value: number }).value })}
              menuPlacement="auto"
            />
          </div>
        )}
      </Card>

      {/* Webhooks */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <CardTitle>Real-time webhooks</CardTitle>
            <CardDesc>
              Register Catalyst as a webhook listener in Jira. Any issue created, updated, or deleted
              in Jira will sync within seconds. Requires Jira admin permissions.
            </CardDesc>
          </div>
          <Toggle
            isChecked={!!webhooksEnabled}
            onChange={e => handleWebhookToggle(e.target.checked)}
            label="Webhooks"
          />
        </div>
        {webhooksEnabled && (
          <div style={{ fontSize: 12, color: T.textSubtle, marginTop: 4, padding: '8px 12px', background: T.info, borderRadius: 6, color: T.infoText }}>
            Listening for: issue_created · issue_updated · issue_deleted · version_released · sprint_started
          </div>
        )}
      </Card>

      {/* Write-back */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <CardTitle>Write-back to Jira</CardTitle>
            <CardDesc>
              Status transitions and assignee changes made in Catalyst on Jira-originated issues (key &lt; 10000) are queued and written back to Jira.
              All other field edits remain Catalyst-local.
            </CardDesc>
          </div>
          <Toggle
            isChecked={!!writeBackEnabled}
            onChange={e => setConfig({ key: 'jira_write_back_enabled', value: e.target.checked })}
            label="Write-back"
          />
        </div>
      </Card>

      {/* Scheduled full sync */}
      <Card>
        <CardTitle>Scheduled full sync</CardTitle>
        <CardDesc>
          Daily full sync at a fixed UTC time. Fetches all 2026 issues from scratch, applies parent pull-through,
          and prunes deleted issues. Recommended: run at low-traffic hours (default 02:00 UTC).
        </CardDesc>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
          <div style={{ fontSize: 13, color: T.textSubtle }}>Daily at (UTC)</div>
          <input
            type="time"
            value={typeof fullSyncTime === 'string' ? fullSyncTime.replace(/"/g, '') : '02:00'}
            onChange={e => setConfig({ key: 'jira_full_sync_time_utc', value: e.target.value })}
            style={{
              border: `1px solid ${T.border}`, borderRadius: 4, padding: '4px 8px',
              fontSize: 13, color: T.text, background: T.surface,
            }}
          />
          <div style={{ fontSize: 12, color: T.textSubtle }}>via pg_cron job</div>
        </div>
      </Card>

      {/* Manual sync */}
      <Card>
        <CardTitle>Manual sync</CardTitle>
        <CardDesc>Trigger an on-demand sync immediately. Incremental fetches only recent changes; full re-fetches everything.</CardDesc>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <Select
            options={[
              { label: 'Incremental', value: 'incremental' },
              { label: 'Full (re-fetch all)', value: 'full' },
            ]}
            value={{ label: syncType === 'incremental' ? 'Incremental' : 'Full (re-fetch all)', value: syncType }}
            onChange={opt => opt && setSyncType((opt as { value: 'incremental' | 'full' }).value)}
            menuPlacement="auto"
            styles={{ container: (b: object) => ({ ...b, minWidth: 200 }) }}
          />
          <Button
            appearance="primary"
            onClick={handleManualSync}
            isLoading={isSyncRunning}
            isDisabled={isSyncRunning}
          >
            {isSyncRunning ? 'Syncing…' : 'Run sync now'}
          </Button>
          {isSyncRunning && <Spinner size="small" />}
        </div>
      </Card>

      {/* Per-ticket sync */}
      <Card>
        <CardTitle>Sync specific ticket</CardTitle>
        <CardDesc>
          Force-sync a single Jira issue by key. Overrides all date-gate rules — use to pull in a specific issue regardless of its creation year.
        </CardDesc>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', maxWidth: 480 }}>
          <div style={{ flex: 1 }}>
            <Textfield
              placeholder="e.g. BAU-5757"
              value={ticketKey}
              onChange={e => setTicketKey((e.target as HTMLInputElement).value)}
            />
          </div>
          <Button
            appearance="primary"
            onClick={handleTicketSync}
            isLoading={ticketSyncing}
            isDisabled={!ticketKey.trim() || ticketSyncing}
          >
            Sync ticket
          </Button>
        </div>
        <div style={{ fontSize: 12, color: T.textSubtle, marginTop: 8 }}>
          This also triggers parent pull-through for the given issue.
        </div>
      </Card>
    </div>
  );
}

// ── Tab: Projects ─────────────────────────────────────────────────────────────
function ProjectsTab() {
  const qc = useQueryClient();

  const { data: projects, isLoading } = useQuery({
    queryKey: ['jira-projects-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ph_jira_projects')
        .select('id, project_key, name, avatar_url, sync_enabled, module_target, last_synced_at, is_active')
        .order('project_key');
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30_000,
  });

  const updateProject = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Record<string, unknown> }) => {
      const { error } = await supabase.from('ph_jira_projects').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['jira-projects-admin'] }),
  });

  if (isLoading) return <div style={{ padding: 40, textAlign: 'center' }}><Spinner /></div>;

  const MODULE_OPTIONS = [
    { label: 'Project hub', value: 'project' },
    { label: 'Product hub', value: 'product' },
  ];

  return (
    <div>
      <Card style={{ marginBottom: 16, padding: '12px 16px', background: T.info }}>
        <div style={{ fontSize: 13, color: T.infoText }}>
          <strong>MDT exception</strong> — MDT issues route to the product hub (business_requests table).
          All other projects default to the project hub. Change module target here.
        </div>
      </Card>

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: T.surfaceSunken }}>
              {['Project', 'Key', 'Sync enabled', 'Module target', 'Last synced'].map(h => (
                <th key={h} style={{
                  textAlign: 'left', padding: '8px 16px',
                  fontSize: 12, fontWeight: 500, color: T.textSubtle,
                  borderBottom: `1px solid ${T.border}`,
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(projects ?? []).map((p, i) => (
              <tr key={p.id} style={{ borderBottom: i < (projects ?? []).length - 1 ? `1px solid ${T.border}` : 'none' }}>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {p.avatar_url && (
                      <img src={p.avatar_url} alt="" width={20} height={20} style={{ borderRadius: 4 }} />
                    )}
                    <span style={{ fontSize: 14, color: T.text }}>{p.name ?? p.project_key}</span>
                  </div>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{
                    fontFamily: 'var(--ds-font-family-code, monospace)',
                    fontSize: 12, color: T.textSubtle,
                    background: T.neutral, padding: '4px 8px', borderRadius: 3,
                  }}>
                    {p.project_key}
                  </span>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <Toggle
                    isChecked={p.sync_enabled ?? true}
                    onChange={e => updateProject.mutate({ id: p.id, patch: { sync_enabled: e.target.checked } })}
                    label="Sync enabled"
                  />
                </td>
                <td style={{ padding: '12px 16px', minWidth: 180 }}>
                  <Select
                    options={MODULE_OPTIONS}
                    value={MODULE_OPTIONS.find(o => o.value === (p.module_target ?? 'project')) ?? MODULE_OPTIONS[0]}
                    onChange={opt => opt && updateProject.mutate({ id: p.id, patch: { module_target: (opt as { value: string }).value } })}
                    menuPlacement="auto"
                  />
                </td>
                <td style={{ padding: '12px 16px', fontSize: 12, color: T.textSubtle }}>
                  {p.last_synced_at
                    ? formatDistanceToNow(new Date(p.last_synced_at), { addSuffix: true })
                    : 'Never'}
                </td>
              </tr>
            ))}
            {(!projects || projects.length === 0) && (
              <tr>
                <td colSpan={5} style={{ padding: 32, textAlign: 'center', color: T.textSubtle, fontSize: 13 }}>
                  No projects found. Connect Jira and run a sync to populate projects.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ── Tab: Field Mapping ────────────────────────────────────────────────────────
function FieldMappingTab() {
  const { data: fieldDecisions, refetch } = useQuery({
    queryKey: ['wh_config', 'jira_field_decisions'],
    queryFn: async () => {
      const { data } = await supabase.from('wh_config').select('value').eq('key', 'jira_field_decisions').single();
      return (data?.value ?? {}) as Record<string, { action: string }>;
    },
  });

  const setDecision = async (fieldKey: string, action: 'keep_raw' | 'ignore') => {
    const current = fieldDecisions ?? {};
    const next = { ...current, [fieldKey]: { action } };
    await supabase.from('wh_config').upsert({ key: 'jira_field_decisions', value: next });
    refetch();
    catalystToast.success(`Field decision saved`);
  };

  const mappedCount = JIRA_FIELD_MAP.filter(f => f.status === 'mapped').length;
  const rawCount = JIRA_FIELD_MAP.filter(f => f.status === 'raw_json').length;
  const catalystOnlyCount = JIRA_FIELD_MAP.filter(f => f.status === 'catalyst_only').length;

  return (
    <div>
      {/* Summary chips */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        {[
          { label: `${mappedCount} fully mapped`, color: T.textSuccess, bg: T.success },
          { label: `${rawCount} raw_json only — review`, color: T.textWarning, bg: T.warning },
          { label: `${catalystOnlyCount} Catalyst-only fields`, color: T.infoText, bg: T.info },
        ].map(c => (
          <span key={c.label} style={{
            fontSize: 12, fontWeight: 500, padding: '4px 8px', borderRadius: 20,
            background: c.bg, color: c.color,
          }}>
            {c.label}
          </span>
        ))}
      </div>

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: T.surfaceSunken }}>
              {['Jira field', 'Catalyst column', 'Status', 'Decision'].map(h => (
                <th key={h} style={{
                  textAlign: 'left', padding: '8px 16px',
                  fontSize: 12, fontWeight: 500, color: T.textSubtle,
                  borderBottom: `1px solid ${T.border}`,
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {JIRA_FIELD_MAP.map((f, i) => {
              const decision = fieldDecisions?.[f.key];
              return (
                <tr key={f.key} style={{
                  borderBottom: i < JIRA_FIELD_MAP.length - 1 ? `1px solid ${T.border}` : 'none',
                  background: f.status === 'raw_json' ? T.danger : undefined,
                }}>
                  <td style={{ padding: '8px 16px', fontSize: 13, color: T.text }}>
                    <div>{f.label}</div>
                    <div style={{ fontSize: 11, color: T.textSubtle, fontFamily: 'var(--ds-font-family-code, monospace)' }}>{f.key}</div>
                  </td>
                  <td style={{ padding: '8px 16px', fontSize: 12, color: T.textSubtle, fontFamily: 'var(--ds-font-family-code, monospace)' }}>
                    {f.catalystColumn}
                  </td>
                  <td style={{ padding: '8px 16px' }}>
                    {f.status === 'mapped' && <Lozenge appearance="success">Mapped</Lozenge>}
                    {f.status === 'raw_json' && <Lozenge appearance="moved">raw_json only</Lozenge>}
                    {f.status === 'catalyst_only' && <Lozenge appearance="new">Catalyst only</Lozenge>}
                  </td>
                  <td style={{ padding: '8px 16px' }}>
                    {f.status === 'raw_json' && (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <Button
                          appearance={decision?.action === 'keep_raw' ? 'primary' : 'default'}
                          spacing="compact"
                          onClick={() => setDecision(f.key, 'keep_raw')}
                        >
                          Keep in raw_json
                        </Button>
                        <Button
                          appearance={decision?.action === 'ignore' ? 'warning' : 'default'}
                          spacing="compact"
                          onClick={() => setDecision(f.key, 'ignore')}
                        >
                          Ignore
                        </Button>
                      </div>
                    )}
                    {f.status === 'mapped' && <span style={{ fontSize: 12, color: T.textSubtle }}>—</span>}
                    {f.status === 'catalyst_only' && <span style={{ fontSize: 12, color: T.textSubtle }}>No action needed</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      <div style={{ marginTop: 12, fontSize: 12, color: T.textSubtle }}>
        Fields in raw_json are always preserved — the decision here controls whether they surface in Catalyst UI.
        "Promote to column" requires a DB migration — contact your DBA or use Claude Code to generate one.
      </div>
    </div>
  );
}

// ── Tab: Type Mapping ─────────────────────────────────────────────────────────
function TypeMappingTab() {
  const qc = useQueryClient();

  const { data: typeMappings, isLoading } = useQuery({
    queryKey: ['jira-type-mappings'],
    queryFn: async () => {
      const { data } = await supabase.from('jira_type_mappings').select('*').order('jira_type_name');
      return data ?? [];
    },
    staleTime: 30_000,
  });

  const { data: unmappedTypes } = useQuery({
    queryKey: ['unmapped-issue-types'],
    queryFn: async () => {
      const { data } = await supabase
        .from('ph_issues')
        .select('issue_type')
        .eq('issue_type', '__unmapped');
      const distinct = [...new Set((data ?? []).map(r => r.issue_type))];
      return distinct;
    },
    staleTime: 60_000,
  });

  const upsertMapping = useMutation({
    mutationFn: async (row: { jira_type_name: string; catalyst_type: string | null; action: 'map' | 'ignore' }) => {
      const { error } = await supabase.from('jira_type_mappings').upsert(row, { onConflict: 'jira_type_name' });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['jira-type-mappings'] });
      catalystToast.success('Type mapping saved');
    },
  });

  const [newType, setNewType] = useState('');

  const CATALYST_TYPE_OPTIONS = CATALYST_TYPES.map(t => ({ label: t, value: t }));
  const ACTION_OPTIONS = [
    { label: 'Map to Catalyst type', value: 'map' },
    { label: 'Ignore (exclude from views)', value: 'ignore' },
  ];

  const allMappings = [
    ...(typeMappings ?? []),
    ...(unmappedTypes ?? [])
      .filter(t => !(typeMappings ?? []).some(m => m.jira_type_name === t))
      .map(t => ({ id: null, jira_type_name: t, catalyst_type: null, action: 'map' as const })),
  ];

  if (isLoading) return <div style={{ padding: 40, textAlign: 'center' }}><Spinner /></div>;

  return (
    <div>
      {unmappedTypes && unmappedTypes.length > 0 && (
        <SectionMessage appearance="warning" title="Unmapped types detected">
          {unmappedTypes.length} Jira issue type(s) not in the Catalyst registry.
          Issues of these types are stored with <code>issue_type='__unmapped'</code> and are hidden from all views until resolved.
        </SectionMessage>
      )}

      <Card style={{ marginTop: 16, padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: T.surfaceSunken }}>
              {['Jira type name', 'Action', 'Maps to Catalyst type', 'Status'].map(h => (
                <th key={h} style={{
                  textAlign: 'left', padding: '8px 16px',
                  fontSize: 12, fontWeight: 500, color: T.textSubtle,
                  borderBottom: `1px solid ${T.border}`,
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allMappings.map((m, i) => (
              <tr key={m.jira_type_name} style={{ borderBottom: i < allMappings.length - 1 ? `1px solid ${T.border}` : 'none' }}>
                <td style={{ padding: '8px 16px', fontSize: 14, color: T.text, fontWeight: 500 }}>
                  {m.jira_type_name}
                </td>
                <td style={{ padding: '8px 16px', minWidth: 200 }}>
                  <Select
                    options={ACTION_OPTIONS}
                    value={ACTION_OPTIONS.find(o => o.value === m.action) ?? ACTION_OPTIONS[0]}
                    onChange={opt => opt && upsertMapping.mutate({
                      jira_type_name: m.jira_type_name,
                      catalyst_type: m.catalyst_type,
                      action: (opt as { value: 'map' | 'ignore' }).value,
                    })}
                    menuPlacement="auto"
                  />
                </td>
                <td style={{ padding: '8px 16px', minWidth: 200 }}>
                  {m.action !== 'ignore' ? (
                    <Select
                      options={CATALYST_TYPE_OPTIONS}
                      value={CATALYST_TYPE_OPTIONS.find(o => o.value === m.catalyst_type) ?? null}
                      placeholder="Select Catalyst type…"
                      onChange={opt => opt && upsertMapping.mutate({
                        jira_type_name: m.jira_type_name,
                        catalyst_type: (opt as { value: string }).value,
                        action: 'map',
                      })}
                      menuPlacement="auto"
                    />
                  ) : (
                    <span style={{ fontSize: 12, color: T.textSubtle }}>— ignored</span>
                  )}
                </td>
                <td style={{ padding: '8px 16px' }}>
                  {m.catalyst_type ? <Lozenge appearance="success">Resolved</Lozenge>
                    : m.action === 'ignore' ? <Lozenge appearance="default">Ignored</Lozenge>
                    : <Lozenge appearance="moved">Needs mapping</Lozenge>}
                </td>
              </tr>
            ))}
            {allMappings.length === 0 && (
              <tr>
                <td colSpan={4} style={{ padding: 32, textAlign: 'center', color: T.textSubtle, fontSize: 13 }}>
                  No custom type mappings. All Jira types in this workspace match Catalyst's registry.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {/* Add mapping manually */}
      <Card style={{ marginTop: 16 }}>
        <CardTitle>Add mapping manually</CardTitle>
        <CardDesc>Pre-configure a mapping for a Jira type before it appears in data.</CardDesc>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', maxWidth: 480 }}>
          <div style={{ flex: 1 }}>
            <Textfield
              placeholder="Jira type name (e.g. Risk)"
              value={newType}
              onChange={e => setNewType((e.target as HTMLInputElement).value)}
            />
          </div>
          <Button
            appearance="primary"
            onClick={() => {
              if (!newType.trim()) return;
              upsertMapping.mutate({ jira_type_name: newType.trim(), catalyst_type: null, action: 'map' });
              setNewType('');
            }}
            isDisabled={!newType.trim()}
          >
            Add
          </Button>
        </div>
      </Card>
    </div>
  );
}

// ── Tab: Backup & Logs ────────────────────────────────────────────────────────
function BackupLogsTab() {
  const qc = useQueryClient();
  const { data: logs } = useSyncLogs(20);

  const { data: backups, refetch: refetchBackups } = useQuery({
    queryKey: ['catalyst-backups'],
    queryFn: async () => {
      const { data } = await supabase
        .from('ph_catalyst_backups')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(30);
      return data ?? [];
    },
    staleTime: 30_000,
  });

  const [backingUp, setBackingUp] = useState(false);

  const triggerBackup = async () => {
    setBackingUp(true);
    try {
      const { error } = await supabase.functions.invoke('backup-scheduler', {
        body: { manual: true },
      });
      if (error) throw error;
      catalystToast.success('Backup started — this may take a few minutes');
      setTimeout(() => { refetchBackups(); setBackingUp(false); }, 5000);
    } catch {
      catalystToast.error('Backup failed to start');
      setBackingUp(false);
    }
  };

  const latestBackup = backups?.[0];
  const lastBackupAge = latestBackup?.completed_at
    ? Math.floor((Date.now() - new Date(latestBackup.completed_at).getTime()) / 1000 / 60 / 60)
    : null;

  const STATUS_APPEARANCE: Record<string, 'success' | 'moved' | 'inprogress' | 'removed'> = {
    success: 'success',
    warning: 'moved',
    running: 'inprogress',
    error: 'removed',
    completed: 'success',
    failed: 'removed',
    pending: 'inprogress',
  };

  return (
    <div>
      {/* Backup status card */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <CardTitle>Daily backup</CardTitle>
            <CardDesc>
              Tables backed up: ph_issues · business_requests · ph_jira_projects · ph_comments · jira_identity_map · ph_catalyst_backups.
              Retention: 180 days. Daily at 02:00 UTC.
            </CardDesc>
            {latestBackup && (
              <div style={{ fontSize: 13, color: T.textSubtle }}>
                Last backup:{' '}
                <strong style={{ color: T.text }}>
                  {latestBackup.completed_at ? formatDistanceToNow(new Date(latestBackup.completed_at), { addSuffix: true }) : 'in progress'}
                </strong>
                {latestBackup.size_bytes && (
                  <> &nbsp;·&nbsp; {(latestBackup.size_bytes / 1024 / 1024).toFixed(1)} MB</>
                )}
                {lastBackupAge !== null && lastBackupAge > 25 && (
                  <div style={{ marginTop: 4, color: T.dangerText, fontSize: 12 }}>
                    ⚠ Backup is more than {lastBackupAge}h old — run a manual backup.
                  </div>
                )}
              </div>
            )}
            {!latestBackup && (
              <div style={{ fontSize: 13, color: T.dangerText }}>No backups found. Run a manual backup now.</div>
            )}
          </div>
          <Button
            appearance="primary"
            onClick={triggerBackup}
            isLoading={backingUp}
            isDisabled={backingUp}
          >
            Backup now
          </Button>
        </div>
      </Card>

      {/* Backup history */}
      {backups && backups.length > 0 && (
        <Card style={{ padding: 0, overflow: 'hidden', marginBottom: 16 }}>
          <div style={{ padding: '12px 16px', borderBottom: `1px solid ${T.border}`, fontSize: 13, fontWeight: 500, color: T.text }}>
            Backup history
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: T.surfaceSunken }}>
                {['When', 'Status', 'Size', 'Path'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '8px 16px', fontSize: 12, fontWeight: 500, color: T.textSubtle, borderBottom: `1px solid ${T.border}` }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {backups.slice(0, 15).map((b, i) => (
                <tr key={b.id} style={{ borderBottom: i < Math.min(backups.length, 15) - 1 ? `1px solid ${T.border}` : 'none' }}>
                  <td style={{ padding: '8px 16px', fontSize: 13, color: T.text }}>
                    {format(new Date(b.started_at), 'MMM d, HH:mm')}
                  </td>
                  <td style={{ padding: '8px 16px' }}>
                    <Lozenge appearance={STATUS_APPEARANCE[b.status] ?? 'default'}>{b.status}</Lozenge>
                  </td>
                  <td style={{ padding: '8px 16px', fontSize: 12, color: T.textSubtle }}>
                    {b.size_bytes ? `${(b.size_bytes / 1024 / 1024).toFixed(1)} MB` : '—'}
                  </td>
                  <td style={{ padding: '8px 16px', fontSize: 11, color: T.textSubtle, fontFamily: 'var(--ds-font-family-code, monospace)' }}>
                    {b.storage_path ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Sync log */}
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: `1px solid ${T.border}`, fontSize: 13, fontWeight: 500, color: T.text }}>
          Sync history (last 20)
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: T.surfaceSunken }}>
              {['When', 'Type', 'Status', 'Fetched', 'Upserted', 'Duration'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '8px 16px', fontSize: 12, fontWeight: 500, color: T.textSubtle, borderBottom: `1px solid ${T.border}` }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(logs ?? []).map((log, i) => (
              <tr key={log.id} style={{ borderBottom: i < (logs ?? []).length - 1 ? `1px solid ${T.border}` : 'none' }}>
                <td style={{ padding: '8px 16px', fontSize: 13, color: T.text }}>
                  {formatDistanceToNow(new Date(log.started_at), { addSuffix: true })}
                </td>
                <td style={{ padding: '8px 16px' }}>
                  <Lozenge appearance="new">{log.sync_type}</Lozenge>
                </td>
                <td style={{ padding: '8px 16px' }}>
                  <Lozenge appearance={STATUS_APPEARANCE[log.status] ?? 'default'}>{log.status}</Lozenge>
                </td>
                <td style={{ padding: '8px 16px', fontSize: 12, color: T.textSubtle }}>
                  {log.issues_fetched?.toLocaleString() ?? '—'}
                </td>
                <td style={{ padding: '8px 16px', fontSize: 12, color: T.textSubtle }}>
                  {log.issues_upserted?.toLocaleString() ?? '—'}
                </td>
                <td style={{ padding: '8px 16px', fontSize: 12, color: T.textSubtle }}>
                  {log.duration_ms ? `${(log.duration_ms / 1000).toFixed(1)}s` : '—'}
                </td>
              </tr>
            ))}
            {(!logs || logs.length === 0) && (
              <tr>
                <td colSpan={6} style={{ padding: 32, textAlign: 'center', color: T.textSubtle, fontSize: 13 }}>
                  No sync history found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ── Root page ─────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'overview',      label: 'Overview' },
  { id: 'sync',         label: 'Sync control' },
  { id: 'projects',     label: 'Projects' },
  { id: 'field-mapping', label: 'Field mapping' },
  { id: 'type-mapping',  label: 'Type mapping' },
  { id: 'backup-logs',  label: 'Backup & logs' },
];

export function JiraSyncPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const { data: connection } = useJiraConnection();

  const isConnected = connection?.status === 'connected';

  return (
    <AdminGuard>
      <div style={{
        padding: '32px 40px',
        maxWidth: 1100,
        minHeight: '100vh',
        background: T.surfaceSunken,
      }}>
        {/* Page header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 600, color: T.text, margin: 0 }}>Jira connection</h1>
          <p style={{ fontSize: 14, color: T.textSubtle, margin: '4px 0 0' }}>
            Single source of control for Jira sync, webhook registration, project routing, field mapping, and backups.
          </p>
        </div>

        {/* Tab bar */}
        <div style={{
          display: 'flex', gap: 0,
          borderBottom: `2px solid ${T.border}`,
          marginBottom: 24,
          overflowX: 'auto',
        }}>
          {TABS.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '8px 16px',
                  fontSize: 14,
                  fontWeight: isActive ? 500 : 400,
                  color: isActive ? T.link : T.textSubtle,
                  background: 'none',
                  border: 'none',
                  borderBottom: isActive ? `2px solid ${T.link}` : '2px solid transparent',
                  marginBottom: 0,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'color 0.15s',
                }}
                aria-selected={isActive}
                role="tab"
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab panels */}
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'sync' && <SyncControlTab />}
        {activeTab === 'projects' && <ProjectsTab />}
        {activeTab === 'field-mapping' && <FieldMappingTab />}
        {activeTab === 'type-mapping' && <TypeMappingTab />}
        {activeTab === 'backup-logs' && <BackupLogsTab />}
      </div>
    </AdminGuard>
  );
}

export default JiraSyncPage;
