/**
 * NotionConnectionPage
 * Route: /admin/connections/notion
 *
 * Full Notion sync management page.
 * Tabs: Setup · Field Mapping · Sync Log · Comments
 *
 * Design: ADS tokens only, @atlaskit/* components only.
 * No hardcoded colors, no Tailwind, no external font sources.
 */

import { useState, useEffect, useCallback } from 'react';
import Button from '@atlaskit/button/new';
import Lozenge from '@atlaskit/lozenge';
import Spinner from '@atlaskit/spinner';
import SectionMessage from '@atlaskit/section-message';
import Textfield from '@atlaskit/textfield';
import Toggle from '@atlaskit/toggle';
import Tabs, { Tab, TabList, TabPanel } from '@atlaskit/tabs';
import { Label } from '@atlaskit/form';
import Select from '@atlaskit/select';
import DynamicTable from '@atlaskit/dynamic-table';
import Badge from '@atlaskit/badge';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/lib/catalystToast';
import { AdminGuard } from '@/components/admin/AdminGuard';
import { format, formatDistanceToNow } from 'date-fns';

// ── ADS token map (matches JiraSyncPage pattern) ─────────────────────────────
const T = {
  surface:       'var(--ds-surface, #FFFFFF)',
  surfaceSunken: 'var(--ds-surface-sunken, #F7F8F9)',
  neutral:       'var(--ds-background-neutral, #F1F2F4)',
  text:          'var(--ds-text, #172B4D)',
  textSubtle:    'var(--ds-text-subtle, #42526E)',
  textSubtlest:  'var(--ds-text-subtlest, #6B778C)',
  border:        'var(--ds-border, #DFE1E6)',
  link:          'var(--ds-link, #0052CC)',
  success:       'var(--ds-background-success, #E3FCEF)',
  danger:        'var(--ds-background-danger, #FFEBE6)',
  dangerText:    'var(--ds-text-danger, #AE2A19)',
  info:          'var(--ds-background-information, #DEEBFF)',
  infoText:      'var(--ds-text-information, #0747A6)',
  warning:       'var(--ds-background-warning, #FFFAE6)',
  warningText:   'var(--ds-text-warning, #7A5200)',
} as const;

// ── Notion icon SVG (black N) ─────────────────────────────────────────────────
function NotionIcon({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="6" fill={T.neutral} />
      <text x="8" y="23" fontSize="18" fontWeight="700" fill={T.text} fontFamily="serif">N</text>
    </svg>
  );
}

// ── Shared layout primitives ──────────────────────────────────────────────────
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

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 12, fontWeight: 653, color: T.textSubtlest,
      textTransform: 'uppercase', letterSpacing: '0.04em',
      marginBottom: 12, paddingBottom: 6,
      borderBottom: `1px solid ${T.border}`,
    }}>
      {children}
    </div>
  );
}

function FieldRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <Label htmlFor={label.toLowerCase().replace(/\s/g, '-')}>{label}</Label>
      {hint && (
        <div style={{ fontSize: 12, color: T.textSubtlest, marginBottom: 4 }}>{hint}</div>
      )}
      {children}
    </div>
  );
}

// ── Business request field options for mapping ────────────────────────────────
const BR_COLUMN_OPTIONS = [
  { value: 'title',           label: 'Title' },
  { value: 'description',     label: 'Description' },
  { value: 'request_type',    label: 'Request type' },
  { value: 'category',        label: 'Category' },
  { value: 'theme',           label: 'Theme' },
  { value: 'stakeholders',    label: 'Stakeholders' },
  { value: 'targeted_feature', label: 'Targeted feature' },
  { value: 'urgency',         label: 'Priority / Urgency' },
  { value: 'end_date',        label: 'Target date' },
  { value: 'planned_quarter', label: 'Planned quarter' },
  { value: 'scope_url',       label: 'Scope URL' },
  { value: 'arabic_title',    label: 'Arabic title' },
  { value: 'process_step',    label: 'Process step / Status' },
  { value: '',                label: '— Skip this field —' },
];

// ── Hooks ─────────────────────────────────────────────────────────────────────
function useNotionConfig() {
  return useQuery({
    queryKey: ['notion-sync-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notion_sync_config')
        .select('*')
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

function useSyncLogs(configId: string | undefined) {
  return useQuery({
    queryKey: ['notion-sync-log', configId],
    queryFn: async () => {
      if (!configId) return [];
      const { data, error } = await supabase
        .from('notion_sync_log')
        .select('*')
        .eq('config_id', configId)
        .order('started_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
    enabled: !!configId,
    refetchInterval: 10_000,
  });
}

function useNotionComments() {
  return useQuery({
    queryKey: ['notion-comments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ph_comments')
        .select('id, body, source, notion_comment_id, notion_page_id, created_at')
        .eq('source', 'notion')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
  });
}

// ── Tab 1: Setup ──────────────────────────────────────────────────────────────
function SetupTab({ config, onSaved }: { config: any; onSaved: () => void }) {
  const qc = useQueryClient();
  const [token,       setToken]       = useState(config?.integration_token || '');
  const [dbUrl,       setDbUrl]       = useState('');
  const [name,        setName]        = useState(config?.workspace_name || 'Notion workspace');
  const [webhookSec,  setWebhookSec]  = useState(config?.webhook_secret || '');
  const [enabled,     setEnabled]     = useState(config?.sync_enabled ?? true);
  const [testing,     setTesting]     = useState(false);
  const [testResult,  setTestResult]  = useState<{ ok: boolean; title?: string; rowCount?: number; error?: string } | null>(null);

  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notion-webhook`;

  const testConnection = useCallback(async () => {
    if (!token || !dbUrl) {
      catalystToast.warning('Enter token and database URL first');
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notion-fetch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ integrationToken: token, databaseUrl: dbUrl }),
      });
      const data = await res.json();
      if (data.success) {
        setTestResult({ ok: true, title: data.databaseTitle, rowCount: data.rows?.length });
      } else {
        setTestResult({ ok: false, error: data.error });
      }
    } catch (e: any) {
      setTestResult({ ok: false, error: e.message });
    } finally {
      setTesting(false);
    }
  }, [token, dbUrl]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Extract database ID from URL
      const urlMatch = dbUrl.match(/([a-f0-9]{32})/);
      const dbId = urlMatch ? urlMatch[1] : (config?.database_id || '');

      const payload = {
        workspace_name:    name,
        integration_token: token,
        database_id:       dbId,
        database_title:    testResult?.title || config?.database_title,
        webhook_secret:    webhookSec || null,
        sync_enabled:      enabled,
        updated_at:        new Date().toISOString(),
      };

      if (config?.id) {
        const { error } = await supabase.from('notion_sync_config').update(payload).eq('id', config.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('notion_sync_config').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      catalystToast.success('Notion connection saved');
      qc.invalidateQueries({ queryKey: ['notion-sync-config'] });
      onSaved();
    },
    onError: (e: any) => catalystToast.error(e.message),
  });

  const triggerSync = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notion-sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ config_id: config?.id, triggered_by: 'manual' }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      catalystToast.success(`Sync complete — ${data.synced} records updated`);
      qc.invalidateQueries({ queryKey: ['notion-sync-config'] });
      qc.invalidateQueries({ queryKey: ['notion-sync-log'] });
    },
    onError: (e: any) => catalystToast.error(`Sync failed: ${e.message}`),
  });

  const syncStatus = config?.last_sync_status;
  const lastSync   = config?.last_sync_at
    ? formatDistanceToNow(new Date(config.last_sync_at), { addSuffix: true })
    : null;

  return (
    <div style={{ maxWidth: 640, paddingTop: 8 }}>
      {/* Status banner */}
      {config && (
        <Card style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <NotionIcon size={28} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: T.text }}>{config.workspace_name}</div>
              {lastSync && (
                <div style={{ fontSize: 12, color: T.textSubtlest }}>
                  Last sync {lastSync} · {config.last_sync_count ?? 0} records
                </div>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {syncStatus === 'ok'      && <Lozenge appearance="success">Connected</Lozenge>}
            {syncStatus === 'error'   && <Lozenge appearance="removed">Error</Lozenge>}
            {syncStatus === 'running' && <Lozenge appearance="inprogress">Syncing</Lozenge>}
            {!syncStatus              && <Lozenge appearance="default">Not synced</Lozenge>}
            <Button
              appearance="primary"
              isLoading={triggerSync.isPending}
              isDisabled={!config?.id || triggerSync.isPending}
              onClick={() => triggerSync.mutate()}
            >
              Sync now
            </Button>
          </div>
        </Card>
      )}

      {config?.last_sync_status === 'error' && config.last_sync_error && (
        <div style={{ marginBottom: 16 }}>
          <SectionMessage appearance="error" title="Last sync failed">
            <p>{config.last_sync_error}</p>
          </SectionMessage>
        </div>
      )}

      {/* Credentials */}
      <Card>
        <SectionTitle>Connection credentials</SectionTitle>

        <FieldRow
          label="Workspace name"
          hint="Display name shown in the admin panel"
        >
          <Textfield
            value={name}
            onChange={(e) => setName((e.target as HTMLInputElement).value)}
            placeholder="e.g. MoIM Notion workspace"
          />
        </FieldRow>

        <FieldRow
          label="Notion integration token"
          hint="Internal integration secret — starts with secret_. Never expose this publicly."
        >
          <Textfield
            value={token}
            onChange={(e) => setToken((e.target as HTMLInputElement).value)}
            placeholder="secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            type="password"
          />
        </FieldRow>

        <FieldRow
          label="Notion database URL"
          hint="The full URL of your Features database in Notion (not a page URL)."
        >
          <Textfield
            value={dbUrl}
            onChange={(e) => setDbUrl((e.target as HTMLInputElement).value)}
            placeholder="https://www.notion.so/workspace/abc123...?v=..."
          />
        </FieldRow>

        {testResult && (
          <div style={{ marginBottom: 12 }}>
            {testResult.ok ? (
              <SectionMessage appearance="confirmation" title={`Connected to "${testResult.title}"`}>
                <p>{testResult.rowCount} rows found. Configure field mapping in the next tab before saving.</p>
              </SectionMessage>
            ) : (
              <SectionMessage appearance="error" title="Connection failed">
                <p>{testResult.error}</p>
              </SectionMessage>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <Button
            appearance="default"
            isLoading={testing}
            onClick={testConnection}
          >
            Test connection
          </Button>
          <Button
            appearance="primary"
            isLoading={saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
          >
            {config?.id ? 'Save changes' : 'Connect Notion'}
          </Button>
        </div>
      </Card>

      {/* Sync settings */}
      <Card>
        <SectionTitle>Sync settings</SectionTitle>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0' }}>
          <div>
            <div style={{ fontSize: 14, color: T.text }}>Enable automatic sync</div>
            <div style={{ fontSize: 12, color: T.textSubtlest }}>Syncs daily at 02:00 UTC via pg_cron</div>
          </div>
          <Toggle
            isChecked={enabled}
            onChange={() => setEnabled((v) => !v)}
            label="Enable sync"
          />
        </div>
      </Card>

      {/* Webhook */}
      <Card>
        <SectionTitle>Webhook (comment sync)</SectionTitle>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 13, color: T.textSubtle, marginBottom: 8 }}>
            Register this URL in your Notion integration to receive comment events in real-time.
          </div>
          <div style={{
            background: T.surfaceSunken, border: `1px solid ${T.border}`,
            borderRadius: 4, padding: '8px 12px',
            fontFamily: 'var(--ds-font-family-code, monospace)',
            fontSize: 12, color: T.text, wordBreak: 'break-all',
          }}>
            {webhookUrl}
          </div>
        </div>
        <FieldRow
          label="Webhook secret"
          hint="Optional — Notion sends this in X-Notion-Signature to verify payloads."
        >
          <Textfield
            value={webhookSec}
            onChange={(e) => setWebhookSec((e.target as HTMLInputElement).value)}
            placeholder="whsec_xxxxxxxxxxxxxxxx"
            type="password"
          />
        </FieldRow>
      </Card>
    </div>
  );
}

// ── Tab 2: Field Mapping ──────────────────────────────────────────────────────
function FieldMappingTab({ config }: { config: any }) {
  const qc = useQueryClient();
  const [notionProps, setNotionProps] = useState<Array<{ id: string; name: string; type: string }>>([]);
  const [mapping,     setMapping]     = useState<Record<string, string>>(config?.field_mapping || {});
  const [loading,     setLoading]     = useState(false);
  const [loaded,      setLoaded]      = useState(false);

  const loadProps = useCallback(async () => {
    if (!config?.integration_token || !config?.database_id) return;
    setLoading(true);
    try {
      // Re-derive DB URL from stored database_id
      const raw   = config.database_id.replace(/-/g, '');
      const dbUrl = `https://www.notion.so/${raw}`;
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notion-fetch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ integrationToken: config.integration_token, databaseUrl: dbUrl }),
      });
      const data = await res.json();
      if (data.success) {
        setNotionProps(data.properties || []);
        setLoaded(true);
      } else {
        catalystToast.error(data.error || 'Failed to load Notion properties');
      }
    } catch (e: any) {
      catalystToast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [config]);

  useEffect(() => {
    if (config?.database_id && config?.integration_token) loadProps();
  }, [config?.database_id]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('notion_sync_config')
        .update({ field_mapping: mapping, updated_at: new Date().toISOString() })
        .eq('id', config.id);
      if (error) throw error;
    },
    onSuccess: () => {
      catalystToast.success('Field mapping saved');
      qc.invalidateQueries({ queryKey: ['notion-sync-config'] });
    },
    onError: (e: any) => catalystToast.error(e.message),
  });

  if (!config?.id) {
    return (
      <div style={{ paddingTop: 24 }}>
        <SectionMessage appearance="information" title="Connect Notion first">
          <p>Set up the connection in the Setup tab before configuring field mapping.</p>
        </SectionMessage>
      </div>
    );
  }

  const rows = notionProps.map((prop) => ({
    key: prop.id,
    cells: [
      {
        key: 'notion',
        content: (
          <div>
            <div style={{ fontSize: 13, color: T.text, fontWeight: 500 }}>{prop.name}</div>
            <div style={{ fontSize: 11, color: T.textSubtlest }}>{prop.type}</div>
          </div>
        ),
      },
      {
        key: 'arrow',
        content: <span style={{ color: T.textSubtlest }}>→</span>,
      },
      {
        key: 'catalyst',
        content: (
          <Select
            inputId={`map-${prop.id}`}
            options={BR_COLUMN_OPTIONS}
            value={BR_COLUMN_OPTIONS.find((o) => o.value === (mapping[prop.name] ?? '')) || null}
            onChange={(opt) =>
              setMapping((prev) => ({ ...prev, [prop.name]: (opt as any)?.value ?? '' }))
            }
            placeholder="Skip this field"
            menuPortalTarget={document.body}
            styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
          />
        ),
      },
    ],
  }));

  return (
    <div style={{ maxWidth: 780, paddingTop: 8 }}>
      <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 13, color: T.textSubtle }}>
          Map each Notion property to a business request field. Unmapped properties are ignored.
        </div>
        <Button appearance="default" isLoading={loading} onClick={loadProps}>
          Refresh properties
        </Button>
      </div>

      {!loaded && !loading && (
        <SectionMessage appearance="information" title="Loading Notion properties">
          <p>Fetching fields from the connected database…</p>
        </SectionMessage>
      )}

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
          <Spinner size="medium" />
        </div>
      )}

      {loaded && notionProps.length > 0 && (
        <>
          <DynamicTable
            head={{
              cells: [
                { key: 'notion',   content: 'Notion property', width: 35 },
                { key: 'arrow',    content: '',                 width: 5  },
                { key: 'catalyst', content: 'Business request field', width: 60 },
              ],
            }}
            rows={rows}
          />
          <div style={{ marginTop: 16 }}>
            <Button
              appearance="primary"
              isLoading={saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
            >
              Save mapping
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Tab 3: Sync Log ───────────────────────────────────────────────────────────
function SyncLogTab({ config }: { config: any }) {
  const { data: logs = [], isLoading } = useSyncLogs(config?.id);

  if (!config?.id) {
    return (
      <div style={{ paddingTop: 24 }}>
        <SectionMessage appearance="information" title="Connect Notion first">
          <p>No sync history available — connect Notion in the Setup tab first.</p>
        </SectionMessage>
      </div>
    );
  }

  if (isLoading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><Spinner size="medium" /></div>;
  }

  if (logs.length === 0) {
    return (
      <div style={{ paddingTop: 24 }}>
        <SectionMessage appearance="information" title="No sync runs yet">
          <p>Trigger a manual sync from the Setup tab or wait for the daily cron.</p>
        </SectionMessage>
      </div>
    );
  }

  const rows = logs.map((log: any) => ({
    key: log.id,
    cells: [
      {
        key: 'time',
        content: (
          <div>
            <div style={{ fontSize: 13, color: T.text }}>
              {format(new Date(log.started_at), 'dd MMM yyyy, HH:mm')}
            </div>
            <div style={{ fontSize: 11, color: T.textSubtlest }}>
              {log.triggered_by === 'manual' ? 'Manual' : 'Scheduled'}
            </div>
          </div>
        ),
      },
      {
        key: 'status',
        content: (
          log.status === 'ok'      ? <Lozenge appearance="success">Success</Lozenge>  :
          log.status === 'error'   ? <Lozenge appearance="removed">Failed</Lozenge>   :
          log.status === 'running' ? <Lozenge appearance="inprogress">Running</Lozenge> :
          <Lozenge appearance="default">{log.status}</Lozenge>
        ),
      },
      {
        key: 'records',
        content: (
          <div style={{ fontSize: 13, color: T.textSubtle }}>
            {log.records_synced != null && <><strong>{log.records_synced}</strong> synced</>}
            {log.records_skipped != null && <>, {log.records_skipped} skipped</>}
          </div>
        ),
      },
      {
        key: 'duration',
        content: (
          <div style={{ fontSize: 12, color: T.textSubtlest }}>
            {log.finished_at
              ? `${Math.round((new Date(log.finished_at).getTime() - new Date(log.started_at).getTime()) / 1000)}s`
              : '—'}
          </div>
        ),
      },
      {
        key: 'error',
        content: log.error_message
          ? <span style={{ fontSize: 12, color: T.dangerText }}>{log.error_message}</span>
          : null,
      },
    ],
  }));

  return (
    <div style={{ paddingTop: 8 }}>
      <DynamicTable
        head={{
          cells: [
            { key: 'time',     content: 'Started',   width: 25 },
            { key: 'status',   content: 'Status',    width: 15 },
            { key: 'records',  content: 'Records',   width: 20 },
            { key: 'duration', content: 'Duration',  width: 15 },
            { key: 'error',    content: 'Error',     width: 25 },
          ],
        }}
        rows={rows}
        isLoading={isLoading}
      />
    </div>
  );
}

// ── Tab 4: Comments ───────────────────────────────────────────────────────────
function CommentsTab() {
  const { data: comments = [], isLoading } = useNotionComments();

  if (isLoading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><Spinner size="medium" /></div>;
  }

  if (comments.length === 0) {
    return (
      <div style={{ paddingTop: 24 }}>
        <SectionMessage appearance="information" title="No Notion comments synced yet">
          <p>Comments from Notion pages will appear here once the webhook is configured and a comment is posted in Notion.</p>
        </SectionMessage>
      </div>
    );
  }

  const rows = comments.map((c: any) => ({
    key: c.id,
    cells: [
      {
        key: 'body',
        content: (
          <div style={{ fontSize: 13, color: T.text }}>
            <Lozenge appearance="new">Notion</Lozenge>
            <span style={{ marginLeft: 8 }}>{c.body}</span>
          </div>
        ),
      },
      {
        key: 'page',
        content: (
          <div style={{ fontSize: 12, color: T.textSubtlest, fontFamily: 'var(--ds-font-family-code, monospace)' }}>
            {c.notion_page_id?.slice(0, 8)}…
          </div>
        ),
      },
      {
        key: 'when',
        content: (
          <div style={{ fontSize: 12, color: T.textSubtlest }}>
            {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
          </div>
        ),
      },
    ],
  }));

  return (
    <div style={{ paddingTop: 8 }}>
      <div style={{ marginBottom: 12, fontSize: 13, color: T.textSubtle }}>
        Showing last 50 comments synced from Notion.
        <Badge max={999}>{comments.length}</Badge>
      </div>
      <DynamicTable
        head={{
          cells: [
            { key: 'body', content: 'Comment',       width: 65 },
            { key: 'page', content: 'Notion page',   width: 20 },
            { key: 'when', content: 'Received',       width: 15 },
          ],
        }}
        rows={rows}
      />
    </div>
  );
}

// ── Root page ─────────────────────────────────────────────────────────────────
export default function NotionConnectionPage() {
  const { data: config, isLoading, refetch } = useNotionConfig();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 64 }}>
        <Spinner size="large" />
      </div>
    );
  }

  return (
    <AdminGuard>
      <div style={{ padding: '32px 48px', maxWidth: 860 }}>
        {/* Page header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
          <NotionIcon size={48} />
          <div>
            <h1 style={{
              margin: 0, fontSize: 24, fontWeight: 653,
              color: T.text, lineHeight: '28px',
              fontFamily: 'var(--ds-font-family-heading, "Atlassian Sans", sans-serif)',
            }}>
              Notion
            </h1>
            <div style={{ marginTop: 4 }}>
              {config
                ? <Lozenge appearance="success">Connected</Lozenge>
                : <Lozenge appearance="default">Not connected</Lozenge>}
            </div>
          </div>
        </div>

        <p style={{
          margin: '0 0 24px', fontSize: 14, lineHeight: '20px',
          color: T.textSubtle,
        }}>
          Sync business requests from the Notion Features database into Catalyst.
          Notion is the source of truth — all mapped fields update on each sync.
          Comments posted in Notion appear in the business request activity feed.
        </p>

        <Tabs id="notion-connection-tabs">
          <TabList>
            <Tab>Setup</Tab>
            <Tab>Field mapping</Tab>
            <Tab>Sync log</Tab>
            <Tab>Comments</Tab>
          </TabList>

          <TabPanel>
            <SetupTab config={config} onSaved={() => refetch()} />
          </TabPanel>
          <TabPanel>
            <FieldMappingTab config={config} />
          </TabPanel>
          <TabPanel>
            <SyncLogTab config={config} />
          </TabPanel>
          <TabPanel>
            <CommentsTab />
          </TabPanel>
        </Tabs>
      </div>
    </AdminGuard>
  );
}
