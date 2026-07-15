/**
 * STRATA Upload Wizard — governed ingestion intake (blueprint Flow 1, §19/§22).
 * Route: /strata/data/upload.
 *
 * Honest write path (no strata_ingest_* RPC exists yet): the wizard creates a
 * strata_upload_runs row + strata_staging_rows via the domain ingest adapter
 * (RLS: run initiator with data_steward / kpi_owner / strategy_office role),
 * then leaves the run in 'staging'. Validation, attestation and canonical
 * writes remain server-side — the step-3 pre-checks here are DISPLAY-ONLY
 * courtesy checks against the governed template schema, never a verdict.
 */
import React, { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button, CatalystTag, EmptyState, Lozenge, SectionMessage, Select, Spinner,
} from '@/components/ads';
import type { SelectOption } from '@/components/ads';
import { JiraTable } from '@/components/shared/JiraTable';
import type { Column } from '@/components/shared/JiraTable';
import { StatusLozenge } from '@/components/shared/StatusLozenge';
import { Routes } from '@/lib/routes';
import {
  CheckCircle2, Database, FileSpreadsheet, FileUp, ListChecks, Upload,
} from '@/lib/atlaskit-icons';
import { lineageApi } from '@/modules/strata/domain';
import {
  useDataSources, useInvalidateStrata, useStrataRoles, useUploadTemplates,
} from '@/modules/strata/hooks/useStrata';
import {
  StrataLifecycleStepper, StrataPageShell, StrataPanel, T,
  type StrataLifecycleStep, type StrataStepState,
} from '@/modules/strata/components/shared';
import { labelize } from '@/modules/strata/components/format';
import type { StrataUploadTemplate } from '@/modules/strata/types';

const bodyStyle: React.CSSProperties = { fontSize: 'var(--ds-font-size-200)', color: T.text };
const captionStyle: React.CSSProperties = { fontSize: 'var(--ds-font-size-100)', color: T.subtlest };
const mono: React.CSSProperties = {
  fontFamily: 'var(--ds-font-family-code, monospace)', fontSize: 'var(--ds-font-size-100)',
};

const STEPS = ['Contract', 'Upload', 'Map'] as const;
const INGEST_ROLES = ['data_steward', 'kpi_owner', 'strategy_office', 'strata_admin'] as const;

/** Anchor-20 7-step lifecycle — the wizard owns Contract/Upload/Map (steps 1-3),
 *  then stages + hands off to run detail (anchor 09) for Validate→Promote→Calculated. */
function wizardLifecycle(step: number, template: StrataUploadTemplate | null, parsed: ParsedData | null): StrataLifecycleStep[] {
  const st = (i: number): StrataStepState => (i < step ? 'done' : i === step ? 'current' : 'todo');
  return [
    { id: 'contract', label: 'Contract', state: st(0), note: template ? `${template.name} v${template.version}` : undefined },
    { id: 'upload', label: 'Upload', state: st(1), note: parsed ? `${parsed.rows.length} rows` : undefined },
    { id: 'map', label: 'Map', state: st(2), note: 'match columns' },
    { id: 'validate', label: 'Validate', state: 'todo', note: 'server rules' },
    { id: 'resolve', label: 'Resolve', state: 'todo', note: undefined },
    { id: 'promote', label: 'Promote', state: 'todo', note: 'pending attestation' },
    { id: 'calculated', label: 'Calculated', state: 'todo', note: undefined },
  ];
}

// ── Column mapping (anchor 20) — AUTO/CONFIRM/DECIDE client heuristic ─────────
// No server match config exists (template.mapping_rules is empty), so match by
// normalised column/label name: exact→AUTO, partial→CONFIRM, none→DECIDE.
type MatchKind = 'AUTO' | 'CONFIRM' | 'DECIDE';
interface MapRow { header: string; samples: string[]; match: MatchKind; suggested: string | null; }
const normName = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]/g, '');
function sampleValues(parsed: ParsedData, header: string): string[] {
  return parsed.rows.slice(0, 4).map((r) => { const v = r[header]; return v == null ? '' : String(v); }).filter((v) => v !== '').slice(0, 3);
}
function buildMapRows(template: StrataUploadTemplate, parsed: ParsedData): MapRow[] {
  const fields = template.column_schema ?? [];
  return parsed.headers.map((header) => {
    const nh = normName(header);
    const exact = fields.find((f) => normName(f.column) === nh || normName(f.label) === nh);
    if (exact) return { header, samples: sampleValues(parsed, header), match: 'AUTO', suggested: exact.column };
    const partial = nh.length >= 3
      ? fields.find((f) => normName(f.column).includes(nh) || nh.includes(normName(f.column)) || normName(f.label).includes(nh) || nh.includes(normName(f.label)))
      : undefined;
    if (partial) return { header, samples: sampleValues(parsed, header), match: 'CONFIRM', suggested: partial.column };
    return { header, samples: sampleValues(parsed, header), match: 'DECIDE', suggested: null };
  });
}
const MATCH_APPEARANCE: Record<MatchKind, 'success' | 'moved'> = { AUTO: 'success', CONFIRM: 'moved', DECIDE: 'moved' };
const UNMAPPED = '__unmapped__';

/** MAP step (anchor 20) — AUTO/CONFIRM/DECIDE mapping table + honest mapping-memory band. */
function MapStep({ template, rows, mapping, onChange }: {
  template: StrataUploadTemplate;
  rows: MapRow[];
  mapping: Record<string, string>;
  onChange: (header: string, value: string) => void;
}) {
  const autoCount = rows.filter((r) => r.match === 'AUTO').length;
  const fieldOptions: SelectOption[] = [
    ...(template.column_schema ?? []).map((f) => ({ label: f.label, value: f.column })),
    { label: 'Leave unmapped', value: UNMAPPED },
  ];
  const columns: Column<MapRow>[] = [
    {
      id: 'yourcol', label: 'Your column', flex: true,
      cell: ({ row }) => <span style={{ ...mono, color: T.text, fontWeight: 600 }}>{row.header}</span>,
    },
    {
      id: 'samples', label: 'Sample values', width: 24,
      cell: ({ row }) => row.samples.length > 0
        ? <span style={{ ...mono, color: T.subtlest, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{row.samples.join(' · ')}</span>
        : <span style={{ color: T.subtlest }}>—</span>,
    },
    {
      id: 'target', label: 'Template field', width: 26,
      cell: ({ row }) => (
        <Select
          spacing="compact"
          options={fieldOptions}
          value={fieldOptions.find((o) => o.value === (mapping[row.header] ?? '')) ?? null}
          placeholder={row.match === 'DECIDE' ? 'Choose…' : undefined}
          onChange={(opt) => onChange(row.header, (opt as SelectOption | null)?.value ?? '')}
          aria-label={`Template field for ${row.header}`}
        />
      ),
    },
    {
      id: 'match', label: 'Match', width: 16,
      cell: ({ row }) => (
        <div>
          <StatusLozenge status={row.match.toLowerCase()} label={row.match} appearance={MATCH_APPEARANCE[row.match]} />
          {row.match === 'CONFIRM' ? <div style={{ ...captionStyle, marginTop: 4 }}>header renamed — confirm meaning</div> : null}
          {row.match === 'DECIDE' ? <div style={{ ...captionStyle, marginTop: 4 }}>new column — map or leave unmapped</div> : null}
        </div>
      ),
    },
  ];
  return (
    <>
      <p style={{ ...bodyStyle, margin: 0 }}>
        <strong>{autoCount} of {rows.length} column{rows.length === 1 ? '' : 's'} auto-matched</strong> against {template.name} v{template.version}
        {rows.length - autoCount > 0 ? ` — ${rows.length - autoCount} need your decision` : ''}. Sample values are from your file.
        <span style={{ ...captionStyle, marginLeft: 8 }}>Nothing is written until Promote.</span>
      </p>
      <StrataPanel title="Column mapping" icon={<ListChecks size={16} />} count={rows.length} noPadding testId="strata-upload-map">
        {rows.length === 0 ? (
          <div style={{ padding: 16 }}><EmptyState size="compact" header="No columns detected" description="The uploaded file has no header row to map." /></div>
        ) : (
          <JiraTable<MapRow> columns={columns} data={rows} getRowId={(r) => r.header} showRowCount={false} ariaLabel="Column mapping" />
        )}
      </StrataPanel>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 16px', border: `1px solid ${T.border}`, borderRadius: 8, background: T.sunken, ...captionStyle, flexWrap: 'wrap' }} data-testid="strata-upload-mapping-memory">
        <span style={{ fontWeight: 700, letterSpacing: '0.04em', color: T.subtlest }}>MAPPING MEMORY</span>
        <span>This mapping applies to this run only — STRATA has no template-contract write path yet, so next month&apos;s file is matched fresh by column name.</span>
      </div>
    </>
  );
}

// ── Parsing (client-side, display + staging payload only) ───────────────────
interface ParsedData {
  headers: string[];
  rows: Array<Record<string, unknown>>;
  /** Raw bytes of the source payload — hashed for run provenance. */
  bytes: ArrayBuffer;
  fileName: string | null;
  channel: 'excel' | 'manual';
}

async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function parseCsvText(text: string, fileName: string | null, channel: 'excel' | 'manual'): Promise<ParsedData> {
  const Papa = (await import('papaparse')).default;
  const out = Papa.parse<Record<string, unknown>>(text, { header: true, skipEmptyLines: 'greedy' });
  if (out.errors.length > 0 && out.data.length === 0) {
    throw new Error(`CSV parse failed: ${out.errors[0].message}`);
  }
  return {
    headers: (out.meta.fields ?? []).filter((f) => f && f.trim().length > 0),
    rows: out.data,
    bytes: new TextEncoder().encode(text).buffer as ArrayBuffer,
    fileName,
    channel,
  };
}

async function parseXlsx(buffer: ArrayBuffer, fileName: string): Promise<ParsedData> {
  // Dynamic import — repo precedent (UWVExport.tsx): keeps xlsx out of the main chunk.
  const XLSX = await import('xlsx');
  const wb = XLSX.read(buffer, { type: 'array' });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) throw new Error('Workbook contains no sheets.');
  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null });
  const headerRows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1 });
  const headers = ((headerRows[0] ?? []) as unknown[]).map((h) => String(h ?? '').trim()).filter(Boolean);
  return { headers, rows, bytes: buffer, fileName, channel: 'excel' };
}

// ── Display-only pre-checks against the governed template schema ────────────

// ── Step 1: governed template picker ─────────────────────────────────────────
function TemplateStep({ selected, onSelect }: {
  selected: StrataUploadTemplate | null;
  onSelect: (t: StrataUploadTemplate) => void;
}) {
  const templates = useUploadTemplates();
  const [hover, setHover] = useState<string | null>(null);

  const schemaColumns: Column<StrataUploadTemplate['column_schema'][number]>[] = [
    { id: 'column', label: 'Column', width: 22, cell: ({ row: c }) => <span style={{ ...mono, color: T.text }}>{c.column}</span> },
    { id: 'label', label: 'Label', flex: true, cell: ({ row: c }) => <span style={bodyStyle}>{c.label}</span> },
    { id: 'type', label: 'Type', width: 14, cell: ({ row: c }) => <CatalystTag text={labelize(c.type)} /> },
    {
      id: 'required', label: 'Required', width: 12,
      cell: ({ row: c }) => (c.required
        ? <Lozenge appearance="removed">Required</Lozenge>
        : <Lozenge appearance="default">Optional</Lozenge>),
    },
  ];

  if (templates.isLoading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><Spinner size="medium" /></div>;
  }
  if (templates.isError) {
    return (
      <SectionMessage appearance="error" title="Failed to load upload templates">
        <p>{templates.error instanceof Error ? templates.error.message : 'Unknown error'}</p>
      </SectionMessage>
    );
  }
  const list = templates.data ?? [];
  if (list.length === 0) {
    return (
      <EmptyState
        header="No governed upload templates"
        description="An approved upload template is required before data can be ingested. Templates are managed in STRATA admin."
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
        {list.map((t) => {
          const isApproved = t.status === 'approved';
          const isSelected = selected?.id === t.id;
          return (
            <button
              key={t.id}
              type="button"
              disabled={!isApproved}
              aria-pressed={isSelected}
              onClick={() => onSelect(t)}
              onMouseEnter={() => setHover(t.id)}
              onMouseLeave={() => setHover(null)}
              data-testid={`strata-upload-template-${t.slug ?? t.id}`}
              style={{
                display: 'flex', flexDirection: 'column', gap: 8, padding: 12, textAlign: 'left', font: 'inherit',
                border: `1px solid ${isSelected ? 'var(--ds-border-focused)' : T.border}`,
                borderRadius: 8, cursor: isApproved ? 'pointer' : 'not-allowed',
                background: isSelected ? T.selected : hover === t.id && isApproved ? T.sunken : T.raised,
                boxShadow: 'var(--ds-shadow-raised)', opacity: isApproved ? 1 : 0.6,
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <strong style={{ fontSize: 'var(--ds-font-size-200)', color: T.text }}>{t.name}</strong>
                <StatusLozenge status={t.status} label={labelize(t.status)} appearance={isApproved ? 'success' : 'default'} />
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <CatalystTag text={labelize(t.target_entity)} />
                <span style={captionStyle}>v{t.version}</span>
              </span>
              {t.description ? <span style={captionStyle}>{t.description}</span> : null}
            </button>
          );
        })}
      </div>
      {selected ? (
        <StrataPanel
          title={`Column schema — ${selected.name}`}
          icon={<ListChecks size={16} />}
          count={selected.column_schema?.length ?? 0}
          noPadding
          testId="strata-upload-schema-panel"
        >
          <JiraTable<StrataUploadTemplate['column_schema'][number]>
            columns={schemaColumns}
            data={selected.column_schema ?? []}
            getRowId={(c) => c.column}
            ariaLabel={`Column schema for ${selected.name}`}
          />
        </StrataPanel>
      ) : (
        <p style={{ ...captionStyle, margin: 0 }}>Select a governed template to see its column contract.</p>
      )}
    </div>
  );
}

// ── Step 2: source + file / pasted CSV ───────────────────────────────────────
function FileStep({ sourceId, onSourceChange, parsed, onParsed }: {
  sourceId: string | null;
  onSourceChange: (id: string | null) => void;
  parsed: ParsedData | null;
  onParsed: (p: ParsedData | null) => void;
}) {
  const sources = useDataSources();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);

  const sourceOptions: SelectOption<string>[] = (sources.data ?? [])
    .filter((s) => s.status !== 'retired')
    .map((s) => ({ value: s.id, label: `${s.name} (${labelize(s.system_type)} · ${labelize(s.status)})` }));
  const selectedOption = sourceOptions.find((o) => o.value === sourceId) ?? null;

  const handleFile = async (file: File) => {
    setParsing(true); setParseError(null);
    try {
      const lower = file.name.toLowerCase();
      if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
        onParsed(await parseXlsx(await file.arrayBuffer(), file.name));
      } else if (lower.endsWith('.csv') || lower.endsWith('.txt')) {
        onParsed(await parseCsvText(await file.text(), file.name, 'excel'));
      } else {
        throw new Error('Unsupported file type. Accepted: .xlsx, .xls, .csv');
      }
    } catch (e) {
      onParsed(null);
      setParseError(e instanceof Error ? e.message : String(e));
    } finally {
      setParsing(false);
    }
  };

  const handlePaste = async () => {
    setParsing(true); setParseError(null);
    try {
      if (pasteText.trim().length === 0) throw new Error('Paste CSV content first.');
      onParsed(await parseCsvText(pasteText, null, 'manual'));
    } catch (e) {
      onParsed(null);
      setParseError(e instanceof Error ? e.message : String(e));
    } finally {
      setParsing(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <StrataPanel title="Registered source" icon={<Database size={16} />} testId="strata-upload-source-panel">
        <p style={{ ...captionStyle, margin: '0 0 8px' }}>
          Only registered sources can feed approved KPIs (§19). Optional here — the run records provenance either way.
        </p>
        <div style={{ maxWidth: 420 }}>
          <Select<string>
            options={sourceOptions}
            value={selectedOption}
            onChange={(next) => onSourceChange(next?.value ?? null)}
            placeholder={sources.isLoading ? 'Loading sources…' : 'Select a registered source'}
            isLoading={sources.isLoading}
            isClearable
            aria-label="Registered data source"
            testId="strata-upload-source-select"
          />
        </div>
      </StrataPanel>

      <StrataPanel title="Data payload" icon={<FileSpreadsheet size={16} />} testId="strata-upload-file-panel">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx,.xls,.txt"
              style={{ display: 'none' }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleFile(f);
                e.target.value = '';
              }}
              data-testid="strata-upload-file-input"
            />
            <Button iconBefore={<FileUp size={14} />} onClick={() => fileRef.current?.click()} isDisabled={parsing}>
              Choose file (.xlsx / .csv)
            </Button>
            <Button appearance="subtle" onClick={() => setPasteOpen((o) => !o)} isDisabled={parsing}>
              {pasteOpen ? 'Hide paste area' : 'Paste CSV instead'}
            </Button>
            {parsing ? <Spinner size="small" /> : null}
          </div>
          {pasteOpen ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                rows={8}
                placeholder={'kpi_slug,period,value\nnet-revenue,Q2 FY2026,1250000'}
                aria-label="Pasted CSV content"
                data-testid="strata-upload-paste-area"
                style={{
                  width: '100%', resize: 'vertical', padding: 8, borderRadius: 6,
                  border: `1px solid ${T.border}`, background: T.surface, color: T.text,
                  fontFamily: 'var(--ds-font-family-code, monospace)', fontSize: 'var(--ds-font-size-100)',
                }}
              />
              <div>
                <Button appearance="primary" onClick={() => void handlePaste()} isDisabled={parsing}>
                  Parse pasted CSV
                </Button>
              </div>
            </div>
          ) : null}
          {parseError ? (
            <SectionMessage appearance="error" title="Could not parse the payload">
              <p>{parseError}</p>
            </SectionMessage>
          ) : null}
          {parsed ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ color: 'var(--ds-icon-success)', display: 'inline-flex' }} aria-hidden><CheckCircle2 size={16} /></span>
              <span style={bodyStyle}>
                {parsed.fileName ?? 'Pasted CSV'} — {parsed.rows.length.toLocaleString('en-US')} row{parsed.rows.length === 1 ? '' : 's'},{' '}
                {parsed.headers.length} column{parsed.headers.length === 1 ? '' : 's'}
              </span>
              <CatalystTag text={parsed.channel === 'manual' ? 'Manual entry' : 'File upload'} />
            </div>
          ) : null}
        </div>
      </StrataPanel>
    </div>
  );
}

// ── Step 3: preview + display-only pre-checks ────────────────────────────────

// ── Page ─────────────────────────────────────────────────────────────────────
export default function StrataUploadWizardPage() {
  const navigate = useNavigate();
  const invalidate = useInvalidateStrata();
  const roles = useStrataRoles();
  const sources = useDataSources();

  const [step, setStep] = useState(0);
  const [template, setTemplate] = useState<StrataUploadTemplate | null>(null);
  const [sourceId, setSourceId] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedData | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});

  // Column mapping rows (anchor 20); AUTO/CONFIRM defaults auto-fill, DECIDE stays undecided.
  const mapRows = useMemo(() => (template && parsed ? buildMapRows(template, parsed) : []), [template, parsed]);
  React.useEffect(() => {
    if (mapRows.length === 0) return;
    setMapping((prev) => {
      const next = { ...prev };
      mapRows.forEach((r) => { if (next[r.header] === undefined && r.match !== 'DECIDE' && r.suggested) next[r.header] = r.suggested; });
      return next;
    });
  }, [mapRows]);
  const unresolvedDecide = mapRows.some((r) => r.match === 'DECIDE' && mapping[r.header] === undefined);
  const hasIngestRole = (roles.data ?? []).some((r) => (INGEST_ROLES as readonly string[]).includes(r));

  /** Remap a parsed row's keys to the template columns the steward mapped (anchor 20). */
  const remapRaw = (raw: Record<string, unknown>): Record<string, unknown> => {
    const out: Record<string, unknown> = {};
    mapRows.forEach((r) => { const t = mapping[r.header]; if (t && t !== UNMAPPED) out[t] = raw[r.header]; });
    return out;
  };

  const canContinue =
    step === 0 ? template != null
    : step === 1 ? parsed != null && parsed.rows.length > 0
    : !unresolvedDecide;

  const submit = async () => {
    if (!template || !parsed) return;
    setSubmitting(true); setSubmitError(null);
    try {
      const fileHash = await sha256Hex(parsed.bytes);
      const run = await lineageApi.createUploadRun({
        data_source_id: sourceId,
        template_id: template.id,
        template_version: template.version,
        channel: parsed.channel,
        file_name: parsed.fileName,
        file_hash: fileHash,
        row_count_raw: parsed.rows.length,
      });
      await lineageApi.insertStagingRows(
        run.id,
        parsed.rows.map((raw, i) => ({
          row_number: i + 1,
          raw: remapRaw(raw),
          target_entity: template.target_entity ?? null,
        })),
      );
      await lineageApi.markRunStaged(run.id, parsed.rows.length);
      invalidate();
      navigate(Routes.strata.run(run.run_key));
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : String(e));
      setSubmitting(false);
    }
  };

  return (
    <StrataPageShell
      trail={[{ text: 'Data pipeline', href: Routes.strata.data() }, { text: 'Upload' }]}
      docTitle="Upload data"
      testId="strata-upload-wizard-chrome"
    >
      {/* Anchor-20 7-step lifecycle; wizard owns Contract/Upload/Map, then hands to run detail (09). */}
      <div style={{ padding: '12px 16px', border: `1px solid ${T.border}`, borderRadius: 8, background: T.raised, boxShadow: 'var(--ds-shadow-raised)', overflowX: 'auto', marginBottom: 16 }}>
        <StrataLifecycleStepper variant="full" steps={wizardLifecycle(step, template, parsed)} ariaLabel="Upload lifecycle" />
      </div>

      {roles.isSuccess && !hasIngestRole ? (
        <div style={{ marginBottom: 16 }}>
          <SectionMessage appearance="warning" title="Ingest role required">
            <p>
              Creating upload runs requires the data steward, KPI owner or strategy office role.
              The database will reject the submission without one — role assignments live in STRATA admin.
            </p>
          </SectionMessage>
        </div>
      ) : null}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {step === 0 ? <TemplateStep selected={template} onSelect={setTemplate} /> : null}
        {step === 1 ? (
          <FileStep sourceId={sourceId} onSourceChange={setSourceId} parsed={parsed} onParsed={setParsed} />
        ) : null}
        {step === 2 && template && parsed ? (
          <MapStep template={template} rows={mapRows} mapping={mapping} onChange={(header, value) => setMapping((prev) => ({ ...prev, [header]: value }))} />
        ) : null}
        {step === 2 && submitError ? (
          <SectionMessage appearance="error" title="Could not stage the run">
            <p style={{ whiteSpace: 'pre-wrap' }}>{submitError}</p>
          </SectionMessage>
        ) : null}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 12, borderTop: `1px solid ${T.border}` }}>
        <Button appearance="subtle" onClick={() => navigate(Routes.strata.data())} isDisabled={submitting}>
          Cancel
        </Button>
        <div style={{ display: 'flex', gap: 8 }}>
          {step > 0 ? (
            <Button onClick={() => setStep((s) => s - 1)} isDisabled={submitting}>Back</Button>
          ) : null}
          {step < STEPS.length - 1 ? (
            <Button appearance="primary" onClick={() => setStep((s) => s + 1)} isDisabled={!canContinue}>
              Continue
            </Button>
          ) : (
            <Button
              appearance="primary"
              iconBefore={submitting ? undefined : <Upload size={14} />}
              onClick={() => void submit()}
              isDisabled={submitting || !template || !parsed || unresolvedDecide}
              testId="strata-upload-submit"
            >
              {submitting ? 'Staging…' : 'Continue to validation'}
            </Button>
          )}
        </div>
      </div>
    </StrataPageShell>
  );
}
