/**
 * IMPORT RESULTS MODAL
 * Minimal CSV import for execution results
 */

import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, CheckCircle2, AlertCircle, Download } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ScopeType } from '../hooks/useGlobalTestScope';

interface ImportResultsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scopeType: ScopeType;
  scopeId: string | null;
  onSuccess?: () => void;
}

interface ImportRow {
  cycle_key?: string;
  case_title?: string;
  status?: string;
  actual_result?: string;
  comments?: string;
  valid: boolean;
  error?: string;
}

export function ImportResultsModal({
  open,
  onOpenChange,
  scopeType,
  scopeId,
  onSuccess,
}: ImportResultsModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [parsedRows, setParsedRows] = useState<ImportRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(l => l.trim());
      
      if (lines.length < 2) {
        setParsedRows([]);
        toast.error('CSV file must have headers and at least one data row');
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
      const rows: ImportRow[] = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
        const row: ImportRow = { valid: true };

        headers.forEach((header, idx) => {
          const value = values[idx] || '';
          if (header === 'cycle_key' || header === 'cycle') row.cycle_key = value;
          if (header === 'case_title' || header === 'test_case' || header === 'title') row.case_title = value;
          if (header === 'status' || header === 'result') row.status = value.toLowerCase();
          if (header === 'actual_result' || header === 'actual') row.actual_result = value;
          if (header === 'comments' || header === 'notes') row.comments = value;
        });

        // Validate
        if (!row.cycle_key) {
          row.valid = false;
          row.error = 'Missing cycle_key';
        } else if (!row.case_title) {
          row.valid = false;
          row.error = 'Missing case_title';
        } else if (!row.status || !['passed', 'failed', 'blocked', 'not_executed'].includes(row.status)) {
          row.valid = false;
          row.error = 'Invalid status (must be passed, failed, blocked, or not_executed)';
        }

        rows.push(row);
      }

      setParsedRows(rows);
    };
    reader.readAsText(file);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'] },
    maxFiles: 1,
  });

  const importMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');

      const validRows = parsedRows.filter(r => r.valid);
      if (validRows.length === 0) throw new Error('No valid rows to import');

      let successCount = 0;
      let errorCount = 0;

      for (const row of validRows) {
        try {
          // Find cycle
          const { data: cycle } = await supabase
            .from('test_cycles')
            .select('id')
            .eq('key', row.cycle_key)
            .single();

          if (!cycle) {
            errorCount++;
            continue;
          }

          // Find test case
          const { data: testCase } = await supabase
            .from('test_cases')
            .select('id')
            .ilike('title', row.case_title || '')
            .limit(1)
            .single();

          if (!testCase) {
            errorCount++;
            continue;
          }

          // Find execution
          const { data: execution } = await supabase
            .from('test_cycle_executions')
            .select('id')
            .eq('cycle_id', cycle.id)
            .eq('case_id', testCase.id)
            .single();

          if (!execution) {
            errorCount++;
            continue;
          }

          // Update execution
          await supabase
            .from('test_cycle_executions')
            .update({
              status: row.status,
              comments: row.comments || null,
              executed_at: new Date().toISOString(),
              executed_by: user.id,
            })
            .eq('id', execution.id);

          successCount++;
        } catch {
          errorCount++;
        }
      }

      // Log activity
      await supabase.from('test_activity_log').insert({
        user_id: user.id,
        activity_type: 'updated',
        entity_type: 'test_executions',
        entity_id: user.id,
        description: `Imported ${successCount} execution results from CSV`,
      });

      return { successCount, errorCount };
    },
    onSuccess: (result) => {
      toast.success(`Imported ${result.successCount} results (${result.errorCount} errors)`);
      queryClient.invalidateQueries({ queryKey: ['global-test-executions'] });
      onOpenChange(false);
      setParsedRows([]);
      setFileName(null);
      onSuccess?.();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const downloadTemplate = () => {
    const template = 'cycle_key,case_title,status,actual_result,comments\nCYC-001,Login with valid credentials,passed,Logged in successfully,\nCYC-001,Login with invalid password,failed,Error message not displayed,Missing error handling';
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'execution_results_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const validCount = parsedRows.filter(r => r.valid).length;
  const invalidCount = parsedRows.filter(r => !r.valid).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface-1 border-border-default max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-text-primary flex items-center gap-2">
            <Upload className="h-5 w-5 text-accent-primary" />
            Import Execution Results
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Template download */}
          <Alert className="bg-surface-2 border-border-default">
            <FileText className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>Download the CSV template to format your data correctly</span>
              <Button variant="outline" size="sm" onClick={downloadTemplate}>
                <Download className="h-4 w-4 mr-1.5" />
                Template
              </Button>
            </AlertDescription>
          </Alert>

          {/* Dropzone */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive ? 'border-accent-primary bg-accent-subtle/30' : 'border-border-default hover:border-accent-primary/50'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="h-8 w-8 mx-auto text-text-tertiary mb-3" />
            <p className="text-text-primary font-medium">
              {fileName || (isDragActive ? 'Drop the file here' : 'Drop a CSV file or click to browse')}
            </p>
            <p className="text-sm text-text-tertiary mt-1">
              CSV with columns: cycle_key, case_title, status, actual_result, comments
            </p>
          </div>

          {/* Preview */}
          {parsedRows.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-text-primary">Preview</span>
                <Badge variant="secondary" className="text-xs">
                  {validCount} valid
                </Badge>
                {invalidCount > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {invalidCount} invalid
                  </Badge>
                )}
              </div>

              <ScrollArea className="h-[200px] border border-border-default rounded-lg">
                <div className="p-2 space-y-1">
                  {parsedRows.slice(0, 20).map((row, i) => (
                    <div
                      key={i}
                      className={`flex items-center gap-2 p-2 rounded text-sm ${
                        row.valid ? 'bg-surface-2' : 'bg-status-error/10'
                      }`}
                    >
                      {row.valid ? (
                        <CheckCircle2 className="h-4 w-4 text-status-success shrink-0" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-status-error shrink-0" />
                      )}
                      <span className="text-text-tertiary w-16 shrink-0">{row.cycle_key}</span>
                      <span className="flex-1 truncate text-text-primary">{row.case_title}</span>
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          row.status === 'passed' ? 'text-status-success' :
                          row.status === 'failed' ? 'text-status-error' :
                          row.status === 'blocked' ? 'text-status-warning' :
                          'text-text-tertiary'
                        }`}
                      >
                        {row.status || 'N/A'}
                      </Badge>
                      {!row.valid && (
                        <span className="text-xs text-status-error shrink-0">{row.error}</span>
                      )}
                    </div>
                  ))}
                  {parsedRows.length > 20 && (
                    <p className="text-xs text-text-tertiary text-center py-2">
                      ...and {parsedRows.length - 20} more rows
                    </p>
                  )}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              setParsedRows([]);
              setFileName(null);
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={() => importMutation.mutate()}
            disabled={validCount === 0 || importMutation.isPending}
          >
            {importMutation.isPending ? 'Importing...' : `Import ${validCount} Results`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
