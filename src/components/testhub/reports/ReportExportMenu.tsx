/**
 * ReportExportMenu — CSV / PDF export for one Reports-hub report.
 * Feature: CAT-REPORTS-HUB-20260703-001 Phase 3 (Task B).
 * Replaces the disabled Lab stub (src/pages/testhub/reports/lab/ReportExportMenu.tsx — deleted).
 *
 * Canonical @atlaskit/dropdown-menu; heavy libs load lazily through
 * src/lib/exportLoaders (papaparse, jspdf + jspdf-autotable, file-saver).
 * Charts are NOT embedded in the PDF this phase — table only.
 */
import { useState } from 'react';
import DropdownMenu, { DropdownItem, DropdownItemGroup } from '@atlaskit/dropdown-menu';
import {
  loadFileSaver,
  loadJsPDF,
  loadJsPDFAutoTable,
  loadPapaparse,
} from '@/lib/exportLoaders';
import type { ExportColumn, ExportRow } from './reportExportRows';

interface Props {
  reportId: string;
  reportLabel: string;
  projectName?: string | null;
  dateLabel?: string | null;
  columns: ExportColumn[];
  rows: ExportRow[];
}

function stamp(): string {
  return new Date().toISOString().slice(0, 10).replace(/-/g, '');
}

function cellText(v: string | number | null | undefined): string {
  return v === null || v === undefined ? '' : String(v);
}

export function ReportExportMenu({ reportId, reportLabel, projectName, dateLabel, columns, rows }: Props) {
  const [busy, setBusy] = useState(false);
  const hasRows = rows.length > 0 && columns.length > 0;
  const baseName = `catalyst-${reportId}-${stamp()}`;

  const exportCsv = async () => {
    if (!hasRows || busy) return;
    setBusy(true);
    try {
      const Papa = await loadPapaparse();
      const saveAs = await loadFileSaver();
      const csv = Papa.unparse({
        fields: columns.map((c) => c.header),
        data: rows.map((r) => columns.map((c) => cellText(r[c.key]))),
      });
      saveAs(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `${baseName}.csv`);
    } finally {
      setBusy(false);
    }
  };

  const exportPdf = async () => {
    if (!hasRows || busy) return;
    setBusy(true);
    try {
      const JsPDF = await loadJsPDF();
      const autoTable = await loadJsPDFAutoTable();
      const doc = new JsPDF({ orientation: columns.length > 6 ? 'landscape' : 'portrait' });
      const title = [reportLabel, projectName, dateLabel].filter(Boolean).join(' · ');
      doc.setFontSize(14);
      doc.text(title, 14, 16);
      doc.setFontSize(9);
      doc.text(`Generated ${new Date().toLocaleString()}`, 14, 22);
      autoTable(doc, {
        startY: 28,
        head: [columns.map((c) => c.header)],
        body: rows.map((r) => columns.map((c) => cellText(r[c.key]))),
        styles: { fontSize: 8 },
      });
      doc.save(`${baseName}.pdf`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <DropdownMenu trigger="Export" shouldRenderToParent isLoading={busy}>
      <DropdownItemGroup>
        <DropdownItem isDisabled={!hasRows || busy} onClick={exportCsv}>
          Export CSV
        </DropdownItem>
        <DropdownItem isDisabled={!hasRows || busy} onClick={exportPdf}>
          Export PDF
        </DropdownItem>
      </DropdownItemGroup>
    </DropdownMenu>
  );
}

export default ReportExportMenu;
