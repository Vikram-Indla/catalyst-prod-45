/**
 * Export Dialog Component
 * TC-401 to TC-425: Evidence export configuration
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Download,
  FileText,
  FileSpreadsheet,
  Archive,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import type { Evidence } from '../types';
import { useEvidenceExport, type ExportFormat, type ExportOptions } from './useEvidenceExport';

interface ExportDialogProps {
  evidence: Evidence[];
  trigger?: React.ReactNode;
  disabled?: boolean;
}

export function ExportDialog({ evidence, trigger, disabled }: ExportDialogProps) {
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<ExportFormat>('csv');
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [includeOcrText, setIncludeOcrText] = useState(true);
  const [includeAiAnalysis, setIncludeAiAnalysis] = useState(true);
  const [includeAnnotations, setIncludeAnnotations] = useState(true);

  const { isExporting, exportProgress, exportEvidence } = useEvidenceExport();

  const handleExport = async () => {
    const options: ExportOptions = {
      format,
      includeMetadata,
      includeOcrText,
      includeAiAnalysis,
      includeAnnotations,
    };

    await exportEvidence(evidence, options);

    if (exportProgress.status === 'complete') {
      setTimeout(() => setOpen(false), 1500);
    }
  };

  const progressPercentage = exportProgress.total > 0 
    ? (exportProgress.current / exportProgress.total) * 100 
    : 0;

  const formatIcons: Record<ExportFormat, React.ReactNode> = {
    csv: <FileSpreadsheet className="h-4 w-4" />,
    pdf: <FileText className="h-4 w-4" />,
    zip: <Archive className="h-4 w-4" />,
  };

  // Count items with OCR/AI data
  const ocrCount = evidence.filter(e => e.ocrText).length;
  const aiCount = evidence.filter(e => e.aiAnalysis?.defects?.length).length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8 text-xs"
            disabled={disabled || evidence.length === 0}
          >
            <Download className="h-3.5 w-3.5 mr-1" />
            Export
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Export Evidence</DialogTitle>
          <DialogDescription>
            Export {evidence.length} evidence item(s) with selected options
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Format selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Export Format</Label>
            <RadioGroup
              value={format}
              onValueChange={(v) => setFormat(v as ExportFormat)}
              className="grid grid-cols-3 gap-2"
            >
              <Label
                htmlFor="csv"
                className={`flex flex-col items-center gap-1.5 p-3 border rounded-lg cursor-pointer transition-colors
                  ${format === 'csv' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}
              >
                <RadioGroupItem value="csv" id="csv" className="sr-only" />
                <FileSpreadsheet className="h-5 w-5" />
                <span className="text-xs font-medium">CSV</span>
                <span className="text-[10px] text-muted-foreground">Metadata</span>
              </Label>
              <Label
                htmlFor="pdf"
                className={`flex flex-col items-center gap-1.5 p-3 border rounded-lg cursor-pointer transition-colors
                  ${format === 'pdf' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}
              >
                <RadioGroupItem value="pdf" id="pdf" className="sr-only" />
                <FileText className="h-5 w-5" />
                <span className="text-xs font-medium">PDF</span>
                <span className="text-[10px] text-muted-foreground">Report</span>
              </Label>
              <Label
                htmlFor="zip"
                className={`flex flex-col items-center gap-1.5 p-3 border rounded-lg cursor-pointer transition-colors
                  ${format === 'zip' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}
              >
                <RadioGroupItem value="zip" id="zip" className="sr-only" />
                <Archive className="h-5 w-5" />
                <span className="text-xs font-medium">Files</span>
                <span className="text-[10px] text-muted-foreground">+CSV</span>
              </Label>
            </RadioGroup>
          </div>

          {/* Include options */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Include in Export</Label>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="metadata"
                    checked={includeMetadata}
                    onCheckedChange={(v) => setIncludeMetadata(v === true)}
                  />
                  <Label htmlFor="metadata" className="text-sm cursor-pointer">
                    File metadata
                  </Label>
                </div>
                <Badge variant="secondary" className="text-[10px]">
                  {evidence.length} items
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="ocr"
                    checked={includeOcrText}
                    onCheckedChange={(v) => setIncludeOcrText(v === true)}
                    disabled={ocrCount === 0}
                  />
                  <Label 
                    htmlFor="ocr" 
                    className={`text-sm cursor-pointer ${ocrCount === 0 ? 'text-muted-foreground' : ''}`}
                  >
                    OCR extracted text
                  </Label>
                </div>
                <Badge variant={ocrCount > 0 ? 'secondary' : 'outline'} className="text-[10px]">
                  {ocrCount} items
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="ai"
                    checked={includeAiAnalysis}
                    onCheckedChange={(v) => setIncludeAiAnalysis(v === true)}
                    disabled={aiCount === 0}
                  />
                  <Label 
                    htmlFor="ai" 
                    className={`text-sm cursor-pointer ${aiCount === 0 ? 'text-muted-foreground' : ''}`}
                  >
                    AI analysis results
                  </Label>
                </div>
                <Badge variant={aiCount > 0 ? 'secondary' : 'outline'} className="text-[10px]">
                  {aiCount} items
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="annotations"
                    checked={includeAnnotations}
                    onCheckedChange={(v) => setIncludeAnnotations(v === true)}
                  />
                  <Label htmlFor="annotations" className="text-sm cursor-pointer">
                    Annotations
                  </Label>
                </div>
              </div>
            </div>
          </div>

          {/* Progress */}
          {exportProgress.status !== 'idle' && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {exportProgress.status === 'complete' ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : exportProgress.status === 'error' ? (
                  <AlertCircle className="h-4 w-4 text-destructive" />
                ) : (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                <span className="text-sm">{exportProgress.message}</span>
              </div>
              <Progress value={progressPercentage} className="h-1.5" />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isExporting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting || evidence.length === 0}
          >
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                {formatIcons[format]}
                <span className="ml-2">Export {format.toUpperCase()}</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
