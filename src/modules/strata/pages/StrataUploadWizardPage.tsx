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
import { StrataPageShell, StrataPanel, T } from '@/modules/strata/components/shared';
import { labelize } from '@/modules/strata/components/format';
import type { StrataUploadTemplate } from '@/modules/strata/types';

const bodyStyle: React.CSSProperties = { fontSize: 'var(--ds-font-size-200)', color: T.text };
const captionStyle: React.CSSProperties = { fontSize: 'var(--ds-font-size-100)', color: T.subtlest };
const mono: React.CSSProperties = {
  fontFamily: 'var(--ds-font-family-code, monospace)', fontSize: 'var(--ds-font-size-100)',
};

const STEPS = ['Template', 'File', 'Preview & validate', 'Submit'] as const;
const PREVIEW_CAP = 100;
const INGEST_ROLES = ['data_steward', 'kpi_owner', 'strategy_office', 'strata_admin'] as const;

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
interface RowCheck { rowNumber: number; issues: string[] }

function precheckRows(template: StrataUploadTemplate, parsed: ParsedData): {
  missingRequiredColumns: string[];
  checks: RowCheck[];
  invalidCount: number;
} {
  const schema = template.column_schema ?? [];
  const headerSet = new Set(parsed.headers.map((h) => h.toLowerCase()));
  const missingRequiredColumns = schema
    .filter((c) => c.required && !headerSet.has(c.column.toLowerCase()))
    .map((c) => c.column);
  const checks: RowCheck[] = parsed.rows.map((row, i) => {
    const issues: string[] = [];
    // Header keys may differ in case from the schema column names.
    const byLower = new Map(Object.keys(row).map((k) => [k.toLowerCase(), row[k]]));
    schema.forEach((col) => {
      const v = byLower.get(col.column.toLowerCase());
      const empty = v == null || String(v).trim() === '';
      if (col.required && empty) issues.push(`${col.column}: required, empty`);
      if (col.type === 'number' && !empty && !Number.isFinite(Number(v))) {
        issues.push(`${col.column}: not numeric`);
      }
    });
    return { rowNumber: i + 1, issues };
  });
  return { missingRequiredColumns, checks, invalidCount: checks.filter((c) => c.issues.length > 0).length };
}

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
function PreviewStep({ template, parsed }: { template: StrataUploadTemplate; parsed: ParsedData }) {
  const pre = useMemo(() => precheckRows(template, parsed), [template, parsed]);
  const shown = parsed.rows.slice(0, PREVIEW_CAP);
  const shownHeaders = parsed.headers.slice(0, 6);

  const columns: Column<{ row: Record<string, unknown>; check: RowCheck }>[] = [
    {
      id: 'n', label: '#', width: 6, align: 'end',
      cell: ({ row: r }) => <span style={{ ...bodyStyle, fontVariantNumeric: 'tabular-nums' }}>{r.check.rowNumber}</span>,
    },
    ...shownHeaders.map((h, i): Column<{ row: Record<string, unknown>; check: RowCheck }> => ({
      id: `col-${h}`,
      label: h,
      ...(i === 0 ? { flex: true } : { width: 14 }),
      cell: ({ row: r }) => {
        const v = r.row[h];
        return v == null || String(v).trim() === ''
          ? <span style={{ color: T.subtlest }}>—</span>
          : <span style={{ ...bodyStyle, fontVariantNumeric: 'tabular-nums', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{String(v)}</span>;
      },
    })),
    {
      id: 'precheck', label: 'Pre-check', width: 12,
      cell: ({ row: r }) => (r.check.issues.length === 0
        ? <StatusLozenge status="valid" label="Valid" appearance="success" />
        : <StatusLozenge status="invalid" label="Invalid" appearance="removed" />),
    },
    {
      id: 'issues', label: 'Issues', width: 24,
      cell: ({ row: r }) => (r.check.issues.length === 0
        ? <span style={{ color: T.subtlest }}>—</span>
        : <span style={{ fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-danger)' }}>{r.check.issues.join('; ')}</span>),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <SectionMessage appearance="information" title="Display-only pre-checks">
        <p>
          These checks compare the parsed payload with template “{template.name}” (v{template.version}) for early feedback only.
          Authoritative validation, attestation and canonical writes happen server-side after submission.
        </p>
      </SectionMessage>
      {pre.missingRequiredColumns.length > 0 ? (
        <SectionMessage appearance="warning" title="Required columns missing from the payload">
          <p>{pre.missingRequiredColumns.join(', ')}</p>
        </SectionMessage>
      ) : null}
      <StrataPanel
        title="Parsed rows"
        icon={<ListChecks size={16} />}
        count={parsed.rows.length}
        noPadding
        testId="strata-upload-preview-panel"
        actions={
          <span style={{ ...captionStyle, whiteSpace: 'nowrap' }}>
            {pre.invalidCount > 0
              ? `${(parsed.rows.length - pre.invalidCount).toLocaleString('en-US')} pass · ${pre.invalidCount.toLocaleString('en-US')} fail pre-checks`
              : 'All rows pass pre-checks'}
          </span>
        }
      >
        <JiraTable<{ row: Record<string, unknown>; check: RowCheck }>
          columns={columns}
          data={shown.map((row, i) => ({ row, check: pre.checks[i] }))}
          getRowId={(r) => String(r.check.rowNumber)}
          ariaLabel="Parsed upload preview"
        />
        {parsed.rows.length > PREVIEW_CAP ? (
          <div style={{ padding: '8px 16px', borderTop: `1px solid ${T.border}` }}>
            <span style={captionStyle}>
              Showing first {PREVIEW_CAP} of {parsed.rows.length.toLocaleString('en-US')} rows. All rows are staged on submit.
            </span>
          </div>
        ) : null}
      </StrataPanel>
    </div>
  );
}

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

  const pre = useMemo(
    () => (template && parsed ? precheckRows(template, parsed) : null),
    [template, parsed],
  );
  const hasIngestRole = (roles.data ?? []).some((r) => (INGEST_ROLES as readonly string[]).includes(r));

  const canContinue =
    step === 0 ? template != null
    : step === 1 ? parsed != null && parsed.rows.length > 0
    : true;

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
          raw,
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

  const summaryRow = (label: string, value: React.ReactNode) => (
    <div style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}>
      <span style={{ ...captionStyle, fontWeight: 600, width: 140, flexShrink: 0 }}>{label}</span>
      <span style={bodyStyle}>{value}</span>
    </div>
  );

  return (
    <StrataPageShell
      trail={[{ text: 'Data pipeline', href: Routes.strata.data() }, { text: 'Upload' }]}
      docTitle="Upload data"
      testId="strata-upload-wizard-chrome"
    >
      {/* Token-pure stepper (@atlaskit/progress-tracker is not an installed dep) */}
      <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 20, overflowX: 'auto' }} aria-label="Upload steps">
        {STEPS.map((label, i) => {
          const state = i < step ? 'done' : i === step ? 'current' : 'todo';
          const tone = state === 'done' ? 'var(--ds-text-success)' : state === 'current' ? 'var(--ds-text-brand)' : T.subtlest;
          return (
            <React.Fragment key={label}>
              {i > 0 ? <div style={{ flex: '1 1 24px', height: 2, marginTop: 12, minWidth: 12, background: i <= step ? 'var(--ds-text-brand)' : T.border }} /> : null}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 96 }}>
                <span aria-hidden style={{
                  width: 24, height: 24, borderRadius: 12, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  border: `2px solid ${tone}`, color: tone, background: T.raised,
                  fontSize: 'var(--ds-font-size-050)', fontWeight: 700, fontVariantNumeric: 'tabular-nums',
                }}>
                  {state === 'done' ? '✓' : i + 1}
                </span>
                <span style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: state === 'current' ? 600 : 500, color: state === 'todo' ? T.subtlest : T.text, whiteSpace: 'nowrap' }}>
                  {label}
                </span>
              </div>
            </React.Fragment>
          );
        })}
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
        {step === 2 && template && parsed ? <PreviewStep template={template} parsed={parsed} /> : null}
        {step === 3 && template && parsed ? (
          <StrataPanel title="Submit governed run" icon={<Upload size={16} />} testId="strata-upload-submit-panel">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {summaryRow('Template', `${template.name} (v${template.version})`)}
              {summaryRow('Target entity', labelize(template.target_entity))}
              {summaryRow('Source', sourceId
                ? (sources.data ?? []).find((s) => s.id === sourceId)?.name ?? '—'
                : '—')}
              {summaryRow('Payload', parsed.fileName ?? 'Pasted CSV')}
              {summaryRow('Rows to stage', parsed.rows.length.toLocaleString('en-US'))}
              {pre ? summaryRow(
                'Pre-checks',
                pre.invalidCount === 0
                  ? 'All rows pass'
                  : `${pre.invalidCount.toLocaleString('en-US')} row(s) fail display-only pre-checks — they will still be staged; server-side validation decides`,
              ) : null}
              <div style={{ marginTop: 8 }}>
                <SectionMessage appearance="information" title="What happens on submit">
                  <p>
                    A run (RUN-…) is created and every parsed row is staged as pending. No strata_ingest / validation RPC
                    exists yet, so the run stops at the Staging stage of the pipeline; validation, attestation and canonical
                    KPI writes remain server-side governance steps.
                  </p>
                </SectionMessage>
              </div>
              {submitError ? (
                <SectionMessage appearance="error" title="Submission failed">
                  <p>{submitError}</p>
                </SectionMessage>
              ) : null}
            </div>
          </StrataPanel>
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
              isDisabled={submitting || !template || !parsed}
              testId="strata-upload-submit"
            >
              {submitting ? 'Submitting…' : 'Create upload run'}
            </Button>
          )}
        </div>
      </div>
    </StrataPageShell>
  );
}
