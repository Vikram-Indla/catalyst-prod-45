/**
 * Export Buttons Component
 * Provides download ZIP, export CSV, and print functionality
 */

import React, { useState } from 'react';
import { Archive, FileSpreadsheet, Printer, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ExportButtonsProps {
  executionId: string;
  executionName?: string;
}

export const ExportButtons: React.FC<ExportButtonsProps> = ({ 
  executionId, 
  executionName 
}) => {
  const [downloading, setDownloading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const downloadAllEvidence = async () => {
    setDownloading(true);
    try {
      // Dynamically import JSZip
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      // Get all attachments with step order
      const { data: attachments, error } = await supabase
        .from('step_result_attachments')
        .select(`
          id,
          file_name,
          storage_path,
          mime_type,
          step_result_id,
          ai_has_issues,
          annotations
        `)
        .eq('execution_result_id', executionId)
        .is('deleted_at', null);

      if (error) throw error;

      if (!attachments || attachments.length === 0) {
        toast.info('No evidence files to download');
        return;
      }

      // Get step info - use index in the array as order since step_order doesn't exist
      const stepResultIds = [...new Set(attachments.map(a => a.step_result_id))];
      const { data: stepResults } = await supabase
        .from('tm_step_results')
        .select('id, test_step_id')
        .in('id', stepResultIds);

      // Create a map from step result id to index (1-based)
      const stepOrderMap = new Map<string, number>();
      stepResults?.forEach((s: { id: string; test_step_id: string }, idx: number) => {
        stepOrderMap.set(s.id, idx + 1);
      });

      // Download each file and add to ZIP
      let successCount = 0;
      for (const att of attachments) {
        try {
          const stepOrder = stepOrderMap.get(att.step_result_id) || 'unknown';
          const stepFolder = `Step-${stepOrder}`;
          
          const { data: signedUrl } = await supabase.storage
            .from('evidence')
            .createSignedUrl(att.storage_path, 60);

          if (signedUrl?.signedUrl) {
            const response = await fetch(signedUrl.signedUrl);
            if (response.ok) {
              const blob = await response.blob();
              zip.folder(stepFolder)?.file(att.file_name, blob);
              successCount++;
            }
          }
        } catch (err) {
          console.error(`Failed to download ${att.file_name}:`, err);
        }
      }

      // Add manifest
      zip.file('manifest.json', JSON.stringify({
        executionId,
        executionName,
        exportedAt: new Date().toISOString(),
        totalFiles: successCount,
        filesWithAiIssues: attachments.filter(a => a.ai_has_issues).length,
      }, null, 2));

      // Generate and download
      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `evidence-${executionId.slice(0, 8)}.zip`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success(`Downloaded ${successCount} files`);
    } catch (error) {
      console.error('Download failed:', error);
      toast.error('Failed to download evidence');
    } finally {
      setDownloading(false);
    }
  };

  const exportToCSV = async () => {
    setExporting(true);
    try {
      // Get all attachments with metadata
      const { data: attachments, error } = await supabase
        .from('step_result_attachments')
        .select(`
          id,
          file_name,
          file_size,
          mime_type,
          capture_method,
          ai_has_issues,
          ocr_text,
          created_at,
          step_result_id
        `)
        .eq('execution_result_id', executionId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (!attachments || attachments.length === 0) {
        toast.info('No evidence to export');
        return;
      }

      // Get step info - use index in the array as order
      const stepResultIds = [...new Set(attachments.map(a => a.step_result_id))];
      const { data: stepResults } = await supabase
        .from('tm_step_results')
        .select('id, test_step_id')
        .in('id', stepResultIds);

      // Create a map from step result id to index (1-based)
      const stepOrderMap = new Map<string, number>();
      stepResults?.forEach((s: { id: string; test_step_id: string }, idx: number) => {
        stepOrderMap.set(s.id, idx + 1);
      });

      // Build CSV content
      const headers = [
        'Step',
        'File Name',
        'Type',
        'Size (bytes)',
        'Capture Method',
        'AI Issues',
        'OCR Text',
        'Created At',
      ];

      const rows = attachments.map((att) => [
        stepOrderMap.get(att.step_result_id) || '',
        att.file_name,
        att.mime_type,
        att.file_size,
        att.capture_method,
        att.ai_has_issues ? 'Yes' : 'No',
        (att.ocr_text || '').replace(/"/g, '""').slice(0, 200),
        att.created_at,
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map((row) =>
          row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
        ),
      ].join('\n');

      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `evidence-${executionId.slice(0, 8)}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success('CSV exported');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export CSV');
    } finally {
      setExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex items-center gap-2 no-print">
      <Button
        variant="outline"
        size="sm"
        onClick={downloadAllEvidence}
        disabled={downloading}
        className="gap-2"
      >
        {downloading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Archive className="w-4 h-4" />
        )}
        Download ZIP
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={exportToCSV}
        disabled={exporting}
        className="gap-2"
      >
        {exporting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <FileSpreadsheet className="w-4 h-4" />
        )}
        Export CSV
      </Button>
      <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
        <Printer className="w-4 h-4" />
        Print
      </Button>
    </div>
  );
};
