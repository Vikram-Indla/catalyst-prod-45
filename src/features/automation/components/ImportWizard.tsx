/**
 * Module 5A-2: Import Wizard Component
 */

import React, { useState, useCallback, memo } from 'react';
import { Upload, FileText, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useResultImport } from '../hooks/useResultImport';
import { parseResults, detectFormat } from '../utils/resultParser';
import { SOURCE_FORMAT_CONFIG, RESULT_STATUS_CONFIG, type SourceFormat, type ParsedResult } from '../types/import';

interface ImportWizardProps {
  connectorId: string;
  open: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

type WizardStep = 'upload' | 'preview' | 'importing' | 'complete';

export const ImportWizard = memo(function ImportWizard({
  connectorId,
  open,
  onClose,
  onComplete
}: ImportWizardProps) {
  const [step, setStep] = useState<WizardStep>('upload');
  const [sourceFormat, setSourceFormat] = useState<SourceFormat>('junit');
  const [fileName, setFileName] = useState<string>('');
  const [parsedResults, setParsedResults] = useState<ParsedResult[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  
  const { importResults, isImporting, progress } = useResultImport();

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setParseError(null);
    
    // Auto-detect format
    const detected = detectFormat(file.name);
    setSourceFormat(detected);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const results = parseResults(content, detected);
        setParsedResults(results);
        setStep('preview');
      } catch (err) {
        setParseError('Failed to parse file. Please check the format.');
      }
    };
    reader.readAsText(file);
  }, []);

  const handleImport = async () => {
    setStep('importing');
    const result = await importResults(connectorId, parsedResults, fileName, sourceFormat);
    if (result?.success) {
      setStep('complete');
    } else {
      setStep('preview');
    }
  };

  const handleClose = () => {
    setStep('upload');
    setFileName('');
    setParsedResults([]);
    setParseError(null);
    onClose();
    if (step === 'complete') {
      onComplete?.();
    }
  };

  const statusCounts = parsedResults.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Import Automation Results</DialogTitle>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Result Format</Label>
              <Select value={sourceFormat} onValueChange={v => setSourceFormat(v as SourceFormat)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SOURCE_FORMAT_CONFIG).map(([format, config]) => (
                    <SelectItem key={format} value={format}>
                      <span className="flex items-center gap-2">
                        <span>{config.icon}</span>
                        <span>{config.label}</span>
                        <span className="text-muted-foreground text-xs">({config.extension})</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
              <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
              <p className="text-sm text-muted-foreground mb-4">
                Drag & drop your result file or click to browse
              </p>
              <input
                type="file"
                accept=".xml,.json"
                onChange={handleFileSelect}
                className="hidden"
                id="result-file-input"
              />
              <Button asChild variant="outline">
                <label htmlFor="result-file-input" className="cursor-pointer">
                  Select File
                </label>
              </Button>
            </div>

            {parseError && (
              <div className="flex items-center gap-2 text-destructive text-sm">
                <AlertCircle className="w-4 h-4" />
                {parseError}
              </div>
            )}
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <FileText className="w-5 h-5 text-muted-foreground" />
              <div className="flex-1">
                <div className="font-medium text-sm">{fileName}</div>
                <div className="text-xs text-muted-foreground">
                  {parsedResults.length} test results found
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              {Object.entries(statusCounts).map(([status, count]) => (
                <Badge key={status} variant={RESULT_STATUS_CONFIG[status as keyof typeof RESULT_STATUS_CONFIG]?.variant || 'outline'}>
                  {status}: {count}
                </Badge>
              ))}
            </div>

            <ScrollArea className="h-[250px] border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="text-left p-2 font-medium">Test Name</th>
                    <th className="text-left p-2 font-medium">Status</th>
                    <th className="text-right p-2 font-medium">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedResults.slice(0, 50).map((result, idx) => (
                    <tr key={idx} className="border-t border-border">
                      <td className="p-2 truncate max-w-[250px]" title={result.external_test_name}>
                        {result.external_test_name}
                      </td>
                      <td className="p-2">
                        <Badge variant={RESULT_STATUS_CONFIG[result.status]?.variant || 'outline'} className="text-xs">
                          {result.status}
                        </Badge>
                      </td>
                      <td className="p-2 text-right text-muted-foreground">
                        {result.duration_ms ? `${result.duration_ms}ms` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {parsedResults.length > 50 && (
                <div className="p-2 text-center text-xs text-muted-foreground">
                  ...and {parsedResults.length - 50} more
                </div>
              )}
            </ScrollArea>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setStep('upload')}>Back</Button>
              <Button onClick={handleImport}>Import {parsedResults.length} Results</Button>
            </div>
          </div>
        )}

        {step === 'importing' && (
          <div className="py-8 text-center space-y-4">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto" />
            <div className="text-sm text-muted-foreground">Importing results...</div>
            <Progress value={progress} className="w-full" />
          </div>
        )}

        {step === 'complete' && (
          <div className="py-8 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Check className="w-6 h-6 text-primary" />
            </div>
            <div className="font-medium">Import Complete!</div>
            <div className="text-sm text-muted-foreground">
              Successfully imported {parsedResults.length} test results
            </div>
            <Button onClick={handleClose}>Done</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
});
