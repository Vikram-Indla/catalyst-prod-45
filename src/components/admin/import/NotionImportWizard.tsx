/**
 * NotionImportWizard — Premium 4-step wizard for Notion database imports.
 * Steps: Connect → Preview → Map Fields → Confirm & Import
 */
import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Button from '@atlaskit/button/new';
import Textfield from '@atlaskit/textfield';
import AdsSelect from '@atlaskit/select';
import { fetchNotionDatabase, importNotionRows } from '@/lib/import/notionImportService';
import type { NotionProperty, NotionRow } from '@/types/notionImport';
import Spinner from '@atlaskit/spinner';
import AlertIcon from '@atlaskit/icon/core/alert';
import ArrowRightIcon from '@atlaskit/icon/core/arrow-right';
import BoardsIcon from '@atlaskit/icon/core/boards';
import CheckCircleIcon from '@atlaskit/icon/core/check-circle';
import CheckMarkIcon from '@atlaskit/icon/core/check-mark';
import CrossCircleIcon from '@atlaskit/icon/core/cross-circle';
import DatabaseIcon from '@atlaskit/icon/core/database';
import GridIcon from '@atlaskit/icon/core/grid';
import InformationCircleIcon from '@atlaskit/icon/core/information-circle';
import LinkIcon from '@atlaskit/icon/core/link';
import LinkExternalIcon from '@atlaskit/icon/core/link-external';
import LockLockedIcon from '@atlaskit/icon/core/lock-locked';
import UploadIcon from '@atlaskit/icon/core/upload';
import VideoNextIcon from '@atlaskit/icon/core/video-next';
import ChevronLeftIcon from '@atlaskit/icon/glyph/chevron-left';

const CATALYST_FIELDS = [
  { value: '__skip__', label: 'Skip (do not import)' },
  { value: 'summary', label: 'Summary ✱' },
  { value: 'status', label: 'Status' },
  { value: 'priority', label: 'Priority' },
  { value: 'description', label: 'Description' },
  { value: 'due_date', label: 'Due Date' },
  { value: 'start_date', label: 'Start Date' },
  { value: 'story_points', label: 'Story Points' },
  { value: 'assignee_id', label: 'Assignee' },
  { value: 'department', label: 'Department' },
  { value: 'environment', label: 'Environment' },
  { value: 'labels', label: 'Labels' },
];

const ITEM_TYPES = ['Story', 'Task', 'Bug', 'Epic', 'Feature'];

function smartDefault(name: string): string {
  const n = name.toLowerCase().trim();
  if (n === 'name' || n === 'title') return 'summary';
  if (n === 'status') return 'status';
  if (n === 'priority') return 'priority';
  if (n === 'due date' || n === 'due' || n === 'deadline') return 'due_date';
  if (n === 'start date' || n === 'start') return 'start_date';
  if (n === 'assignee' || n === 'assigned to' || n === 'owner') return 'assignee_id';
  if (n === 'description' || n === 'details' || n === 'notes') return 'description';
  if (n === 'story points' || n === 'points' || n === 'estimate') return 'story_points';
  if (n === 'department' || n === 'team') return 'department';
  if (n === 'environment') return 'environment';
  if (n === 'labels' || n === 'tags') return 'labels';
  return '__skip__';
}

/* ─── Mini stat pill ─── */
function StatPill({ icon: Icon, label, value, color = 'var(--ds-text-brand, #2563EB)' }: {
  icon: any; label: string; value: string | number; color?: string;
}) {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[var(--ds-surface-sunken,#F8FAFC)] border border-[var(--ds-border,#E2E8F0)]">
      <Icon className="h-3.5 w-3.5 shrink-0" style={{ color }} />
      <span className="text-[10px] uppercase tracking-wider font-semibold text-[var(--ds-text-subtlest,#94A3B8)]">{label}</span>
      <span className="text-[13px] font-semibold text-[var(--ds-text,#0F172A)]">{value}</span>
    </div>
  );
}

/* ─── Stepper ─── */
function WizardStepper({ step }: { step: number }) {
  const steps = [
    { id: 1, label: 'Connect', icon: LockLockedIcon },
    { id: 2, label: 'Preview', icon: DatabaseIcon },
    { id: 3, label: 'Map Fields', icon: ArrowRightIcon },
    { id: 4, label: 'Import', icon: UploadIcon },
  ];
  return (
    <div className="flex items-center gap-0">
      {steps.map((s, i) => {
        const done = step > s.id;
        const active = step === s.id;
        const Icon = s.icon;
        return (
          <div key={s.id} className="flex items-center">
            <div className="flex items-center gap-2">
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200
                ${done ? 'bg-[var(--ds-text-success,#16A34A)] text-white' : ''}
                ${active ? 'bg-[var(--ds-text-brand,#2563EB)] text-white ring-2 ring-[var(--ds-text-brand,#2563EB)]/30 ring-offset-1' : ''}
                ${!done && !active ? 'bg-[var(--ds-surface-sunken,#F1F5F9)] text-[var(--ds-text-subtlest,#94A3B8)]' : ''}
              `}>
                {done ? <CheckMarkIcon label="" size="small" /> : <Icon className="h-3.5 w-3.5" />}
              </div>
              <span className={`text-xs font-medium hidden sm:block ${
                active ? 'text-[var(--ds-text-brand,#2563EB)]' : done ? 'text-[var(--ds-text,#0F172A)]' : 'text-[var(--ds-text-subtlest,#94A3B8)]'
              }`}>
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`w-8 h-px mx-2 ${done ? 'bg-[var(--ds-text-success,#16A34A)]' : 'bg-[var(--ds-border,#E2E8F0)]'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function NotionImportWizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  // Step 1
  const [token, setToken] = useState('');
  const [dbUrl, setDbUrl] = useState('');
  const [projectId, setProjectId] = useState('');
  const [itemType, setItemType] = useState('Story');
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Fetched data
  const [dbTitle, setDbTitle] = useState('');
  const [notionProps, setNotionProps] = useState<NotionProperty[]>([]);
  const [notionRows, setNotionRows] = useState<NotionRow[]>([]);

  // Step 3
  const [mappings, setMappings] = useState<Record<string, string>>({});

  // Step 4
  const [importing, setImporting] = useState(false);
  const [importDone, setImportDone] = useState(0);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; failed: number } | null>(null);

  const { data: projects } = useQuery({
    queryKey: ['ph-projects-list-for-import'],
    queryFn: async () => {
      const { data } = await supabase.from('ph_projects').select('id, name').order('name');
      return data || [];
    },
  });

  const projectName = useMemo(() => projects?.find(p => p.id === projectId)?.name || '', [projects, projectId]);

  const handleFetch = useCallback(async () => {
    setFetchError(null);
    setFetching(true);
    try {
      const res = await fetchNotionDatabase(token, dbUrl);
      setDbTitle(res.databaseTitle);
      setNotionProps(res.properties);
      setNotionRows(res.rows);
      const defaults: Record<string, string> = {};
      res.properties.forEach(p => { defaults[p.name] = smartDefault(p.name); });
      setMappings(defaults);
      setStep(2);
    } catch (e: any) {
      setFetchError(e.message || 'Failed to connect');
    } finally {
      setFetching(false);
    }
  }, [token, dbUrl]);

  const summaryMapped = useMemo(() => Object.values(mappings).includes('summary'), [mappings]);
  const mappedCount = useMemo(() => Object.values(mappings).filter(v => v !== '__skip__').length, [mappings]);
  const skippedCount = useMemo(() => Object.values(mappings).filter(v => v === '__skip__').length, [mappings]);
  const [mapError, setMapError] = useState(false);

  const handleImport = useCallback(async () => {
    setImporting(true);
    setImportDone(0);
    try {
      const result = await importNotionRows({
        rows: notionRows,
        mappings,
        projectId,
        defaultItemType: itemType,
        onProgress: (done) => setImportDone(done),
      });
      setImportResult(result);
    } catch {
      setImportResult({ imported: 0, skipped: 0, failed: notionRows.length });
    } finally {
      setImporting(false);
    }
  }, [notionRows, mappings, itemType, projectId]);

  const canFetch = token.length > 0 && dbUrl.length > 0 && projectId.length > 0;

  return (
    <div className="flex flex-col h-full">
      {/* ─── Header Bar ─── */}
      <div className="h-14 flex items-center justify-between border-b border-[var(--ds-border,#E2E8F0)] px-6 shrink-0 bg-white">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-md bg-[var(--ds-text,#0F172A)] flex items-center justify-center">
            <DatabaseIcon label="" size="small" />
          </div>
          <h1 className="text-[15px] font-semibold text-[var(--ds-text,#0F172A)] tracking-[-0.01em]">
            Notion Import
          </h1>
        </div>
        <WizardStepper step={step} />
      </div>

      {/* ─── Content ─── */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto py-6 px-6">

          {/* ═══ STEP 1: CONNECT ═══ */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="mb-1">
                <h2 className="text-[15px] font-semibold text-[var(--ds-text,#0F172A)]">Connect to Notion</h2>
                <p className="text-[13px] text-[var(--ds-text-subtlest,#64748B)] mt-0.5">
                  Enter your integration token and database URL to start.
                </p>
              </div>

              <div className="bg-white border border-[var(--ds-border,#E2E8F0)] rounded-lg overflow-hidden">
                {/* Token */}
                <div className="px-4 pt-3.5 pb-3 border-b border-[var(--ds-surface-sunken,#F1F5F9)]">
                  <label htmlFor="notion-token" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ds-text, #0F172A)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                    <LockLockedIcon label="" size="small" />
                    Integration Token
                  </label>
                  <Textfield
                    id="notion-token"
                    type="password"
                    placeholder="secret_..."
                    value={token}
                    onChange={e => setToken((e.target as HTMLInputElement).value)}
                  />
                  <p className="text-[11px] text-[var(--ds-text-subtlest,#94A3B8)] mt-1.5">
                    Create at{' '}
                    <a href="https://www.notion.so/my-integrations" target="_blank" rel="noopener noreferrer"
                       className="underline text-[var(--ds-text-brand,#2563EB)]">
                      notion.so/my-integrations
                    </a>
                    {' '}→ copy Internal Integration Secret
                  </p>
                </div>

                {/* Database URL */}
                <div className="px-4 pt-3.5 pb-3 border-b border-[var(--ds-surface-sunken,#F1F5F9)]">
                  <label htmlFor="notion-db-url" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ds-text, #0F172A)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                    <LinkIcon label="" size="small" />
                    Database URL
                  </label>
                  <Textfield
                    id="notion-db-url"
                    placeholder="https://www.notion.so/workspace/..."
                    value={dbUrl}
                    onChange={e => setDbUrl((e.target as HTMLInputElement).value)}
                  />
                  <p className="text-[11px] text-[var(--ds-text-subtlest,#94A3B8)] mt-1.5">
                    Open your database in Notion, copy the full URL from the browser bar
                  </p>
                </div>

                {/* Project + Type */}
                <div className="px-4 pt-3.5 pb-3.5 grid grid-cols-2 gap-3">
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ds-text, #0F172A)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                      <BoardsIcon label="" size="small" />
                      Target Project
                    </label>
                    <AdsSelect
                      value={projectId ? { label: (projects || []).find(p => p.id === projectId)?.name || projectId, value: projectId } : null}
                      options={(projects || []).map(p => ({ label: p.name, value: p.id }))}
                      placeholder="Select project…"
                      onChange={(opt) => setProjectId(opt?.value ?? '')}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ds-text, #0F172A)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                      <BoardsIcon label="" size="small" />
                      Default Type
                    </label>
                    <AdsSelect
                      value={{ label: itemType, value: itemType }}
                      options={ITEM_TYPES.map(t => ({ label: t, value: t }))}
                      onChange={(opt) => setItemType(opt?.value ?? 'Story')}
                    />
                  </div>
                </div>
              </div>

              {/* Error */}
              {fetchError && (
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-[var(--ds-background-danger,#FEF2F2)] border border-[#FECACA]">
                  <CrossCircleIcon label="" size="small" />
                  <div>
                    <p className="text-[13px] font-semibold text-[var(--ds-text-danger,#DC2626)]">Connection failed</p>
                    <p className="text-[12px] text-[var(--ds-text-danger,#DC2626)]/80 mt-0.5">{fetchError}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══ STEP 2: PREVIEW ═══ */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-[15px] font-semibold text-[var(--ds-text,#0F172A)]">Data Preview</h2>
                <p className="text-[13px] text-[var(--ds-text-subtlest,#64748B)] mt-0.5">
                  {notionRows.length} rows from <span className="font-medium text-[var(--ds-text,#0F172A)]">{dbTitle}</span>
                </p>
              </div>

              <div className="flex gap-2">
                <StatPill icon={DatabaseIcon} label="Rows" value={notionRows.length} />
                <StatPill icon={GridIcon} label="Columns" value={notionProps.length} />
                <StatPill icon={BoardsIcon} label="Target" value={projectName} />
              </div>

              <div className="bg-white border border-[var(--ds-border,#E2E8F0)] rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[var(--ds-border,#E2E8F0)] bg-[var(--ds-surface-sunken,#F8FAFC)]">
                        <th className="text-left px-3 py-2 font-semibold text-[10px] uppercase tracking-wider text-[var(--ds-text-subtlest,#64748B)] w-8">#</th>
                        {notionProps.map(p => (
                          <th key={p.id} className="text-left px-3 py-2 font-semibold text-[10px] uppercase tracking-wider text-[var(--ds-text-subtlest,#64748B)] whitespace-nowrap">
                            {p.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {notionRows.slice(0, 8).map((row, idx) => (
                        <tr key={row.notionPageId} className="border-b border-[var(--ds-surface-sunken,#F1F5F9)] hover:bg-[var(--ds-surface-sunken,#F8FAFC)]">
                          <td className="px-3 py-1.5 text-[11px] font-mono text-[var(--ds-text-subtlest,#94A3B8)]">{idx + 1}</td>
                          {notionProps.map(p => (
                            <td key={p.id} className="px-3 py-1.5 whitespace-nowrap text-[var(--ds-text,#0F172A)] max-w-[200px] truncate text-[13px]">
                              {row.properties[p.name] || <span className="text-[var(--ds-text-disabled,#CBD5E1)]">—</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {notionRows.length > 8 && (
                  <div className="px-3 py-2 text-[11px] text-[var(--ds-text-subtlest,#94A3B8)] bg-[var(--ds-surface-sunken,#FAFBFC)] border-t border-[var(--ds-surface-sunken,#F1F5F9)]">
                    + {notionRows.length - 8} more rows
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══ STEP 3: MAP FIELDS ═══ */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-[15px] font-semibold text-[var(--ds-text,#0F172A)]">Map Fields</h2>
                  <p className="text-[13px] text-[var(--ds-text-subtlest,#64748B)] mt-0.5">
                    Map each Notion column to a Catalyst field.
                  </p>
                </div>
                <div className="flex gap-2 text-[11px]">
                  <span className="px-2 py-1 rounded bg-[var(--ds-background-success,#DCFCE7)] text-[var(--ds-text-success,#16A34A)] font-semibold">{mappedCount} mapped</span>
                  <span className="px-2 py-1 rounded bg-[var(--ds-surface-sunken,#F1F5F9)] text-[var(--ds-text-subtlest,#94A3B8)] font-semibold">{skippedCount} skipped</span>
                </div>
              </div>

              <div className="bg-white border border-[var(--ds-border,#E2E8F0)] rounded-lg overflow-hidden">
                <div className="flex items-center px-4 py-2 bg-[var(--ds-surface-sunken,#F8FAFC)] border-b border-[var(--ds-border,#E2E8F0)]">
                  <span className="flex-1 text-[10px] uppercase tracking-wider font-semibold text-[var(--ds-text-subtlest,#64748B)]">Notion Column</span>
                  <ArrowRightIcon label="" size="small" />
                  <span className="w-44 text-[10px] uppercase tracking-wider font-semibold text-[var(--ds-text-subtlest,#64748B)] text-right">Catalyst Field</span>
                </div>
                {notionProps.map(p => {
                  const mapped = mappings[p.name] || '__skip__';
                  const isSkip = mapped === '__skip__';
                  const isSummary = mapped === 'summary';
                  return (
                    <div key={p.id} className={`flex items-center px-4 py-2 gap-2 border-b border-[var(--ds-surface-sunken,#F1F5F9)] last:border-b-0 ${isSkip ? 'bg-[var(--ds-surface-sunken,#FAFBFC)]' : ''}`}>
                      <div className="flex-1 flex items-center gap-2 min-w-0">
                        <span className={`text-[13px] font-medium truncate ${isSkip ? 'text-[var(--ds-text-subtlest,#94A3B8)]' : 'text-[var(--ds-text,#0F172A)]'}`}>{p.name}</span>
                        <span className="shrink-0 text-[9px] uppercase tracking-wider font-bold px-1 py-px rounded bg-[var(--ds-surface-sunken,#F1F5F9)] text-[var(--ds-text-subtlest,#94A3B8)]">{p.type}</span>
                      </div>
                      <ArrowRightIcon label="" size="small" />
                      <div className="w-44 shrink-0">
                        <AdsSelect
                          value={{ label: CATALYST_FIELDS.find(f => f.value === mapped)?.label || mapped, value: mapped }}
                          options={CATALYST_FIELDS.map(f => ({ label: f.label, value: f.value }))}
                          onChange={(opt) => setMappings(prev => ({ ...prev, [p.name]: opt?.value ?? '__skip__' }))}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {mapError && !summaryMapped && (
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-[var(--ds-background-danger,#FEF2F2)] border border-[#FECACA]">
                  <AlertIcon label="" size="small" />
                  <p className="text-[13px] text-[var(--ds-text-danger,#DC2626)]">Map at least one column to <strong>Summary</strong> to proceed.</p>
                </div>
              )}
            </div>
          )}

          {/* ═══ STEP 4: CONFIRM & IMPORT ═══ */}
          {step === 4 && (
            <div className="space-y-4">
              <h2 className="text-[15px] font-semibold text-[var(--ds-text,#0F172A)]">
                {importResult ? 'Import Complete' : 'Review & Import'}
              </h2>

              {!importResult ? (
                <>
                  <div className="bg-white border border-[var(--ds-border,#E2E8F0)] rounded-lg overflow-hidden">
                    {[
                      { label: 'Source', value: dbTitle, icon: DatabaseIcon },
                      { label: 'Rows', value: String(notionRows.length), icon: DatabaseIcon },
                      { label: 'Project', value: projectName, icon: BoardsIcon },
                      { label: 'Type', value: itemType, icon: GridIcon },
                      { label: 'Fields', value: `${mappedCount} / ${notionProps.length}`, icon: ArrowRightIcon },
                    ].map((row, i) => (
                      <div key={row.label} className={`flex items-center justify-between px-4 py-2.5 ${i < 4 ? 'border-b border-[var(--ds-surface-sunken,#F1F5F9)]' : ''}`}>
                        <div className="flex items-center gap-2">
                          <row.icon className="h-3.5 w-3.5 text-[var(--ds-text-subtlest,#94A3B8)]" />
                          <span className="text-[13px] text-[var(--ds-text-subtlest,#64748B)]">{row.label}</span>
                        </div>
                        <span className="text-[13px] font-semibold text-[var(--ds-text,#0F172A)]">{row.value}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-start gap-2 p-3 rounded-lg bg-[#F0F9FF] border border-[#BAE6FD]">
                    <InformationCircleIcon label="" size="small" />
                    <p className="text-[12px] text-[#0369A1]">
                      Duplicate rows (matched by Notion page ID) are skipped automatically.
                    </p>
                  </div>

                  {importing && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[13px]">
                        <span className="text-[var(--ds-text-subtlest,#64748B)]">Importing…</span>
                        <span className="font-mono font-semibold text-[var(--ds-text,#0F172A)]">{importDone}/{notionRows.length}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-[var(--ds-surface-sunken,#F1F5F9)] overflow-hidden">
                        <div className="h-full rounded-full bg-[var(--ds-text-brand,#2563EB)] transition-all duration-300" style={{ width: `${(importDone / notionRows.length) * 100}%` }} />
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-white border border-[var(--ds-border,#E2E8F0)] rounded-lg p-6 text-center space-y-4">
                  <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center ${
                    importResult.failed > 0 && importResult.imported === 0 ? 'bg-[#FEE2E2]' : 'bg-[var(--ds-background-success,#DCFCE7)]'
                  }`}>
                    {importResult.failed > 0 && importResult.imported === 0
                      ? <CrossCircleIcon label="" size="small" />
                      : <CheckCircleIcon label="" size="small" />}
                  </div>
                  <p className="text-[15px] font-semibold text-[var(--ds-text,#0F172A)]">
                    {importResult.imported > 0 ? `${importResult.imported} items imported` : 'Import failed'}
                  </p>
                  <div className="flex justify-center gap-2 text-[12px] font-medium">
                    {importResult.imported > 0 && (
                      <span className="px-2.5 py-1 rounded-full bg-[var(--ds-background-success,#DCFCE7)] text-[var(--ds-text-success,#16A34A)]">{importResult.imported} imported</span>
                    )}
                    {importResult.skipped > 0 && (
                      <span className="px-2.5 py-1 rounded-full bg-[var(--ds-surface-sunken,#F1F5F9)] text-[var(--ds-text-subtlest,#64748B)]">{importResult.skipped} skipped</span>
                    )}
                    {importResult.failed > 0 && (
                      <span className="px-2.5 py-1 rounded-full bg-[#FEE2E2] text-[var(--ds-text-danger,#DC2626)]">{importResult.failed} failed</span>
                    )}
                  </div>
                  <Button appearance="default" onClick={() => navigate('/product/backlog')} iconAfter={LinkExternalIcon}>
                    View in ProductHub
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ─── Sticky Footer ─── */}
      <div className="shrink-0 border-t border-[var(--ds-border,#E2E8F0)] bg-white px-6 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Button
            appearance="subtle"
            onClick={() => setStep(s => Math.max(1, s - 1))}
            isDisabled={step === 1 || importing}
            iconBefore={ChevronLeftIcon}
          >
            Back
          </Button>

          <div className="flex items-center gap-3">
            {step === 1 && (
              <Button
                appearance="primary"
                onClick={handleFetch}
                isDisabled={!canFetch || fetching}
                iconAfter={fetching ? undefined : ArrowRightIcon}
              >
                {fetching ? (
                  <span className="flex items-center gap-2"><Spinner size="small" /> Connecting…</span>
                ) : 'Fetch Database'}
              </Button>
            )}
            {step === 2 && (
              <Button
                appearance="primary"
                onClick={() => setStep(3)}
                iconAfter={ArrowRightIcon}
              >
                Continue to Mapping
              </Button>
            )}
            {step === 3 && (
              <Button
                appearance="primary"
                onClick={() => {
                  if (!summaryMapped) { setMapError(true); return; }
                  setMapError(false);
                  setStep(4);
                }}
                iconAfter={ArrowRightIcon}
              >
                Review &amp; Import
              </Button>
            )}
            {step === 4 && !importResult && (
              <Button
                appearance="primary"
                onClick={handleImport}
                isDisabled={importing}
                iconBefore={importing ? undefined : UploadIcon}
              >
                {importing ? (
                  <span className="flex items-center gap-2"><Spinner size="small" /> Importing…</span>
                ) : `Import ${notionRows.length} Items`}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
