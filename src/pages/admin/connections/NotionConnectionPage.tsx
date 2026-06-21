/**
 * NotionConnectionPage
 * Route: /admin/connections/notion
 *
 * Multi-source Notion sync management.
 * Each notion_sync_config row = one Notion database source.
 *
 * Flow:
 *   Sources list → "Add source" opens 3-step wizard:
 *     Step 1: Token + URL + name → Test connection
 *     Step 2: Schema preview (Notion properties + sample values) + field mapping
 *     Step 3: Preview transformation (3 sample rows → BR records)
 *   → Save
 *
 * ADS tokens only, @atlaskit/* components only.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
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

// ── ADS token map ─────────────────────────────────────────────────────────────
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
} as const;

// ── Notion icon ───────────────────────────────────────────────────────────────
function NotionIcon({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="6" fill={T.neutral} />
      <text x="8" y="23" fontSize="18" fontWeight="700" fill={T.text} fontFamily="serif">N</text>
    </svg>
  );
}

// ── Layout primitives ─────────────────────────────────────────────────────────
function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: T.surface, border: `1px solid ${T.border}`,
      borderRadius: 8, padding: '16px 24px', marginBottom: 16, ...style,
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
      marginBottom: 12, paddingBottom: 6, borderBottom: `1px solid ${T.border}`,
    }}>
      {children}
    </div>
  );
}

function FieldRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <Label htmlFor={label.toLowerCase().replace(/\s/g, '-')}>{label}</Label>
      {hint && <div style={{ fontSize: 12, color: T.textSubtlest, marginBottom: 4 }}>{hint}</div>}
      {children}
    </div>
  );
}

// ── BR column options for mapping ─────────────────────────────────────────────
const BR_COLUMN_OPTIONS = [
  { value: '',               label: '— Skip this field —' },
  { value: 'title',          label: 'Title' },
  { value: 'description',    label: 'Description' },
  { value: 'request_type',   label: 'Request type' },
  { value: 'category',       label: 'Category' },
  { value: 'theme',          label: 'Theme' },
  { value: 'stakeholders',   label: 'Stakeholders' },
  { value: 'targeted_feature', label: 'Targeted feature' },
  { value: 'urgency',        label: 'Priority / Urgency' },
  { value: 'end_date',       label: 'Target date' },
  { value: 'planned_quarter', label: 'Planned quarter' },
  { value: 'scope_url',      label: 'Scope URL' },
  { value: 'arabic_title',   label: 'Arabic title' },
  { value: 'process_step',   label: 'Process step / Status' },
];

// ── API helpers ───────────────────────────────────────────────────────────────
const SUPABASE_URL     = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

async function callNotionFetch(integrationToken: string, databaseUrl: string) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/notion-fetch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
    body: JSON.stringify({ integrationToken, databaseUrl }),
  });
  return res.json();
}

// ── Hooks ─────────────────────────────────────────────────────────────────────
function useAllConfigs() {
  return useQuery({
    queryKey: ['notion-sync-configs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notion_sync_config')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });
}

function useSyncLogs(configId?: string) {
  return useQuery({
    queryKey: ['notion-sync-log', configId ?? 'all'],
    queryFn: async () => {
      let q = supabase
        .from('notion_sync_log')
        .select('*, notion_sync_config(source_label)')
        .order('started_at', { ascending: false })
        .limit(30);
      if (configId) q = q.eq('config_id', configId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
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

// ── Wizard state ──────────────────────────────────────────────────────────────
interface WizardState {
  step: 1 | 2 | 3;
  token: string;
  dbUrl: string;
  sourceLabel: string;
  webhookSecret: string;
  syncEnabled: boolean;
  // set after step 1
  testResult: { ok: boolean; title?: string; dbId?: string; properties?: NotionProp[]; rows?: any[]; error?: string } | null;
  // set during step 2
  mapping: Record<string, string>;
}

interface NotionProp {
  id: string;
  name: string;
  type: string;
  sample?: string;
}

const WIZARD_INIT: WizardState = {
  step: 1,
  token: '',
  dbUrl: '',
  sourceLabel: 'Notion database',
  webhookSecret: '',
  syncEnabled: true,
  testResult: null,
  mapping: {},
};

// ── Step 1: Credentials ───────────────────────────────────────────────────────
function WizardStep1({
  state, onChange, onNext,
}: {
  state: WizardState;
  onChange: (patch: Partial<WizardState>) => void;
  onNext: () => void;
}) {
  const [testing, setTesting] = useState(false);

  const testAndNext = useCallback(async () => {
    if (!state.token || !state.dbUrl) {
      catalystToast.warning('Enter integration token and database URL first');
      return;
    }
    setTesting(true);
    try {
      const data = await callNotionFetch(state.token, state.dbUrl);
      if (data.success) {
        onChange({
          testResult: {
            ok: true,
            title: data.databaseTitle,
            dbId:  data.databaseId,
            properties: data.properties || [],
            rows:  data.rows || [],
          },
        });
        onNext();
      } else {
        onChange({ testResult: { ok: false, error: data.error || 'Connection failed' } });
      }
    } catch (e: any) {
      onChange({ testResult: { ok: false, error: e.message } });
    } finally {
      setTesting(false);
    }
  }, [state.token, state.dbUrl, onChange, onNext]);

  return (
    <div>
      <div style={{ marginBottom: 20, fontSize: 14, color: T.textSubtle }}>
        Enter your Notion integration token and the URL of the database you want to sync.
        The system will read the database schema and let you map columns to business request fields.
      </div>

      <FieldRow label="Source label" hint="Short name shown in the source list (e.g. 'Features DB', 'MoIM Roadmap')">
        <Textfield
          value={state.sourceLabel}
          onChange={(e) => onChange({ sourceLabel: (e.target as HTMLInputElement).value })}
          placeholder="Features database"
        />
      </FieldRow>

      <FieldRow label="Notion integration token" hint="Internal secret starting with secret_ — from notion.so/my-integrations">
        <Textfield
          value={state.token}
          onChange={(e) => onChange({ token: (e.target as HTMLInputElement).value })}
          placeholder="secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
          type="password"
        />
      </FieldRow>

      <FieldRow label="Notion database URL" hint="Full URL of the Notion database (not a page) — copy from browser address bar">
        <Textfield
          value={state.dbUrl}
          onChange={(e) => onChange({ dbUrl: (e.target as HTMLInputElement).value })}
          placeholder="https://www.notion.so/workspace/abc123...?v=..."
        />
      </FieldRow>

      {state.testResult && !state.testResult.ok && (
        <div style={{ marginBottom: 12 }}>
          <SectionMessage appearance="error" title="Connection failed">
            <p>{state.testResult.error}</p>
          </SectionMessage>
        </div>
      )}

      <Button appearance="primary" isLoading={testing} onClick={testAndNext}>
        Connect and load schema →
      </Button>
    </div>
  );
}

// ── Step 2: Schema preview + mapping ─────────────────────────────────────────
function WizardStep2({
  state, onChange, onBack, onNext,
}: {
  state: WizardState;
  onChange: (patch: Partial<WizardState>) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const props = state.testResult?.properties || [];

  const rows = props.map((prop) => ({
    key: prop.id,
    cells: [
      {
        key: 'notion',
        content: (
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: T.text }}>{prop.name}</div>
            <div style={{ fontSize: 11, color: T.textSubtlest }}>{prop.type}</div>
          </div>
        ),
      },
      {
        key: 'sample',
        content: (
          <div style={{
            fontSize: 12, color: T.textSubtle, maxWidth: 160,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {prop.sample || <span style={{ color: T.textSubtlest }}>—</span>}
          </div>
        ),
      },
      {
        key: 'arrow',
        content: <span style={{ color: T.textSubtlest, fontSize: 16 }}>→</span>,
      },
      {
        key: 'catalyst',
        content: (
          <Select
            inputId={`map-${prop.id}`}
            options={BR_COLUMN_OPTIONS}
            value={BR_COLUMN_OPTIONS.find((o) => o.value === (state.mapping[prop.name] ?? '')) || BR_COLUMN_OPTIONS[0]}
            onChange={(opt) =>
              onChange({ mapping: { ...state.mapping, [prop.name]: (opt as any)?.value ?? '' } })
            }
            menuPortalTarget={document.body}
            styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
          />
        ),
      },
    ],
  }));

  const mappedCount = Object.values(state.mapping).filter(Boolean).length;

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: T.text, marginBottom: 4 }}>
          {state.testResult?.title}
        </div>
        <div style={{ fontSize: 13, color: T.textSubtle }}>
          {props.length} columns found · {state.testResult?.rows?.length ?? 0} rows · {mappedCount} mapped
        </div>
      </div>

      <div style={{ marginBottom: 12, fontSize: 13, color: T.textSubtle }}>
        Map each Notion column to a business request field.
        The <strong>Sample value</strong> column shows a real value from the first row so you can identify each column.
      </div>

      {props.length > 0 ? (
        <DynamicTable
          head={{
            cells: [
              { key: 'notion',   content: 'Notion column',   width: 28 },
              { key: 'sample',   content: 'Sample value',    width: 22 },
              { key: 'arrow',    content: '',                 width: 5  },
              { key: 'catalyst', content: 'Business request field', width: 45 },
            ],
          }}
          rows={rows}
        />
      ) : (
        <SectionMessage appearance="warning" title="No properties found">
          <p>The database returned no columns. Check that your integration has access to this database.</p>
        </SectionMessage>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <Button appearance="default" onClick={onBack}>← Back</Button>
        <Button appearance="primary" onClick={onNext} isDisabled={mappedCount === 0}>
          Preview transformation →
        </Button>
      </div>
    </div>
  );
}

// ── Step 3: Preview transformation ───────────────────────────────────────────
function flattenNotionProp(prop: any): string {
  if (!prop) return '';
  switch (prop.type) {
    case 'title':        return prop.title?.[0]?.plain_text || '';
    case 'rich_text':    return prop.rich_text?.[0]?.plain_text || '';
    case 'select':       return prop.select?.name || '';
    case 'multi_select': return prop.multi_select?.map((s: any) => s.name).join(', ') || '';
    case 'status':       return prop.status?.name || '';
    case 'date':         return prop.date?.start || '';
    case 'number':       return String(prop.number ?? '');
    case 'checkbox':     return prop.checkbox ? 'Yes' : 'No';
    case 'people':       return prop.people?.[0]?.name || '';
    case 'url':          return prop.url || '';
    default:             return '';
  }
}

function previewTransform(page: any, mapping: Record<string, string>): Record<string, string> {
  const br: Record<string, string> = { notion_page_id: page.id };
  for (const [propName, brCol] of Object.entries(mapping)) {
    if (!brCol) continue;
    const val = flattenNotionProp(page.properties?.[propName]);
    if (val) br[brCol] = val;
  }
  return br;
}

function WizardStep3({
  state, onChange, onBack, onSave, saving,
}: {
  state: WizardState;
  onChange: (patch: Partial<WizardState>) => void;
  onBack: () => void;
  onSave: () => void;
  saving: boolean;
}) {
  const sampleRows = (state.testResult?.rows || []).slice(0, 3);
  const WEBHOOK_URL = `${SUPABASE_URL}/functions/v1/notion-webhook`;

  return (
    <div>
      <div style={{ marginBottom: 16, fontSize: 13, color: T.textSubtle }}>
        Preview: how the first {sampleRows.length} Notion rows will become business request records.
        Each column shown is a mapped field.
      </div>

      {sampleRows.length === 0 ? (
        <SectionMessage appearance="information" title="No rows to preview">
          <p>The database is empty. Field mapping looks correct — save to proceed.</p>
        </SectionMessage>
      ) : (
        <div style={{ marginBottom: 20 }}>
          {sampleRows.map((row: any, i: number) => {
            const preview = previewTransform(row, state.mapping);
            const fields = Object.entries(preview).filter(([k]) => k !== 'notion_page_id');
            return (
              <div key={row.id} style={{
                background: T.surfaceSunken, border: `1px solid ${T.border}`,
                borderRadius: 6, padding: '12px 16px', marginBottom: 10,
              }}>
                <div style={{ fontSize: 11, fontWeight: 653, color: T.textSubtlest, marginBottom: 8 }}>
                  ROW {i + 1} PREVIEW
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '4px 12px' }}>
                  {fields.map(([col, val]) => (
                    <>
                      <div key={`${col}-label`} style={{ fontSize: 12, fontWeight: 500, color: T.textSubtle }}>{col}</div>
                      <div key={`${col}-val`} style={{ fontSize: 12, color: T.text, wordBreak: 'break-word' }}>{val}</div>
                    </>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Sync settings */}
      <Card>
        <SectionTitle>Sync settings</SectionTitle>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 14, color: T.text }}>Enable automatic sync</div>
            <div style={{ fontSize: 12, color: T.textSubtlest }}>Daily at 02:00 UTC via pg_cron</div>
          </div>
          <Toggle isChecked={state.syncEnabled} onChange={() => onChange({ syncEnabled: !state.syncEnabled })} label="Enable sync" />
        </div>

        <FieldRow label="Webhook secret" hint="Optional — register the URL below in your Notion integration for real-time comment sync">
          <Textfield
            value={state.webhookSecret}
            onChange={(e) => onChange({ webhookSecret: (e.target as HTMLInputElement).value })}
            placeholder="whsec_xxxxxxxxxxxxxxxx"
            type="password"
          />
        </FieldRow>

        <div style={{
          background: T.surfaceSunken, border: `1px solid ${T.border}`, borderRadius: 4,
          padding: '8px 12px', fontFamily: 'var(--ds-font-family-code, monospace)',
          fontSize: 11, color: T.text, wordBreak: 'break-all', marginTop: 4,
        }}>
          {WEBHOOK_URL}
        </div>
      </Card>

      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <Button appearance="default" onClick={onBack}>← Back</Button>
        <Button appearance="primary" isLoading={saving} onClick={onSave}>
          Save source
        </Button>
      </div>
    </div>
  );
}

// ── Wizard shell ──────────────────────────────────────────────────────────────
const STEP_LABELS = ['1. Connect', '2. Map columns', '3. Preview & save'];

function AddSourceWizard({
  existingConfig,
  onClose,
  onSaved,
}: {
  existingConfig?: any;
  onClose: () => void;
  onSaved: () => void;
}) {
  const qc = useQueryClient();

  const [state, setState] = useState<WizardState>(() => {
    if (existingConfig) {
      const raw = existingConfig.database_id?.replace(/-/g, '') || '';
      const dbUrl = raw ? `https://www.notion.so/${raw}` : '';
      return {
        ...WIZARD_INIT,
        token: existingConfig.integration_token || '',
        dbUrl,
        sourceLabel: existingConfig.source_label || existingConfig.workspace_name || 'Notion database',
        webhookSecret: existingConfig.webhook_secret || '',
        syncEnabled: existingConfig.sync_enabled ?? true,
        mapping: existingConfig.field_mapping || {},
      };
    }
    return WIZARD_INIT;
  });

  const patch = (p: Partial<WizardState>) => setState((s) => ({ ...s, ...p }));
  const goStep = (step: 1 | 2 | 3) => patch({ step });

  const [saving, setSaving] = useState(false);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      const dbId = state.testResult?.dbId || existingConfig?.database_id || '';
      const payload = {
        source_label:      state.sourceLabel,
        workspace_name:    state.sourceLabel,
        integration_token: state.token,
        database_id:       dbId,
        database_title:    state.testResult?.title || existingConfig?.database_title,
        webhook_secret:    state.webhookSecret || null,
        sync_enabled:      state.syncEnabled,
        field_mapping:     state.mapping,
        updated_at:        new Date().toISOString(),
      };

      if (existingConfig?.id) {
        const { error } = await supabase.from('notion_sync_config').update(payload).eq('id', existingConfig.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('notion_sync_config').insert(payload);
        if (error) throw error;
      }
      catalystToast.success(`${state.sourceLabel} saved`);
      qc.invalidateQueries({ queryKey: ['notion-sync-configs'] });
      onSaved();
    } catch (e: any) {
      catalystToast.error(e.message);
    } finally {
      setSaving(false);
    }
  }, [state, existingConfig, qc, onSaved]);

  return (
    <div style={{
      background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8,
      marginBottom: 24,
    }}>
      {/* Wizard header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 24px', borderBottom: `1px solid ${T.border}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {STEP_LABELS.map((label, i) => {
            const stepNum = (i + 1) as 1 | 2 | 3;
            const active  = state.step === stepNum;
            const done    = state.step > stepNum;
            return (
              <div key={label} style={{
                fontSize: 13,
                fontWeight: active ? 600 : 400,
                color: active ? T.text : done ? T.link : T.textSubtlest,
                cursor: done ? 'pointer' : 'default',
              }} onClick={() => done ? goStep(stepNum) : undefined}>
                {done ? '✓ ' : ''}{label}
              </div>
            );
          })}
        </div>
        <Button appearance="subtle" onClick={onClose}>Cancel</Button>
      </div>

      <div style={{ padding: '24px 32px' }}>
        {state.step === 1 && (
          <WizardStep1
            state={state}
            onChange={patch}
            onNext={() => goStep(2)}
          />
        )}
        {state.step === 2 && (
          <WizardStep2
            state={state}
            onChange={patch}
            onBack={() => goStep(1)}
            onNext={() => goStep(3)}
          />
        )}
        {state.step === 3 && (
          <WizardStep3
            state={state}
            onChange={patch}
            onBack={() => goStep(2)}
            onSave={save}
            saving={saving}
          />
        )}
      </div>
    </div>
  );
}

// ── Source card ───────────────────────────────────────────────────────────────
function SourceCard({ config, onConfigure }: { config: any; onConfigure: () => void }) {
  const qc = useQueryClient();

  const triggerSync = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/notion-sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ config_id: config.id, triggered_by: 'manual' }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || data.results?.[0]?.error || 'Sync failed');
      return data;
    },
    onSuccess: (data) => {
      const r = data.results?.[0];
      catalystToast.success(`Synced ${r?.synced ?? data.synced} records from ${config.source_label}`);
      qc.invalidateQueries({ queryKey: ['notion-sync-configs'] });
      qc.invalidateQueries({ queryKey: ['notion-sync-log'] });
    },
    onError: (e: any) => catalystToast.error(e.message),
  });

  const deleteSource = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('notion_sync_config').delete().eq('id', config.id);
      if (error) throw error;
    },
    onSuccess: () => {
      catalystToast.success(`${config.source_label} removed`);
      qc.invalidateQueries({ queryKey: ['notion-sync-configs'] });
    },
    onError: (e: any) => catalystToast.error(e.message),
  });

  const syncStatus = config.last_sync_status;
  const lastSync   = config.last_sync_at
    ? formatDistanceToNow(new Date(config.last_sync_at), { addSuffix: true })
    : null;

  return (
    <div style={{
      background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8,
      padding: '16px 20px', marginBottom: 12,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
        <NotionIcon size={36} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: T.text, marginBottom: 2 }}>
            {config.source_label}
          </div>
          <div style={{ fontSize: 12, color: T.textSubtlest }}>
            {config.database_title || config.database_id?.slice(0, 8) + '…'}
          </div>
          {lastSync && (
            <div style={{ fontSize: 11, color: T.textSubtlest, marginTop: 2 }}>
              Synced {lastSync} · {config.last_sync_count ?? 0} records
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {syncStatus === 'ok'      && <Lozenge appearance="success">Connected</Lozenge>}
        {syncStatus === 'error'   && <Lozenge appearance="removed">Error</Lozenge>}
        {syncStatus === 'running' && <Lozenge appearance="inprogress">Syncing</Lozenge>}
        {!syncStatus              && <Lozenge appearance="default">Not synced</Lozenge>}
        {!config.sync_enabled     && <Lozenge appearance="default">Disabled</Lozenge>}

        <Button appearance="subtle" onClick={onConfigure}>Configure</Button>
        <Button
          appearance="default"
          isLoading={triggerSync.isPending}
          onClick={() => triggerSync.mutate()}
        >
          Sync now
        </Button>
        <Button
          appearance="subtle"
          isDisabled={deleteSource.isPending}
          onClick={() => {
            if (confirm(`Remove "${config.source_label}"? This won't delete synced business requests.`)) {
              deleteSource.mutate();
            }
          }}
        >
          Remove
        </Button>
      </div>
    </div>
  );
}

// ── Sources tab ───────────────────────────────────────────────────────────────
function SourcesTab({ configs, isLoading, onRefresh }: { configs: any[]; isLoading: boolean; onRefresh: () => void }) {
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editConfig, setEditConfig] = useState<any>(null);

  const openAdd = () => { setEditConfig(null); setWizardOpen(true); };
  const openEdit = (cfg: any) => { setEditConfig(cfg); setWizardOpen(true); };
  const closeWizard = () => setWizardOpen(false);
  const afterSave = () => { closeWizard(); onRefresh(); };

  if (isLoading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><Spinner size="medium" /></div>;
  }

  return (
    <div style={{ paddingTop: 8 }}>
      {/* Wizard (inline, above source list) */}
      {wizardOpen && (
        <AddSourceWizard
          existingConfig={editConfig}
          onClose={closeWizard}
          onSaved={afterSave}
        />
      )}

      {/* Add source button */}
      {!wizardOpen && (
        <div style={{ marginBottom: 16 }}>
          <Button appearance="primary" onClick={openAdd}>
            + Add Notion source
          </Button>
        </div>
      )}

      {/* Source cards */}
      {configs.length === 0 && !wizardOpen && (
        <SectionMessage appearance="information" title="No sources connected">
          <p>Click "Add Notion source" to connect a Notion database. You can add multiple databases — each syncs independently to business requests.</p>
        </SectionMessage>
      )}

      {configs.map((cfg) => (
        <SourceCard key={cfg.id} config={cfg} onConfigure={() => openEdit(cfg)} />
      ))}
    </div>
  );
}

// ── Sync log tab ──────────────────────────────────────────────────────────────
function SyncLogTab() {
  const { data: logs = [], isLoading } = useSyncLogs();

  if (isLoading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><Spinner size="medium" /></div>;
  }

  if (logs.length === 0) {
    return (
      <div style={{ paddingTop: 24 }}>
        <SectionMessage appearance="information" title="No sync runs yet">
          <p>Trigger a manual sync from the Sources tab or wait for the daily cron at 02:00 UTC.</p>
        </SectionMessage>
      </div>
    );
  }

  const rows = logs.map((log: any) => ({
    key: log.id,
    cells: [
      {
        key: 'source',
        content: (
          <div style={{ fontSize: 12, fontWeight: 500, color: T.textSubtle }}>
            {(log.notion_sync_config as any)?.source_label || '—'}
          </div>
        ),
      },
      {
        key: 'time',
        content: (
          <div>
            <div style={{ fontSize: 13, color: T.text }}>{format(new Date(log.started_at), 'dd MMM yyyy, HH:mm')}</div>
            <div style={{ fontSize: 11, color: T.textSubtlest }}>{log.triggered_by === 'manual' ? 'Manual' : 'Scheduled'}</div>
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
            { key: 'source',   content: 'Source',    width: 20 },
            { key: 'time',     content: 'Started',   width: 22 },
            { key: 'status',   content: 'Status',    width: 13 },
            { key: 'records',  content: 'Records',   width: 18 },
            { key: 'duration', content: 'Duration',  width: 12 },
            { key: 'error',    content: 'Error',     width: 15 },
          ],
        }}
        rows={rows}
        isLoading={isLoading}
      />
    </div>
  );
}

// ── Comments tab ──────────────────────────────────────────────────────────────
function CommentsTab() {
  const { data: comments = [], isLoading } = useNotionComments();

  if (isLoading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><Spinner size="medium" /></div>;
  }

  if (comments.length === 0) {
    return (
      <div style={{ paddingTop: 24 }}>
        <SectionMessage appearance="information" title="No Notion comments synced yet">
          <p>Register the webhook URL (shown in Step 3 of each source) in your Notion integration.
          Comments posted in Notion pages will then appear here in real-time.</p>
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
        Last 50 comments synced from Notion · <Badge max={999}>{comments.length}</Badge>
      </div>
      <DynamicTable
        head={{
          cells: [
            { key: 'body', content: 'Comment',     width: 65 },
            { key: 'page', content: 'Notion page', width: 20 },
            { key: 'when', content: 'Received',    width: 15 },
          ],
        }}
        rows={rows}
      />
    </div>
  );
}

// ── Root page ─────────────────────────────────────────────────────────────────
export default function NotionConnectionPage() {
  const { data: configs = [], isLoading, refetch } = useAllConfigs();

  const connected = configs.length > 0;

  return (
    <AdminGuard>
      <div style={{ padding: '32px 48px', maxWidth: 900 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
          <NotionIcon size={48} />
          <div>
            <h1 style={{
              margin: 0, fontSize: 24, fontWeight: 653, color: T.text, lineHeight: '28px',
              fontFamily: 'var(--ds-font-family-heading, "Atlassian Sans", sans-serif)',
            }}>
              Notion
            </h1>
            <div style={{ marginTop: 4, display: 'flex', gap: 8, alignItems: 'center' }}>
              {connected
                ? <Lozenge appearance="success">{configs.length} source{configs.length > 1 ? 's' : ''} connected</Lozenge>
                : <Lozenge appearance="default">Not connected</Lozenge>}
            </div>
          </div>
        </div>

        <p style={{ margin: '0 0 24px', fontSize: 14, lineHeight: '20px', color: T.textSubtle }}>
          Connect one or more Notion databases and sync rows as business requests in Catalyst.
          Each database is an independent source — add, configure, and sync them separately.
          Comments posted in Notion appear in the business request activity feed via webhook.
        </p>

        <Tabs id="notion-connection-tabs">
          <TabList>
            <Tab>Sources</Tab>
            <Tab>Sync log</Tab>
            <Tab>Comments</Tab>
          </TabList>

          <TabPanel>
            <SourcesTab configs={configs} isLoading={isLoading} onRefresh={refetch} />
          </TabPanel>
          <TabPanel>
            <SyncLogTab />
          </TabPanel>
          <TabPanel>
            <CommentsTab />
          </TabPanel>
        </Tabs>
      </div>
    </AdminGuard>
  );
}
