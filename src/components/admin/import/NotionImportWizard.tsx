/**
 * NotionImportWizard — Premium 4-step wizard for Notion database imports.
 * Steps: Connect → Preview → Map Fields → Confirm & Import
 */
import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertCircle, Check, Loader2, ExternalLink, Database,
  ArrowRight, KeyRound, Link2, FolderKanban, Layers,
  Table2, ArrowLeftRight, Upload, CheckCircle2, XCircle,
  SkipForward, Info, ChevronLeft,
} from 'lucide-react';
import { fetchNotionDatabase, importNotionRows } from '@/lib/import/notionImportService';
import type { NotionProperty, NotionRow } from '@/types/notionImport';

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
function StatPill({ icon: Icon, label, value, color = '#2563EB' }: {
  icon: any; label: string; value: string | number; color?: string;
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
      <Icon className="h-4 w-4 shrink-0" style={{ color }} />
      <div className="flex flex-col">
        <span className="text-[10px] uppercase tracking-wider font-semibold text-[#94A3B8]">{label}</span>
        <span className="text-sm font-semibold text-[#0F172A]">{value}</span>
      </div>
    </div>
  );
}

/* ─── Stepper ─── */
function WizardStepper({ step }: { step: number }) {
  const steps = [
    { id: 1, label: 'Connect', icon: KeyRound },
    { id: 2, label: 'Preview', icon: Table2 },
    { id: 3, label: 'Map Fields', icon: ArrowLeftRight },
    { id: 4, label: 'Import', icon: Upload },
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
                ${done ? 'bg-[#16A34A] text-white' : ''}
                ${active ? 'bg-[#2563EB] text-white ring-2 ring-[#2563EB]/30 ring-offset-1' : ''}
                ${!done && !active ? 'bg-[#F1F5F9] text-[#94A3B8]' : ''}
              `}>
                {done ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
              </div>
              <span className={`text-xs font-medium hidden sm:block ${
                active ? 'text-[#2563EB]' : done ? 'text-[#0F172A]' : 'text-[#94A3B8]'
              }`}>
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`w-8 h-px mx-2 ${done ? 'bg-[#16A34A]' : 'bg-[#E2E8F0]'}`} />
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
      <div className="h-14 flex items-center justify-between border-b border-[#E2E8F0] px-6 shrink-0 bg-white">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-md bg-[#0F172A] flex items-center justify-center">
            <Database className="h-3.5 w-3.5 text-white" />
          </div>
          <h1 className="text-[15px] font-semibold text-[#0F172A] tracking-[-0.01em]">
            Notion Import
          </h1>
        </div>
        <WizardStepper step={step} />
      </div>

      {/* ─── Content ─── */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-3xl mx-auto py-8 px-6">

          {/* ═══ STEP 1: CONNECT ═══ */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-[#0F172A] mb-1">Connect to Notion</h2>
                <p className="text-sm text-[#64748B]">
                  Provide your integration token and database URL to begin importing work items.
                </p>
              </div>

              <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
                {/* Token */}
                <div className="p-5 space-y-2 border-b border-[#F1F5F9]">
                  <div className="flex items-center gap-2">
                    <KeyRound className="h-4 w-4 text-[#64748B]" />
                    <Label htmlFor="notion-token" className="text-sm font-semibold text-[#0F172A]">
                      Integration Token
                    </Label>
                  </div>
                  <Input
                    id="notion-token"
                    type="password"
                    placeholder="secret_..."
                    value={token}
                    onChange={e => setToken(e.target.value)}
                    className="h-10 bg-[#F8FAFC] border-[#E2E8F0] focus:bg-white transition-colors"
                  />
                  <p className="text-xs text-[#94A3B8] flex items-center gap-1">
                    <Info className="h-3 w-3" />
                    Create at{' '}
                    <a href="https://www.notion.so/my-integrations" target="_blank" rel="noopener noreferrer"
                       className="underline text-[#2563EB] hover:text-[#1D4ED8]">
                      notion.so/my-integrations
                    </a>
                    {' '}→ copy Internal Integration Secret
                  </p>
                </div>

                {/* Database URL */}
                <div className="p-5 space-y-2 border-b border-[#F1F5F9]">
                  <div className="flex items-center gap-2">
                    <Link2 className="h-4 w-4 text-[#64748B]" />
                    <Label htmlFor="notion-db-url" className="text-sm font-semibold text-[#0F172A]">
                      Database URL
                    </Label>
                  </div>
                  <Input
                    id="notion-db-url"
                    type="text"
                    placeholder="https://www.notion.so/workspace/..."
                    value={dbUrl}
                    onChange={e => setDbUrl(e.target.value)}
                    className="h-10 bg-[#F8FAFC] border-[#E2E8F0] focus:bg-white transition-colors"
                  />
                  <p className="text-xs text-[#94A3B8] flex items-center gap-1">
                    <Info className="h-3 w-3" />
                    Open your database in Notion and copy the URL from the browser
                  </p>
                </div>

                {/* Project + Type — side by side */}
                <div className="p-5 grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <FolderKanban className="h-4 w-4 text-[#64748B]" />
                      <Label className="text-sm font-semibold text-[#0F172A]">Target Project</Label>
                    </div>
                    <Select value={projectId} onValueChange={setProjectId}>
                      <SelectTrigger className="h-10 bg-[#F8FAFC] border-[#E2E8F0]">
                        <SelectValue placeholder="Select a project…" />
                      </SelectTrigger>
                      <SelectContent>
                        {(projects || []).map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Layers className="h-4 w-4 text-[#64748B]" />
                      <Label className="text-sm font-semibold text-[#0F172A]">Default Type</Label>
                    </div>
                    <Select value={itemType} onValueChange={setItemType}>
                      <SelectTrigger className="h-10 bg-[#F8FAFC] border-[#E2E8F0]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ITEM_TYPES.map(t => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Error */}
              {fetchError && (
                <div className="flex items-start gap-3 p-4 rounded-xl bg-[#FEF2F2] border border-[#FECACA]">
                  <div className="w-8 h-8 rounded-full bg-[#FEE2E2] flex items-center justify-center shrink-0">
                    <XCircle className="h-4 w-4 text-[#DC2626]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#DC2626]">Connection failed</p>
                    <p className="text-sm text-[#DC2626]/80 mt-0.5">{fetchError}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══ STEP 2: PREVIEW ═══ */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-[#0F172A] mb-1">Data Preview</h2>
                  <p className="text-sm text-[#64748B]">
                    Review the data fetched from <span className="font-medium text-[#0F172A]">{dbTitle}</span>
                  </p>
                </div>
              </div>

              {/* Stats row */}
              <div className="flex gap-3">
                <StatPill icon={Table2} label="Rows" value={notionRows.length} />
                <StatPill icon={Layers} label="Columns" value={notionProps.length} />
                <StatPill icon={FolderKanban} label="Target" value={projectName} />
              </div>

              {/* Table */}
              <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                        <th className="text-left px-3 py-2.5 font-semibold text-[10px] uppercase tracking-wider text-[#64748B] w-8">
                          #
                        </th>
                        {notionProps.map(p => (
                          <th key={p.id} className="text-left px-3 py-2.5 font-semibold text-[10px] uppercase tracking-wider text-[#64748B] whitespace-nowrap">
                            {p.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {notionRows.slice(0, 8).map((row, idx) => (
                        <tr key={row.notionPageId} className="border-b border-[#F1F5F9] hover:bg-[#F8FAFC] transition-colors">
                          <td className="px-3 py-2 text-[11px] font-mono text-[#94A3B8]">{idx + 1}</td>
                          {notionProps.map(p => (
                            <td key={p.id} className="px-3 py-2 whitespace-nowrap text-[#0F172A] max-w-[220px] truncate text-[13px]">
                              {row.properties[p.name] || <span className="text-[#CBD5E1]">—</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {notionRows.length > 8 && (
                  <div className="px-4 py-2.5 text-xs text-[#94A3B8] bg-[#FAFBFC] border-t border-[#F1F5F9] font-medium">
                    + {notionRows.length - 8} more rows not shown
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══ STEP 3: MAP FIELDS ═══ */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-[#0F172A] mb-1">Map Fields</h2>
                  <p className="text-sm text-[#64748B]">
                    Map each Notion column to a Catalyst field, or skip it.
                  </p>
                </div>
                <div className="flex gap-2">
                  <StatPill icon={ArrowLeftRight} label="Mapped" value={mappedCount} color="#16A34A" />
                  <StatPill icon={SkipForward} label="Skipped" value={skippedCount} color="#94A3B8" />
                </div>
              </div>

              <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
                {/* Header row */}
                <div className="flex items-center px-5 py-2.5 bg-[#F8FAFC] border-b border-[#E2E8F0]">
                  <span className="flex-1 text-[10px] uppercase tracking-wider font-semibold text-[#64748B]">
                    Notion Column
                  </span>
                  <span className="w-6 flex justify-center">
                    <ArrowRight className="h-3 w-3 text-[#CBD5E1]" />
                  </span>
                  <span className="w-52 text-[10px] uppercase tracking-wider font-semibold text-[#64748B] text-right">
                    Catalyst Field
                  </span>
                </div>
                {/* Mapping rows */}
                {notionProps.map((p, i) => {
                  const mapped = mappings[p.name] || '__skip__';
                  const isSkip = mapped === '__skip__';
                  const isSummary = mapped === 'summary';
                  return (
                    <div key={p.id} className={`flex items-center px-5 py-3 gap-3 border-b border-[#F1F5F9] last:border-b-0 transition-colors ${
                      isSkip ? 'bg-[#FAFBFC]' : ''
                    }`}>
                      <div className="flex-1 flex items-center gap-2.5 min-w-0">
                        <span className={`text-sm font-medium truncate ${isSkip ? 'text-[#94A3B8]' : 'text-[#0F172A]'}`}>
                          {p.name}
                        </span>
                        <span className="shrink-0 text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded bg-[#F1F5F9] text-[#64748B] border border-[#E2E8F0]">
                          {p.type}
                        </span>
                      </div>
                      <ArrowRight className={`h-3.5 w-3.5 shrink-0 ${isSkip ? 'text-[#E2E8F0]' : 'text-[#94A3B8]'}`} />
                      <div className="w-52 shrink-0">
                        <Select
                          value={mapped}
                          onValueChange={val => setMappings(prev => ({ ...prev, [p.name]: val }))}
                        >
                          <SelectTrigger className={`h-8 text-sm border ${
                            isSummary ? 'border-[#16A34A] bg-[#F0FDF4]' :
                            isSkip ? 'border-[#E2E8F0] text-[#94A3B8]' :
                            'border-[#E2E8F0]'
                          }`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CATALYST_FIELDS.map(f => (
                              <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  );
                })}
              </div>

              {mapError && !summaryMapped && (
                <div className="flex items-start gap-3 p-4 rounded-xl bg-[#FEF2F2] border border-[#FECACA]">
                  <div className="w-8 h-8 rounded-full bg-[#FEE2E2] flex items-center justify-center shrink-0">
                    <AlertCircle className="h-4 w-4 text-[#DC2626]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#DC2626]">Summary required</p>
                    <p className="text-sm text-[#DC2626]/80 mt-0.5">Map at least one Notion column to the <strong>Summary</strong> field to proceed.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══ STEP 4: CONFIRM & IMPORT ═══ */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-[#0F172A] mb-1">
                  {importResult ? 'Import Complete' : 'Ready to Import'}
                </h2>
              </div>

              {!importResult ? (
                <>
                  {/* Summary card */}
                  <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
                    {[
                      { label: 'Source Database', value: dbTitle, icon: Database },
                      { label: 'Rows to Import', value: String(notionRows.length), icon: Table2 },
                      { label: 'Target Project', value: projectName, icon: FolderKanban },
                      { label: 'Default Item Type', value: itemType, icon: Layers },
                      { label: 'Mapped Fields', value: `${mappedCount} of ${notionProps.length}`, icon: ArrowLeftRight },
                    ].map((row, i) => (
                      <div key={row.label} className={`flex items-center justify-between px-5 py-3.5 ${
                        i < 4 ? 'border-b border-[#F1F5F9]' : ''
                      }`}>
                        <div className="flex items-center gap-2.5">
                          <row.icon className="h-4 w-4 text-[#94A3B8]" />
                          <span className="text-sm text-[#64748B]">{row.label}</span>
                        </div>
                        <span className="text-sm font-semibold text-[#0F172A]">{row.value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Info callout */}
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-[#F0F9FF] border border-[#BAE6FD]">
                    <Info className="h-4 w-4 text-[#0284C7] mt-0.5 shrink-0" />
                    <p className="text-sm text-[#0369A1]">
                      Rows already imported from this Notion database (matched by page ID) will be skipped automatically.
                    </p>
                  </div>

                  {/* Progress bar during import */}
                  {importing && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[#64748B]">Importing…</span>
                        <span className="font-mono font-semibold text-[#0F172A]">
                          {importDone} / {notionRows.length}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-[#F1F5F9] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#2563EB] transition-all duration-300"
                          style={{ width: `${(importDone / notionRows.length) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                </>
              ) : (
                /* ─── Success / Results ─── */
                <div className="bg-white border border-[#E2E8F0] rounded-xl p-8 text-center space-y-5">
                  <div className={`mx-auto w-14 h-14 rounded-full flex items-center justify-center ${
                    importResult.failed > 0 && importResult.imported === 0
                      ? 'bg-[#FEE2E2]' : 'bg-[#DCFCE7]'
                  }`}>
                    {importResult.failed > 0 && importResult.imported === 0 ? (
                      <XCircle className="h-7 w-7 text-[#DC2626]" />
                    ) : (
                      <CheckCircle2 className="h-7 w-7 text-[#16A34A]" />
                    )}
                  </div>

                  <div className="space-y-1">
                    <p className="text-lg font-semibold text-[#0F172A]">
                      {importResult.imported > 0
                        ? `${importResult.imported} items imported`
                        : 'Import failed'}
                    </p>
                  </div>

                  {/* Result pills */}
                  <div className="flex justify-center gap-3">
                    {importResult.imported > 0 && (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#DCFCE7] text-[#16A34A] text-sm font-medium">
                        <CheckCircle2 className="h-3.5 w-3.5" /> {importResult.imported} imported
                      </div>
                    )}
                    {importResult.skipped > 0 && (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F1F5F9] text-[#64748B] text-sm font-medium">
                        <SkipForward className="h-3.5 w-3.5" /> {importResult.skipped} skipped
                      </div>
                    )}
                    {importResult.failed > 0 && (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FEE2E2] text-[#DC2626] text-sm font-medium">
                        <XCircle className="h-3.5 w-3.5" /> {importResult.failed} failed
                      </div>
                    )}
                  </div>

                  <div className="pt-2">
                    <Button
                      variant="outline"
                      className="gap-1.5"
                      onClick={() => navigate('/producthub/backlog')}
                    >
                      View in ProductHub
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ─── Sticky Footer ─── */}
      <div className="shrink-0 border-t border-[#E2E8F0] bg-white px-6 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Button
            onClick={() => setStep(s => Math.max(1, s - 1))}
            variant="ghost"
            disabled={step === 1 || importing}
            className="gap-1.5 text-[#64748B] hover:text-[#0F172A]"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>

          <div className="flex items-center gap-3">
            {step === 1 && (
              <Button
                onClick={handleFetch}
                disabled={!canFetch || fetching}
                className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white gap-2 h-9 px-5"
              >
                {fetching ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Connecting…
                  </>
                ) : (
                  <>
                    Fetch Database
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            )}
            {step === 2 && (
              <Button
                onClick={() => setStep(3)}
                className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white gap-2 h-9 px-5"
              >
                Continue to Mapping
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
            {step === 3 && (
              <Button
                onClick={() => {
                  if (!summaryMapped) { setMapError(true); return; }
                  setMapError(false);
                  setStep(4);
                }}
                className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white gap-2 h-9 px-5"
              >
                Review & Import
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
            {step === 4 && !importResult && (
              <Button
                onClick={handleImport}
                disabled={importing}
                className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white gap-2 h-9 px-5"
              >
                {importing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Importing…
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Import {notionRows.length} Items
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
