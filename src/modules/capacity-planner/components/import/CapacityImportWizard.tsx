/**
 * Capacity Import Wizard - Multi-step import with CSV/Markdown support
 */

import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Lozenge } from '@/components/ads';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Upload, AlertCircle, CheckCircle2, ArrowRight, ArrowLeft, RefreshCw } from 'lucide-react';
import { useCapacityImport } from './useCapacityImport';
import { RESOURCE_IMPORT_FIELDS } from './fieldConfig';
import { WIZARD_STEPS, type ImportMode, type ParsedRow, type ImportPreviewRow } from './types';

interface CapacityImportWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CapacityImportWizard({ open, onOpenChange }: CapacityImportWizardProps) {
  const [step, setStep] = useState(1);
  const [mode, setMode] = useState<ImportMode>('update');
  const [rawData, setRawData] = useState('');
  const [selectedFields, setSelectedFields] = useState<string[]>(['name', 'role_name', 'department_id']);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [previewRows, setPreviewRows] = useState<ImportPreviewRow[]>([]);
  const [importComplete, setImportComplete] = useState(false);

  const { parseData, executeImport, loadLookups, isProcessing, progress } = useCapacityImport();

  // Load lookups on open
  useEffect(() => {
    if (open) {
      loadLookups();
    }
  }, [open, loadLookups]);

  // Reset on close
  const handleClose = useCallback(() => {
    setStep(1);
    setMode('update');
    setRawData('');
    setSelectedFields(['name', 'role_name', 'department_id']);
    setHeaders([]);
    setRows([]);
    setPreviewRows([]);
    setImportComplete(false);
    onOpenChange(false);
  }, [onOpenChange]);

  // Parse data when moving to step 2
  const handleParseAndContinue = useCallback(() => {
    if (!rawData.trim()) return;
    
    const result = parseData(rawData, selectedFields);
    setHeaders(result.headers);
    setRows(result.rows);
    setPreviewRows(result.previewRows);
    setStep(2);
  }, [rawData, selectedFields, parseData]);

  // Execute import
  const handleImport = useCallback(async () => {
    const result = await executeImport(rows, headers, selectedFields, mode);
    if (result.success) {
      setImportComplete(true);
      setStep(4);
    }
  }, [rows, headers, selectedFields, mode, executeImport]);

  // Toggle field selection
  const toggleField = (key: string) => {
    setSelectedFields(prev => 
      prev.includes(key) 
        ? prev.filter(f => f !== key)
        : [...prev, key]
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Capacity Import Wizard
          </DialogTitle>
          
          {/* Progress Steps */}
          <div className="flex items-center gap-2 pt-4">
            {WIZARD_STEPS.map((s, idx) => (
              <div key={s.id} className="flex items-center">
                <div className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all',
                  step === s.id && 'bg-primary text-primary-foreground',
                  step > s.id && 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
                  step < s.id && 'bg-muted text-muted-foreground'
                )}>
                  {step > s.id ? <CheckCircle2 className="h-3.5 w-3.5" /> : <span>{s.id}</span>}
                  {s.label}
                </div>
                {idx < WIZARD_STEPS.length - 1 && (
                  <ArrowRight className="h-4 w-4 mx-2 text-muted-foreground" />
                )}
              </div>
            ))}
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          {/* Step 1: Input */}
          {step === 1 && (
            <div className="space-y-6 py-4">
              {/* Mode Selection */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Import Mode</Label>
                <RadioGroup value={mode} onValueChange={(v) => setMode(v as ImportMode)} className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="update" id="update" />
                    <Label htmlFor="update" className="flex items-center gap-2 cursor-pointer">
                      <RefreshCw className="h-4 w-4" />
                      Update Existing
                      <span className="text-xs text-muted-foreground">(Match by name, update fields)</span>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="rewrite" id="rewrite" />
                    <Label htmlFor="rewrite" className="flex items-center gap-2 cursor-pointer text-destructive">
                      <AlertCircle className="h-4 w-4" />
                      Rewrite All
                      <span className="text-xs text-muted-foreground">(Delete all, import fresh)</span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Input Area */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Paste CSV or Markdown Table</Label>
                <div className="flex gap-2 text-xs text-muted-foreground">
                  <Lozenge appearance="default">CSV</Lozenge>
                  <Lozenge appearance="default">Markdown</Lozenge>
                </div>
                <Textarea
                  value={rawData}
                  onChange={(e) => setRawData(e.target.value)}
                  placeholder={`Paste your data here...

CSV Example:
name,role_name,department
John Doe,Developer,Delivery
Jane Smith,Designer,Product

Markdown Example:
| name | role_name | department |
|------|-----------|------------|
| John Doe | Developer | Delivery |
| Jane Smith | Designer | Product |`}
                  className="min-h-[300px] font-mono text-sm"
                />
              </div>
            </div>
          )}

          {/* Step 2: Field Selection */}
          {step === 2 && (
            <div className="space-y-6 py-4">
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm">
                  <strong>Detected {rows.length} rows</strong> with {headers.length} columns.
                  Select which fields to update:
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {RESOURCE_IMPORT_FIELDS.map((field) => (
                  <div
                    key={field.key}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer',
                      selectedFields.includes(field.key)
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-muted-foreground/50'
                    )}
                    onClick={() => toggleField(field.key)}
                  >
                    <Checkbox
                      checked={selectedFields.includes(field.key)}
                      onCheckedChange={() => toggleField(field.key)}
                    />
                    <div className="flex-1">
                      <div className="font-medium text-sm">{field.label}</div>
                      <div className="text-xs text-muted-foreground">{field.dbColumn}</div>
                    </div>
                    {field.required && (
                      <Lozenge appearance="removed">Required</Lozenge>
                    )}
                    {field.lookupTable && (
                      <Lozenge appearance="default">Lookup</Lozenge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Preview */}
          {step === 3 && (
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <strong>{previewRows.filter(r => r.status === 'valid').length}</strong> valid, 
                  <strong className="text-destructive ml-2">{previewRows.filter(r => r.status === 'error').length}</strong> errors
                </div>
                <Lozenge appearance={mode === 'rewrite' ? 'removed' : 'default'}>
                  Mode: {mode === 'rewrite' ? 'Rewrite All' : 'Update'}
                </Lozenge>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium">#</th>
                        {headers.slice(0, 5).map(h => (
                          <th key={h} className="px-3 py-2 text-left text-xs font-medium">{h}</th>
                        ))}
                        <th className="px-3 py-2 text-left text-xs font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.slice(0, 10).map((row, idx) => (
                        <tr key={idx} className={cn(
                          'border-t',
                          row.status === 'error' && 'bg-destructive/5'
                        )}>
                          <td className="px-3 py-2 text-muted-foreground">{idx + 1}</td>
                          {headers.slice(0, 5).map(h => (
                            <td key={h} className="px-3 py-2 truncate max-w-[150px]">
                              {String(row.data[h] || '-')}
                            </td>
                          ))}
                          <td className="px-3 py-2">
                            {row.status === 'valid' ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-destructive" />
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {previewRows.length > 10 && (
                  <div className="px-3 py-2 bg-muted/50 text-xs text-muted-foreground">
                    Showing 10 of {previewRows.length} rows
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 4: Complete */}
          {step === 4 && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              {isProcessing ? (
                <>
                  <RefreshCw className="h-12 w-12 text-primary animate-spin" />
                  <p className="text-lg font-medium">Importing...</p>
                  <Progress value={progress} className="w-64" />
                  <p className="text-sm text-muted-foreground">{progress}% complete</p>
                </>
              ) : importComplete ? (
                <>
                  <CheckCircle2 className="h-12 w-12 text-emerald-500" />
                  <p className="text-lg font-medium">Import Complete!</p>
                  <p className="text-sm text-muted-foreground">
                    {rows.length} resources have been imported. Changes are synced in real-time.
                  </p>
                </>
              ) : null}
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="gap-2">
          {step > 1 && step < 4 && (
            <Button variant="outline" onClick={() => setStep(s => s - 1)} disabled={isProcessing}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          )}
          
          {step === 1 && (
            <Button onClick={handleParseAndContinue} disabled={!rawData.trim()}>
              Continue
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
          
          {step === 2 && (
            <Button onClick={() => setStep(3)} disabled={selectedFields.length === 0}>
              Preview
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
          
          {step === 3 && (
            <Button onClick={handleImport} disabled={isProcessing} variant={mode === 'rewrite' ? 'destructive' : 'default'}>
              {mode === 'rewrite' ? 'Rewrite All' : 'Import'}
            </Button>
          )}
          
          {step === 4 && importComplete && (
            <Button onClick={handleClose}>
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
