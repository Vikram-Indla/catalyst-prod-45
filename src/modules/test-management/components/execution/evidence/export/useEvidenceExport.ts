/**
 * Evidence Export Hook
 * TC-401 to TC-425: Export evidence as ZIP/PDF
 */

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import type { Evidence } from '../types';

export type ExportFormat = 'zip' | 'pdf' | 'csv';

export interface ExportOptions {
  format: ExportFormat;
  includeMetadata: boolean;
  includeOcrText: boolean;
  includeAiAnalysis: boolean;
  includeAnnotations: boolean;
}

export interface ExportProgress {
  status: 'idle' | 'preparing' | 'downloading' | 'complete' | 'error';
  current: number;
  total: number;
  message: string;
}

const DEFAULT_OPTIONS: ExportOptions = {
  format: 'zip',
  includeMetadata: true,
  includeOcrText: true,
  includeAiAnalysis: true,
  includeAnnotations: true,
};

export function useEvidenceExport() {
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<ExportProgress>({
    status: 'idle',
    current: 0,
    total: 0,
    message: '',
  });

  /**
   * Generate CSV export of evidence metadata
   */
  const exportToCSV = useCallback(async (
    evidence: Evidence[],
    options: ExportOptions
  ): Promise<void> => {
    setExportProgress({
      status: 'preparing',
      current: 0,
      total: evidence.length,
      message: 'Preparing CSV export...',
    });

    try {
      // Build CSV headers
      const headers = [
        'ID',
        'File Name',
        'File Type',
        'File Size (bytes)',
        'Capture Method',
        'Dimensions',
        'Created At',
        'Uploaded By',
      ];

      if (options.includeOcrText) {
        headers.push('OCR Text', 'OCR Confidence');
      }

      if (options.includeAiAnalysis) {
        headers.push('AI Defects Count', 'AI Summary');
      }

      // Build CSV rows
      const rows = evidence.map(e => {
        const row = [
          e.id,
          e.fileName,
          e.fileType,
          e.fileSize.toString(),
          e.captureMethod,
          e.width && e.height ? `${e.width}x${e.height}` : '',
          format(e.createdAt, 'yyyy-MM-dd HH:mm:ss'),
          e.uploadedBy,
        ];

        if (options.includeOcrText) {
          row.push(
            e.ocrText?.replace(/"/g, '""') || '',
            e.ocrConfidence?.toFixed(2) || ''
          );
        }

        if (options.includeAiAnalysis) {
          row.push(
            e.aiAnalysis?.defects?.length?.toString() || '0',
            e.aiAnalysis?.summary?.replace(/"/g, '""') || ''
          );
        }

        return row;
      });

      // Build CSV content
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
      ].join('\n');

      // Download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `evidence-export-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setExportProgress({
        status: 'complete',
        current: evidence.length,
        total: evidence.length,
        message: 'Export complete!',
      });

      toast.success(`Exported ${evidence.length} items to CSV`);
    } catch (error) {
      console.error('CSV export failed:', error);
      setExportProgress({
        status: 'error',
        current: 0,
        total: evidence.length,
        message: 'Export failed',
      });
      toast.error('Failed to export evidence');
    }
  }, []);

  /**
   * Export evidence with files (ZIP-like - individual downloads for now)
   */
  const exportWithFiles = useCallback(async (
    evidence: Evidence[],
    options: ExportOptions
  ): Promise<void> => {
    setExportProgress({
      status: 'preparing',
      current: 0,
      total: evidence.length,
      message: 'Preparing download...',
    });

    try {
      // First, export metadata as CSV
      await exportToCSV(evidence, options);

      // Then download files individually
      setExportProgress({
        status: 'downloading',
        current: 0,
        total: evidence.length,
        message: 'Downloading files...',
      });

      for (let i = 0; i < evidence.length; i++) {
        const item = evidence[i];
        
        if (item.url) {
          const link = document.createElement('a');
          link.href = item.url;
          link.download = item.fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          // Delay between downloads
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        setExportProgress({
          status: 'downloading',
          current: i + 1,
          total: evidence.length,
          message: `Downloaded ${i + 1} of ${evidence.length}`,
        });
      }

      setExportProgress({
        status: 'complete',
        current: evidence.length,
        total: evidence.length,
        message: 'All files downloaded!',
      });

      toast.success(`Downloaded ${evidence.length} files`);
    } catch (error) {
      console.error('File export failed:', error);
      setExportProgress({
        status: 'error',
        current: 0,
        total: evidence.length,
        message: 'Export failed',
      });
      toast.error('Failed to download some files');
    }
  }, [exportToCSV]);

  /**
   * Generate PDF report of evidence
   */
  const exportToPDF = useCallback(async (
    evidence: Evidence[],
    options: ExportOptions
  ): Promise<void> => {
    setExportProgress({
      status: 'preparing',
      current: 0,
      total: evidence.length,
      message: 'Generating PDF report...',
    });

    try {
      // Dynamic import of jspdf
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Title
      doc.setFontSize(18);
      doc.text('Evidence Export Report', pageWidth / 2, 20, { align: 'center' });
      
      doc.setFontSize(10);
      doc.text(`Generated: ${format(new Date(), 'PPpp')}`, pageWidth / 2, 28, { align: 'center' });
      doc.text(`Total Items: ${evidence.length}`, pageWidth / 2, 34, { align: 'center' });

      // Summary table
      const tableData = evidence.map(e => [
        e.fileName.length > 30 ? e.fileName.slice(0, 27) + '...' : e.fileName,
        e.fileType,
        `${(e.fileSize / 1024).toFixed(1)} KB`,
        e.captureMethod.replace('_', ' '),
        format(e.createdAt, 'MMM d, HH:mm'),
        options.includeOcrText && e.ocrText ? 'Yes' : '-',
        options.includeAiAnalysis && e.aiAnalysis?.defects?.length ? `${e.aiAnalysis.defects.length}` : '-',
      ]);

      // Use autoTable
      autoTable(doc, {
        head: [['File Name', 'Type', 'Size', 'Capture', 'Date', 'OCR', 'Defects']],
        body: tableData,
        startY: 42,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [59, 130, 246] },
        alternateRowStyles: { fillColor: [245, 247, 250] },
      });

      // Add detailed sections for each evidence item if OCR/AI is included
      if (options.includeOcrText || options.includeAiAnalysis) {
        let yPosition = (doc as any).lastAutoTable?.finalY + 15 || 120;

        for (let i = 0; i < Math.min(evidence.length, 10); i++) {
          const item = evidence[i];
          
          // Check if we need a new page
          if (yPosition > 260) {
            doc.addPage();
            yPosition = 20;
          }

          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.text(`${i + 1}. ${item.fileName}`, 14, yPosition);
          yPosition += 6;

          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');

          if (options.includeOcrText && item.ocrText) {
            doc.text('OCR Text:', 14, yPosition);
            yPosition += 4;
            const ocrLines = doc.splitTextToSize(item.ocrText.slice(0, 500), pageWidth - 28);
            doc.text(ocrLines, 14, yPosition);
            yPosition += ocrLines.length * 4 + 4;
          }

          if (options.includeAiAnalysis && item.aiAnalysis?.defects?.length) {
            doc.text(`AI Detected Defects (${item.aiAnalysis.defects.length}):`, 14, yPosition);
            yPosition += 4;
            
            item.aiAnalysis.defects.slice(0, 3).forEach(defect => {
              doc.text(`• [${defect.severity.toUpperCase()}] ${defect.title}`, 18, yPosition);
              yPosition += 4;
            });
            yPosition += 4;
          }

          yPosition += 6;

          setExportProgress({
            status: 'preparing',
            current: i + 1,
            total: evidence.length,
            message: `Processing ${i + 1} of ${evidence.length}...`,
          });
        }

        if (evidence.length > 10) {
          doc.setFontSize(9);
          doc.setFont('helvetica', 'italic');
          doc.text(`... and ${evidence.length - 10} more items (see CSV for full details)`, 14, yPosition);
        }
      }

      // Save PDF
      doc.save(`evidence-report-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.pdf`);

      setExportProgress({
        status: 'complete',
        current: evidence.length,
        total: evidence.length,
        message: 'PDF report generated!',
      });

      toast.success('PDF report generated');
    } catch (error) {
      console.error('PDF export failed:', error);
      setExportProgress({
        status: 'error',
        current: 0,
        total: evidence.length,
        message: 'PDF generation failed',
      });
      toast.error('Failed to generate PDF report');
    }
  }, []);

  /**
   * Main export function
   */
  const exportEvidence = useCallback(async (
    evidence: Evidence[],
    options: Partial<ExportOptions> = {}
  ): Promise<void> => {
    if (evidence.length === 0) {
      toast.error('No evidence to export');
      return;
    }

    const mergedOptions: ExportOptions = { ...DEFAULT_OPTIONS, ...options };
    setIsExporting(true);

    try {
      switch (mergedOptions.format) {
        case 'csv':
          await exportToCSV(evidence, mergedOptions);
          break;
        case 'pdf':
          await exportToPDF(evidence, mergedOptions);
          break;
        case 'zip':
        default:
          await exportWithFiles(evidence, mergedOptions);
          break;
      }
    } finally {
      setIsExporting(false);
      // Reset progress after delay
      setTimeout(() => {
        setExportProgress({
          status: 'idle',
          current: 0,
          total: 0,
          message: '',
        });
      }, 3000);
    }
  }, [exportToCSV, exportToPDF, exportWithFiles]);

  return {
    isExporting,
    exportProgress,
    exportEvidence,
    exportToCSV,
    exportToPDF,
    exportWithFiles,
  };
}
