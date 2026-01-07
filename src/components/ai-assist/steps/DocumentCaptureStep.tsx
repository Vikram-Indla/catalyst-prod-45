import React, { useCallback, useState, useMemo, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { 
  Upload, 
  FileText, 
  Check, 
  CheckCircle, 
  Globe, 
  ChevronRight, 
  Loader2, 
  RefreshCw, 
  Eye, 
  Lightbulb, 
  AlertCircle, 
  Lock, 
  Shield, 
  AlertTriangle, 
  ChevronDown,
  Hash,
  Maximize2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { useAIAssistUpload } from '@/hooks/useAIAssistUpload';
import { catalystToast } from '@/lib/catalystToast';
import { formatDistanceToNow, format } from 'date-fns';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { DocumentPreviewModal } from '../DocumentPreviewModal';
import { logAuditEvent } from '@/hooks/useAIAssistDrafts';
import { supabase } from '@/integrations/supabase/client';

interface Document {
  id: string;
  file_name: string;
  file_size: number;
  file_sha256: string | null;
  extraction_status: string | null;
  extracted_text: string | null;
  created_at: string;
  uploaded_by?: string | null;
  // Metadata fields
  primary_language?: string | null;
  bilingual_confidence?: string | null;
  pages_total?: number | null; // DEPRECATED: Use pdf_page_count instead
  ocr_avg_confidence?: number | null;
  ocr_quality_band?: string | null;
  sections_detected_count?: number | null;
  canonical_text_hash?: string | null;
  extraction_warnings?: string[] | null;
  document_version?: number | null;
  // NEW: Authoritative PDF stats (JOB-151)
  pdf_page_count?: number | null;
  pdf_bytes?: number | null;
  pdf_parse_error?: string | null;
  pdf_info_json?: Record<string, unknown> | null;
  // NEW: OCR processing stats (separate from PDF stats)
  ocr_images_processed?: number | null;
  ocr_pages_attempted?: number | null;
  ocr_confidence_min?: number | null;
  ocr_tiling_mode?: string | null;
  ocr_engine?: string | null;
  ocr_completed_at?: string | null;
  // NEW: Pipeline status
  canonical_status?: string | null;
  sectioning_status?: string | null;
  pipeline_error_json?: Record<string, unknown> | null;
}

interface DocumentCaptureStepProps {
  draftId: string;
  documents: Document[];
  onUploadComplete?: () => void;
  onCaptureGateChange?: (gateState: CaptureGateState) => void;
}

export interface CaptureGateState {
  canContinue: boolean;
  isHardWarn: boolean;
  hasReviewedExtraction: boolean;
  hasAcknowledgedWarn: boolean;
  gaps: string[];
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

function formatUploadTimeFull(dateString: string): string {
  try {
    return format(new Date(dateString), "d MMM yyyy, HH:mm 'AST'");
  } catch {
    return 'Unknown';
  }
}

function shortenHash(hash: string | null, length = 8): string {
  if (!hash) return '—';
  return hash.substring(0, length) + '...';
}

export function DocumentCaptureStep({ 
  draftId, 
  documents, 
  onUploadComplete,
  onCaptureGateChange 
}: DocumentCaptureStepProps) {
  const upload = useAIAssistUpload();
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [fullScreenPreview, setFullScreenPreview] = useState(false);
  const [hasReviewedExtraction, setHasReviewedExtraction] = useState(false);
  const [hasAcknowledgedWarn, setHasAcknowledgedWarn] = useState(false);

  const latestDoc = documents[0];
  const hasDocument = !!latestDoc;

  // Compute extraction metadata
  const extractionStatus = latestDoc?.extraction_status;
  const sectionsCount = latestDoc?.sections_detected_count ?? 
    (latestDoc?.extracted_text ? latestDoc.extracted_text.split('\n\n').filter(Boolean).length : 0);
  
  // JOB-151: Use AUTHORITATIVE pdf_page_count, NOT OCR-derived counts
  // Fallback chain: pdf_page_count -> pages_total (legacy) -> "Unknown"
  const pdfPageCount = latestDoc?.pdf_page_count;
  const pagesTotal = pdfPageCount ?? latestDoc?.pages_total ?? null;
  const hasValidPageCount = pagesTotal !== null && pagesTotal >= 1;
  const pdfParseError = latestDoc?.pdf_parse_error;
  
  // OCR stats (separate from PDF page count)
  const ocrImagesProcessed = latestDoc?.ocr_images_processed;
  const ocrPagesAttempted = latestDoc?.ocr_pages_attempted;
  const ocrTilingMode = latestDoc?.ocr_tiling_mode ?? 'none';
  const ocrQualityBand = latestDoc?.ocr_quality_band ?? 'medium';
  const ocrAvgConfidence = latestDoc?.ocr_avg_confidence ?? 0.85;
  const ocrConfidenceMin = latestDoc?.ocr_confidence_min;
  const ocrEngine = latestDoc?.ocr_engine;
  
  // Pipeline status
  const canonicalStatus = latestDoc?.canonical_status ?? 'pending';
  const sectioningStatus = latestDoc?.sectioning_status ?? 'pending';
  
  const primaryLanguage = latestDoc?.primary_language ?? 'ar';
  const bilingualConfidence = latestDoc?.bilingual_confidence ?? 'low';
  const canonicalHash = latestDoc?.canonical_text_hash;
  const fileHash = latestDoc?.file_sha256;
  const documentVersion = latestDoc?.document_version ?? 1;
  const extractionWarnings = latestDoc?.extraction_warnings ?? [];

  // Determine HARD_WARN state
  const isHardWarn = useMemo(() => {
    return (
      sectionsCount === 0 ||
      ocrQualityBand === 'low' ||
      (extractionStatus !== 'completed' && extractionStatus !== 'done')
    );
  }, [sectionsCount, ocrQualityBand, extractionStatus]);

  // Compute gaps for quality mode
  const gaps = useMemo(() => {
    const gapList: string[] = [];
    if (sectionsCount === 0) gapList.push('No sections detected');
    if (ocrQualityBand === 'low') gapList.push('Low OCR confidence');
    if (extractionStatus !== 'completed' && extractionStatus !== 'done') {
      gapList.push('Extraction incomplete/failed');
    }
    return gapList;
  }, [sectionsCount, ocrQualityBand, extractionStatus]);

  // Can continue logic
  const canContinue = useMemo(() => {
    if (!hasDocument) return false;
    if (!isHardWarn) return true;
    // HARD_WARN requires both preview review AND acknowledgment
    return hasReviewedExtraction && hasAcknowledgedWarn;
  }, [hasDocument, isHardWarn, hasReviewedExtraction, hasAcknowledgedWarn]);

  // Notify parent of gate state changes
  useEffect(() => {
    onCaptureGateChange?.({
      canContinue,
      isHardWarn,
      hasReviewedExtraction,
      hasAcknowledgedWarn,
      gaps,
    });
  }, [canContinue, isHardWarn, hasReviewedExtraction, hasAcknowledgedWarn, gaps, onCaptureGateChange]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    // Reset gating state on new upload
    setHasReviewedExtraction(false);
    setHasAcknowledgedWarn(false);

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

  // Handle preview open - fires audit event
  const handleOpenPreview = async () => {
    setPreviewOpen(true);
    if (!hasReviewedExtraction) {
      const { data: userData } = await supabase.auth.getUser();
      await logAuditEvent(draftId, null, 'extraction_reviewed' as any, userData.user?.id, {
        document_id: latestDoc?.id,
        document_version: documentVersion,
      });
    }
  };

  // Handle first view callback from modal
  const handleFirstPreviewView = () => {
    setHasReviewedExtraction(true);
  };

  // Handle acknowledgment checkbox
  const handleAcknowledge = async (checked: boolean) => {
    setHasAcknowledgedWarn(checked);
    if (checked) {
      const { data: userData } = await supabase.auth.getUser();
      await logAuditEvent(draftId, null, 'quality_warn_acknowledged' as any, userData.user?.id, {
        document_id: latestDoc?.id,
        gaps,
      });
    }
  };

  // Determine quality level
  const quality = sectionsCount === 0 ? 'warning' : sectionsCount <= 5 ? 'okay' : 'good';
  const borderColor = quality === 'warning' 
    ? 'border-[hsl(var(--warning))]' 
    : quality === 'okay' 
      ? 'border-[hsl(var(--info))]' 
      : 'border-[hsl(var(--success))]';

  // Get language display text
  const getLanguageDisplay = () => {
    const langNames: Record<string, string> = {
      'ar': 'Arabic (RTL)',
      'en': 'English',
      'mixed': 'Arabic + English'
    };
    
    const primary = langNames[primaryLanguage] || 'Arabic (RTL)';
    
    if (primaryLanguage === 'mixed' || bilingualConfidence === 'high' || bilingualConfidence === 'medium') {
      return {
        primary: 'Primary: Arabic (RTL)',
        secondary: bilingualConfidence === 'high' 
          ? 'Secondary: English' 
          : 'Secondary: Limited (Low confidence)'
      };
    }
    
    return {
      primary: `Primary: ${primary}`,
      secondary: 'Secondary: None'
    };
  };

  const langDisplay = getLanguageDisplay();

  // Show document card if uploaded
  if (hasDocument) {
    const extractionComplete = extractionStatus === 'completed' || extractionStatus === 'done';
    
    return (
      <div className="space-y-4">
        {/* Document card */}
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
                {hasValidPageCount ? `${pagesTotal} pages` : 'Pages: Unknown'} • {formatFileSize(latestDoc.file_size)} • Uploaded {formatUploadTime(latestDoc.created_at)}
              </p>

              {/* Detailed metadata row */}
              <div className="mt-3 p-3 bg-muted/30 rounded-lg text-xs text-muted-foreground space-y-1.5">
                <div className="flex items-center justify-between">
                  <span>Uploaded:</span>
                  <span className="font-medium text-foreground">{formatUploadTimeFull(latestDoc.created_at)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Version:</span>
                  <span className="font-medium text-foreground">v{documentVersion}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Pages:</span>
                  {hasValidPageCount ? (
                    <span className="font-medium text-foreground">{pagesTotal}</span>
                  ) : (
                    <span className="font-medium text-[hsl(var(--warning))] flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Unknown
                      {pdfParseError && <span className="text-muted-foreground">({pdfParseError})</span>}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span>OCR Quality:</span>
                  <span className={cn(
                    "font-medium",
                    ocrQualityBand === 'high' && "text-[hsl(var(--success))]",
                    ocrQualityBand === 'medium' && "text-[hsl(var(--info))]",
                    ocrQualityBand === 'low' && "text-[hsl(var(--warning))]"
                  )}>
                    {ocrQualityBand.charAt(0).toUpperCase() + ocrQualityBand.slice(1)} ({Math.round(ocrAvgConfidence * 100)}%)
                  </span>
                </div>
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

          {/* Metrics cards - Sections, Language, Hashes */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            {/* Card 1: Sections */}
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
                )}>{sectionsCount}</p>
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
            
            {/* Card 2: Language */}
            <div className="bg-muted/50 rounded-lg p-4 text-center transition-all duration-200 hover:bg-muted hover:shadow-sm">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Globe className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground">{langDisplay.primary}</p>
              <p className="text-xs text-muted-foreground/70 mt-0.5">{langDisplay.secondary}</p>
            </div>

            {/* Card 3: Hashes */}
            <div className="bg-muted/50 rounded-lg p-4 transition-all duration-200 hover:bg-muted hover:shadow-sm">
              <div className="flex items-center justify-center gap-1 mb-2">
                <Hash className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">File:</span>
                  <code className="font-mono text-foreground">{shortenHash(fileHash)}</code>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Canonical:</span>
                  {canonicalHash ? (
                    <code className="font-mono text-foreground">{shortenHash(canonicalHash)}</code>
                  ) : (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">Pending</Badge>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Technical Details - Collapsible (JOB-151: OCR stats shown here, NOT as "Pages") */}
          <Collapsible open={showTechnicalDetails} onOpenChange={setShowTechnicalDetails} className="mt-4">
            <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <ChevronDown className={cn(
                "h-3 w-3 transition-transform",
                showTechnicalDetails && "rotate-180"
              )} />
              Technical details
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-2">
              {/* Pipeline Status */}
              <div className="bg-muted/50 rounded p-3 text-xs">
                <span className="text-muted-foreground/70 font-medium">Pipeline Status</span>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Canonical:</span>
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "text-[10px] px-1.5 py-0",
                        canonicalStatus === 'complete' && "border-[hsl(var(--success))]/50 text-[hsl(var(--success))]",
                        canonicalStatus === 'failed' && "border-destructive/50 text-destructive",
                        canonicalStatus === 'running' && "border-primary/50 text-primary"
                      )}
                    >
                      {canonicalStatus === 'complete' ? 'Ready' : canonicalStatus}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Sectioning:</span>
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "text-[10px] px-1.5 py-0",
                        sectioningStatus === 'complete' && "border-[hsl(var(--success))]/50 text-[hsl(var(--success))]",
                        sectioningStatus === 'failed' && "border-destructive/50 text-destructive",
                        sectioningStatus === 'running' && "border-primary/50 text-primary"
                      )}
                    >
                      {sectioningStatus === 'complete' ? 'Done' : sectioningStatus}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* OCR Processing Stats (separate from PDF page count) */}
              {(ocrImagesProcessed !== null || ocrPagesAttempted !== null || ocrTilingMode !== 'none') && (
                <div className="bg-[hsl(var(--info))]/5 border border-[hsl(var(--info))]/20 rounded p-3 text-xs">
                  <span className="text-[hsl(var(--info))] font-medium">OCR Processing</span>
                  <div className="mt-2 space-y-1.5 text-muted-foreground">
                    {ocrImagesProcessed !== null && (
                      <div className="flex items-center justify-between">
                        <span>Images Processed:</span>
                        <span className="font-mono text-foreground">{ocrImagesProcessed}</span>
                      </div>
                    )}
                    {ocrPagesAttempted !== null && (
                      <div className="flex items-center justify-between">
                        <span>Pages Attempted:</span>
                        <span className="font-mono text-foreground">{ocrPagesAttempted}</span>
                      </div>
                    )}
                    {ocrTilingMode && ocrTilingMode !== 'none' && (
                      <div className="flex items-center justify-between">
                        <span>Tiling Mode:</span>
                        <span className="font-mono text-foreground">{ocrTilingMode}</span>
                      </div>
                    )}
                    {ocrConfidenceMin !== null && ocrConfidenceMin !== undefined && (
                      <div className="flex items-center justify-between">
                        <span>Min Confidence:</span>
                        <span className="font-mono text-foreground">{Math.round(ocrConfidenceMin * 100)}%</span>
                      </div>
                    )}
                    {ocrEngine && (
                      <div className="flex items-center justify-between">
                        <span>Engine:</span>
                        <span className="font-mono text-foreground">{ocrEngine}</span>
                      </div>
                    )}
                  </div>
                  {/* Explain discrepancy if OCR images > PDF pages */}
                  {ocrImagesProcessed !== null && hasValidPageCount && ocrImagesProcessed > (pagesTotal ?? 0) && (
                    <p className="mt-2 text-[10px] text-muted-foreground/80 italic">
                      Note: OCR images ({ocrImagesProcessed}) &gt; PDF pages ({pagesTotal}) due to tiling for better text extraction.
                    </p>
                  )}
                </div>
              )}

              {fileHash && (
                <div className="bg-muted/50 rounded p-3 text-xs font-mono text-muted-foreground">
                  <span className="text-muted-foreground/70">File Hash (SHA-256): </span>
                  <span className="break-all">{fileHash}</span>
                </div>
              )}
              {canonicalHash && (
                <div className="bg-muted/50 rounded p-3 text-xs font-mono text-muted-foreground">
                  <span className="text-muted-foreground/70">Canonical Text Hash: </span>
                  <span className="break-all">{canonicalHash}</span>
                </div>
              )}
              {extractionWarnings.length > 0 && (
                <div className="bg-[hsl(var(--warning))]/10 rounded p-3 text-xs">
                  <span className="text-[hsl(var(--warning))] font-medium">Extraction Warnings:</span>
                  <ul className="mt-1 list-disc list-inside text-muted-foreground">
                    {extractionWarnings.map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                </div>
              )}
              {pdfParseError && (
                <div className="bg-destructive/10 rounded p-3 text-xs">
                  <span className="text-destructive font-medium">PDF Parse Error:</span>
                  <p className="mt-1 text-muted-foreground">{pdfParseError}</p>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Actions */}
          <div className="flex gap-3 mt-6">
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2 transition-all hover:border-primary hover:shadow-sm" 
              {...getRootProps()}
            >
              <input {...getInputProps()} />
              <RefreshCw className="h-4 w-4" />
              Replace Document
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2 transition-all hover:border-primary hover:shadow-sm"
              onClick={handleOpenPreview}
            >
              <Eye className="h-4 w-4" />
              Preview Text
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2 transition-all hover:border-primary hover:shadow-sm"
              onClick={() => {
                setFullScreenPreview(true);
                handleOpenPreview();
              }}
            >
              <Maximize2 className="h-4 w-4" />
              Full Screen Preview
            </Button>
          </div>
        </div>

        {/* Warning Banner for 0 Sections or other quality issues */}
        {quality === 'warning' && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-[hsl(var(--warning))]/10 border border-[hsl(var(--warning))]/30">
            <AlertTriangle className="h-5 w-5 text-[hsl(var(--warning))] flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-[hsl(var(--warning))]">
                No structural sections detected
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Downstream analysis quality may be reduced. For best results, use documents with clear numbered sections (e.g., "1.0 Introduction", "2.0 Requirements").
              </p>
            </div>
          </div>
        )}

        {/* HARD_WARN Gating Section */}
        {isHardWarn && (
          <div className="p-4 rounded-xl border border-[hsl(var(--warning))]/50 bg-card space-y-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-[hsl(var(--warning))]" />
              <h4 className="font-semibold text-sm">Quality Review Required</h4>
            </div>
            
            <p className="text-xs text-muted-foreground">
              This document has quality issues that may affect analysis. Before continuing, you must:
            </p>

            <div className="space-y-3">
              {/* Step 1: Review extraction */}
              <div className={cn(
                "flex items-center gap-3 p-3 rounded-lg border",
                hasReviewedExtraction 
                  ? "border-[hsl(var(--success))]/30 bg-[hsl(var(--success))]/5" 
                  : "border-border bg-muted/30"
              )}>
                <div className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                  hasReviewedExtraction 
                    ? "bg-[hsl(var(--success))] text-white" 
                    : "bg-muted text-muted-foreground"
                )}>
                  {hasReviewedExtraction ? <Check className="h-3.5 w-3.5" /> : '1'}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Review extracted text</p>
                  <p className="text-xs text-muted-foreground">Open Preview to verify extraction quality</p>
                </div>
                {!hasReviewedExtraction && (
                  <Button size="sm" variant="outline" onClick={handleOpenPreview} className="shrink-0">
                    Open Preview
                  </Button>
                )}
              </div>

              {/* Step 2: Acknowledge */}
              <div className={cn(
                "flex items-start gap-3 p-3 rounded-lg border",
                hasAcknowledgedWarn 
                  ? "border-[hsl(var(--success))]/30 bg-[hsl(var(--success))]/5" 
                  : "border-border bg-muted/30",
                !hasReviewedExtraction && "opacity-50 pointer-events-none"
              )}>
                <Checkbox 
                  id="acknowledge-warn"
                  checked={hasAcknowledgedWarn}
                  onCheckedChange={handleAcknowledge}
                  disabled={!hasReviewedExtraction}
                  className="mt-0.5"
                />
                <label htmlFor="acknowledge-warn" className="flex-1 cursor-pointer">
                  <p className="text-sm font-medium">Proceed in QUALITY-WARN mode</p>
                  <p className="text-xs text-muted-foreground">
                    I understand gaps will be recorded: {gaps.join(', ')}
                  </p>
                </label>
              </div>
            </div>

            {/* Gap list */}
            {gaps.length > 0 && (
              <div className="mt-3 p-3 rounded bg-[hsl(var(--warning))]/10 border border-[hsl(var(--warning))]/20">
                <p className="text-xs font-medium text-[hsl(var(--warning))] mb-2">Detected Gaps:</p>
                <ul className="space-y-1">
                  {gaps.map((gap, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--warning))]" />
                      {gap}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Preview Modal */}
        <DocumentPreviewModal
          open={previewOpen}
          onClose={() => {
            setPreviewOpen(false);
            setFullScreenPreview(false);
          }}
          extractedText={latestDoc.extracted_text}
          documentName={latestDoc.file_name}
          pageCount={pagesTotal}
          isFullScreen={fullScreenPreview}
          onToggleFullScreen={() => setFullScreenPreview(!fullScreenPreview)}
          onFirstView={handleFirstPreviewView}
        />
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
