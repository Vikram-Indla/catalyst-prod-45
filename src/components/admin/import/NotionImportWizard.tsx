/**
 * NotionImportWizard — 4-step wizard to import work items from a Notion database.
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
import { ImportWizardStepper, WizardStep } from './ImportWizardStepper';
import { AlertCircle, Check, Loader2, ExternalLink } from 'lucide-react';
import { fetchNotionDatabase, importNotionRows } from '@/lib/import/notionImportService';
import type { NotionProperty, NotionRow } from '@/types/notionImport';

const WIZARD_STEPS: WizardStep[] = [
  { id: 1, label: 'Connect' },
  { id: 2, label: 'Preview' },
  { id: 3, label: 'Map fields' },
  { id: 4, label: 'Confirm' },
];

const CATALYST_FIELDS = [
  { value: '__skip__', label: 'Skip' },
  { value: 'summary', label: 'Summary' },
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

/** Smart default: map Notion property name → Catalyst column */
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

export function NotionImportWizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  // Step 1 — Connect state
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

  // Step 3 — Mappings
  const [mappings, setMappings] = useState<Record<string, string>>({});

  // Step 4 — Import state
  const [importing, setImporting] = useState(false);
  const [importDone, setImportDone] = useState(0);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; failed: number } | null>(null);

  // Fetch projects for dropdown
  const { data: projects } = useQuery({
    queryKey: ['ph-projects-list-for-import'],
    queryFn: async () => {
      const { data } = await supabase.from('ph_projects').select('id, name').order('name');
      return data || [];
    },
  });

  // Derive project name
  const projectName = useMemo(() => projects?.find(p => p.id === projectId)?.name || '', [projects, projectId]);

  // Step 1 — Fetch Database via service
  const handleFetch = useCallback(async () => {
    setFetchError(null);
    setFetching(true);
    try {
      const res = await fetchNotionDatabase(token, dbUrl);

      setDbTitle(res.databaseTitle);
      setNotionProps(res.properties);
      setNotionRows(res.rows);

      // Build smart default mappings
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

  // Step 3 — Validation
  const summaryMapped = useMemo(() => Object.values(mappings).includes('summary'), [mappings]);
  const mappedCount = useMemo(() => Object.values(mappings).filter(v => v !== '__skip__').length, [mappings]);
  const [mapError, setMapError] = useState(false);

  // Step 4 — Import
  const handleImport = useCallback(async () => {
    setImporting(true);
    setImportDone(0);
    let imported = 0;
    let skipped = 0;
    let failed = 0;

    // Build insert payload per row
    const activeMappings = Object.entries(mappings).filter(([, v]) => v !== '__skip__');

    const batchSize = 50;
    for (let i = 0; i < notionRows.length; i += batchSize) {
      const batch = notionRows.slice(i, i + batchSize);
      const inserts = batch.map(row => {
        const record: Record<string, any> = {
          item_type: itemType,
          project_id: projectId,
          sync_source: 'notion',
          jira_issue_id: row.notionPageId,
          jira_url: row.notionPageUrl,
        };
        activeMappings.forEach(([notionProp, catalystCol]) => {
          const val = row.properties[notionProp];
          if (val !== null && val !== undefined) {
            record[catalystCol] = val;
          }
        });
        // Ensure summary exists
        if (!record.summary) record.summary = 'Untitled';
        return record;
      });

      // @ts-ignore — dynamic column set
      const { error, data } = await supabase
        .from('ph_work_items')
        .upsert(inserts as any[], { onConflict: 'jira_issue_id', ignoreDuplicates: true })
        .select('id');

      if (error) {
        failed += inserts.length;
      } else {
        imported += data?.length || 0;
        skipped += inserts.length - (data?.length || 0);
      }
      setImportDone(Math.min(i + batchSize, notionRows.length));
    }

    setImportResult({ imported, skipped, failed });
    setImporting(false);
  }, [notionRows, mappings, itemType, projectId]);

  const canFetch = token.length > 0 && dbUrl.length > 0 && projectId.length > 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="h-[72px] flex items-center justify-between border-b px-6 shrink-0">
        <h1 className="text-2xl font-semibold text-foreground">Import from Notion</h1>
        <ImportWizardStepper steps={WIZARD_STEPS} currentStep={step} className="max-w-md" />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-6 py-6">
        <div className="max-w-4xl">

          {/* ─── STEP 1: CONNECT ─── */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-1">Connect to Notion</h2>
                <p className="text-sm text-muted-foreground">
                  Provide your Notion integration token and database URL to begin importing.
                </p>
              </div>

              <div className="bg-white border border-[#E2E8F0] rounded-lg p-6 space-y-5">
                {/* Integration Token */}
                <div className="space-y-1.5">
                  <Label htmlFor="notion-token">Notion Integration Token</Label>
                  <Input
                    id="notion-token"
                    type="password"
                    placeholder="secret_..."
                    value={token}
                    onChange={e => setToken(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Create at{' '}
                    <a href="https://www.notion.so/my-integrations" target="_blank" rel="noopener noreferrer" className="underline text-[#2563EB]">
                      notion.so/my-integrations
                    </a>{' '}
                    → copy Internal Integration Secret
                  </p>
                </div>

                {/* Database URL */}
                <div className="space-y-1.5">
                  <Label htmlFor="notion-db-url">Notion Database URL</Label>
                  <Input
                    id="notion-db-url"
                    type="text"
                    placeholder="https://www.notion.so/workspace/..."
                    value={dbUrl}
                    onChange={e => setDbUrl(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Open your database in Notion, copy the URL from the browser
                  </p>
                </div>

                {/* Target Project */}
                <div className="space-y-1.5">
                  <Label>Import into Project</Label>
                  <Select value={projectId} onValueChange={setProjectId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a project…" />
                    </SelectTrigger>
                    <SelectContent>
                      {(projects || []).map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Default Item Type */}
                <div className="space-y-1.5">
                  <Label>Default Work Item Type</Label>
                  <Select value={itemType} onValueChange={setItemType}>
                    <SelectTrigger>
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

              {/* Error */}
              {fetchError && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626] text-sm">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{fetchError}</span>
                </div>
              )}
            </div>
          )}

          {/* ─── STEP 2: PREVIEW ─── */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-1">Preview — {dbTitle}</h2>
                <p className="text-sm text-muted-foreground">
                  {notionRows.length} rows found in Notion database
                </p>
              </div>

              <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-[#F8FAFC]">
                        {notionProps.map(p => (
                          <th key={p.id} className="text-left px-3 py-2 font-medium text-muted-foreground whitespace-nowrap text-xs uppercase tracking-wide">
                            {p.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {notionRows.slice(0, 10).map((row, idx) => (
                        <tr key={row.notionPageId} className={idx % 2 === 0 ? '' : ''}>
                          {notionProps.map(p => (
                            <td key={p.id} className="px-3 py-2 whitespace-nowrap text-foreground border-b border-[#F1F5F9] max-w-[200px] truncate">
                              {row.properties[p.name] || <span className="text-muted-foreground">—</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {notionRows.length > 10 && (
                  <div className="px-3 py-2 text-xs text-muted-foreground border-t">
                    and {notionRows.length - 10} more rows
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─── STEP 3: MAP FIELDS ─── */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-1">Map Notion columns → Catalyst fields</h2>
                <p className="text-sm text-muted-foreground">
                  Choose which Catalyst field each Notion property maps to, or skip it.
                </p>
              </div>

              <div className="bg-white border border-[#E2E8F0] rounded-lg divide-y divide-[#F1F5F9]">
                {notionProps.map(p => (
                  <div key={p.id} className="flex items-center justify-between px-4 py-3 gap-4">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-medium text-sm text-foreground truncate">{p.name}</span>
                      <span className="shrink-0 text-[10px] uppercase tracking-wide font-semibold px-1.5 py-0.5 rounded bg-[#DFE1E6] text-[#253858]">
                        {p.type}
                      </span>
                    </div>
                    <div className="w-48 shrink-0">
                      <Select
                        value={mappings[p.name] || '__skip__'}
                        onValueChange={val => setMappings(prev => ({ ...prev, [p.name]: val }))}
                      >
                        <SelectTrigger className="h-8 text-sm">
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
                ))}
              </div>

              {mapError && !summaryMapped && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626] text-sm">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>The <strong>Summary</strong> field must be mapped to at least one Notion column.</span>
                </div>
              )}
            </div>
          )}

          {/* ─── STEP 4: CONFIRM & IMPORT ─── */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-1">Ready to import</h2>
              </div>

              {!importResult ? (
                <>
                  {/* Summary card */}
                  <div className="bg-white border border-[#E2E8F0] rounded-lg p-5 space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Database</span>
                      <span className="font-medium text-foreground">{dbTitle}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Rows to import</span>
                      <span className="font-medium text-foreground">{notionRows.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Target project</span>
                      <span className="font-medium text-foreground">{projectName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Item type</span>
                      <span className="font-medium text-foreground">{itemType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Mapped fields</span>
                      <span className="font-medium text-foreground">{mappedCount} of {notionProps.length}</span>
                    </div>
                  </div>

                  {/* Warning */}
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-[#FFFBEB] border border-[#FDE68A] text-[#D97706] text-sm">
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>
                      Rows already imported from this Notion database (matched by Notion page ID) will be skipped automatically.
                    </span>
                  </div>

                  {/* Import button */}
                  <Button
                    onClick={handleImport}
                    disabled={importing}
                    className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white"
                  >
                    {importing ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Importing {importDone} of {notionRows.length}…
                      </span>
                    ) : (
                      `Import ${notionRows.length} Items`
                    )}
                  </Button>
                </>
              ) : (
                /* Success state */
                <div className="bg-white border border-[#E2E8F0] rounded-lg p-6 text-center space-y-4">
                  <div className="mx-auto w-12 h-12 rounded-full bg-[#DCFCE7] flex items-center justify-center">
                    <Check className="h-6 w-6 text-[#16A34A]" />
                  </div>
                  <div className="space-y-1 text-sm">
                    <p className="font-semibold text-foreground">{importResult.imported} items imported successfully</p>
                    {importResult.skipped > 0 && (
                      <p className="text-muted-foreground">{importResult.skipped} skipped (already exist)</p>
                    )}
                    {importResult.failed > 0 && (
                      <p className="text-[#DC2626]">{importResult.failed} failed</p>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    className="gap-1.5"
                    onClick={() => navigate('/producthub/backlog')}
                  >
                    View in ProductHub
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Sticky footer */}
      <div className="shrink-0 border-t bg-background px-6 py-4 shadow-[0_-2px_8px_rgba(0,0,0,0.05)]">
        <div className="max-w-4xl flex items-center justify-between">
          <Button
            onClick={() => setStep(s => Math.max(1, s - 1))}
            variant="outline"
            disabled={step === 1 || importing}
          >
            Back
          </Button>
          {step === 1 && (
            <Button
              onClick={handleFetch}
              disabled={!canFetch || fetching}
              className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white"
            >
              {fetching ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Fetching…
                </span>
              ) : (
                'Fetch Database'
              )}
            </Button>
          )}
          {step === 2 && (
            <Button
              onClick={() => setStep(3)}
              className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white"
            >
              Map columns in next step →
            </Button>
          )}
          {step === 3 && (
            <Button
              onClick={() => {
                if (!summaryMapped) { setMapError(true); return; }
                setMapError(false);
                setStep(4);
              }}
              className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white"
            >
              Next
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
