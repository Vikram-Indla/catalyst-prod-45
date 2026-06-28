/**
 * NotionConnectionPage — redesigned v2
 * Route: /admin/connections/notion
 *
 * Sources list with health dot, stats, Riyadh time, Pause/Resume, Disconnect.
 * 3-step wizard: Connect → Map + Exclusions → Schedule & Settings.
 * Comment sync toggle per source. Admin notifications after sync.
 * All times displayed in AST (Riyadh, UTC+3, no DST).
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
import InlineMessage from '@atlaskit/inline-message';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/lib/catalystToast';
import { AdminGuard } from '@/components/admin/AdminGuard';

// ── ADS tokens ────────────────────────────────────────────────────────────────
const T = {
  surface:       'var(--ds-surface)',
  surfaceSunken: 'var(--ds-surface-sunken)',
  neutral:       'var(--ds-background-neutral)',
  text:          'var(--ds-text)',
  textSubtle:    'var(--ds-text-subtle)',
  textSubtlest:  'var(--ds-text-subtlest)',
  border:        'var(--ds-border)',
  link:          'var(--ds-link)',
  success:       'var(--ds-background-success)',
  successBold:   'var(--ds-background-success-bold)',
  danger:        'var(--ds-background-danger)',
  dangerBold:    'var(--ds-background-danger-bold)',
  dangerText:    'var(--ds-text-danger)',
  warning:       'var(--ds-background-warning)',
  warningBold:   'var(--ds-background-warning-bold)',
  info:          'var(--ds-background-information)',
} as const;

// ── Riyadh time helpers (AST = UTC+3, no DST) ─────────────────────────────────
const RIYADH_TZ = 'Asia/Riyadh';

function formatRiyadh(date: string | Date, style: 'datetime' | 'time' | 'relative' = 'datetime'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '—';

  if (style === 'relative') {
    const diffMs   = Date.now() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1)  return 'just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24)  return `${diffHrs}h ago`;
    return `${Math.floor(diffHrs / 24)}d ago`;
  }

  const fmt = new Intl.DateTimeFormat('en-SA', {
    timeZone: RIYADH_TZ,
    ...(style === 'time'
      ? { hour: '2-digit', minute: '2-digit', hour12: false }
      : { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false }),
  });
  return fmt.format(d) + ' AST';
}

function nextSyncRiyadh(scheduleTime: string, syncMode: string): string {
  if (syncMode === 'manual') return 'Manual only';
  const [h, m] = (scheduleTime || '08:00').split(':').map(Number);
  // Compute next occurrence of HH:MM in Riyadh (UTC+3) as UTC time
  const nowUtcMs = Date.now();
  const riyadhOffsetMs = 3 * 60 * 60 * 1000;
  const riyadhNow = new Date(nowUtcMs + riyadhOffsetMs); // fake UTC treating as Riyadh

  const targetUtc = new Date(Date.UTC(
    riyadhNow.getUTCFullYear(), riyadhNow.getUTCMonth(), riyadhNow.getUTCDate(),
    h - 3, m, 0, 0, // h-3 converts Riyadh hour → UTC hour
  ));
  if (targetUtc.getTime() <= nowUtcMs) {
    targetUtc.setUTCDate(targetUtc.getUTCDate() + 1);
  }

  return new Intl.DateTimeFormat('en-SA', {
    timeZone: RIYADH_TZ, weekday: 'short',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(targetUtc) + ' AST';
}

// ── Icons / primitives ────────────────────────────────────────────────────────
function NotionIcon({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="6" fill={T.neutral} />
      <text x="8" y="23" fontSize="18" fontWeight="700" fill={T.text} fontFamily="serif">N</text>
    </svg>
  );
}

function HealthDot({ status, paused }: { status?: string | null; paused?: boolean }) {
  const bg = paused
    ? T.warningBold
    : status === 'ok'      ? T.successBold
    : status === 'error'   ? T.dangerBold
    : T.border;
  return <div style={{ width: 8, height: 8, borderRadius: '50%', background: bg, flexShrink: 0 }} />;
}

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
      fontSize: 'var(--ds-font-size-200)', fontWeight: 653, color: T.textSubtlest,
      textTransform: 'uppercase' as const, letterSpacing: '0.04em',
      marginBottom: 12, paddingBottom: 4, borderBottom: `1px solid ${T.border}`,
    }}>
      {children}
    </div>
  );
}

function FieldRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <Label htmlFor={label.toLowerCase().replace(/\s/g, '-')}>{label}</Label>
      {hint && <div style={{ fontSize: 'var(--ds-font-size-200)', color: T.textSubtlest, marginBottom: 4 }}>{hint}</div>}
      {children}
    </div>
  );
}

// ── Auto-mapper ───────────────────────────────────────────────────────────────
function autoMapField(notionName: string): string {
  const n = notionName.toLowerCase().replace(/[^a-z0-9]/g, '');
  const rules: Array<[RegExp, string]> = [
    [/^(name|title|featurename|feature|requestname)$/, 'title'],
    [/description|detail|body|desc/, 'description'],
    [/type|requesttype|brtype/, 'request_type'],
    [/status|processstep|process/, 'process_step'],
    [/^theme$/, 'theme'],
    [/category/, 'category'],
    [/stakeholder/, 'stakeholders'],
    [/priority|urgency/, 'urgency'],
    [/enddate|targetdate|duedate|target|due/, 'end_date'],
    [/quarter|plannedquarter/, 'planned_quarter'],
    [/arabic/, 'arabic_title'],
    [/scope|link|url/, 'scope_url'],
  ];
  for (const [re, col] of rules) if (re.test(n)) return col;
  return '';
}

// ── BR column options ─────────────────────────────────────────────────────────
const BR_COLUMN_OPTIONS = [
  { value: '',                label: '— Skip this field —' },
  { value: 'title',           label: 'Title' },
  { value: 'description',     label: 'Description' },
  { value: 'request_type',    label: 'Request type' },
  { value: 'category',        label: 'Category' },
  { value: 'theme',           label: 'Theme' },
  { value: 'stakeholders',    label: 'Stakeholders' },
  { value: 'targeted_feature',label: 'Targeted feature' },
  { value: 'urgency',         label: 'Priority / Urgency' },
  { value: 'end_date',        label: 'Target date' },
  { value: 'planned_quarter', label: 'Planned quarter' },
  { value: 'scope_url',       label: 'Scope URL' },
  { value: 'arabic_title',    label: 'Arabic title' },
  { value: 'process_step',    label: 'Process step / Status' },
];

// ── Exclusion rules ───────────────────────────────────────────────────────────
interface ExclusionRule {
  field: string;
  op: 'is' | 'is_not' | 'contains';
  value: string;
}

const OP_OPTIONS = [
  { value: 'is',       label: 'is' },
  { value: 'is_not',   label: 'is not' },
  { value: 'contains', label: 'contains' },
];

function ExclusionRulesEditor({
  rules, fields, onChange,
}: {
  rules: ExclusionRule[];
  fields: string[];
  onChange: (rules: ExclusionRule[]) => void;
}) {
  const fieldOpts = fields.map((f) => ({ value: f, label: f }));

  const add = () => onChange([...rules, { field: fields[0] || '', op: 'is', value: '' }]);
  const remove = (i: number) => onChange(rules.filter((_, idx) => idx !== i));
  const update = (i: number, patch: Partial<ExclusionRule>) =>
    onChange(rules.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  return (
    <div>
      <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 'var(--ds-font-size-300)', fontWeight: 500, color: T.text }}>
          Row exclusions
          {rules.length > 0 && (
            <span style={{ marginLeft: 8, fontSize: 'var(--ds-font-size-100)', color: T.textSubtlest }}>
              ({rules.length} rule{rules.length > 1 ? 's' : ''} — matching rows won't sync)
            </span>
          )}
        </div>
        <Button appearance="subtle" onClick={add}>+ Add rule</Button>
      </div>

      {rules.length === 0 && (
        <div style={{ fontSize: 'var(--ds-font-size-200)', color: T.textSubtlest, fontStyle: 'italic' }}>
          No exclusions — all rows will sync. Add a rule to skip rows matching a condition.
        </div>
      )}

      {rules.map((rule, i) => (
        <div key={i} style={{
          display: 'grid', gridTemplateColumns: '1fr 120px 1fr 32px', gap: 8,
          alignItems: 'center', marginBottom: 8,
          background: T.surfaceSunken, border: `1px solid ${T.border}`,
          borderRadius: 6, padding: '8px 12px',
        }}>
          <Select
            placeholder="Field"
            options={fieldOpts}
            value={fieldOpts.find((o) => o.value === rule.field) || null}
            onChange={(o) => update(i, { field: (o as any)?.value || '' })}
            menuPortalTarget={document.body}
            styles={{ menuPortal: (b) => ({ ...b, zIndex: 9999 }) }}
          />
          <Select
            options={OP_OPTIONS}
            value={OP_OPTIONS.find((o) => o.value === rule.op) || OP_OPTIONS[0]}
            onChange={(o) => update(i, { op: (o as any)?.value || 'is' })}
            menuPortalTarget={document.body}
            styles={{ menuPortal: (b) => ({ ...b, zIndex: 9999 }) }}
          />
          <Textfield
            value={rule.value}
            onChange={(e) => update(i, { value: (e.target as HTMLInputElement).value })}
            placeholder="Value"
          />
          <button
            onClick={() => remove(i)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: T.dangerText, fontSize: 'var(--ds-font-size-500)', lineHeight: 1, padding: 4,
            }}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

// ── API helpers ───────────────────────────────────────────────────────────────
const SUPABASE_URL      = import.meta.env.VITE_SUPABASE_URL as string;
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
interface NotionProp {
  id: string;
  name: string;
  type: string;
  sample?: string;
}

interface WizardState {
  step: 1 | 2 | 3;
  token: string;
  dbUrl: string;
  sourceLabel: string;
  webhookSecret: string;
  syncEnabled: boolean;
  syncMode: 'auto' | 'scheduled' | 'manual';
  scheduleTimeRiyadh: string;
  syncFrequency: 'daily' | 'hourly';
  commentSyncEnabled: boolean;
  notifyAdmins: boolean;
  exclusionRules: ExclusionRule[];
  testResult: {
    ok: boolean;
    title?: string;
    dbId?: string;
    properties?: NotionProp[];
    rows?: any[];
    error?: string;
  } | null;
  mapping: Record<string, string>;
}

const WIZARD_INIT: WizardState = {
  step: 1,
  token: '',
  dbUrl: '',
  sourceLabel: 'Notion database',
  webhookSecret: '',
  syncEnabled: true,
  syncMode: 'auto',
  scheduleTimeRiyadh: '08:00',
  syncFrequency: 'daily',
  commentSyncEnabled: true,
  notifyAdmins: true,
  exclusionRules: [],
  testResult: null,
  mapping: {},
};

// ── Step 1: Connect ───────────────────────────────────────────────────────────
function WizardStep1({
  state, onChange, onNext,
}: { state: WizardState; onChange: (p: Partial<WizardState>) => void; onNext: () => void }) {
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
        // Auto-suggest field mapping from detected properties
        const autoMapping: Record<string, string> = {};
        for (const prop of (data.properties || [])) {
          const mapped = autoMapField(prop.name);
          if (mapped) autoMapping[prop.name] = mapped;
        }
        onChange({
          testResult: {
            ok: true,
            title: data.databaseTitle,
            dbId: data.databaseId,
            properties: data.properties || [],
            rows: data.rows || [],
          },
          mapping: autoMapping,
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
      <div style={{ marginBottom: 16, fontSize: 'var(--ds-font-size-400)', color: T.textSubtle }}>
        Paste the Notion database URL — the system auto-detects schema and pre-maps columns.
        You can refine the mapping in step 2.
      </div>

      <FieldRow label="Source label" hint="Short name shown in the sources list">
        <Textfield
          value={state.sourceLabel}
          onChange={(e) => onChange({ sourceLabel: (e.target as HTMLInputElement).value })}
          placeholder="Features database"
        />
      </FieldRow>

      <FieldRow
        label="Integration token"
        hint="Starts with secret_ — from notion.so/my-integrations → Internal integration"
      >
        <Textfield
          value={state.token}
          onChange={(e) => onChange({ token: (e.target as HTMLInputElement).value })}
          placeholder="secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
          type="password"
        />
      </FieldRow>

      <FieldRow
        label="Notion database URL"
        hint="Full URL from the browser address bar — must be a database view, not a page"
      >
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

// ── Step 2: Map + Exclusions ──────────────────────────────────────────────────
function WizardStep2({
  state, onChange, onBack, onNext,
}: { state: WizardState; onChange: (p: Partial<WizardState>) => void; onBack: () => void; onNext: () => void }) {
  const props   = state.testResult?.properties || [];
  const fields  = props.map((p) => p.name);

  const runAutoMap = () => {
    const autoMapping: Record<string, string> = {};
    for (const prop of props) {
      const mapped = autoMapField(prop.name);
      if (mapped) autoMapping[prop.name] = mapped;
    }
    onChange({ mapping: autoMapping });
    catalystToast.success(`Auto-mapped ${Object.values(autoMapping).filter(Boolean).length} fields`);
  };

  const mappedCount = Object.values(state.mapping).filter(Boolean).length;

  const rows = props.map((prop) => ({
    key: prop.id,
    cells: [
      {
        key: 'notion',
        content: (
          <div>
            <div style={{ fontSize: 'var(--ds-font-size-300)', fontWeight: 500, color: T.text }}>{prop.name}</div>
            <div style={{ fontSize: 'var(--ds-font-size-100)', color: T.textSubtlest }}>{prop.type}</div>
          </div>
        ),
      },
      {
        key: 'sample',
        content: (
          <div style={{
            fontSize: 'var(--ds-font-size-200)', color: T.textSubtle, maxWidth: 160,
            whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {prop.sample || <span style={{ color: T.textSubtlest }}>—</span>}
          </div>
        ),
      },
      {
        key: 'arrow',
        content: <span style={{ color: T.textSubtlest, fontSize: 'var(--ds-font-size-500)' }}>→</span>,
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
            styles={{ menuPortal: (b) => ({ ...b, zIndex: 9999 }) }}
          />
        ),
      },
    ],
  }));

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <div style={{ fontSize: 'var(--ds-font-size-400)', fontWeight: 500, color: T.text, marginBottom: 4 }}>
            {state.testResult?.title}
          </div>
          <div style={{ fontSize: 'var(--ds-font-size-300)', color: T.textSubtle }}>
            {props.length} columns · {state.testResult?.rows?.length ?? 0} rows · {mappedCount} mapped
          </div>
        </div>
        <Button appearance="default" onClick={runAutoMap}>Auto-map fields</Button>
      </div>

      {props.length > 0 ? (
        <DynamicTable
          head={{
            cells: [
              { key: 'notion',   content: 'Notion column',        width: 28 },
              { key: 'sample',   content: 'Sample value',         width: 22 },
              { key: 'arrow',    content: '',                      width: 5 },
              { key: 'catalyst', content: 'Business request field', width: 45 },
            ],
          }}
          rows={rows}
        />
      ) : (
        <SectionMessage appearance="warning" title="No properties found">
          <p>Check that your integration has access to this database.</p>
        </SectionMessage>
      )}

      <div style={{ marginTop: 16, marginBottom: 8 }}>
        <ExclusionRulesEditor
          rules={state.exclusionRules}
          fields={fields}
          onChange={(exclusionRules) => onChange({ exclusionRules })}
        />
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <Button appearance="default" onClick={onBack}>← Back</Button>
        <Button appearance="primary" onClick={onNext} isDisabled={mappedCount === 0}>
          Configure schedule →
        </Button>
      </div>
    </div>
  );
}

// ── Step 3: Schedule & Settings ───────────────────────────────────────────────
const SYNC_MODE_OPTIONS = [
  { value: 'auto',      label: 'Automatic — webhook + daily scheduled sync' },
  { value: 'scheduled', label: 'Scheduled only — daily cron, no webhook' },
  { value: 'manual',    label: 'Manual only — trigger from UI' },
];

const FREQ_OPTIONS = [
  { value: 'daily',  label: 'Daily' },
  { value: 'hourly', label: 'Hourly' },
];

function WizardStep3({
  state, onChange, onBack, onSave, saving,
}: {
  state: WizardState;
  onChange: (p: Partial<WizardState>) => void;
  onBack: () => void;
  onSave: () => void;
  saving: boolean;
}) {
  const WEBHOOK_URL = `${SUPABASE_URL}/functions/v1/notion-webhook`;
  const [copied, setCopied] = useState(false);

  const copyWebhook = () => {
    navigator.clipboard.writeText(WEBHOOK_URL).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const showSchedule = state.syncMode !== 'manual';
  const showWebhook  = state.syncMode === 'auto';
  const nextSync     = showSchedule ? nextSyncRiyadh(state.scheduleTimeRiyadh, state.syncMode) : null;

  return (
    <div>
      <Card>
        <SectionTitle>Sync schedule</SectionTitle>

        <FieldRow label="Sync mode">
          <Select
            options={SYNC_MODE_OPTIONS}
            value={SYNC_MODE_OPTIONS.find((o) => o.value === state.syncMode) || SYNC_MODE_OPTIONS[0]}
            onChange={(o) => onChange({ syncMode: (o as any)?.value || 'auto' })}
          />
        </FieldRow>

        {showSchedule && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <FieldRow
                label="Daily run time (Riyadh / AST)"
                hint="HH:MM in Arabia Standard Time — UTC+3, no daylight saving"
              >
                <Textfield
                  value={state.scheduleTimeRiyadh}
                  onChange={(e) => onChange({ scheduleTimeRiyadh: (e.target as HTMLInputElement).value })}
                  placeholder="08:00"
                />
              </FieldRow>

              <FieldRow label="Frequency">
                <Select
                  options={FREQ_OPTIONS}
                  value={FREQ_OPTIONS.find((o) => o.value === state.syncFrequency) || FREQ_OPTIONS[0]}
                  onChange={(o) => onChange({ syncFrequency: (o as any)?.value || 'daily' })}
                />
              </FieldRow>
            </div>

            {nextSync && (
              <div style={{
                background: T.info, borderRadius: 4, padding: '8px 12px',
                fontSize: 'var(--ds-font-size-200)', color: T.text, marginTop: -8, marginBottom: 16,
              }}>
                Next sync: <strong>{nextSync}</strong>
              </div>
            )}
          </>
        )}
      </Card>

      <Card>
        <SectionTitle>Features</SectionTitle>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${T.border}` }}>
          <div>
            <div style={{ fontSize: 'var(--ds-font-size-400)', color: T.text }}>Comment sync</div>
            <div style={{ fontSize: 'var(--ds-font-size-200)', color: T.textSubtlest }}>Notion comments → business request activity feed via webhook</div>
          </div>
          <Toggle
            isChecked={state.commentSyncEnabled}
            onChange={() => onChange({ commentSyncEnabled: !state.commentSyncEnabled })}
            label="Comment sync"
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0' }}>
          <div>
            <div style={{ fontSize: 'var(--ds-font-size-400)', color: T.text }}>Notify admins after sync</div>
            <div style={{ fontSize: 'var(--ds-font-size-200)', color: T.textSubtlest }}>Send a notification bell event to all admin users when sync completes</div>
          </div>
          <Toggle
            isChecked={state.notifyAdmins}
            onChange={() => onChange({ notifyAdmins: !state.notifyAdmins })}
            label="Notify admins"
          />
        </div>
      </Card>

      {showWebhook && (
        <Card>
          <SectionTitle>Webhook</SectionTitle>
          <div style={{ fontSize: 'var(--ds-font-size-200)', color: T.textSubtle, marginBottom: 12 }}>
            Register this URL in your Notion integration (Capabilities → Webhooks) to receive real-time
            comment and field-change events.
          </div>

          <FieldRow label="Webhook secret" hint="Optional — paste a secret to enable HMAC signature validation">
            <Textfield
              value={state.webhookSecret}
              onChange={(e) => onChange({ webhookSecret: (e.target as HTMLInputElement).value })}
              placeholder="whsec_xxxxxxxxxxxxxxxx"
              type="password"
            />
          </FieldRow>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              flex: 1, background: T.surfaceSunken, border: `1px solid ${T.border}`, borderRadius: 4,
              padding: '8px 12px', fontFamily: 'var(--ds-font-family-code, monospace)',
              fontSize: 'var(--ds-font-size-100)', color: T.text, wordBreak: 'break-all' as const,
            }}>
              {WEBHOOK_URL}
            </div>
            <Button appearance="subtle" onClick={copyWebhook}>
              {copied ? 'Copied!' : 'Copy'}
            </Button>
          </div>
        </Card>
      )}

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
const STEP_LABELS = ['1. Connect', '2. Map fields', '3. Schedule'];

function AddSourceWizard({
  existingConfig, onClose, onSaved,
}: { existingConfig?: any; onClose: () => void; onSaved: () => void }) {
  const qc = useQueryClient();

  const [state, setState] = useState<WizardState>(() => {
    if (existingConfig) {
      const raw  = existingConfig.database_id?.replace(/-/g, '') || '';
      const dbUrl = raw ? `https://www.notion.so/${raw}` : '';
      return {
        ...WIZARD_INIT,
        token:               existingConfig.integration_token || '',
        dbUrl,
        sourceLabel:         existingConfig.source_label || 'Notion database',
        webhookSecret:       existingConfig.webhook_secret || '',
        syncEnabled:         existingConfig.sync_enabled ?? true,
        syncMode:            existingConfig.sync_mode || 'auto',
        scheduleTimeRiyadh:  existingConfig.schedule_time_riyadh || '08:00',
        syncFrequency:       existingConfig.sync_frequency || 'daily',
        commentSyncEnabled:  existingConfig.comment_sync_enabled ?? true,
        notifyAdmins:        existingConfig.notify_admins ?? true,
        exclusionRules:      existingConfig.exclusion_rules || [],
        mapping:             existingConfig.field_mapping || {},
      };
    }
    return WIZARD_INIT;
  });

  const patch  = (p: Partial<WizardState>) => setState((s) => ({ ...s, ...p }));
  const goStep = (step: 1 | 2 | 3) => patch({ step });

  const [saving, setSaving] = useState(false);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      const dbId    = state.testResult?.dbId || existingConfig?.database_id || '';
      const payload = {
        source_label:          state.sourceLabel,
        workspace_name:        state.sourceLabel,
        integration_token:     state.token,
        database_id:           dbId,
        database_title:        state.testResult?.title || existingConfig?.database_title,
        webhook_secret:        state.webhookSecret || null,
        sync_enabled:          state.syncEnabled,
        sync_mode:             state.syncMode,
        schedule_time_riyadh:  state.scheduleTimeRiyadh,
        sync_frequency:        state.syncFrequency,
        comment_sync_enabled:  state.commentSyncEnabled,
        notify_admins:         state.notifyAdmins,
        exclusion_rules:       state.exclusionRules,
        field_mapping:         state.mapping,
        updated_at:            new Date().toISOString(),
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
      background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, marginBottom: 24,
    }}>
      {/* Step header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 24px', borderBottom: `1px solid ${T.border}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {STEP_LABELS.map((label, i) => {
            const stepNum = (i + 1) as 1 | 2 | 3;
            const active  = state.step === stepNum;
            const done    = state.step > stepNum;
            return (
              <div
                key={label}
                onClick={() => done ? goStep(stepNum) : undefined}
                style={{
                  fontSize: 'var(--ds-font-size-300)', fontWeight: active ? 600 : 400, cursor: done ? 'pointer' : 'default',
                  color: active ? T.text : done ? T.link : T.textSubtlest,
                }}
              >
                {done ? '✓ ' : ''}{label}
              </div>
            );
          })}
        </div>
        <Button appearance="subtle" onClick={onClose}>Cancel</Button>
      </div>

      <div style={{ padding: '24px 32px' }}>
        {state.step === 1 && <WizardStep1 state={state} onChange={patch} onNext={() => goStep(2)} />}
        {state.step === 2 && <WizardStep2 state={state} onChange={patch} onBack={() => goStep(1)} onNext={() => goStep(3)} />}
        {state.step === 3 && <WizardStep3 state={state} onChange={patch} onBack={() => goStep(2)} onSave={save} saving={saving} />}
      </div>
    </div>
  );
}

// ── Source card ───────────────────────────────────────────────────────────────
function SourceCard({ config, onConfigure }: { config: any; onConfigure: () => void }) {
  const qc = useQueryClient();
  const [menuOpen, setMenuOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        !menuRef.current?.contains(e.target as Node) &&
        !btnRef.current?.contains(e.target as Node)
      ) {
        setMenuOpen(false);
      }
    };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false); };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', esc);
    };
  }, [menuOpen]);

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

  const togglePause = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('notion_sync_config')
        .update({ sync_paused: !config.sync_paused, updated_at: new Date().toISOString() })
        .eq('id', config.id);
      if (error) throw error;
    },
    onSuccess: () => {
      catalystToast.success(config.sync_paused ? `${config.source_label} resumed` : `${config.source_label} paused`);
      qc.invalidateQueries({ queryKey: ['notion-sync-configs'] });
    },
    onError: (e: any) => catalystToast.error(e.message),
  });

  const disconnect = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('notion_sync_config').delete().eq('id', config.id);
      if (error) throw error;
    },
    onSuccess: () => {
      catalystToast.success(`${config.source_label} disconnected`);
      qc.invalidateQueries({ queryKey: ['notion-sync-configs'] });
    },
    onError: (e: any) => catalystToast.error(e.message),
  });

  const syncStatus = config.last_sync_status as string | undefined;
  const paused     = Boolean(config.sync_paused);
  const lastSyncAt = config.last_sync_at;
  const nextSync   = config.sync_mode !== 'manual' && config.schedule_time_riyadh
    ? nextSyncRiyadh(config.schedule_time_riyadh, config.sync_mode || 'auto')
    : 'Manual only';

  // Progress fill: records synced / expected (use last_sync_count as proxy)
  const recordsCount  = config.last_sync_count ?? 0;
  const commentsCount = config.last_comment_count ?? 0;

  const menuPortal = menuOpen && btnRef.current
    ? createPortal(
        <div
          ref={menuRef}
          role="menu"
          style={{
            position: 'fixed',
            top: (() => { const r = btnRef.current!.getBoundingClientRect(); return r.bottom + 4; })(),
            right: (() => { const r = btnRef.current!.getBoundingClientRect(); return window.innerWidth - r.right; })(),
            background: 'var(--ds-surface-overlay)',
            border: `1px solid ${T.border}`,
            borderRadius: 6,
            boxShadow: '0 8px 28px var(--ds-shadow-raised, rgba(9,30,66,0.20))',
            padding: '4px 0',
            minWidth: 180,
            zIndex: 9999,
          }}
        >
          <button
            role="menuitem"
            onClick={() => { setMenuOpen(false); onConfigure(); }}
            style={{
              display: 'block', width: '100%', textAlign: 'left',
              padding: '8px 16px', border: 'none', background: 'none',
              fontSize: 'var(--ds-font-size-400)', color: T.text, cursor: 'pointer',
            }}
          >
            Edit mapping
          </button>
          <button
            role="menuitem"
            onClick={() => {
              setMenuOpen(false);
              if (confirm(`Disconnect "${config.source_label}"?\n\nThis removes the sync config. Business requests already synced are NOT deleted.`)) {
                disconnect.mutate();
              }
            }}
            style={{
              display: 'block', width: '100%', textAlign: 'left',
              padding: '8px 16px', border: 'none', background: 'none',
              fontSize: 'var(--ds-font-size-400)', color: T.dangerText, cursor: 'pointer',
            }}
          >
            Disconnect
          </button>
        </div>,
        document.body,
      )
    : null;

  return (
    <div style={{
      background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8,
      padding: '16px 20px', marginBottom: 12,
    }}>
      {/* Top row: icon + name + status + actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <HealthDot status={syncStatus} paused={paused} />
        <NotionIcon size={32} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 'var(--ds-font-size-400)', fontWeight: 500, color: T.text }}>{config.source_label}</div>
          <div style={{ fontSize: 'var(--ds-font-size-200)', color: T.textSubtlest }}>
            {config.database_title || (config.database_id?.slice(0, 8) + '…')}
          </div>
        </div>

        {/* Status lozenges */}
        <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexShrink: 0 }}>
          {paused && <Lozenge appearance="moved">Paused</Lozenge>}
          {!paused && syncStatus === 'ok'      && <Lozenge appearance="success">Active</Lozenge>}
          {!paused && syncStatus === 'error'   && <Lozenge appearance="removed">Error</Lozenge>}
          {!paused && syncStatus === 'running' && <Lozenge appearance="inprogress">Syncing</Lozenge>}
          {!paused && !syncStatus              && <Lozenge appearance="default">Not synced</Lozenge>}
        </div>

        {/* Action buttons */}
        <Button
          appearance="subtle"
          isLoading={togglePause.isPending}
          onClick={() => togglePause.mutate()}
        >
          {paused ? 'Resume' : 'Pause'}
        </Button>

        <Button
          appearance="default"
          isLoading={triggerSync.isPending}
          isDisabled={paused}
          onClick={() => triggerSync.mutate()}
        >
          Sync now
        </Button>

        {/* ⋮ menu */}
        <button
          ref={btnRef}
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="More actions"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          style={{
            background: 'none', border: `1px solid ${T.border}`, borderRadius: 4,
            padding: '4px 8px', cursor: 'pointer', fontSize: 'var(--ds-font-size-600)', color: T.textSubtle,
            lineHeight: 1,
          }}
        >
          ⋯
        </button>
        {menuPortal}
      </div>

      {/* Stats row */}
      <div style={{
        marginTop: 12, paddingTop: 12, borderTop: `1px solid ${T.border}`,
        display: 'flex', gap: 24, fontSize: 'var(--ds-font-size-200)', color: T.textSubtle,
      }}>
        <div>
          <span style={{ fontWeight: 600, color: T.text }}>{recordsCount.toLocaleString()}</span>
          {' '}records synced
        </div>
        <div>
          <span style={{ fontWeight: 600, color: T.text }}>{commentsCount.toLocaleString()}</span>
          {' '}comments
        </div>
        {lastSyncAt && (
          <div>
            Last sync: <span style={{ color: T.text }}>{formatRiyadh(lastSyncAt, 'relative')}</span>
            <span style={{ marginLeft: 4, color: T.textSubtlest }}>({formatRiyadh(lastSyncAt)})</span>
          </div>
        )}
        <div style={{ marginLeft: 'auto' }}>
          Next: <span style={{ color: T.text }}>{nextSync}</span>
        </div>
      </div>

      {/* Error message */}
      {syncStatus === 'error' && config.last_sync_error && (
        <div style={{
          marginTop: 8, fontSize: 'var(--ds-font-size-200)', color: T.dangerText,
          background: T.danger, borderRadius: 4, padding: '4px 10px',
        }}>
          {config.last_sync_error}
        </div>
      )}
    </div>
  );
}

// ── Sources tab ───────────────────────────────────────────────────────────────
function SourcesTab({ configs, isLoading, onRefresh }: { configs: any[]; isLoading: boolean; onRefresh: () => void }) {
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editConfig, setEditConfig] = useState<any>(null);

  const openAdd  = () => { setEditConfig(null); setWizardOpen(true); };
  const openEdit = (cfg: any) => { setEditConfig(cfg); setWizardOpen(true); };
  const afterSave = () => { setWizardOpen(false); onRefresh(); };

  if (isLoading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><Spinner size="medium" /></div>;
  }

  return (
    <div style={{ paddingTop: 8 }}>
      {wizardOpen && (
        <AddSourceWizard
          existingConfig={editConfig}
          onClose={() => setWizardOpen(false)}
          onSaved={afterSave}
        />
      )}

      {!wizardOpen && (
        <div style={{ marginBottom: 16 }}>
          <Button appearance="primary" onClick={openAdd}>+ Add Notion source</Button>
        </div>
      )}

      {configs.length === 0 && !wizardOpen && (
        <SectionMessage appearance="information" title="No sources connected">
          <p>
            Click "Add Notion source" to connect a Notion database.
            Each database syncs independently as business requests.
          </p>
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
          <p>Trigger a manual sync from the Sources tab or wait for the scheduled run.</p>
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
          <div style={{ fontSize: 'var(--ds-font-size-200)', fontWeight: 500, color: T.textSubtle }}>
            {(log.notion_sync_config as any)?.source_label || '—'}
          </div>
        ),
      },
      {
        key: 'time',
        content: (
          <div>
            <div style={{ fontSize: 'var(--ds-font-size-300)', color: T.text }}>{formatRiyadh(log.started_at)}</div>
            <div style={{ fontSize: 'var(--ds-font-size-100)', color: T.textSubtlest }}>
              {log.triggered_by === 'manual' ? 'Manual' : 'Scheduled'}
            </div>
          </div>
        ),
      },
      {
        key: 'status',
        content:
          log.status === 'ok'      ? <Lozenge appearance="success">Success</Lozenge> :
          log.status === 'error'   ? <Lozenge appearance="removed">Failed</Lozenge> :
          log.status === 'running' ? <Lozenge appearance="inprogress">Running</Lozenge> :
          <Lozenge appearance="default">{log.status}</Lozenge>,
      },
      {
        key: 'records',
        content: (
          <div style={{ fontSize: 'var(--ds-font-size-300)', color: T.textSubtle }}>
            {log.records_synced != null && <><strong>{log.records_synced}</strong> synced</>}
            {log.records_skipped != null && <>, {log.records_skipped} skipped</>}
          </div>
        ),
      },
      {
        key: 'duration',
        content: (
          <div style={{ fontSize: 'var(--ds-font-size-200)', color: T.textSubtlest }}>
            {log.finished_at
              ? `${Math.round((new Date(log.finished_at).getTime() - new Date(log.started_at).getTime()) / 1000)}s`
              : '—'}
          </div>
        ),
      },
      {
        key: 'error',
        content: log.error_message
          ? <span style={{ fontSize: 'var(--ds-font-size-200)', color: T.dangerText }}>{log.error_message}</span>
          : null,
      },
    ],
  }));

  return (
    <div style={{ paddingTop: 8 }}>
      <div style={{ fontSize: 'var(--ds-font-size-200)', color: T.textSubtlest, marginBottom: 8 }}>
        All times shown in Arabia Standard Time (AST, UTC+3)
      </div>
      <DynamicTable
        head={{
          cells: [
            { key: 'source',   content: 'Source',   width: 20 },
            { key: 'time',     content: 'Started',  width: 22 },
            { key: 'status',   content: 'Status',   width: 13 },
            { key: 'records',  content: 'Records',  width: 18 },
            { key: 'duration', content: 'Duration', width: 12 },
            { key: 'error',    content: 'Error',    width: 15 },
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
          <p>
            Register the webhook URL (shown in step 3 of each source setup) in your Notion integration.
            Comments posted in Notion pages will appear here in real-time.
          </p>
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
          <div style={{ fontSize: 'var(--ds-font-size-300)', color: T.text }}>
            <Lozenge appearance="new">Notion</Lozenge>
            <span style={{ marginLeft: 8 }}>{c.body}</span>
          </div>
        ),
      },
      {
        key: 'page',
        content: (
          <div style={{ fontSize: 'var(--ds-font-size-200)', color: T.textSubtlest, fontFamily: 'var(--ds-font-family-code, monospace)' }}>
            {c.notion_page_id?.slice(0, 8)}…
          </div>
        ),
      },
      {
        key: 'when',
        content: (
          <div>
            <div style={{ fontSize: 'var(--ds-font-size-200)', color: T.text }}>{formatRiyadh(c.created_at, 'relative')}</div>
            <div style={{ fontSize: 'var(--ds-font-size-100)', color: T.textSubtlest }}>{formatRiyadh(c.created_at)}</div>
          </div>
        ),
      },
    ],
  }));

  return (
    <div style={{ paddingTop: 8 }}>
      <div style={{ marginBottom: 12, fontSize: 'var(--ds-font-size-300)', color: T.textSubtle }}>
        Last 50 comments synced from Notion · <Badge max={999}>{comments.length}</Badge>
        <span style={{ fontSize: 'var(--ds-font-size-200)', color: T.textSubtlest, marginLeft: 12 }}>
          Times shown in AST (UTC+3)
        </span>
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
  const activeCount = (configs as any[]).filter((c) => c.sync_enabled && !c.sync_paused).length;

  return (
    <AdminGuard>
      <div style={{ padding: '32px 48px', maxWidth: 900 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <NotionIcon size={48} />
          <div>
            <h1 style={{
              margin: 0, fontSize: 'var(--ds-font-size-800)', fontWeight: 653, color: T.text, lineHeight: '28px',
              fontFamily: 'var(--ds-font-family-heading, "Atlassian Sans", sans-serif)',
            }}>
              Notion
            </h1>
            <div style={{ marginTop: 4, display: 'flex', gap: 8, alignItems: 'center' }}>
              {connected
                ? <Lozenge appearance="success">{activeCount} active · {configs.length} source{configs.length > 1 ? 's' : ''}</Lozenge>
                : <Lozenge appearance="default">Not connected</Lozenge>}
            </div>
          </div>
        </div>

        <p style={{ margin: '0 0 24px', fontSize: 'var(--ds-font-size-400)', lineHeight: '20px', color: T.textSubtle }}>
          Connect Notion databases and sync rows as business requests.
          Each source syncs independently — pause, resume, or disconnect without affecting others.
          All schedule times are in Riyadh time (AST, UTC+3).
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
