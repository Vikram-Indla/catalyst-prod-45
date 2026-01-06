/**
 * Report Export Service
 * Handles PDF and Excel exports for reports
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';

interface ReportData {
  title: string;
  subtitle?: string;
  generatedAt: string;
  summary?: Record<string, any>;
  data?: any[];
  chartElementId?: string;
}

export const reportExportService = {
  /**
   * Export report to PDF
   */
  exportToPDF: async (report: ReportData, filename: string) => {
    const doc = new jsPDF();
    let yPosition = 20;

    // Header
    doc.setFontSize(20);
    doc.setTextColor(37, 99, 235); // Catalyst primary blue
    doc.text(report.title, 14, yPosition);
    yPosition += 10;

    if (report.subtitle) {
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text(report.subtitle, 14, yPosition);
      yPosition += 8;
    }

    // Generated timestamp
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text(`Generated: ${report.generatedAt}`, 14, yPosition);
    yPosition += 15;

    // Summary section
    if (report.summary && Object.keys(report.summary).length > 0) {
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text('Summary', 14, yPosition);
      yPosition += 8;

      doc.setFontSize(10);
      Object.entries(report.summary).forEach(([key, value]) => {
        doc.text(`${key}: ${value}`, 14, yPosition);
        yPosition += 6;
      });
      yPosition += 10;
    }

    // Chart capture (if element exists)
    if (report.chartElementId) {
      const chartElement = document.getElementById(report.chartElementId);
      if (chartElement) {
        try {
          const canvas = await html2canvas(chartElement, {
            backgroundColor: '#ffffff',
            scale: 2
          });
          const imgData = canvas.toDataURL('image/png');
          
          // Calculate dimensions to fit page width
          const pageWidth = doc.internal.pageSize.getWidth();
          const imgWidth = pageWidth - 28; // 14px margin each side
          const imgHeight = (canvas.height / canvas.width) * imgWidth;
          
          // Check if we need a new page
          if (yPosition + imgHeight > doc.internal.pageSize.getHeight() - 20) {
            doc.addPage();
            yPosition = 20;
          }
          
          doc.addImage(imgData, 'PNG', 14, yPosition, imgWidth, Math.min(imgHeight, 150));
          yPosition += Math.min(imgHeight, 150) + 10;
        } catch (error) {
          console.error('Failed to capture chart:', error);
        }
      }
    }

    // Data table
    if (report.data && report.data.length > 0) {
      // Check if we need a new page
      if (yPosition > doc.internal.pageSize.getHeight() - 60) {
        doc.addPage();
        yPosition = 20;
      }

      const headers = Object.keys(report.data[0]);
      const rows = report.data.map(row => headers.map(h => String(row[h] ?? '')));

      autoTable(doc, {
        head: [headers],
        body: rows,
        startY: yPosition,
        theme: 'grid',
        headStyles: { 
          fillColor: [37, 99, 235],
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        styles: {
          fontSize: 8,
          cellPadding: 3
        },
        alternateRowStyles: {
          fillColor: [245, 247, 250]
        }
      });
    }

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Page ${i} of ${pageCount} | Catalyst Test Management`,
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }

    doc.save(`${filename}.pdf`);
  },

  /**
   * Export report to Excel
   */
  exportToExcel: async (report: ReportData, filename: string) => {
    const wb = XLSX.utils.book_new();

    // Summary sheet
    if (report.summary && Object.keys(report.summary).length > 0) {
      const summaryData = [
        ['Report', report.title],
        ['Generated', report.generatedAt],
        [''],
        ['Metric', 'Value'],
        ...Object.entries(report.summary).map(([key, value]) => [key, String(value)])
      ];
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');
    }

    // Data sheet
    if (report.data && report.data.length > 0) {
      const dataSheet = XLSX.utils.json_to_sheet(report.data);
      XLSX.utils.book_append_sheet(wb, dataSheet, 'Data');
    }

    XLSX.writeFile(wb, `${filename}.xlsx`);
  }
};
