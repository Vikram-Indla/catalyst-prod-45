import React, { useState } from 'react';
import { FileText, Download, FileIcon, Eye, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

export interface BRDGenerationStepProps {
  draftId?: string;
  runId?: string;
  isGenerating?: boolean;
  progress?: number;
  qualityScore?: number;
  traceabilityScore?: number;
  mode?: 'draft' | 'final' | 'final_warn';
  hasBrd?: boolean;
  brdPreview?: {
    titleAr?: string;
    titleEn?: string;
    sections?: string[];
    frCount?: number;
    nfrCount?: number;
    hasGapRegister?: boolean;
  };
  onExport?: (format: 'pdf' | 'docx' | 'html') => void;
}

export function BRDGenerationStep({
  isGenerating = false,
  progress = 0,
  qualityScore = 87,
  traceabilityScore = 94,
  mode = 'final_warn',
  hasBrd = true,
  brdPreview,
  onExport
}: BRDGenerationStepProps) {
  const [exportOptions, setExportOptions] = useState({
    includeEvidence: true,
    includeCompliance: true,
    arabicOnly: false
  });

  const defaultPreview = {
    titleAr: 'وثيقة متطلبات العمل',
    titleEn: 'Business Requirements Document',
    sections: [
      '1. Executive Summary',
      '2. Scope & Objectives',
      '3. Functional Requirements (23)',
      '4. Non-Functional Requirements (8)',
      '5. DGA/NCA Compliance Matrix',
      '6. GAP Register ⚠️',
      '7. Evidence Appendix'
    ],
    frCount: 23,
    nfrCount: 8,
    hasGapRegister: mode === 'final_warn'
  };

  const preview = brdPreview || defaultPreview;

  const getModeConfig = () => {
    switch (mode) {
      case 'draft':
        return {
          label: 'DRAFT',
          description: 'Working draft for review',
          bgClass: 'bg-muted text-muted-foreground'
        };
      case 'final':
        return {
          label: 'FINAL',
          description: 'Ready for submission',
          bgClass: 'bg-success/10 text-success'
        };
      case 'final_warn':
        return {
          label: 'FINAL_WARN',
          description: 'Includes GAP register due to compliance gaps',
          bgClass: 'bg-warning/10 text-warning'
        };
    }
  };

  const modeConfig = getModeConfig();

  // Generating state
  if (isGenerating) {
    return (
      <div className="space-y-6">
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
            <FileText className="h-8 w-8 text-primary animate-pulse" />
          </div>
          
          <h3 className="text-lg font-semibold mb-2">Generating BRD</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Compiling all requirements into a structured document...
          </p>

          <div className="max-w-md mx-auto mb-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          <div className="mt-6 space-y-2 text-left max-w-md mx-auto">
            {[
              { label: 'Compiling requirements', done: progress > 25 },
              { label: 'Building compliance matrix', done: progress > 50 },
              { label: 'Generating evidence appendix', done: progress > 75 },
              { label: 'Finalizing document', done: progress === 100 }
            ].map((task, idx) => (
              <div key={idx} className="flex items-center gap-3 text-sm">
                {task.done ? (
                  <CheckCircle2 className="h-4 w-4 text-success" />
                ) : progress > idx * 25 ? (
                  <Loader2 className="h-4 w-4 text-primary animate-spin" />
                ) : (
                  <div className="h-4 w-4 rounded-full border-2 border-muted" />
                )}
                <span className={cn(
                  task.done ? 'text-foreground' : 'text-muted-foreground'
                )}>
                  {task.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Empty/Ready state
  if (!hasBrd) {
    return (
      <div className="space-y-6">
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-6">
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
          
          <h3 className="text-lg font-semibold mb-2">Ready to Generate BRD</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
            All requirements have been processed and validated. Generate your Business Requirements Document.
          </p>

          <Button className="gap-2">
            <FileText className="h-4 w-4" />
            Generate BRD
          </Button>
        </div>
      </div>
    );
  }

  // Results state with preview
  return (
    <div className="space-y-6">
      {/* Score Overview */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">Quality Score</span>
            <span className="text-2xl font-bold">{qualityScore}/100</span>
          </div>
          <Progress value={qualityScore} className="h-2" />
          <p className="text-xs text-muted-foreground mt-2">
            Based on completeness, clarity, and consistency
          </p>
        </div>
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">Traceability</span>
            <span className="text-2xl font-bold">{traceabilityScore}/100</span>
          </div>
          <Progress value={traceabilityScore} className="h-2" />
          <p className="text-xs text-muted-foreground mt-2">
            Evidence links to source document
          </p>
        </div>
      </div>

      {/* Mode Indicator */}
      <div className="flex items-center gap-3">
        <Badge className={cn("text-xs", modeConfig.bgClass)}>
          {modeConfig.label}
        </Badge>
        <span className="text-sm text-muted-foreground">{modeConfig.description}</span>
      </div>

      {/* BRD Preview */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h4 className="font-semibold flex items-center gap-2">
            <Eye className="h-4 w-4" />
            BRD Preview
          </h4>
          <Button variant="ghost" size="sm">
            Full Screen Preview
          </Button>
        </div>
        
        <ScrollArea className="h-[320px]">
          <div className="p-6 bg-muted/20">
            <div className="max-w-lg mx-auto bg-card border border-border rounded-lg shadow-lg p-8 text-center">
              <p className="text-lg font-semibold mb-1" dir="rtl">{preview.titleAr}</p>
              <p className="text-sm text-muted-foreground mb-6">{preview.titleEn}</p>
              
              <hr className="my-4" />

              <div className="text-start space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Table of Contents
                </p>
                {preview.sections?.map((section, idx) => (
                  <p key={idx} className="text-sm flex items-center gap-2">
                    {section.includes('⚠️') ? (
                      <AlertTriangle className="h-3 w-3 text-warning" />
                    ) : (
                      <CheckCircle2 className="h-3 w-3 text-muted-foreground" />
                    )}
                    {section.replace('⚠️', '')}
                  </p>
                ))}
              </div>

              <div className="mt-6 pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  {preview.frCount} Functional Requirements • {preview.nfrCount} Non-Functional Requirements
                </p>
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* Export Options */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h4 className="font-semibold mb-4">Export Options</h4>
        
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { format: 'pdf' as const, icon: FileIcon, label: 'PDF', description: 'Portable document' },
            { format: 'docx' as const, icon: FileText, label: 'DOCX', description: 'Editable Word doc' },
            { format: 'html' as const, icon: FileIcon, label: 'HTML', description: 'Web format' }
          ].map((opt) => (
            <button
              key={opt.format}
              onClick={() => onExport?.(opt.format)}
              className="flex flex-col items-center gap-2 p-4 border border-border rounded-xl hover:bg-muted/50 hover:border-primary/50 transition-colors"
            >
              <opt.icon className="h-8 w-8 text-primary" />
              <span className="font-medium text-sm">{opt.label}</span>
              <span className="text-xs text-muted-foreground">{opt.description}</span>
              <Button size="sm" className="mt-2 gap-1">
                <Download className="h-3 w-3" />
                Export
              </Button>
            </button>
          ))}
        </div>

        <div className="space-y-3 pt-4 border-t border-border">
          <div className="flex items-center gap-2">
            <Checkbox
              id="includeEvidence"
              checked={exportOptions.includeEvidence}
              onCheckedChange={(checked) => 
                setExportOptions(prev => ({ ...prev, includeEvidence: !!checked }))
              }
            />
            <Label htmlFor="includeEvidence" className="text-sm cursor-pointer">
              Include evidence appendix
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="includeCompliance"
              checked={exportOptions.includeCompliance}
              onCheckedChange={(checked) => 
                setExportOptions(prev => ({ ...prev, includeCompliance: !!checked }))
              }
            />
            <Label htmlFor="includeCompliance" className="text-sm cursor-pointer">
              Include compliance matrix
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="arabicOnly"
              checked={exportOptions.arabicOnly}
              onCheckedChange={(checked) => 
                setExportOptions(prev => ({ ...prev, arabicOnly: !!checked }))
              }
            />
            <Label htmlFor="arabicOnly" className="text-sm cursor-pointer">
              Arabic only (exclude English)
            </Label>
          </div>
        </div>
      </div>
    </div>
  );
}
