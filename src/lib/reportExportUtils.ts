import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';

export interface ExportData {
  title: string;
  subtitle?: string;
  generatedAt: Date;
  metrics?: Record<string, any>;
  tableData?: {
    headers: string[];
    rows: any[][];
  };
  chartImage?: string;
}

export interface ExportOptions {
  format: 'pdf' | 'excel' | 'csv';
  includeCharts?: boolean;
  includeSummary?: boolean;
  includeRawData?: boolean;
  pageSize?: 'a4' | 'letter' | 'legal';
  orientation?: 'portrait' | 'landscape';
}

function formatLabel(key: string): string {
  return key.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase()).trim();
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-z0-9]/gi, '_').replace(/_+/g, '_').toLowerCase();
}

export async function reportExportToPDF(data: ExportData, options: ExportOptions): Promise<void> {
  const doc = new jsPDF({
    orientation: options.orientation || 'portrait',
    unit: 'mm',
    format: options.pageSize || 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let yPosition = margin;

  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, pageWidth, 25, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.text('Catalyst TestHub', margin, 16);

  yPosition = 35;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(16);
  doc.text(data.title, margin, yPosition);

  yPosition += 8;
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated: ${format(data.generatedAt, 'PPP p')}`, margin, yPosition);
  if (data.subtitle) { yPosition += 5; doc.text(data.subtitle, margin, yPosition); }
  yPosition += 15;

  if (options.includeSummary && data.metrics) {
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text('Summary', margin, yPosition);
    yPosition += 8;
    const metricEntries = Object.entries(data.metrics);
    const metricsPerRow = 4;
    const metricWidth = (pageWidth - 2 * margin) / metricsPerRow;
    for (let i = 0; i < metricEntries.length; i += metricsPerRow) {
      const rowMetrics = metricEntries.slice(i, i + metricsPerRow);
      rowMetrics.forEach(([key, value], index) => {
        const x = margin + index * metricWidth;
        doc.setFillColor(245, 245, 245);
        doc.roundedRect(x, yPosition, metricWidth - 5, 20, 2, 2, 'F');
        doc.setFontSize(8); doc.setTextColor(100, 100, 100);
        doc.text(formatLabel(key), x + 3, yPosition + 6);
        doc.setFontSize(14); doc.setTextColor(0, 0, 0);
        doc.text(String(value), x + 3, yPosition + 15);
      });
      yPosition += 25;
    }
  }

  if (options.includeCharts && data.chartImage) {
    yPosition += 5;
    try {
      doc.addImage(data.chartImage, 'PNG', margin, yPosition, pageWidth - 2 * margin, 80);
      yPosition += 90;
    } catch (e) { console.error('Failed to add chart image:', e); }
  }

  if (options.includeRawData && data.tableData) {
    if (yPosition > doc.internal.pageSize.getHeight() - 60) { doc.addPage(); yPosition = margin; }
    doc.setFontSize(12); doc.setTextColor(0, 0, 0);
    doc.text('Detailed Data', margin, yPosition);
    yPosition += 5;
    autoTable(doc, {
      startY: yPosition,
      head: [data.tableData.headers],
      body: data.tableData.rows,
      margin: { left: margin, right: margin },
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    });
  }

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8); doc.setTextColor(150, 150, 150);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
  }

  doc.save(`${sanitizeFilename(data.title)}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}

export function reportExportToExcel(data: ExportData, options: ExportOptions): void {
  const workbook = XLSX.utils.book_new();
  if (options.includeSummary && data.metrics) {
    const summaryData = [
      ['Report', data.title], ['Generated', format(data.generatedAt, 'PPP p')], [''],
      ['Metric', 'Value'],
      ...Object.entries(data.metrics).map(([key, value]) => [formatLabel(key), value]),
    ];
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(summaryData), 'Summary');
  }
  if (options.includeRawData && data.tableData) {
    const sheet = XLSX.utils.aoa_to_sheet([data.tableData.headers, ...data.tableData.rows]);
    sheet['!cols'] = data.tableData.headers.map((h, i) => ({
      wch: Math.min(Math.max(h.length, ...data.tableData!.rows.map(r => String(r[i] || '').length)) + 2, 50),
    }));
    XLSX.utils.book_append_sheet(workbook, sheet, 'Data');
  }
  XLSX.writeFile(workbook, `${sanitizeFilename(data.title)}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
}

export function reportExportToCSV(data: ExportData): void {
  if (!data.tableData) return;
  const csv = [
    data.tableData.headers.join(','),
    ...data.tableData.rows.map(row =>
      row.map(cell => {
        const v = String(cell ?? '');
        return v.includes(',') || v.includes('"') || v.includes('\n') ? `"${v.replace(/"/g, '""')}"` : v;
      }).join(',')
    ),
  ].join('\n');
  saveAs(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `${sanitizeFilename(data.title)}_${format(new Date(), 'yyyy-MM-dd')}.csv`);
}
