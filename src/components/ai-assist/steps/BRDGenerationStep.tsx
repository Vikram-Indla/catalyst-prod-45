import React, { useState } from 'react';
import { FileText, Download, FileIcon, Eye, CheckCircle2, AlertTriangle, Loader2, Code } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

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

// Skeleton loader
function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse bg-muted rounded", className)} />;
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
          bgClass: 'bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]'
        };
      case 'final_warn':
        return {
          label: '⚠️ Warning',
          description: 'Includes GAP register due to compliance gaps',
          bgClass: 'bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]'
        };
    }
  };

  const modeConfig = getModeConfig();

  const handleExport = (format: 'pdf' | 'docx' | 'html') => {
    onExport?.(format);
    toast.success(`Exporting as ${format.toUpperCase()}...`);
  };

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
                  <CheckCircle2 className="h-4 w-4 text-[hsl(var(--success))]" />
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
      {/* Quality Metrics Cards - ABOVE preview */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-6 text-center transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
          <div className="text-4xl font-bold text-[hsl(var(--success))] mb-1">{(qualityScore / 10).toFixed(1)}</div>
          <div className="text-sm text-muted-foreground mb-3">Quality Score</div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-[hsl(var(--success))] rounded-full transition-all duration-500" 
              style={{ width: `${qualityScore}%` }} 
            />
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-6 text-center transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
          <div className="text-4xl font-bold text-[hsl(var(--success))] mb-1">{traceabilityScore}%</div>
          <div className="text-sm text-muted-foreground mb-3">Traceability</div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-[hsl(var(--success))] rounded-full transition-all duration-500" 
              style={{ width: `${traceabilityScore}%` }} 
            />
          </div>
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
      <div className="bg-card border border-border rounded-xl overflow-hidden transition-all duration-200 hover:shadow-md">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h4 className="font-semibold flex items-center gap-2">
            <Eye className="h-4 w-4" />
            BRD Preview
          </h4>
          <Button variant="ghost" size="sm" className="transition-all hover:bg-primary/10">
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
                      <AlertTriangle className="h-3 w-3 text-[hsl(var(--warning))]" />
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

      {/* Export Options - BELOW preview with visual cards */}
      <div className="grid grid-cols-3 gap-4">
        <button
          onClick={() => handleExport('pdf')}
          className="bg-card border border-border rounded-xl p-6 text-center cursor-pointer transition-all duration-200 hover:border-primary hover:shadow-md hover:-translate-y-0.5 group"
        >
          <div className="w-12 h-12 mx-auto mb-3 bg-destructive/10 rounded-xl flex items-center justify-center transition-colors group-hover:bg-destructive/20">
            <FileText className="w-6 h-6 text-destructive" />
          </div>
          <div className="font-medium">Export PDF</div>
          <div className="text-xs text-muted-foreground mt-1">Print-ready format</div>
        </button>
        
        <button
          onClick={() => handleExport('docx')}
          className="bg-card border border-border rounded-xl p-6 text-center cursor-pointer transition-all duration-200 hover:border-primary hover:shadow-md hover:-translate-y-0.5 group"
        >
          <div className="w-12 h-12 mx-auto mb-3 bg-primary/10 rounded-xl flex items-center justify-center transition-colors group-hover:bg-primary/20">
            <FileIcon className="w-6 h-6 text-primary" />
          </div>
          <div className="font-medium">Export DOCX</div>
          <div className="text-xs text-muted-foreground mt-1">Editable document</div>
        </button>
        
        <button
          onClick={() => handleExport('html')}
          className="bg-card border border-border rounded-xl p-6 text-center cursor-pointer transition-all duration-200 hover:border-primary hover:shadow-md hover:-translate-y-0.5 group"
        >
          <div className="w-12 h-12 mx-auto mb-3 bg-muted rounded-xl flex items-center justify-center transition-colors group-hover:bg-muted/80">
            <Code className="w-6 h-6 text-muted-foreground" />
          </div>
          <div className="font-medium">Export HTML</div>
          <div className="text-xs text-muted-foreground mt-1">Web format</div>
        </button>
      </div>

      {/* Export checkboxes */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h4 className="font-semibold mb-4">Export Options</h4>
        <div className="space-y-3">
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
