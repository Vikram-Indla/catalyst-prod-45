import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, Check, CheckCircle, Globe, ChevronRight, Loader2, RefreshCw, Eye, Lightbulb, AlertCircle, Lock, Shield, AlertTriangle, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useAIAssistUpload } from '@/hooks/useAIAssistUpload';
import { catalystToast } from '@/lib/catalystToast';
import { formatDistanceToNow } from 'date-fns';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface Document {
  id: string;
  file_name: string;
  file_size: number;
  file_sha256: string | null;
  extraction_status: string | null;
  extracted_text: string | null;
  created_at: string;
  page_count?: number;
}

interface DocumentCaptureStepProps {
  draftId: string;
  documents: Document[];
  onUploadComplete?: () => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function formatUploadTime(dateString: string): string {
  try {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  } catch {
    return 'just now';
  }
}

export function DocumentCaptureStep({ draftId, documents, onUploadComplete }: DocumentCaptureStepProps) {
  const upload = useAIAssistUpload();
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  const latestDoc = documents[0];
  const hasDocument = !!latestDoc;

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setUploadProgress(0);
    const interval = setInterval(() => {
      setUploadProgress(prev => Math.min(prev + 10, 90));
    }, 100);

    try {
      await upload.mutateAsync({ draftId, file });
      setUploadProgress(100);
      catalystToast.success('Document Uploaded!', `${file.name} is ready for analysis`);
      onUploadComplete?.();
    } catch (error) {
      catalystToast.error('Upload Failed', 'Please try again with a valid PDF or DOCX file');
    } finally {
      clearInterval(interval);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  }, [draftId, upload, onUploadComplete]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024,
    disabled: upload.isPending,
  });

  // Show document card if uploaded
  if (hasDocument) {
    const extractionComplete = latestDoc.extraction_status === 'completed';
    const sectionsDetected = latestDoc.extracted_text ? latestDoc.extracted_text.split('\n\n').length : 0;
    const pageCount = latestDoc.page_count || Math.ceil(latestDoc.file_size / 50000); // Estimate ~50KB per page
    
    // Determine quality level based on sections
    const quality = sectionsDetected === 0 ? 'warning' : sectionsDetected <= 5 ? 'okay' : 'good';
    const borderColor = quality === 'warning' 
      ? 'border-[hsl(var(--warning))]' 
      : quality === 'okay' 
        ? 'border-[hsl(var(--info))]' 
        : 'border-[hsl(var(--success))]';
    
    return (
      <div className="space-y-4">
        {/* Document card - dynamic state based on quality */}
        <div className={cn(
          "bg-card border-2 rounded-xl p-6 transition-all duration-200 hover:shadow-md",
          borderColor
        )}>
          <div className="flex gap-5">
            {/* File icon */}
            <div className={cn(
              "w-14 h-14 rounded-lg flex items-center justify-center flex-shrink-0",
              quality === 'warning' ? "bg-[hsl(var(--warning))]/10" : "bg-[hsl(var(--success))]/10"
            )}>
              <FileText className={cn(
                "h-7 w-7",
                quality === 'warning' ? "text-[hsl(var(--warning))]" : "text-[hsl(var(--success))]"
              )} />
            </div>

            {/* File info */}
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold truncate">{latestDoc.file_name}</h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                {pageCount} pages • {formatFileSize(latestDoc.file_size)} • Uploaded {formatUploadTime(latestDoc.created_at)}
              </p>

              {/* Progress bar */}
              <div className="mt-4 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    quality === 'warning' ? "bg-[hsl(var(--warning))]" : "bg-[hsl(var(--success))]"
                  )}
                  style={{ width: extractionComplete ? '100%' : '75%' }}
                />
              </div>

              {/* Status indicators */}
              <div className={cn(
                "flex gap-4 mt-3 text-xs font-medium",
                quality === 'warning' ? "text-[hsl(var(--warning))]" : "text-[hsl(var(--success))]"
              )}>
                <span className="flex items-center gap-1">
                  <Check className="h-3.5 w-3.5" /> Text extracted
                </span>
                <span className="flex items-center gap-1">
                  <Shield className="h-3.5 w-3.5" /> Verified
                </span>
                <span className="flex items-center gap-1">
                  <Check className="h-3.5 w-3.5" /> Stored
                </span>
              </div>
            </div>
          </div>

          {/* Metrics cards - only 2 now, SHA256 removed */}
          <div className="grid grid-cols-2 gap-4 mt-6">
            {/* Sections - with warning state */}
            <div className={cn(
              "rounded-lg p-4 text-center transition-all duration-200 hover:shadow-sm",
              quality === 'warning' 
                ? "bg-[hsl(var(--warning))]/10 border border-[hsl(var(--warning))]/30" 
                : "bg-muted/50 hover:bg-muted"
            )}>
              <div className="flex items-center justify-center gap-2">
                {quality === 'warning' && (
                  <AlertTriangle className="h-5 w-5 text-[hsl(var(--warning))]" />
                )}
                <p className={cn(
                  "text-2xl font-bold",
                  quality === 'warning' && "text-[hsl(var(--warning))]"
                )}>{sectionsDetected}</p>
              </div>
              <p className={cn(
                "text-xs mt-1",
                quality === 'warning' 
                  ? "text-[hsl(var(--warning))]" 
                  : "text-muted-foreground"
              )}>
                Sections
              </p>
              {quality === 'warning' && (
                <p className="text-xs text-[hsl(var(--warning))]/80 mt-1">
                  May affect analysis quality
                </p>
              )}
            </div>
            
            {/* Language */}
            <div className="bg-muted/50 rounded-lg p-4 text-center transition-all duration-200 hover:bg-muted hover:shadow-sm">
              <div className="flex items-center justify-center gap-1">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <p className="text-lg font-bold">AR/EN</p>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Language</p>
            </div>
          </div>

          {/* Technical Details - Collapsible */}
          {latestDoc.file_sha256 && (
            <Collapsible open={showTechnicalDetails} onOpenChange={setShowTechnicalDetails} className="mt-4">
              <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <ChevronDown className={cn(
                  "h-3 w-3 transition-transform",
                  showTechnicalDetails && "rotate-180"
                )} />
                Technical details
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <div className="bg-muted/50 rounded p-3 text-xs font-mono text-muted-foreground">
                  <span className="text-muted-foreground/70">SHA-256: </span>
                  <span className="break-all">{latestDoc.file_sha256}</span>
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Actions */}
          <div className="flex gap-3 mt-6">
            <Button variant="outline" size="sm" className="gap-2 transition-all hover:border-primary hover:shadow-sm" {...getRootProps()}>
              <input {...getInputProps()} />
              <RefreshCw className="h-4 w-4" />
              Replace Document
            </Button>
            <Button variant="outline" size="sm" className="gap-2 transition-all hover:border-primary hover:shadow-sm">
              <Eye className="h-4 w-4" />
              Preview Text
            </Button>
          </div>
        </div>

        {/* Warning Banner for 0 Sections */}
        {quality === 'warning' && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-[hsl(var(--warning))]/10 border border-[hsl(var(--warning))]/30">
            <AlertTriangle className="h-5 w-5 text-[hsl(var(--warning))] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-[hsl(var(--warning))]">
                No sections detected
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                This document has no detectable section headings. Analysis results may be limited. 
                For best results, use documents with clear numbered sections (e.g., "1.0 Introduction", "2.0 Requirements").
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Upload zone - empty state with HERO styling
  return (
    <div className="space-y-5">
      {/* Hero upload zone with animated gradient border on hover */}
      <div className="relative group cursor-pointer" {...getRootProps()}>
        {/* Animated gradient border on hover */}
        <div className="absolute -inset-0.5 bg-gradient-to-r from-primary via-[hsl(var(--success))] to-primary rounded-2xl opacity-0 group-hover:opacity-100 blur transition-all duration-500" />
        
        <div className={cn(
          "relative bg-gradient-to-br from-card to-primary/5 border-2 border-dashed rounded-2xl py-8 px-10 text-center transition-all duration-300",
          "border-muted-foreground/40 group-hover:border-primary group-hover:shadow-xl group-hover:shadow-primary/10",
          isDragActive && "border-primary bg-primary/10 border-solid shadow-xl shadow-primary/20",
          isDragReject && "border-[hsl(var(--danger))] bg-[hsl(var(--danger))]/5",
          upload.isPending && "opacity-50 pointer-events-none"
        )}>
          <input {...getInputProps()} />

          {/* Large animated icon */}
          <div className={cn(
            "w-14 h-14 mx-auto mb-4 rounded-xl flex items-center justify-center transition-all duration-300",
            isDragActive ? "bg-primary/20 scale-110" : "bg-primary/10 group-hover:scale-110 group-hover:shadow-lg",
            isDragReject && "bg-[hsl(var(--danger))]/20"
          )}>
            {upload.isPending ? (
              <Loader2 className="h-10 w-10 text-primary animate-spin" />
            ) : isDragReject ? (
              <AlertCircle className="h-10 w-10 text-[hsl(var(--danger))]" />
            ) : (
              <Upload className="h-10 w-10 text-primary group-hover:animate-bounce" />
            )}
          </div>

          {upload.isPending ? (
            <>
              <h3 className="text-xl font-semibold text-foreground mb-2">Uploading...</h3>
              <div className="w-48 h-2 bg-muted rounded-full mx-auto mt-3 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-[hsl(var(--success))] rounded-full transition-all"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </>
          ) : isDragReject ? (
            <>
              <h3 className="text-xl font-semibold text-[hsl(var(--danger))] mb-2">Invalid file type</h3>
              <p className="text-muted-foreground">Please upload PDF or DOCX files only</p>
            </>
          ) : isDragActive ? (
            <h3 className="text-xl font-semibold text-primary">Drop your file here</h3>
          ) : (
            <>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Drop your requirements document here
              </h3>
              <p className="text-muted-foreground mb-1">or click to browse</p>
              
              {/* File type badges */}
              <div className="flex items-center justify-center gap-2 mt-3">
                <Badge variant="secondary" className="text-xs font-medium">PDF</Badge>
                <Badge variant="secondary" className="text-xs font-medium">DOCX</Badge>
                <span className="text-muted-foreground/60">•</span>
                <span className="text-xs text-muted-foreground">Max 50MB</span>
                <span className="text-muted-foreground/60">•</span>
                <span className="text-xs text-muted-foreground">Arabic/English</span>
              </div>

              {/* Tips inside upload zone */}
              <div className="mt-5 pt-4 border-t border-dashed border-border/50">
                <p className="text-xs text-muted-foreground/70 mb-2 flex items-center justify-center gap-1.5">
                  <Lightbulb className="w-3.5 h-3.5" />
                  Best results with:
                </p>
                <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-[hsl(var(--success))]" />
                    Numbered sections
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-[hsl(var(--success))]" />
                    Section headings
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-[hsl(var(--success))]" />
                    Bilingual support
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* What happens next - PROMINENT */}
      <div className="mt-5 p-4 bg-gradient-to-r from-muted/50 to-primary/5 rounded-xl border border-border">
        <h4 className="text-sm font-semibold text-muted-foreground tracking-wide mb-3 text-center">
          What happens next
        </h4>
        
        <div className="flex items-center justify-center gap-4">
          {/* Step 1 */}
          <div className="flex flex-col items-center gap-2 p-4 bg-card rounded-xl shadow-sm border border-border w-28 transition-all hover:shadow-md hover:-translate-y-0.5">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
              <Upload className="w-6 h-6 text-primary" />
            </div>
            <span className="text-xs font-medium text-foreground">Upload</span>
          </div>
          
          {/* Arrow */}
          <div className="flex items-center text-primary/60">
            <div className="w-8 h-0.5 bg-primary/40" />
            <ChevronRight className="w-5 h-5 -ml-1" />
          </div>
          
          {/* Step 2 */}
          <div className="flex flex-col items-center gap-2 p-4 bg-card rounded-xl shadow-sm border border-border w-28 transition-all hover:shadow-md hover:-translate-y-0.5">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-primary" />
            </div>
            <span className="text-xs font-medium text-foreground">Extract</span>
          </div>
          
          {/* Arrow */}
          <div className="flex items-center text-primary/60">
            <div className="w-8 h-0.5 bg-primary/40" />
            <ChevronRight className="w-5 h-5 -ml-1" />
          </div>
          
          {/* Step 3 */}
          <div className="flex flex-col items-center gap-2 p-4 bg-card rounded-xl shadow-sm border border-border w-28 transition-all hover:shadow-md hover:-translate-y-0.5">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
              <Lock className="w-6 h-6 text-primary" />
            </div>
            <span className="text-xs font-medium text-foreground">Hash & Store</span>
          </div>
        </div>
      </div>

    </div>
  );
}
