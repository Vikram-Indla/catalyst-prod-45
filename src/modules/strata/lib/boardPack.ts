/**
 * STRATA board-pack generation — CLIENT-SIDE (CAT-STRATA-20260705-001, Q7: PDF + PPTX).
 *
 * The server generation engine has no staging DB channel yet, so packs are built
 * honestly in the browser from the ALREADY-LOADED frozen snapshot data — nothing
 * is refetched and nothing is recalculated. Every value in the pack is the frozen
 * payload as rendered on the review cockpit.
 *
 * PDF follows the repo's jsPDF + jspdf-autotable pattern (src/utils/exports/exportToPdf.ts,
 * loaded via src/lib/exportLoaders). PPTX follows the repo's pptxgenjs pattern
 * (src/services/ideasRoadmapPptx.ts). Both deps ship in package.json — no new deps.
 *
 * Document colors are export-owned (jsPDF rgb triples / pptxgenjs hashless hex),
 * matching the existing export utilities — ADS CSS tokens do not exist inside
 * generated PDF/PPTX binaries.
 */
import { loadJsPDF, loadJsPDFAutoTable } from '@/lib/exportLoaders';
import { fmtDate, fmtDateTime, labelize } from '@/modules/strata/components/format';
import type { StrataAction, StrataDecision, StrataSnapshot } from '@/modules/strata/types';

const loadPptxGenJS = () => import('pptxgenjs').then((m) => m.default);

/** One frozen evidence row, pre-formatted by the page (same formatting the screen shows). */
export interface BoardPackEvidenceRow {
  entityType: string; // labelized
  entity: string;     // frozen payload.entity_name ('—' for older snapshots that lack it)
  metric: string;     // payload name or labelized metric key ('—' when unknown)
  value: string;      // fmtUnit output ('—' when unknown)
  band: string;       // labelized band/status key ('—' when unknown)
}

/** Everything the pack needs, taken verbatim from the loaded review-cockpit queries. */
export interface BoardPackData {
  snapshot: StrataSnapshot;
  cycleName: string | null;
  periodName: string | null;
  /** Frozen record counts by entity type (labelized), as shown on the evidence panel. */
  evidenceGroups: Array<[string, number]>;
  runCount: number;
  evidence: BoardPackEvidenceRow[];
  /** Decisions linked to this snapshot via snapshot_id, with resolved owner names. */
  decisions: Array<{ decision: StrataDecision; ownerName: string | null }>;
  openActions: Array<{ action: StrataAction; ownerName: string | null }>;
}

const GENERATED_NOTE =
  'Generated locally in the browser from the frozen snapshot payload — no values recalculated.';

/** Result of a pack generation: the artifact blob (for storage persistence) + its filename. */
export interface BoardPackArtifact {
  filename: string;
  blob: Blob;
  contentType: string;
}

export const PACK_CONTENT_TYPE = {
  pdf: 'application/pdf',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
} as const;

/** Trigger a local browser download from an already-built blob (single generation pass). */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Neutral executive palette (export-owned). jsPDF wants rgb triples; pptx wants hashless hex.
const NAVY: [number, number, number] = [9, 30, 66];
const SUBTLE: [number, number, number] = [98, 111, 134];
const PPT = {
  navy: '091E42',
  text: '172B4D',
  subtle: '626F86',
  border: 'DCDFE4',
  bg: 'F7F8F9',
  white: 'FFFFFF',
} as const;

const packFileName = (snapshot: StrataSnapshot, ext: 'pdf' | 'pptx') =>
  `${snapshot.snapshot_key}-board-pack.${ext}`;

/** Summary-fact rows shared by both formats: frozen counts by entity type + data runs. */
function summaryRows(data: BoardPackData): string[][] {
  const rows = data.evidenceGroups.map(([entityType, count]) => [entityType, String(count)]);
  const total = data.evidenceGroups.reduce((sum, [, c]) => sum + c, 0);
  rows.push(['Total frozen records', String(total)]);
  rows.push(['Data runs', String(data.runCount)]);
  return rows;
}

const decisionRows = (data: BoardPackData): string[][] =>
  data.decisions.map(({ decision: d, ownerName }) => [
    d.decision_key,
    d.title,
    labelize(d.status),
    ownerName ?? '—',
    d.due_date ? fmtDate(d.due_date) : '—',
    d.decided_at ? fmtDate(d.decided_at) : '—',
  ]);

const actionRows = (data: BoardPackData): string[][] =>
  data.openActions.map(({ action, ownerName }) => [
    action.action_key,
    action.title,
    ownerName ?? '—',
    action.due_date ? fmtDate(action.due_date) : '—',
    labelize(action.status),
  ]);

/** Provenance appendix rows — strictly the LOCKED snapshot's own frozen references
 *  (data_run_ids + config_versions); nothing is resolved from live data. */
function provenanceRows(snapshot: StrataSnapshot): string[][] {
  const rows: string[][] = [];
  (snapshot.data_run_ids ?? []).forEach((runId) => rows.push(['Data run', runId]));
  Object.entries(snapshot.config_versions ?? {}).forEach(([key, value]) => {
    rows.push([
      `Config · ${labelize(key)}`,
      typeof value === 'string' || typeof value === 'number' ? String(value) : JSON.stringify(value),
    ]);
  });
  return rows;
}

// ── PDF ──────────────────────────────────────────────────────────────────────

export async function generateBoardPackPdf(data: BoardPackData): Promise<BoardPackArtifact> {
  const [jsPDF, autoTable] = await Promise.all([loadJsPDF(), loadJsPDFAutoTable()]);
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const { snapshot } = data;

  // ── Cover ──
  doc.setFontSize(10);
  doc.setTextColor(...SUBTLE);
  doc.text('Catalyst STRATA — Board pack', 14, 15);
  doc.text(fmtDate(new Date()), pageWidth - 14, 15, { align: 'right' });

  doc.setFontSize(20);
  doc.setTextColor(...NAVY);
  doc.text(snapshot.name, 14, 30);

  doc.setFontSize(11);
  doc.setTextColor(...SUBTLE);
  const coverLines = [
    `Snapshot ${snapshot.snapshot_key} · ${String(snapshot.status).toUpperCase()}`,
    `Cycle: ${data.cycleName ?? '—'}    Period: ${data.periodName ?? '—'}`,
    `Locked at: ${fmtDateTime(snapshot.locked_at)}`,
  ];
  coverLines.forEach((line, i) => doc.text(line, 14, 39 + i * 6));

  doc.setFontSize(8);
  doc.text(GENERATED_NOTE, 14, 60);

  const headStyles = { fillColor: NAVY, textColor: 255 as const, fontStyle: 'bold' as const };
  const styles = { fontSize: 9, cellPadding: 2.5 };
  const sectionTitle = (title: string, y: number) => {
    doc.setFontSize(13);
    doc.setTextColor(...NAVY);
    doc.text(title, 14, y);
    return y + 4;
  };
  const emptyLine = (text: string, y: number) => {
    doc.setFontSize(9);
    doc.setTextColor(...SUBTLE);
    doc.text(text, 14, y + 2);
    return y + 10;
  };
  // jspdf-autotable stashes the last table's end Y on the doc instance.
  const lastY = (fallback: number): number =>
    (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? fallback;

  // ── Summary facts ──
  let y = sectionTitle('Summary — frozen record counts', 72);
  autoTable(doc, {
    head: [['Entity type', 'Frozen records']],
    body: summaryRows(data),
    startY: y,
    styles,
    headStyles,
    margin: { left: 14, right: 14 },
  });
  y = lastY(y) + 12;

  // ── Frozen evidence ──
  y = sectionTitle('Frozen evidence', y);
  if (data.evidence.length === 0) {
    y = emptyLine('This snapshot carries no frozen evidence records.', y);
  } else {
    autoTable(doc, {
      head: [['Entity type', 'Entity', 'Metric', 'Value', 'Band']],
      body: data.evidence.map((r) => [r.entityType, r.entity, r.metric, r.value, r.band]),
      startY: y,
      styles,
      headStyles,
      columnStyles: { 3: { halign: 'right' } },
      margin: { left: 14, right: 14 },
    });
    y = lastY(y) + 12;
  }

  // ── Decisions & actions (linked to this snapshot via snapshot_id) ──
  y = sectionTitle('Decisions on this snapshot', y);
  if (data.decisions.length === 0) {
    y = emptyLine('No decisions recorded against this snapshot.', y);
  } else {
    autoTable(doc, {
      head: [['Key', 'Title', 'Status', 'Owner', 'Due', 'Decided']],
      body: decisionRows(data),
      startY: y,
      styles,
      headStyles,
      margin: { left: 14, right: 14 },
    });
    y = lastY(y) + 12;
  }

  // ── Open actions ──
  y = sectionTitle('Open actions', y);
  if (data.openActions.length === 0) {
    y = emptyLine('No open actions on this snapshot’s decisions.', y);
  } else {
    autoTable(doc, {
      head: [['Key', 'Title', 'Owner', 'Due', 'Status']],
      body: actionRows(data),
      startY: y,
      styles,
      headStyles,
      margin: { left: 14, right: 14 },
    });
    y = lastY(y) + 12;
  }

  // ── Provenance appendix — the snapshot's frozen data_run_ids + config_versions ──
  y = sectionTitle('Provenance appendix', y);
  const provRows = provenanceRows(snapshot);
  if (provRows.length === 0) {
    emptyLine('This snapshot carries no data-run or config-version references.', y);
  } else {
    autoTable(doc, {
      head: [['Kind', 'Reference']],
      body: provRows,
      startY: y,
      styles,
      headStyles,
      margin: { left: 14, right: 14 },
    });
  }

  // ── Footer: page numbers + provenance ──
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...SUBTLE);
    doc.text(`${snapshot.snapshot_key} · Page ${i} of ${pageCount}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
  }

  const filename = packFileName(snapshot, 'pdf');
  const blob = doc.output('blob') as Blob;
  downloadBlob(blob, filename);
  return { filename, blob, contentType: PACK_CONTENT_TYPE.pdf };
}

// ── PPTX ─────────────────────────────────────────────────────────────────────

/** pptxgenjs table cell helper. */
const cell = (text: string, opts: Record<string, unknown> = {}) => ({
  text,
  options: { fontSize: 10, color: PPT.text, valign: 'middle', ...opts },
});
const headCell = (text: string) =>
  cell(text, { bold: true, color: PPT.white, fill: { color: PPT.navy }, fontSize: 10 });

export async function generateBoardPackPptx(data: BoardPackData): Promise<BoardPackArtifact> {
  const PptxGenJS = await loadPptxGenJS();
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';
  const { snapshot } = data;

  // ── Cover ──
  const cover = pptx.addSlide();
  cover.background = { color: PPT.white };
  cover.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.12, h: 7.5, fill: { color: PPT.navy } });
  cover.addText('CATALYST STRATA — BOARD PACK', {
    x: 0.5, y: 1.1, w: 9, h: 0.4, fontSize: 12, bold: true, color: PPT.subtle, charSpacing: 2,
  });
  cover.addText(snapshot.name, {
    x: 0.5, y: 1.7, w: 12, h: 1.2, fontSize: 34, bold: true, color: PPT.navy,
  });
  cover.addText(`${snapshot.snapshot_key} · ${String(snapshot.status).toUpperCase()}`, {
    x: 0.5, y: 3.0, w: 9, h: 0.5, fontSize: 16, bold: true, color: PPT.text,
  });
  cover.addText(
    `Cycle: ${data.cycleName ?? '—'}    Period: ${data.periodName ?? '—'}    Locked at: ${fmtDateTime(snapshot.locked_at)}`,
    { x: 0.5, y: 3.6, w: 12, h: 0.5, fontSize: 13, color: PPT.subtle },
  );
  cover.addText(GENERATED_NOTE, { x: 0.5, y: 6.8, w: 12, h: 0.4, fontSize: 9, italic: true, color: PPT.subtle });

  const addTableSlide = (title: string, head: string[], rows: string[][], emptyText: string) => {
    // Chunk long tables so rows never overflow the slide.
    const CHUNK = 12;
    const chunks: string[][][] = [];
    for (let i = 0; i < rows.length; i += CHUNK) chunks.push(rows.slice(i, i + CHUNK));
    if (chunks.length === 0) chunks.push([]);

    chunks.forEach((chunk, idx) => {
      const slide = pptx.addSlide();
      slide.background = { color: PPT.white };
      slide.addText(chunks.length > 1 ? `${title} (${idx + 1}/${chunks.length})` : title, {
        x: 0.5, y: 0.3, w: 12, h: 0.6, fontSize: 22, bold: true, color: PPT.navy,
      });
      if (chunk.length === 0) {
        slide.addText(emptyText, { x: 0.5, y: 1.2, w: 12, h: 0.5, fontSize: 13, color: PPT.subtle });
      } else {
        slide.addTable(
          [head.map(headCell), ...chunk.map((r) => r.map((c) => cell(c)))],
          { x: 0.5, y: 1.1, w: 12.3, border: { type: 'solid', color: PPT.border, pt: 0.5 }, autoPage: false },
        );
      }
      slide.addText(`${snapshot.snapshot_key} · frozen snapshot data`, {
        x: 0.5, y: 7.0, w: 12, h: 0.3, fontSize: 8, color: PPT.subtle,
      });
    });
  };

  addTableSlide('Summary — frozen record counts', ['Entity type', 'Frozen records'], summaryRows(data), '');
  addTableSlide(
    'Frozen evidence',
    ['Entity type', 'Entity', 'Metric', 'Value', 'Band'],
    data.evidence.map((r) => [r.entityType, r.entity, r.metric, r.value, r.band]),
    'This snapshot carries no frozen evidence records.',
  );
  addTableSlide('Decisions on this snapshot', ['Key', 'Title', 'Status', 'Owner', 'Due', 'Decided'], decisionRows(data), 'No decisions recorded against this snapshot.');
  addTableSlide('Open actions', ['Key', 'Title', 'Owner', 'Due', 'Status'], actionRows(data), 'No open actions on this snapshot’s decisions.');
  addTableSlide(
    'Provenance appendix — data runs & config versions',
    ['Kind', 'Reference'],
    provenanceRows(snapshot),
    'This snapshot carries no data-run or config-version references.',
  );

  const filename = packFileName(snapshot, 'pptx');
  const blob = (await pptx.write({ outputType: 'blob' })) as Blob;
  downloadBlob(blob, filename);
  return { filename, blob, contentType: PACK_CONTENT_TYPE.pptx };
}
