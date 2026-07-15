/**
 * STRATA Execution — manual import (session 009, CAT-STRATA-20260705-001).
 * Route: /strata/execution/import.
 *
 * Supports BOTH the STRATA standard 3-sheet template AND real-world exports
 * (Jira-style single-sheet dumps with mixed issue types, arbitrary column
 * names, .xls/.xlsx/.csv). Flow: Upload → Classify → Map → Preview & validate
 * → Confirm → Summary. Column mapping + issue-type classification + a batch
 * Strategic Theme default + unlinked-child-row project assignment all happen
 * client-side, producing the SAME normalized row shape the v1 template-only
 * importer always sent — the backend RPC (strata_import_execution_batch) is
 * unchanged in shape, only its required-field validation was relaxed
 * (20260706210000_strata_execution_import_relax_required.sql) so real files
 * with fewer columns than the ideal template are not rejected outright.
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
  CheckCircle2, Download, FileUp, ListChecks, Upload,
} from '@/lib/atlaskit-icons';
import { importApi } from '@/modules/strata/domain';
import { useInvalidateStrata, useProjectCards, useStrataContext, useStrataRoles, useStrategyElements } from '@/modules/strata/hooks/useStrata';
import { StrataPageShell, StrataPanel, StrataStatStrip, T } from '@/modules/strata/components/shared';
import type {
  ExecutionImportDependencyRow, ExecutionImportMilestoneRow, ExecutionImportProjectCardRow,
  ExecutionImportResult, ExecutionImportRowResult,
} from '@/modules/strata/types';

const bodyStyle: React.CSSProperties = { fontSize: 'var(--ds-font-size-200)', color: T.text };
const captionStyle: React.CSSProperties = { fontSize: 'var(--ds-font-size-100)', color: T.subtlest };
const STEPS = ['Upload', 'Classify', 'Map fields', 'Preview & validate', 'Confirm import', 'Summary'] as const;
const IMPORT_ROLES = ['data_steward', 'vmo_validator', 'strategy_office', 'strata_admin'] as const;

type TargetType = 'project_cards' | 'milestones' | 'dependencies';
type Classification = TargetType | 'mixed_jira' | 'ignore';

const TARGET_LABEL: Record<TargetType, string> = {
  project_cards: 'Project Cards', milestones: 'Milestones', dependencies: 'Delivery Dependencies',
};
const CLASSIFICATION_LABEL: Record<Classification, string> = {
  project_cards: 'Project Cards', milestones: 'Milestones', dependencies: 'Delivery Dependencies',
  mixed_jira: 'Mixed Jira Export (classify by Issue Type)', ignore: 'Ignore this sheet',
};
const CLASSIFICATION_OPTIONS: SelectOption<Classification>[] = (Object.keys(CLASSIFICATION_LABEL) as Classification[])
  .map((v) => ({ value: v, label: CLASSIFICATION_LABEL[v] }));

// ── Target field catalogs (drives the column-mapping UI) ────────────────────
interface TargetField { key: string; label: string; required: boolean; kind: 'text' | 'date' | 'number' | 'status'; picklistKey?: TargetType }

const PROJECT_CARD_FIELDS: TargetField[] = [
  { key: 'referenceId', label: 'Project Reference ID', required: true, kind: 'text' },
  { key: 'name', label: 'Project Name', required: true, kind: 'text' },
  { key: 'deliveryStatus', label: 'Delivery Status', required: true, kind: 'status', picklistKey: 'project_cards' },
  { key: 'baselineStart', label: 'Baseline Start Date', required: true, kind: 'date' },
  { key: 'baselineEnd', label: 'Baseline End Date', required: true, kind: 'date' },
  { key: 'strategicTheme', label: 'Strategic Theme', required: false, kind: 'text' },
  { key: 'businessOwner', label: 'Business Owner', required: false, kind: 'text' },
  { key: 'projectManager', label: 'Project Manager', required: false, kind: 'text' },
  { key: 'leadBusinessUnit', label: 'Lead Business Unit', required: false, kind: 'text' },
  { key: 'deliveryTeam', label: 'Delivery Team', required: false, kind: 'text' },
  { key: 'scopeDescription', label: 'Scope Description', required: false, kind: 'text' },
  { key: 'targetOutcomes', label: 'Target Outcomes', required: false, kind: 'text' },
  { key: 'successCriteria', label: 'Success Criteria', required: false, kind: 'text' },
];
const MILESTONE_FIELDS: TargetField[] = [
  { key: 'name', label: 'Milestone Name', required: true, kind: 'text' },
  { key: 'status', label: 'Status', required: true, kind: 'status', picklistKey: 'milestones' },
  { key: 'progress', label: 'Progress %', required: true, kind: 'number' },
  { key: 'weight', label: 'Weight', required: true, kind: 'number' },
  { key: 'baselineStart', label: 'Baseline Start Date', required: true, kind: 'date' },
  { key: 'baselineEnd', label: 'Baseline End Date', required: true, kind: 'date' },
  { key: 'forecastEnd', label: 'Forecast End Date', required: false, kind: 'date' },
  { key: 'actualEnd', label: 'Actual End Date', required: false, kind: 'date' },
  { key: 'owner', label: 'Milestone Owner', required: false, kind: 'text' },
];
const DEPENDENCY_FIELDS: TargetField[] = [
  { key: 'name', label: 'Dependency Name', required: true, kind: 'text' },
  { key: 'status', label: 'Status', required: true, kind: 'status', picklistKey: 'dependencies' },
  { key: 'baselineStart', label: 'Baseline Start Date', required: true, kind: 'date' },
  { key: 'baselineEnd', label: 'Baseline End Date', required: true, kind: 'date' },
  { key: 'description', label: 'Dependency Description', required: false, kind: 'text' },
  { key: 'requestingProjectOrTeam', label: 'Requesting Project / Team', required: false, kind: 'text' },
  { key: 'servingDepartmentOrTeam', label: 'Serving Department / Team', required: false, kind: 'text' },
  { key: 'owner', label: 'Owner', required: false, kind: 'text' },
  { key: 'blocker', label: 'Blocker', required: false, kind: 'text' },
  { key: 'impactNote', label: 'Impact Note', required: false, kind: 'text' },
];
const TARGET_FIELDS: Record<TargetType, TargetField[]> = {
  project_cards: PROJECT_CARD_FIELDS, milestones: MILESTONE_FIELDS, dependencies: DEPENDENCY_FIELDS,
};

// Auto-suggestion synonyms — normalized (lowercase, alnum-only) header → target field key.
const SYNONYMS: Record<TargetType, Record<string, string>> = {
  project_cards: {
    issuekey: 'referenceId', projectreferenceid: 'referenceId', referenceid: 'referenceId',
    summary: 'name', projectname: 'name', name: 'name',
    status: 'deliveryStatus', deliverystatus: 'deliveryStatus',
    customfieldbaselinestartdate: 'baselineStart', baselinestartdate: 'baselineStart',
    customfieldbaselineenddate: 'baselineEnd', baselineenddate: 'baselineEnd',
    strategictheme: 'strategicTheme',
    customfieldleadingdepartment: 'leadBusinessUnit', leadbusinessunit: 'leadBusinessUnit', leadingdepartment: 'leadBusinessUnit',
    businessowner: 'businessOwner', projectmanager: 'projectManager',
    deliveryteam: 'deliveryTeam', scopedescription: 'scopeDescription',
    targetoutcomes: 'targetOutcomes', successcriteria: 'successCriteria',
  },
  milestones: {
    summary: 'name', milestonename: 'name', name: 'name',
    status: 'status', milestonestatus: 'status',
    customfieldcompletion: 'progress', progress: 'progress',
    weight: 'weight',
    customfieldbaselinestartdate: 'baselineStart', baselinestartdate: 'baselineStart',
    customfieldbaselineenddate: 'baselineEnd', baselineenddate: 'baselineEnd',
    forecastenddate: 'forecastEnd', actualenddate: 'actualEnd',
    customfieldleadingdepartment: 'owner', milestoneowner: 'owner', owner: 'owner',
  },
  dependencies: {
    summary: 'name', dependencyname: 'name', name: 'name',
    status: 'status', dependencystatus: 'status',
    dependencydescription: 'description',
    requestingprojectteam: 'requestingProjectOrTeam',
    customfieldleadingdepartment: 'servingDepartmentOrTeam', servingdepartmentteam: 'servingDepartmentOrTeam', leadingdepartment: 'servingDepartmentOrTeam',
    customfielddependencyowner: 'owner', dependencyowner: 'owner', owner: 'owner',
    blocker: 'blocker', impactnote: 'impactNote',
    customfieldbaselinestartdate: 'baselineStart', baselinestartdate: 'baselineStart',
    customfieldbaselineenddate: 'baselineEnd', baselineenddate: 'baselineEnd',
  },
};
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

const STATUS_PICKLISTS: Record<TargetType, Array<{ value: string; label: string }>> = {
  project_cards: [
    { value: 'planning', label: 'Planning' }, { value: 'active', label: 'Active' }, { value: 'on_hold', label: 'On Hold' },
    { value: 'delivery', label: 'In Delivery' }, { value: 'completed', label: 'Completed' }, { value: 'archived', label: 'Archived' },
  ],
  milestones: [
    { value: 'planned', label: 'Planned' }, { value: 'in_progress', label: 'In Progress' }, { value: 'done', label: 'Done' },
    { value: 'missed', label: 'Missed' }, { value: 'descoped', label: 'Descoped' },
  ],
  dependencies: [
    { value: 'open', label: 'Open' }, { value: 'at_risk', label: 'At Risk' }, { value: 'blocked', label: 'Blocked' },
    { value: 'resolved', label: 'Resolved' }, { value: 'cancelled', label: 'Cancelled' },
  ],
};
const STATUS_GUESS: Record<TargetType, Array<{ re: RegExp; value: string }>> = {
  project_cards: [
    { re: /done|complete/i, value: 'completed' }, { re: /hold/i, value: 'on_hold' },
    { re: /progress|active|doing|review/i, value: 'active' }, { re: /archiv|cancel/i, value: 'archived' },
    { re: /backlog|to ?do|open|new/i, value: 'planning' },
  ],
  milestones: [
    { re: /done|complete|closed/i, value: 'done' }, { re: /progress|active|doing|review/i, value: 'in_progress' },
    { re: /missed|late/i, value: 'missed' }, { re: /descope|cancel/i, value: 'descoped' },
    { re: /backlog|to ?do|open|new/i, value: 'planned' },
  ],
  dependencies: [
    { re: /done|resolved|complete|closed/i, value: 'resolved' }, { re: /block/i, value: 'blocked' },
    { re: /risk/i, value: 'at_risk' }, { re: /cancel/i, value: 'cancelled' },
    { re: /open|to ?do|new|backlog/i, value: 'open' },
  ],
};
function guessStatus(target: TargetType, raw: string): string {
  const hit = STATUS_GUESS[target].find((g) => g.re.test(raw));
  return hit ? hit.value : STATUS_PICKLISTS[target][0].value;
}

function defaultIssueTypeTarget(raw: string): Classification {
  const v = raw.trim().toLowerCase().replace(/\.+$/, '');
  if (v === 'project') return 'project_cards';
  if (v === 'milestone') return 'milestones';
  if (v === 'next dependency' || v === 'dependency') return 'dependencies';
  return 'ignore';
}

// ── Cell normalization ───────────────────────────────────────────────────────
function cellToText(v: unknown): string {
  if (v == null) return '';
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).trim();
}
function excelSerialToIso(n: number): string {
  return new Date(Math.round((n - 25569) * 86400 * 1000)).toISOString().slice(0, 10);
}
function cellToDate(v: unknown): string {
  if (v == null || v === '') return '';
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'number') return excelSerialToIso(v);
  const s = String(v).trim();
  // CSV / mis-typed cells sometimes carry the raw Excel serial as text.
  if (/^\d{4,6}$/.test(s)) return excelSerialToIso(Number(s));
  return s;
}

// ── File parsing (.xlsx / .xls / .csv) — detects ALL sheets, no fixed names ──
interface RawSheet { name: string; headers: string[]; rows: Array<Record<string, unknown>> }
const SUPPORTED_EXT = ['.xlsx', '.xls', '.csv'];

async function parseFile(file: File): Promise<RawSheet[]> {
  const lower = file.name.toLowerCase();
  const ext = SUPPORTED_EXT.find((e) => lower.endsWith(e));
  if (!ext) throw new Error(`Unsupported file type. Accepted: ${SUPPORTED_EXT.join(', ')}`);

  if (ext === '.csv') {
    const Papa = (await import('papaparse')).default;
    const text = await file.text();
    const out = Papa.parse<Record<string, unknown>>(text, { header: true, skipEmptyLines: 'greedy' });
    if (out.errors.length > 0 && out.data.length === 0) throw new Error(`CSV parse failed: ${out.errors[0].message}`);
    const headers = (out.meta.fields ?? []).filter((f) => f && f.trim().length > 0);
    if (headers.length === 0) throw new Error('CSV file has no header row.');
    return [{ name: file.name.replace(/\.csv$/i, ''), headers, rows: out.data }];
  }

  // .xlsx / .xls — SheetJS auto-detects the binary format from the buffer.
  const XLSX = await import('xlsx');
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array', cellDates: true });
  if (wb.SheetNames.length === 0) throw new Error('Workbook contains no sheets.');
  return wb.SheetNames.map((sheetName) => {
    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null });
    const headerRow = (XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1 })[0] ?? []) as unknown[];
    const headers = headerRow.map((h) => String(h ?? '').trim()).filter(Boolean);
    return { name: sheetName, headers, rows };
  }).filter((s) => s.headers.length > 0);
}

function findIssueTypeColumn(headers: string[]): string | null {
  return headers.find((h) => norm(h) === 'issuetype') ?? null;
}

// ── Template download ────────────────────────────────────────────────────────
async function downloadTemplate() {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();
  const cardHeaders = PROJECT_CARD_FIELDS.map((f) => f.label);
  const msHeaders = ['Project Reference ID', ...MILESTONE_FIELDS.map((f) => f.label)];
  const depHeaders = ['Project Reference ID', ...DEPENDENCY_FIELDS.map((f) => f.label)];
  const exampleCard = ['PRJ-00001', 'Example Project', 'Active', '2026-01-01', '2026-12-31', 'Digital Market Leadership', 'Jane Doe', 'John Smith', 'Technology', 'Platform Engineering', 'Example scope', 'Example outcomes', 'Example success criteria'];
  const exampleMs = ['PRJ-00001', 'Example Milestone', 'Planned', '25', '1', '2026-01-01', '2026-03-31', '', '', 'Jane Doe'];
  const exampleDep = ['PRJ-00001', 'Example Dependency', 'Open', '2026-01-01', '2026-02-01', 'Example description', 'Example Project', 'Security Team', 'Jane Doe', 'No', 'Low impact'];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([cardHeaders, exampleCard]), 'Project Cards');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([msHeaders, exampleMs]), 'Milestones');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([depHeaders, exampleDep]), 'Delivery Dependencies');
  const notes = [
    ['STRATA Execution import — notes'],
    [''],
    ['Project Reference ID is the stable key linking all three sheets. It never changes once a Project Card is created.'],
    ['Bold-required columns per sheet: Project Cards = Project Reference ID, Project Name, Delivery Status, Baseline Start/End Date.'],
    ['Milestones = Project Reference ID, Milestone Name, Status, Progress %, Weight, Baseline Start/End Date.'],
    ['Delivery Dependencies = Project Reference ID, Dependency Name, Status, Baseline Start/End Date.'],
    ['All other columns are optional — leave blank if not available.'],
    ['Re-importing the same file updates existing rows instead of creating duplicates.'],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(notes), 'Notes');
  XLSX.writeFile(wb, 'strata_execution_import_template.xlsx');
}

// ── Page ─────────────────────────────────────────────────────────────────────
interface ClassifiedSheet {
  sheet: RawSheet;
  classification: Classification;
  issueTypeColumn: string | null;
  issueTypeCounts: Array<{ value: string; count: number }>;
  issueTypeTarget: Record<string, Classification>;
}

interface ContributingRow { sheetIndex: number; row: Record<string, unknown> }

export default function StrataExecutionImportPage() {
  const navigate = useNavigate();
  const invalidate = useInvalidateStrata();
  const roles = useStrataRoles();
  const { activeCycle } = useStrataContext();
  const themesQ = useStrategyElements(activeCycle?.id);
  const existingCardsQ = useProjectCards();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(0);
  const [fileName, setFileName] = useState<string | null>(null);
  const [sheets, setSheets] = useState<ClassifiedSheet[] | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);

  const handleDownloadTemplate = async () => {
    setTemplateError(null);
    setDownloadingTemplate(true);
    try {
      await downloadTemplate();
    } catch (e) {
      setTemplateError(e instanceof Error ? e.message : String(e));
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const [columnMap, setColumnMap] = useState<Record<TargetType, Record<string, string | null>>>({
    project_cards: {}, milestones: {}, dependencies: {},
  });
  const [parentColumn, setParentColumn] = useState<Record<TargetType, string | null>>({ project_cards: null, milestones: null, dependencies: null });
  const [statusValueMap, setStatusValueMap] = useState<Record<TargetType, Record<string, string>>>({ project_cards: {}, milestones: {}, dependencies: {} });
  const [batchTheme, setBatchTheme] = useState<string | null>(null);
  const [unlinkedAssignment, setUnlinkedAssignment] = useState<Record<string, string | null>>({});
  const [batchUnlinkedAssignment, setBatchUnlinkedAssignment] = useState<string | null>(null);

  const [validating, setValidating] = useState(false);
  const [preview, setPreview] = useState<ExecutionImportResult | null>(null);
  const [committing, setCommitting] = useState(false);
  const [confirmed, setConfirmed] = useState<ExecutionImportResult | null>(null);
  const [runError, setRunError] = useState<string | null>(null);

  const hasImportRole = (roles.data ?? []).some((r) => (IMPORT_ROLES as readonly string[]).includes(r));
  const themes = (themesQ.data ?? []).filter((e) => e.element_type === 'theme');

  // ── File handling ──────────────────────────────────────────────────────────
  const handleFile = async (file: File) => {
    setParsing(true); setParseError(null); setSheets(null); setPreview(null); setConfirmed(null);
    try {
      const raw = await parseFile(file);
      const classified: ClassifiedSheet[] = raw.map((sheet) => {
        const byName = sheet.name.trim().toLowerCase();
        let classification: Classification = 'ignore';
        if (byName === 'project cards') classification = 'project_cards';
        else if (byName === 'milestones') classification = 'milestones';
        else if (byName === 'delivery dependencies') classification = 'dependencies';
        const issueTypeColumn = findIssueTypeColumn(sheet.headers);
        if (classification === 'ignore' && issueTypeColumn) classification = 'mixed_jira';
        let issueTypeCounts: Array<{ value: string; count: number }> = [];
        const issueTypeTarget: Record<string, Classification> = {};
        if (issueTypeColumn) {
          const counts = new Map<string, number>();
          sheet.rows.forEach((r) => {
            const v = cellToText(r[issueTypeColumn]) || '(blank)';
            counts.set(v, (counts.get(v) ?? 0) + 1);
          });
          issueTypeCounts = [...counts.entries()].map(([value, count]) => ({ value, count })).sort((a, b) => b.count - a.count);
          issueTypeCounts.forEach((c) => { issueTypeTarget[c.value] = defaultIssueTypeTarget(c.value); });
        }
        return { sheet, classification, issueTypeColumn, issueTypeCounts, issueTypeTarget };
      });
      setSheets(classified);
      setFileName(file.name);
    } catch (e) {
      setSheets(null);
      setParseError(e instanceof Error ? e.message : String(e));
    } finally {
      setParsing(false);
    }
  };

  // ── Contributing rows per target type (across all classified sheets) ──────
  const contributingRows = useMemo((): Record<TargetType, ContributingRow[]> => {
    const out: Record<TargetType, ContributingRow[]> = { project_cards: [], milestones: [], dependencies: [] };
    (sheets ?? []).forEach((cs, sheetIndex) => {
      if (cs.classification === 'ignore') return;
      if (cs.classification === 'mixed_jira') {
        if (!cs.issueTypeColumn) return;
        cs.sheet.rows.forEach((row) => {
          const v = cellToText(row[cs.issueTypeColumn as string]) || '(blank)';
          const target = cs.issueTypeTarget[v];
          if (target && target !== 'ignore' && target !== 'mixed_jira') out[target].push({ sheetIndex, row });
        });
      } else {
        cs.sheet.rows.forEach((row) => out[cs.classification as TargetType].push({ sheetIndex, row }));
      }
    });
    return out;
  }, [sheets]);

  const ignoredCount = useMemo(() => {
    let n = 0;
    (sheets ?? []).forEach((cs) => {
      if (cs.classification === 'ignore') n += cs.sheet.rows.length;
      if (cs.classification === 'mixed_jira' && cs.issueTypeColumn) {
        cs.sheet.rows.forEach((row) => {
          const v = cellToText(row[cs.issueTypeColumn as string]) || '(blank)';
          if ((cs.issueTypeTarget[v] ?? 'ignore') === 'ignore') n += 1;
        });
      }
    });
    return n;
  }, [sheets]);

  // ── Available source columns per target (union across contributing sheets) ─
  const sourceColumnsFor = (target: TargetType): string[] => {
    const idxs = new Set(contributingRows[target].map((r) => r.sheetIndex));
    const cols = new Set<string>();
    idxs.forEach((i) => (sheets ?? [])[i]?.sheet.headers.forEach((h) => cols.add(h)));
    return [...cols];
  };

  // Auto-suggest mappings the first time a target's source columns become known.
  // Runs as an effect (not inline during render) — calling setState synchronously
  // in the render body for multiple targets caused a "too many re-renders" loop.
  React.useEffect(() => {
    (['project_cards', 'milestones', 'dependencies'] as TargetType[]).forEach((target) => {
      if (contributingRows[target].length === 0) return;
      const cols = sourceColumnsFor(target);
      setColumnMap((prev) => {
        if (Object.keys(prev[target]).length > 0) return prev;
        const next: Record<string, string | null> = {};
        TARGET_FIELDS[target].forEach((f) => { next[f.key] = null; });
        cols.forEach((col) => {
          const key = SYNONYMS[target][norm(col)];
          if (key && next[key] === null) next[key] = col;
        });
        return { ...prev, [target]: next };
      });
      setParentColumn((prev) => {
        if (prev[target] !== null) return prev;
        const parentCol = cols.find((c) => ['parent', 'parentkey', 'parentid', 'epiclink'].includes(norm(c)));
        return parentCol ? { ...prev, [target]: parentCol } : prev;
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheets]);

  // ── Row builders (apply mapping + defaults → normalized RPC payload) ──────
  const getMapped = (target: TargetType, row: Record<string, unknown>, field: string): string => {
    const col = columnMap[target][field];
    if (!col) return '';
    const spec = TARGET_FIELDS[target].find((f) => f.key === field);
    const raw = row[col];
    if (spec?.kind === 'date') return cellToDate(raw);
    return cellToText(raw);
  };
  // Falls back to the same auto-guess shown as the dropdown's default value —
  // the guess is the effective mapping until the user overrides it, not just
  // a visual placeholder (a raw "To Do"/"In Progress" string would otherwise
  // reach the RPC unmapped and fail picklist resolution).
  const resolveStatus = (target: TargetType, raw: string): string => {
    if (!raw) return '';
    return statusValueMap[target][raw] ?? guessStatus(target, raw);
  };

  const cardSourceRefColumn = columnMap.project_cards.referenceId;
  const buildProjectCards = (): ExecutionImportProjectCardRow[] => contributingRows.project_cards.map(({ row }) => ({
    referenceId: getMapped('project_cards', row, 'referenceId'),
    name: getMapped('project_cards', row, 'name'),
    strategicTheme: getMapped('project_cards', row, 'strategicTheme') || (batchTheme ?? ''),
    businessOwner: getMapped('project_cards', row, 'businessOwner'),
    projectManager: getMapped('project_cards', row, 'projectManager'),
    leadBusinessUnit: getMapped('project_cards', row, 'leadBusinessUnit'),
    deliveryTeam: getMapped('project_cards', row, 'deliveryTeam'),
    deliveryStatus: resolveStatus('project_cards', getMapped('project_cards', row, 'deliveryStatus')),
    baselineStart: getMapped('project_cards', row, 'baselineStart'),
    baselineEnd: getMapped('project_cards', row, 'baselineEnd'),
    scopeDescription: getMapped('project_cards', row, 'scopeDescription'),
    targetOutcomes: getMapped('project_cards', row, 'targetOutcomes'),
    successCriteria: getMapped('project_cards', row, 'successCriteria'),
  }));

  const knownProjectRefs = useMemo(() => {
    const set = new Set<string>();
    contributingRows.project_cards.forEach(({ row }) => {
      const v = getMapped('project_cards', row, 'referenceId');
      if (v) set.add(v);
    });
    return set;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contributingRows, columnMap.project_cards]);

  const projectAssignmentOptions: SelectOption<string>[] = useMemo(() => {
    const opts = new Map<string, string>();
    knownProjectRefs.forEach((r) => opts.set(r, r));
    (existingCardsQ.data ?? []).forEach((c) => { if (c.reference_id) opts.set(c.reference_id, `${c.reference_id} — ${c.name}`); });
    return [...opts.entries()].map(([value, label]) => ({ value, label }));
  }, [knownProjectRefs, existingCardsQ.data]);

  const resolveParent = (target: TargetType, row: Record<string, unknown>, rowKey: string): string => {
    const col = parentColumn[target];
    if (col) {
      const parentVal = cellToText(row[col]);
      if (parentVal && (knownProjectRefs.has(parentVal) || (existingCardsQ.data ?? []).some((c) => c.reference_id === parentVal))) {
        return parentVal;
      }
    }
    return unlinkedAssignment[rowKey] ?? batchUnlinkedAssignment ?? '';
  };

  const buildMilestones = (): ExecutionImportMilestoneRow[] => contributingRows.milestones.map(({ row }, i) => ({
    projectReferenceId: resolveParent('milestones', row, `ms-${i}`),
    name: getMapped('milestones', row, 'name'),
    owner: getMapped('milestones', row, 'owner'),
    baselineStart: getMapped('milestones', row, 'baselineStart'),
    baselineEnd: getMapped('milestones', row, 'baselineEnd'),
    forecastEnd: getMapped('milestones', row, 'forecastEnd'),
    actualEnd: getMapped('milestones', row, 'actualEnd'),
    status: resolveStatus('milestones', getMapped('milestones', row, 'status')),
    // Real-world exports rarely carry a weighting scheme — default to equal
    // weighting (1) / not-yet-measured (0%) rather than rejecting every row
    // outright when the source has no equivalent column.
    progress: getMapped('milestones', row, 'progress') || '0',
    weight: getMapped('milestones', row, 'weight') || '1',
  }));

  const buildDependencies = (): ExecutionImportDependencyRow[] => contributingRows.dependencies.map(({ row }, i) => ({
    projectReferenceId: resolveParent('dependencies', row, `dep-${i}`),
    name: getMapped('dependencies', row, 'name'),
    description: getMapped('dependencies', row, 'description'),
    requestingProjectOrTeam: getMapped('dependencies', row, 'requestingProjectOrTeam'),
    servingDepartmentOrTeam: getMapped('dependencies', row, 'servingDepartmentOrTeam'),
    baselineStart: getMapped('dependencies', row, 'baselineStart'),
    baselineEnd: getMapped('dependencies', row, 'baselineEnd'),
    status: resolveStatus('dependencies', getMapped('dependencies', row, 'status')),
    owner: getMapped('dependencies', row, 'owner'),
    blocker: getMapped('dependencies', row, 'blocker'),
    impactNote: getMapped('dependencies', row, 'impactNote'),
  }));

  const unlinkedMilestones = useMemo(() => contributingRows.milestones
    .map(({ row }, i) => ({ i, row, name: getMapped('milestones', row, 'name') }))
    .filter((r) => !resolveParent('milestones', r.row, `ms-${r.i}`)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [contributingRows, columnMap, parentColumn, unlinkedAssignment, batchUnlinkedAssignment, knownProjectRefs]);
  const unlinkedDependencies = useMemo(() => contributingRows.dependencies
    .map(({ row }, i) => ({ i, row, name: getMapped('dependencies', row, 'name') }))
    .filter((r) => !resolveParent('dependencies', r.row, `dep-${r.i}`)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [contributingRows, columnMap, parentColumn, unlinkedAssignment, batchUnlinkedAssignment, knownProjectRefs]);

  const runValidation = async (dryRun: boolean) => importApi.importExecutionBatch({
    projectCards: buildProjectCards(), milestones: buildMilestones(), dependencies: buildDependencies(),
    dryRun, fileName,
  });

  const goToPreview = async () => {
    setValidating(true); setRunError(null);
    try {
      setPreview(await runValidation(true));
      setStep(3);
    } catch (e) {
      setRunError(e instanceof Error ? e.message : String(e));
    } finally {
      setValidating(false);
    }
  };
  const confirmImport = async () => {
    setCommitting(true); setRunError(null);
    try {
      const result = await runValidation(false);
      setConfirmed(result);
      invalidate();
      setStep(5);
    } catch (e) {
      setRunError(e instanceof Error ? e.message : String(e));
    } finally {
      setCommitting(false);
    }
  };

  const downloadErrorReport = (result: ExecutionImportResult) => {
    const lines = ['Sheet,Row,Reference,Name,Status,Action,Errors,Warnings'];
    const emit = (sheet: string, rows: ExecutionImportRowResult[]) => rows.forEach((r) => {
      const ref = r.reference_id ?? r.project_reference_id ?? '';
      const cell = (s: string) => `"${(s ?? '').replace(/"/g, '""')}"`;
      lines.push([sheet, r.row_number, cell(ref), cell(r.name ?? ''), r.status, r.action ?? '', cell(r.errors.join('; ')), cell((r.warnings ?? []).join('; '))].join(','));
    });
    emit('Project Cards', result.project_cards);
    emit('Milestones', result.milestones);
    emit('Delivery Dependencies', result.dependencies);
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${(fileName ?? 'import').replace(/\.[^.]+$/, '')}-import-report.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  const totalDetected = (target: TargetType) => contributingRows[target].length;
  const step1Ready = sheets != null && sheets.some((s) => s.classification !== 'ignore');
  const anyTargetHasRows = (['project_cards', 'milestones', 'dependencies'] as TargetType[]).some((t) => totalDetected(t) > 0);

  return (
    <StrataPageShell
      trail={[{ text: 'Execution', href: Routes.strata.execution() }, { text: 'Import' }]}
      docTitle="Execution import"
      testId="strata-execution-import-chrome"
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 24, overflowX: 'auto' }} aria-label="Import steps">
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

      {roles.isSuccess && !hasImportRole ? (
        <div style={{ marginBottom: 16 }}>
          <SectionMessage appearance="warning" title="Import role required">
            <p>Importing Execution data requires the data steward, VMO validator or strategy office role.</p>
          </SectionMessage>
        </div>
      ) : null}

      {/* ── Step 0: Upload ── */}
      {step === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <StrataPanel title="Upload file" icon={<FileUp size={16} />} testId="strata-execution-import-file-panel">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p style={{ ...captionStyle, margin: 0 }}>
                Accepts the STRATA standard workbook (Project Cards / Milestones / Delivery Dependencies sheets),
                or a real-world export — .xlsx, .xls, or .csv, any sheet name, mixed issue types in one sheet.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  style={{ display: 'none' }}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); e.target.value = ''; }}
                  data-testid="strata-execution-import-file-input"
                />
                <Button iconBefore={<FileUp size={14} />} onClick={() => fileRef.current?.click()} isDisabled={parsing}>
                  Choose file (.xlsx / .xls / .csv)
                </Button>
                <Button appearance="subtle" iconBefore={<Download size={14} />} onClick={() => void handleDownloadTemplate()} isDisabled={downloadingTemplate}>
                  Download STRATA import template
                </Button>
                {parsing || downloadingTemplate ? <Spinner size="small" /> : null}
              </div>
              {parseError ? (
                <SectionMessage appearance="error" title="Could not parse the file">
                  <p>{parseError}</p>
                </SectionMessage>
              ) : null}
              {templateError ? (
                <SectionMessage appearance="error" title="Could not generate the import template">
                  <p>{templateError}</p>
                </SectionMessage>
              ) : null}
              {sheets ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ color: 'var(--ds-icon-success)', display: 'inline-flex' }} aria-hidden><CheckCircle2 size={16} /></span>
                  <span style={bodyStyle}>{fileName}</span>
                  {sheets.map((s) => <CatalystTag key={s.sheet.name} text={`${s.sheet.name}: ${s.sheet.rows.length} row${s.sheet.rows.length === 1 ? '' : 's'}, ${s.sheet.headers.length} columns`} />)}
                </div>
              ) : null}
            </div>
          </StrataPanel>
        </div>
      ) : null}

      {/* ── Step 1: Classify ── */}
      {step === 1 && sheets ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <SectionMessage appearance="information" title="Detected sheets">
            <p>Exact STRATA sheet names were auto-matched. For anything else, choose what it represents.</p>
          </SectionMessage>
          {sheets.map((cs, idx) => (
            <StrataPanel key={cs.sheet.name} title={`Sheet: ${cs.sheet.name}`} icon={<ListChecks size={16} />} testId={`strata-import-sheet-${idx}`}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <span style={captionStyle}>{cs.sheet.rows.length} rows · columns: {cs.sheet.headers.join(', ')}</span>
                </div>
                <div style={{ maxWidth: 420 }}>
                  <Select<Classification>
                    options={CLASSIFICATION_OPTIONS}
                    value={CLASSIFICATION_OPTIONS.find((o) => o.value === cs.classification) ?? null}
                    onChange={(next) => {
                      const val = next?.value ?? 'ignore';
                      setSheets((prev) => (prev ?? []).map((s, i) => (i === idx ? { ...s, classification: val } : s)));
                    }}
                    aria-label={`Classify sheet ${cs.sheet.name}`}
                  />
                </div>
                {cs.classification === 'mixed_jira' && cs.issueTypeColumn ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <span style={{ ...bodyStyle, fontWeight: 600 }}>Issue Type classification</span>
                    {cs.issueTypeCounts.map((c) => (
                      <div key={c.value} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ ...bodyStyle, width: 200 }}>{c.value}</span>
                        <CatalystTag text={`${c.count} row${c.count === 1 ? '' : 's'}`} />
                        <div style={{ width: 260 }}>
                          <Select<Classification>
                            options={CLASSIFICATION_OPTIONS.filter((o) => o.value !== 'mixed_jira')}
                            value={CLASSIFICATION_OPTIONS.find((o) => o.value === cs.issueTypeTarget[c.value]) ?? null}
                            onChange={(next) => {
                              const val = next?.value ?? 'ignore';
                              setSheets((prev) => (prev ?? []).map((s, i) => (i === idx
                                ? { ...s, issueTypeTarget: { ...s.issueTypeTarget, [c.value]: val } } : s)));
                            }}
                            aria-label={`Classify Issue Type ${c.value}`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </StrataPanel>
          ))}
          {sheets && !step1Ready ? (
            <SectionMessage appearance="warning" title="Nothing classified yet">
              <p>Classify at least one sheet (or issue type) as Project Cards, Milestones, or Delivery Dependencies to continue.</p>
            </SectionMessage>
          ) : null}
        </div>
      ) : null}

      {/* ── Step 2: Map fields ── */}
      {step === 2 && sheets ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {(['project_cards', 'milestones', 'dependencies'] as TargetType[]).filter((t) => totalDetected(t) > 0).map((target) => {
            const cols = sourceColumnsFor(target);
            const colOptions: SelectOption<string>[] = [{ value: '', label: '— none —' }, ...cols.map((c) => ({ value: c, label: c }))];
            return (
              <StrataPanel key={target} title={`${TARGET_LABEL[target]} — ${totalDetected(target)} detected`} icon={<ListChecks size={16} />} testId={`strata-import-map-${target}`}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {target !== 'project_cards' ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 8, borderBottom: `1px solid ${T.border}` }}>
                      <span style={{ ...bodyStyle, width: 220 }}>Parent (links to Project)</span>
                      <div style={{ width: 280 }}>
                        <Select<string>
                          options={colOptions}
                          value={colOptions.find((o) => o.value === (parentColumn[target] ?? '')) ?? colOptions[0]}
                          onChange={(next) => setParentColumn((prev) => ({ ...prev, [target]: next?.value || null }))}
                          aria-label={`Parent column for ${TARGET_LABEL[target]}`}
                        />
                      </div>
                      <span style={captionStyle}>If absent, unlinked rows are assigned during Preview.</span>
                    </div>
                  ) : null}
                  {TARGET_FIELDS[target].map((f) => (
                    <div key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ ...bodyStyle, width: 220 }}>{f.label}{f.required ? <span style={{ color: 'var(--ds-text-danger)' }}> *</span> : null}</span>
                      <div style={{ width: 280 }}>
                        <Select<string>
                          options={colOptions}
                          value={colOptions.find((o) => o.value === (columnMap[target][f.key] ?? '')) ?? colOptions[0]}
                          onChange={(next) => setColumnMap((prev) => ({ ...prev, [target]: { ...prev[target], [f.key]: next?.value || null } }))}
                          aria-label={`Map ${f.label}`}
                        />
                      </div>
                      {!columnMap[target][f.key] && !f.required ? <span style={captionStyle}>optional — will be left blank</span> : null}
                    </div>
                  ))}
                  {target === 'project_cards' && !columnMap.project_cards.strategicTheme ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8, paddingTop: 8, borderTop: `1px solid ${T.border}` }}>
                      <span style={{ ...bodyStyle, width: 220 }}>Assign Strategic Theme (batch default)</span>
                      <div style={{ width: 280 }}>
                        <Select<string>
                          isLoading={themesQ.isLoading}
                          options={themes.map((t) => ({ value: t.name, label: t.name }))}
                          value={batchTheme ? { value: batchTheme, label: batchTheme } : null}
                          onChange={(next) => setBatchTheme(next?.value ?? null)}
                          isClearable
                          placeholder="No default — cards import with no theme"
                          aria-label="Batch default Strategic Theme"
                        />
                      </div>
                    </div>
                  ) : null}
                  {/* Status value mapping */}
                  {(() => {
                    const statusField = TARGET_FIELDS[target].find((f) => f.kind === 'status');
                    const mappedCol = statusField ? columnMap[target][statusField.key] : null;
                    if (!statusField || !mappedCol) return null;
                    const distinct = [...new Set(contributingRows[target].map(({ row }) => cellToText(row[mappedCol])).filter(Boolean))];
                    if (distinct.length === 0) return null;
                    return (
                      <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${T.border}` }}>
                        <span style={{ ...bodyStyle, fontWeight: 600 }}>Map "{statusField.label}" values</span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                          {distinct.map((raw) => (
                            <div key={raw} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <span style={{ ...bodyStyle, width: 220 }}>{raw}</span>
                              <div style={{ width: 280 }}>
                                <Select<string>
                                  options={STATUS_PICKLISTS[target]}
                                  value={STATUS_PICKLISTS[target].find((o) => o.value === (statusValueMap[target][raw] ?? guessStatus(target, raw))) ?? null}
                                  onChange={(next) => setStatusValueMap((prev) => ({ ...prev, [target]: { ...prev[target], [raw]: next?.value ?? raw } }))}
                                  aria-label={`Map status ${raw}`}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </StrataPanel>
            );
          })}

          {(unlinkedMilestones.length > 0 || unlinkedDependencies.length > 0) ? (
            <StrataPanel title="Unlinked rows requiring project assignment" icon={<ListChecks size={16} />} testId="strata-import-unlinked-panel">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <SectionMessage appearance="warning" title="No reliable Parent link found">
                  <p>{unlinkedMilestones.length + unlinkedDependencies.length} row(s) could not be automatically linked to a Project Card. Assign them below — unassigned rows will be rejected at validation rather than attached to the wrong project.</p>
                </SectionMessage>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ ...bodyStyle, width: 220 }}>Assign all unlinked to</span>
                  <div style={{ width: 280 }}>
                    <Select<string>
                      options={projectAssignmentOptions}
                      value={projectAssignmentOptions.find((o) => o.value === batchUnlinkedAssignment) ?? null}
                      onChange={(next) => setBatchUnlinkedAssignment(next?.value ?? null)}
                      isClearable
                      placeholder="Choose a Project Card"
                      aria-label="Assign all unlinked rows to a project"
                    />
                  </div>
                </div>
                {unlinkedMilestones.map((r) => (
                  <div key={`ms-${r.i}`} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <CatalystTag text="Milestone" />
                    <span style={{ ...bodyStyle, width: 220 }}>{r.name || `Row ${r.i + 1}`}</span>
                    <div style={{ width: 280 }}>
                      <Select<string>
                        options={projectAssignmentOptions}
                        value={projectAssignmentOptions.find((o) => o.value === unlinkedAssignment[`ms-${r.i}`]) ?? null}
                        onChange={(next) => setUnlinkedAssignment((prev) => ({ ...prev, [`ms-${r.i}`]: next?.value ?? null }))}
                        isClearable
                        placeholder="Use batch default"
                        aria-label={`Assign milestone ${r.name}`}
                      />
                    </div>
                  </div>
                ))}
                {unlinkedDependencies.map((r) => (
                  <div key={`dep-${r.i}`} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <CatalystTag text="Dependency" />
                    <span style={{ ...bodyStyle, width: 220 }}>{r.name || `Row ${r.i + 1}`}</span>
                    <div style={{ width: 280 }}>
                      <Select<string>
                        options={projectAssignmentOptions}
                        value={projectAssignmentOptions.find((o) => o.value === unlinkedAssignment[`dep-${r.i}`]) ?? null}
                        onChange={(next) => setUnlinkedAssignment((prev) => ({ ...prev, [`dep-${r.i}`]: next?.value ?? null }))}
                        isClearable
                        placeholder="Use batch default"
                        aria-label={`Assign dependency ${r.name}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </StrataPanel>
          ) : null}
        </div>
      ) : null}

      {/* ── Step 3: Preview & validate (ready screen before calling the RPC) ── */}
      {step === 3 && !preview ? (
        <StrataPanel title="Ready to validate" icon={<ListChecks size={16} />}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p style={bodyStyle}>{fileName} — {totalDetected('project_cards')} project card row(s), {totalDetected('milestones')} milestone row(s), {totalDetected('dependencies')} dependency row(s).</p>
            {ignoredCount > 0 ? <p style={captionStyle}>{ignoredCount} row(s) ignored/unmapped and will not be imported.</p> : null}
            <p style={captionStyle}>Validation resolves Strategic Theme, owner names, and checks required fields. Nothing is written yet.</p>
            {runError ? <SectionMessage appearance="error" title="Validation failed"><p>{runError}</p></SectionMessage> : null}
          </div>
        </StrataPanel>
      ) : null}

      {step === 3 && preview ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {(() => {
            const sheets = [preview.summary.project_cards, preview.summary.milestones, preview.summary.dependencies];
            const totalRows = sheets.reduce((n, s) => n + s.total, 0);
            const totalCreate = sheets.reduce((n, s) => n + s.created, 0);
            const totalUpdate = sheets.reduce((n, s) => n + s.updated, 0);
            const totalRejected = sheets.reduce((n, s) => n + s.rejected, 0);
            return (
              <>
                {/* DRY RUN header — commitment is explicit before any mutation (anchor 18). */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <Lozenge appearance="inprogress">Dry run</Lozenge>
                  <span style={{ fontSize: 'var(--ds-font-size-100)', color: T.subtlest }}>
                    {fileName} · validated against live STRATA — no writes yet.
                  </span>
                  <span style={{ marginLeft: 'auto' }}>
                    <Button appearance="subtle" iconBefore={<Download size={14} />} onClick={() => downloadErrorReport(preview)}>
                      Download error report
                    </Button>
                  </span>
                </div>
                {/* Summary strip — honest created/updated/rejected (no fabricated Matched/Conflict/Unmatched). */}
                <StrataStatStrip
                  testId="strata-import-summary-strip"
                  items={[
                    { key: 'create', label: 'WILL CREATE', value: <span style={{ color: 'var(--ds-text-success)' }}>{totalCreate}</span>, caption: 'new cards & rows', captionTone: 'neutral' },
                    { key: 'update', label: 'WILL UPDATE', value: <span style={{ color: 'var(--ds-text-information)' }}>{totalUpdate}</span>, caption: 'existing, matched by reference', captionTone: 'neutral' },
                    { key: 'rejected', label: 'REJECTED', value: <span style={{ color: totalRejected > 0 ? 'var(--ds-text-danger)' : T.subtlest }}>{totalRejected}</span>, caption: totalRejected > 0 ? 'skipped on apply — fix & re-run' : 'none', captionTone: totalRejected > 0 ? 'danger' : 'neutral' },
                    { key: 'written', label: 'WRITTEN', value: <span style={{ color: T.subtlest }}>0</span>, caption: 'nothing is written until you apply', captionTone: 'neutral' },
                  ]}
                />
                <SectionMessage appearance={totalRejected > 0 ? 'warning' : 'success'} title={totalRejected > 0 ? `${totalRejected} of ${totalRows} row(s) failed validation` : `All ${totalRows} row(s) pass validation`}>
                  <p>Rows with errors are skipped on apply — nothing else in the file is blocked by them. {ignoredCount > 0 ? `${ignoredCount} row(s) were ignored/unmapped before validation.` : ''}</p>
                </SectionMessage>
              </>
            );
          })()}
          <ResultTable title="Project Cards" rows={preview.project_cards} />
          <ResultTable title="Milestones" rows={preview.milestones} />
          <ResultTable title="Delivery Dependencies" rows={preview.dependencies} />
        </div>
      ) : null}

      {/* ── Step 4: Confirm import — the single commitment point ── */}
      {step === 4 && preview ? (
        <StrataPanel title="Confirm import" icon={<Upload size={16} />} testId="strata-execution-import-confirm-panel">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={bodyStyle}>
              {preview.summary.project_cards.created + preview.summary.project_cards.updated} project card(s),{' '}
              {preview.summary.milestones.created + preview.summary.milestones.updated} milestone(s),{' '}
              {preview.summary.dependencies.created + preview.summary.dependencies.updated} dependenc{preview.summary.dependencies.created + preview.summary.dependencies.updated === 1 ? 'y' : 'ies'} will be created or updated. Rejected rows are skipped.
            </p>
            {/* Commitment band — honest about what apply does and how it is reversed
                (re-import; there is no undo RPC). Anchor 18 shows a 24h undo the backend
                does not have — render the true recovery path instead. */}
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 20, flexWrap: 'wrap',
              padding: 'var(--ds-space-150) var(--ds-space-200)', border: `1px solid ${T.border}`,
              borderRadius: 8, background: T.sunken,
            }}>
              <span style={{ fontSize: 'var(--ds-font-size-075)', fontWeight: 600, letterSpacing: '0.04em', color: T.subtlest }}>COMMITMENT</span>
              <span style={{ minWidth: 0, flex: 1, fontSize: 'var(--ds-font-size-100)', color: T.subtle, lineHeight: 1.5 }}>
                Apply writes card links, milestones and progress rollups in one batch. Re-import is idempotent —
                a row already matched by reference updates in place, never duplicates — so correcting a value means
                re-running a fixed file, not an undo. Every applied row is recorded in the upload run + audit log.
              </span>
            </div>
            {runError ? <SectionMessage appearance="error" title="Import failed"><p>{runError}</p></SectionMessage> : null}
          </div>
        </StrataPanel>
      ) : null}

      {/* ── Step 5: Summary ── */}
      {step === 5 && confirmed ? (
        <StrataPanel title="Import complete" icon={<CheckCircle2 size={16} />} testId="strata-execution-import-summary-panel">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(['project_cards', 'milestones', 'dependencies'] as const).map((k) => {
              const s = confirmed.summary[k];
              const label = k === 'project_cards' ? 'Project Cards' : k === 'milestones' ? 'Milestones' : 'Delivery Dependencies';
              return (
                <div key={k} style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ ...bodyStyle, fontWeight: 600, width: 160 }}>{label}</span>
                  <Lozenge appearance="success">{s.created} created</Lozenge>
                  <Lozenge appearance="inprogress">{s.updated} updated</Lozenge>
                  {s.rejected > 0 ? <Lozenge appearance="removed">{s.rejected} rejected</Lozenge> : null}
                </div>
              );
            })}
            {ignoredCount > 0 ? <p style={captionStyle}>{ignoredCount} row(s) were ignored/unmapped and not imported.</p> : null}
            <div style={{ marginTop: 8 }}>
              <Button appearance="subtle" iconBefore={<Download size={14} />} onClick={() => downloadErrorReport(confirmed)}>Download full report</Button>
            </div>
          </div>
        </StrataPanel>
      ) : null}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 12, borderTop: `1px solid ${T.border}` }}>
        <Button appearance="subtle" onClick={() => navigate(Routes.strata.execution())} isDisabled={validating || committing}>
          {step === 5 ? 'Back to Execution' : 'Cancel'}
        </Button>
        <div style={{ display: 'flex', gap: 8 }}>
          {step > 0 && step < 5 ? <Button onClick={() => setStep((s) => s - 1)} isDisabled={validating || committing}>Back</Button> : null}
          {step === 0 ? (
            <Button appearance="primary" isDisabled={!sheets} onClick={() => setStep(1)}>Continue</Button>
          ) : null}
          {step === 1 ? (
            <Button appearance="primary" isDisabled={!step1Ready} onClick={() => setStep(2)}>Continue</Button>
          ) : null}
          {step === 2 ? (
            <Button appearance="primary" isDisabled={!anyTargetHasRows} onClick={() => setStep(3)}>Continue to preview</Button>
          ) : null}
          {step === 3 && !preview ? (
            <Button appearance="primary" iconBefore={validating ? undefined : <ListChecks size={14} />} isDisabled={validating || !hasImportRole} onClick={() => void goToPreview()}>
              {validating ? 'Validating…' : 'Preview & validate'}
            </Button>
          ) : null}
          {step === 3 && preview ? (
            <Button appearance="primary" onClick={() => setStep(4)}>Continue to confirm</Button>
          ) : null}
          {step === 4 ? (
            <Button
              appearance="primary"
              iconBefore={committing ? undefined : <Upload size={14} />}
              isDisabled={committing || !hasImportRole}
              onClick={() => void confirmImport()}
              testId="strata-execution-import-confirm"
            >
              {committing ? 'Importing…' : 'Apply import'}
            </Button>
          ) : null}
          {step === 5 ? <Button appearance="primary" onClick={() => navigate(Routes.strata.execution())}>Done</Button> : null}
        </div>
      </div>
    </StrataPageShell>
  );
}

// ── Row-result table (shared by Preview) ────────────────────────────────────
function ResultTable({ title, rows }: { title: string; rows: ExecutionImportRowResult[] }) {
  const errorCount = rows.filter((r) => r.status === 'error').length;
  const warningCount = rows.filter((r) => (r.warnings ?? []).length > 0).length;
  const columns: Column<ExecutionImportRowResult>[] = [
    { id: 'row', label: 'Row', width: 8, cell: ({ row: r }) => <span style={{ ...bodyStyle, fontVariantNumeric: 'tabular-nums' }}>{r.row_number}</span> },
    { id: 'ref', label: 'Reference', width: 16, cell: ({ row: r }) => <span style={bodyStyle}>{r.reference_id ?? r.project_reference_id ?? '—'}</span> },
    { id: 'name', label: 'Name', flex: true, cell: ({ row: r }) => <span style={bodyStyle}>{r.name ?? <span style={{ color: T.subtlest }}>—</span>}</span> },
    {
      id: 'status', label: 'Status', width: 12,
      cell: ({ row: r }) => (r.status === 'valid'
        ? <StatusLozenge status="valid" label="Valid" appearance="success" />
        : <StatusLozenge status="error" label="Error" appearance="removed" />),
    },
    { id: 'action', label: 'Action', width: 10, cell: ({ row: r }) => (r.action ? <CatalystTag text={r.action === 'create' ? 'Create' : 'Update'} /> : <span style={{ color: T.subtlest }}>—</span>) },
    {
      id: 'issues', label: 'Errors / Warnings', width: 32,
      cell: ({ row: r }) => {
        const parts: React.ReactNode[] = [];
        if (r.errors.length > 0) parts.push(<span key="e" style={{ fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-danger)' }}>{r.errors.join('; ')}</span>);
        if ((r.warnings ?? []).length > 0) parts.push(<span key="w" style={{ fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-warning)' }}>{r.warnings.join('; ')}</span>);
        return parts.length > 0 ? <>{parts}</> : <span style={{ color: T.subtlest }}>—</span>;
      },
    },
  ];
  return (
    <StrataPanel
      title={title}
      icon={<ListChecks size={16} />}
      count={rows.length}
      noPadding
      actions={<span style={captionStyle}>{errorCount > 0 ? `${errorCount} error${errorCount === 1 ? '' : 's'}` : 'All rows valid'}{warningCount > 0 ? ` · ${warningCount} warning${warningCount === 1 ? '' : 's'}` : ''}</span>}
    >
      {rows.length === 0
        ? <div style={{ padding: 16 }}><span style={captionStyle}>No rows in this sheet.</span></div>
        : <JiraTable<ExecutionImportRowResult> columns={columns} data={rows} getRowId={(r) => `${r.row_number}`} ariaLabel={title} />}
    </StrataPanel>
  );
}
