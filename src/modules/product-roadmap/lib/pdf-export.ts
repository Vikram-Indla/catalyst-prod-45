/**
 * PDF Export utility for the Product Roadmap
 */

import jsPDF from 'jspdf';
import type { RoadmapDemand, TimelineConfig } from '../types/roadmap';
import { format } from 'date-fns';
import { catalystTokens } from '../lib/design-tokens';

export interface ExportConfig {
  title: string;
  subtitle: string;
  dateRange: { start: Date; end: Date };
  items: RoadmapDemand[];
  includeMetadata: boolean;
  orientation: 'portrait' | 'landscape';
  paperSize: 'a4' | 'letter' | 'a3';
}

export interface ExportOptions {
  format: 'pdf' | 'csv';
  orientation: 'portrait' | 'landscape';
  paperSize: 'a4' | 'letter' | 'a3';
  includeMetadata: boolean;
  dateRange: 'visible' | 'all';
}

// Paper dimensions in mm
const PAPER_SIZES = {
  a4: { width: 210, height: 297 },
  letter: { width: 216, height: 279 },
  a3: { width: 297, height: 420 },
};

// Colors
const COLORS = {
  primary: [198, 156, 109] as [number, number, number],
  text: [10, 10, 10] as [number, number, number],
  textSecondary: [82, 82, 82] as [number, number, number],
  textMuted: [115, 115, 115] as [number, number, number],
  border: [229, 229, 229] as [number, number, number],
  bg: [250, 247, 241] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

const STATUS_COLORS: Record<string, [number, number, number]> = {
  draft: [115, 115, 115],
  submitted: [59, 130, 246],
  in_review: [245, 158, 11],
  approved: [34, 197, 94],
  in_progress: [139, 92, 246],
  completed: [21, 128, 61],
  cancelled: [239, 68, 68],
};

export async function exportRoadmapToPDF(config: ExportConfig): Promise<Blob> {
  const { title, subtitle, dateRange, items, includeMetadata, orientation, paperSize } = config;

  const size = PAPER_SIZES[paperSize];
  const isLandscape = orientation === 'landscape';
  const pageWidth = isLandscape ? size.height : size.width;
  const pageHeight = isLandscape ? size.width : size.height;

  const pdf = new jsPDF({ orientation, unit: 'mm', format: paperSize });

  // Margins and spacing
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let yPos = 20;

  // === HEADER ===
  
  // Accent bar
  pdf.setFillColor(...COLORS.primary);
  pdf.rect(margin, yPos - 5, 4, 20, 'F');

  // Title
  pdf.setFontSize(24);
  pdf.setTextColor(...COLORS.text);
  pdf.setFont('helvetica', 'bold');
  pdf.text(title, margin + 10, yPos + 8);

  // Subtitle
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...COLORS.textSecondary);
  pdf.text(subtitle, margin + 10, yPos + 16);

  // Export info (top right)
  const exportDate = format(new Date(), 'MMMM d, yyyy');
  pdf.setFontSize(9);
  pdf.setTextColor(...COLORS.textMuted);
  pdf.text(`Exported: ${exportDate}`, pageWidth - margin, yPos, { align: 'right' });
  
  const dateRangeText = `${format(dateRange.start, 'MMM yyyy')} - ${format(dateRange.end, 'MMM yyyy')}`;
  pdf.text(dateRangeText, pageWidth - margin, yPos + 6, { align: 'right' });

  yPos += 30;

  // === SUMMARY STATS ===
  if (includeMetadata) {
    const stats = [
      { label: 'Total Items', value: items.length.toString() },
      { label: 'In Progress', value: items.filter(i => i.process_step === 'in_progress').length.toString() },
      { label: 'Scheduled', value: items.filter(i => i.start_date && i.end_date).length.toString() },
      { label: 'Unscheduled', value: items.filter(i => !i.start_date).length.toString() },
    ];

    const statWidth = contentWidth / stats.length;
    
    // Background
    pdf.setFillColor(...COLORS.bg);
    pdf.roundedRect(margin, yPos, contentWidth, 25, 3, 3, 'F');

    stats.forEach((stat, idx) => {
      const xPos = margin + idx * statWidth + statWidth / 2;
      
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...COLORS.primary);
      pdf.text(stat.value, xPos, yPos + 12, { align: 'center' });
      
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(...COLORS.textMuted);
      pdf.text(stat.label, xPos, yPos + 19, { align: 'center' });
    });

    yPos += 35;
  }

  // === TABLE ===
  
  // Column widths
  const colWidths = {
    rank: 12,
    key: 25,
    title: isLandscape ? 80 : 55,
    product: 35,
    dates: 45,
    status: 25,
  };

  // Table header
  pdf.setFillColor(...COLORS.border);
  pdf.rect(margin, yPos, contentWidth, 8, 'F');
  
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...COLORS.text);

  let xPos = margin + 2;
  pdf.text('#', xPos, yPos + 5);
  xPos += colWidths.rank;
  pdf.text('KEY', xPos, yPos + 5);
  xPos += colWidths.key;
  pdf.text('TITLE', xPos, yPos + 5);
  xPos += colWidths.title;
  pdf.text('PRODUCT', xPos, yPos + 5);
  xPos += colWidths.product;
  pdf.text('DATES', xPos, yPos + 5);
  xPos += colWidths.dates;
  pdf.text('STATUS', xPos, yPos + 5);

  yPos += 8;

  // Table rows
  const rowHeight = 8;
  
  items.forEach((item, index) => {
    // Check for page break
    if (yPos + rowHeight > pageHeight - 20) {
      pdf.addPage();
      yPos = 20;
    }

    // Alternating row background
    if (index % 2 === 0) {
      pdf.setFillColor(250, 250, 250);
      pdf.rect(margin, yPos, contentWidth, rowHeight, 'F');
    }

    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...COLORS.text);

    xPos = margin + 2;

    // Rank
    pdf.text((index + 1).toString(), xPos, yPos + 5);
    xPos += colWidths.rank;

    // Key
    pdf.setTextColor(...COLORS.primary);
    pdf.setFont('helvetica', 'bold');
    pdf.text(item.request_key || '-', xPos, yPos + 5);
    xPos += colWidths.key;

    // Title (truncate if needed)
    pdf.setTextColor(...COLORS.text);
    pdf.setFont('helvetica', 'normal');
    const maxTitleWidth = colWidths.title - 2;
    let titleText = item.title;
    while (pdf.getTextWidth(titleText) > maxTitleWidth && titleText.length > 10) {
      titleText = titleText.slice(0, -4) + '...';
    }
    pdf.text(titleText, xPos, yPos + 5);
    xPos += colWidths.title;

    // Product
    pdf.setTextColor(...COLORS.textSecondary);
    const productName = item.product?.name || 'Unassigned';
    pdf.text(productName.substring(0, 15), xPos, yPos + 5);
    xPos += colWidths.product;

    // Dates
    if (item.start_date && item.end_date) {
      const startStr = format(new Date(item.start_date), 'MMM d');
      const endStr = format(new Date(item.end_date), 'MMM d');
      pdf.text(`${startStr} - ${endStr}`, xPos, yPos + 5);
    } else {
      pdf.setTextColor(...COLORS.textMuted);
      pdf.text('Not scheduled', xPos, yPos + 5);
    }
    xPos += colWidths.dates;

    // Status
    const statusColor = STATUS_COLORS[item.process_step || 'draft'] || COLORS.textMuted;
    pdf.setTextColor(...statusColor);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7);
    const statusText = (item.process_step || 'draft').replace('_', ' ').toUpperCase();
    pdf.text(statusText, xPos, yPos + 5);

    yPos += rowHeight;
  });

  // === FOOTER ===
  const totalPages = pdf.getNumberOfPages();
  
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    
    // Footer line
    pdf.setDrawColor(...COLORS.border);
    pdf.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
    
    // Footer text
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...COLORS.textMuted);
    
    pdf.text('Catalyst Product Roadmap', margin, pageHeight - 8);
    pdf.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 8, { align: 'center' });
    pdf.text('Confidential', pageWidth - margin, pageHeight - 8, { align: 'right' });
  }

  return pdf.output('blob');
}

/**
 * Export roadmap data to CSV
 */
export function exportRoadmapToCSV(items: RoadmapDemand[]): string {
  const headers = ['Rank', 'Key', 'Title', 'Product', 'Status', 'Priority', 'Health', 'Start Date', 'End Date', 'Progress'];
  
  const rows = items.map((item, index) => [
    (index + 1).toString(),
    item.request_key || '',
    `"${(item.title || '').replace(/"/g, '""')}"`,
    item.product?.name || 'Unassigned',
    item.process_step || 'draft',
    item.priority_tier || '',
    item.health || '',
    item.start_date || '',
    item.end_date || '',
    item.progress?.toString() || '0',
  ]);

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

/**
 * Download a blob as a file
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
