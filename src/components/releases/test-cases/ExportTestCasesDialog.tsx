/**
 * Export Test Cases Dialog — Multi-format export with options
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download,
  FileSpreadsheet,
  FileJson,
  FileText,
  File,
  CheckCircle2,
  Loader2,
  Settings2,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { TestCase } from '@/types/test-cases';
import { exportTestCases, type ExportFormat } from './utils/exportTestCases';

interface ExportTestCasesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount?: number;
  totalCount?: number;
  testCases?: TestCase[];
  selectedIds?: Set<string>;
}

type ExportScope = 'selected' | 'filtered' | 'all';

interface FormatOption {
  value: ExportFormat;
  label: string;
  icon: React.ElementType;
  description: string;
  disabled?: boolean;
}

const formatOptions: FormatOption[] = [
  { value: 'xlsx', label: 'Excel (.xlsx)', icon: FileSpreadsheet, description: 'Best for data analysis and editing' },
  { value: 'csv', label: 'CSV (.csv)', icon: FileText, description: 'Universal format, compatible with most tools' },
  { value: 'json', label: 'JSON (.json)', icon: FileJson, description: 'For import into other systems' },
];

const fieldOptions = [
  { id: 'id', label: 'Test Case ID', required: true },
  { id: 'title', label: 'Title', required: true },
  { id: 'description', label: 'Description' },
  { id: 'type', label: 'Type' },
  { id: 'priority', label: 'Priority' },
  { id: 'status', label: 'Status' },
  { id: 'assignee', label: 'Assignee' },
  { id: 'folder', label: 'Folder' },
  { id: 'tags', label: 'Tags' },
  { id: 'steps', label: 'Test Steps' },
  { id: 'preconditions', label: 'Preconditions' },
  { id: 'lastRun', label: 'Last Run Status' },
  { id: 'createdAt', label: 'Created Date' },
  { id: 'updatedAt', label: 'Updated Date' },
];

export function ExportTestCasesDialog({ 
  open, 
  onOpenChange, 
  selectedCount = 0,
  totalCount = 0,
  testCases = [],
  selectedIds = new Set(),
}: ExportTestCasesDialogProps) {
  const [format, setFormat] = useState<ExportFormat>('xlsx');
  const [scope, setScope] = useState<ExportScope>(selectedCount > 0 ? 'selected' : 'all');
  const [selectedFields, setSelectedFields] = useState<Set<string>>(
    new Set(fieldOptions.map(f => f.id))
  );
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const toggleField = (fieldId: string) => {
    const field = fieldOptions.find(f => f.id === fieldId);
    if (field?.required) return;
    
    const newFields = new Set(selectedFields);
    if (newFields.has(fieldId)) {
      newFields.delete(fieldId);
    } else {
      newFields.add(fieldId);
    }
    setSelectedFields(newFields);
  };

  const getTestCasesToExport = () => {
    switch (scope) {
      case 'selected':
        return testCases.filter(tc => selectedIds.has(tc.id));
      case 'filtered':
      case 'all':
        return testCases;
      default:
        return [];
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    setExportProgress(0);

    try {
      // Show progress
      for (let i = 0; i <= 50; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 50));
        setExportProgress(i);
      }

      const casesToExport = getTestCasesToExport();
      const fields = Array.from(selectedFields);

      // Perform export
      exportTestCases(casesToExport, {
        format,
        selectedFields: fields,
      });

      for (let i = 50; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 50));
        setExportProgress(i);
      }

      const count = casesToExport.length;
      toast.success(`Exported ${count} test cases as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
      setExportProgress(0);
      onOpenChange(false);
    }
  };

  const getExportCount = () => {
    switch (scope) {
      case 'selected': return selectedCount;
      case 'filtered': return totalCount;
      case 'all': return totalCount;
      default: return 0;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Export Test Cases
          </DialogTitle>
          <DialogDescription>
            Choose format and options for your export
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Export Scope */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Export Scope</Label>
            <RadioGroup value={scope} onValueChange={(v) => setScope(v as ExportScope)}>
              <div className="grid grid-cols-3 gap-3">
                <label
                  className={cn(
                    "flex flex-col items-center gap-1 p-3 rounded-lg border cursor-pointer transition-all",
                    scope === 'selected' 
                      ? "border-primary bg-primary/5" 
                      : "border-border hover:border-primary/50",
                    selectedCount === 0 && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <RadioGroupItem value="selected" disabled={selectedCount === 0} className="sr-only" />
                  <span className="text-lg font-semibold">{selectedCount}</span>
                  <span className="text-xs text-muted-foreground">Selected</span>
                </label>
                <label
                  className={cn(
                    "flex flex-col items-center gap-1 p-3 rounded-lg border cursor-pointer transition-all",
                    scope === 'filtered' 
                      ? "border-primary bg-primary/5" 
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <RadioGroupItem value="filtered" className="sr-only" />
                  <span className="text-lg font-semibold">{totalCount}</span>
                  <span className="text-xs text-muted-foreground">Filtered</span>
                </label>
                <label
                  className={cn(
                    "flex flex-col items-center gap-1 p-3 rounded-lg border cursor-pointer transition-all",
                    scope === 'all' 
                      ? "border-primary bg-primary/5" 
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <RadioGroupItem value="all" className="sr-only" />
                  <span className="text-lg font-semibold">{totalCount}</span>
                  <span className="text-xs text-muted-foreground">All</span>
                </label>
              </div>
            </RadioGroup>
          </div>

          {/* Format Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Export Format</Label>
            <div className="grid grid-cols-2 gap-3">
              {formatOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.value}
                    onClick={() => setFormat(option.value)}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-lg border text-left transition-all",
                      format === option.value 
                        ? "border-primary bg-primary/5" 
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <Icon className={cn(
                      "w-5 h-5 mt-0.5 flex-shrink-0",
                      format === option.value ? "text-primary" : "text-muted-foreground"
                    )} />
                    <div className="min-w-0">
                      <div className="font-medium text-sm">{option.label}</div>
                      <div className="text-xs text-muted-foreground">{option.description}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Advanced Options */}
          <div className="space-y-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="h-auto p-0 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              <Settings2 className="w-4 h-4 mr-1.5" />
              {showAdvanced ? 'Hide' : 'Show'} field options
            </Button>

            <AnimatePresence>
              {showAdvanced && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-2 gap-2 p-3 bg-muted/50 rounded-lg">
                    {fieldOptions.map((field) => (
                      <div key={field.id} className="flex items-center gap-2">
                        <Checkbox
                          id={field.id}
                          checked={selectedFields.has(field.id)}
                          onCheckedChange={() => toggleField(field.id)}
                          disabled={field.required}
                        />
                        <label
                          htmlFor={field.id}
                          className={cn(
                            "text-sm cursor-pointer",
                            field.required && "text-muted-foreground"
                          )}
                        >
                          {field.label}
                          {field.required && <span className="text-xs ml-1">(required)</span>}
                        </label>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Export Progress */}
          <AnimatePresence>
            {isExporting && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-2"
              >
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Exporting...</span>
                  <span className="font-medium">{exportProgress}%</span>
                </div>
                <Progress value={exportProgress} className="h-2" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isExporting}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isExporting || getExportCount() === 0}>
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Export {getExportCount()} Test Cases
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
