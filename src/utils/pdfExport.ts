/**
 * PDF Export Utility for Incident Reports
 * 
 * Generates well-formatted PDF reports with:
 * - Report title and timestamp
 * - Executive summary section
 * - Tabular data with proper column alignment
 */

import jsPDF from 'jspdf';

interface InsightData {
  label: string;
  value: string | number;
}

interface ColumnDef {
  key: string;
  label: string;
  width?: number; // percentage of page width
  align?: 'left' | 'center' | 'right';
}

interface ExportOptions {
  reportTitle: string;
  insights: InsightData[];
  columns: ColumnDef[];
  data: Record<string, any>[];
  filename?: string;
}

const PAGE_MARGIN = 20;
const PAGE_WIDTH = 210 - (PAGE_MARGIN * 2); // A4 width minus margins
const HEADER_HEIGHT = 8;
const ROW_HEIGHT = 7;

export function exportReportToPDF({
  reportTitle,
  insights,
  columns,
  data,
  filename,
}: ExportOptions): void {
  const doc = new jsPDF();
  let yPos = PAGE_MARGIN;

  // ═══════════════════════════════════════════════════════════
  // HEADER
  // ═══════════════════════════════════════════════════════════
  
  // Title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text(reportTitle, PAGE_MARGIN, yPos);
  yPos += 8;

  // Timestamp
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated: ${new Date().toLocaleString()}`, PAGE_MARGIN, yPos);
  yPos += 12;

  // ═══════════════════════════════════════════════════════════
  // EXECUTIVE SUMMARY
  // ═══════════════════════════════════════════════════════════
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text('Executive Summary', PAGE_MARGIN, yPos);
  yPos += 6;

  // Draw summary box
  const summaryBoxHeight = 12;
  doc.setFillColor(248, 249, 250);
  doc.setDrawColor(200, 200, 200);
  doc.roundedRect(PAGE_MARGIN, yPos, PAGE_WIDTH, summaryBoxHeight, 2, 2, 'FD');
  
  // Draw insights in the box
  const insightWidth = PAGE_WIDTH / Math.min(insights.length, 5);
  insights.slice(0, 5).forEach((insight, idx) => {
    const xPos = PAGE_MARGIN + (idx * insightWidth) + (insightWidth / 2);
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text(String(insight.value), xPos, yPos + 5, { align: 'center' });
    
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(insight.label.toUpperCase(), xPos, yPos + 9, { align: 'center' });
  });
  
  yPos += summaryBoxHeight + 10;

  // ═══════════════════════════════════════════════════════════
  // TABLE
  // ═══════════════════════════════════════════════════════════

  // Calculate column widths
  const totalParts = columns.reduce((sum, col) => sum + (col.width || 1), 0);
  const colWidths = columns.map(col => ((col.width || 1) / totalParts) * PAGE_WIDTH);
  
  // Table header
  doc.setFillColor(92, 124, 92); // Brand primary
  doc.setDrawColor(92, 124, 92);
  doc.rect(PAGE_MARGIN, yPos, PAGE_WIDTH, HEADER_HEIGHT, 'F');
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  
  let xPos = PAGE_MARGIN;
  columns.forEach((col, idx) => {
    const textX = col.align === 'center' 
      ? xPos + (colWidths[idx] / 2) 
      : col.align === 'right'
        ? xPos + colWidths[idx] - 2
        : xPos + 2;
    
    doc.text(
      col.label.toUpperCase(), 
      textX, 
      yPos + 5.5, 
      { align: col.align || 'left' }
    );
    xPos += colWidths[idx];
  });
  
  yPos += HEADER_HEIGHT;

  // Table rows
  const maxY = 280; // Leave margin at bottom
  
  data.forEach((row, rowIdx) => {
    // Check for page break
    if (yPos + ROW_HEIGHT > maxY) {
      doc.addPage();
      yPos = PAGE_MARGIN;
      
      // Repeat header on new page
      doc.setFillColor(92, 124, 92);
      doc.rect(PAGE_MARGIN, yPos, PAGE_WIDTH, HEADER_HEIGHT, 'F');
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      
      let headerX = PAGE_MARGIN;
      columns.forEach((col, idx) => {
        const textX = col.align === 'center' 
          ? headerX + (colWidths[idx] / 2) 
          : col.align === 'right'
            ? headerX + colWidths[idx] - 2
            : headerX + 2;
        
        doc.text(col.label.toUpperCase(), textX, yPos + 5.5, { align: col.align || 'left' });
        headerX += colWidths[idx];
      });
      
      yPos += HEADER_HEIGHT;
    }
    
    // Alternating row background
    if (rowIdx % 2 === 0) {
      doc.setFillColor(250, 250, 250);
      doc.rect(PAGE_MARGIN, yPos, PAGE_WIDTH, ROW_HEIGHT, 'F');
    }
    
    // Row border
    doc.setDrawColor(230, 230, 230);
    doc.line(PAGE_MARGIN, yPos + ROW_HEIGHT, PAGE_MARGIN + PAGE_WIDTH, yPos + ROW_HEIGHT);
    
    // Row data
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50, 50, 50);
    
    xPos = PAGE_MARGIN;
    columns.forEach((col, idx) => {
      const value = String(row[col.key] ?? '—');
      const maxWidth = colWidths[idx] - 4;
      
      // Truncate text if too long
      let displayValue = value;
      const textWidth = doc.getTextWidth(displayValue);
      if (textWidth > maxWidth) {
        while (doc.getTextWidth(displayValue + '…') > maxWidth && displayValue.length > 0) {
          displayValue = displayValue.slice(0, -1);
        }
        displayValue += '…';
      }
      
      const textX = col.align === 'center' 
        ? xPos + (colWidths[idx] / 2) 
        : col.align === 'right'
          ? xPos + colWidths[idx] - 2
          : xPos + 2;
      
      doc.text(displayValue, textX, yPos + 5, { align: col.align || 'left' });
      xPos += colWidths[idx];
    });
    
    yPos += ROW_HEIGHT;
  });

  // ═══════════════════════════════════════════════════════════
  // FOOTER
  // ═══════════════════════════════════════════════════════════
  
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Page ${i} of ${pageCount}`,
      210 / 2,
      290,
      { align: 'center' }
    );
    doc.text('Catalyst Incident Reports', PAGE_MARGIN, 290);
  }

  // Save
  const safeFilename = filename || `${reportTitle.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(safeFilename);
}
