/**
 * PDF Export Utility
 * Export data to PDF format using jsPDF
 */
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ExportColumn, PdfExportOptions } from './types';

export const exportToPdf = async <T extends Record<string, any>>(
  data: T[],
  columns: ExportColumn<T>[],
  options: PdfExportOptions
): Promise<string> => {
  if (data.length === 0) {
    throw new Error('No data to export');
  }

  const doc = new jsPDF({
    orientation: options.orientation || 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Brand header
  const brandName = options.brandName || 'Catalyst Platform';
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(brandName, 14, 15);
  
  // Export date
  doc.text(new Date().toLocaleDateString(), pageWidth - 14, 15, { align: 'right' });

  // Title
  if (options.title) {
    doc.setFontSize(18);
    doc.setTextColor(0);
    doc.text(options.title, 14, 28);
  }

  // Subtitle
  if (options.subtitle) {
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(options.subtitle, 14, 35);
  }

  // Format table data
  const tableHeaders = columns.map(col => col.header);
  const tableData = data.map(item =>
    columns.map(col => {
      const value = item[col.key];
      return col.formatter ? col.formatter(value) : String(value ?? '');
    })
  );

  // Generate table
  autoTable(doc, {
    head: [tableHeaders],
    body: tableData,
    startY: options.title ? (options.subtitle ? 42 : 35) : 25,
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: options.headerColor ? hexToRgb(options.headerColor) : [13, 148, 136], // Teal default
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [250, 250, 250],
    },
    margin: { top: 20, right: 14, bottom: 20, left: 14 },
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }

  // Generate filename
  const timestamp = options.includeTimestamp !== false 
    ? `-${new Date().toISOString().split('T')[0]}` 
    : '';
  const filename = `${options.filename}${timestamp}.pdf`;

  // Save
  doc.save(filename);

  return filename;
};

/**
 * Export HTML element to PDF
 */
export const exportElementToPdf = async (
  elementId: string,
  options: PdfExportOptions
): Promise<string> => {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Element with id "${elementId}" not found`);
  }

  // Use html2canvas for complex HTML
  const { default: html2canvas } = await import('html2canvas');
  
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
  });

  const imgData = canvas.toDataURL('image/png');
  const doc = new jsPDF({
    orientation: options.orientation || 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const imgWidth = pageWidth - 28;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  let heightLeft = imgHeight;
  let position = 14;

  doc.addImage(imgData, 'PNG', 14, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  while (heightLeft >= 0) {
    position = heightLeft - imgHeight;
    doc.addPage();
    doc.addImage(imgData, 'PNG', 14, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  const timestamp = options.includeTimestamp !== false 
    ? `-${new Date().toISOString().split('T')[0]}` 
    : '';
  const filename = `${options.filename}${timestamp}.pdf`;

  doc.save(filename);

  return filename;
};

/**
 * Convert hex color to RGB array
 */
function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [13, 148, 136]; // Default teal
}
