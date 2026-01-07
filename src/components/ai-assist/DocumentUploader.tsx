import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, Loader2, CheckCircle, AlertCircle, AlertTriangle, ChevronDown, ChevronUp, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAIAssistUpload } from '@/hooks/useAIAssistUpload';
import { formatDistanceToNow } from 'date-fns';
import type { AIAssistDocument } from '@/hooks/useAIAssistDocuments';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface DocumentUploaderProps {
  draftId: string;
  documents: AIAssistDocument[];
  onUploadComplete?: (document: AIAssistDocument) => void;
}

export function DocumentUploader({ draftId, documents, onUploadComplete }: DocumentUploaderProps) {
  const upload = useAIAssistUpload();
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    
    const file = acceptedFiles[0];
    setUploadProgress('Uploading...');
    
    try {
      const result = await upload.mutateAsync({ file, draftId });
      setUploadProgress(null);
      onUploadComplete?.(result.document);
    } catch (error) {
      setUploadProgress(null);
    }
  }, [draftId, upload, onUploadComplete]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
    },
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024, // 50MB
    disabled: upload.isPending,
  });

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatUploadTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return 'just now';
    }
  };

  // Determine document quality based on extracted sections
  const getDocumentQuality = (doc: AIAssistDocument) => {
    // Parse page_hashes to get section count if available
    const pageHashes = doc.page_hashes as { sections?: number; pages?: number } | null;
    const sectionCount = pageHashes?.sections ?? 0;
    const pageCount = pageHashes?.pages ?? 0;
    
    if (sectionCount === 0) return 'warning';
    if (sectionCount <= 5) return 'okay';
    return 'good';
  };

  const getQualityBorderColor = (quality: string) => {
    switch (quality) {
      case 'good': return 'border-[hsl(var(--success))]';
      case 'okay': return 'border-[hsl(var(--info))]';
      case 'warning': return 'border-[hsl(var(--warning))]';
      default: return 'border-border';
    }
  };

  return (
    <div className="space-y-6">
      {/* Drop Zone */}
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-12 text-center transition-colors cursor-pointer",
          isDragActive && !isDragReject && "border-[hsl(var(--info))] bg-[hsl(var(--info))]/5",
          isDragReject && "border-[hsl(var(--danger))] bg-[hsl(var(--danger))]/5",
          !isDragActive && "border-[var(--border-default)] hover:border-[hsl(var(--info))] hover:bg-[hsl(var(--info))]/5",
          upload.isPending && "opacity-50 cursor-not-allowed"
        )}
      >
        <input {...getInputProps()} />
        
        {upload.isPending ? (
          <>
            <Loader2 className="h-12 w-12 mx-auto mb-4 text-[hsl(var(--info))] animate-spin" />
            <p className="text-sm text-muted-foreground mb-2">{uploadProgress || 'Uploading...'}</p>
            <p className="text-xs text-muted-foreground">Verifying document...</p>
          </>
        ) : isDragReject ? (
          <>
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-[hsl(var(--danger))]" />
            <p className="text-sm text-[hsl(var(--danger))] mb-2">Invalid file type</p>
            <p className="text-xs text-muted-foreground">Only PDF and DOCX files are supported</p>
          </>
        ) : isDragActive ? (
          <>
            <Upload className="h-12 w-12 mx-auto mb-4 text-[hsl(var(--info))]" />
            <p className="text-sm text-[hsl(var(--info))] mb-2">Drop your file here</p>
          </>
        ) : (
          <>
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-2">Drop your requirements document here</p>
            <p className="text-xs text-muted-foreground">Supports PDF, DOCX • Max 50MB</p>
          </>
        )}
      </div>

      {/* Uploaded Documents List */}
      {documents.length > 0 && (
        <div className="space-y-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Uploaded Documents ({documents.length})
          </p>
          
          {documents.map((doc) => {
            const quality = getDocumentQuality(doc);
            const pageHashes = doc.page_hashes as { sections?: number; pages?: number; bilingual?: boolean } | null;
            const sectionCount = pageHashes?.sections ?? 0;
            const pageCount = pageHashes?.pages ?? 0;
            const isBilingual = pageHashes?.bilingual ?? false;
            
            return (
              <div key={doc.id} className="space-y-3">
                {/* Main Document Card */}
                <div className={cn(
                  "border-2 rounded-lg p-4 transition-colors",
                  getQualityBorderColor(quality)
                )}>
                  <div className="flex items-start gap-3">
                    <FileText className={cn(
                      "h-8 w-8 flex-shrink-0 mt-0.5",
                      quality === 'good' && "text-[hsl(var(--success))]",
                      quality === 'okay' && "text-[hsl(var(--info))]",
                      quality === 'warning' && "text-[hsl(var(--warning))]"
                    )} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{doc.file_name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {pageCount > 0 && `${pageCount} pages • `}
                        {formatFileSize(doc.file_size)} • Uploaded {formatUploadTime(doc.created_at)}
                      </p>
                      
                      {/* Status Badges */}
                      <div className="flex flex-wrap items-center gap-2 mt-3">
                        {/* Sections Badge */}
                        <div className={cn(
                          "inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-md",
                          quality === 'warning' 
                            ? "bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]"
                            : "bg-muted text-muted-foreground"
                        )}>
                          {quality === 'warning' && <AlertTriangle className="h-3 w-3" />}
                          <span>Sections: {sectionCount}</span>
                        </div>
                        
                        {/* Language Badge */}
                        <div className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground">
                          <span>Language: {isBilingual ? 'Bilingual' : 'Single'}</span>
                        </div>
                        
                        {/* Verification Badge */}
                        {doc.file_sha256 && (
                          <div className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-md bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]">
                            <Shield className="h-3 w-3" />
                            <span>Verified</span>
                          </div>
                        )}
                        
                        {/* Extraction Status */}
                        <div className={cn(
                          "inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-md",
                          doc.extraction_status === 'completed' && "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]",
                          doc.extraction_status === 'processing' && "bg-[hsl(var(--info))]/10 text-[hsl(var(--info))]",
                          doc.extraction_status === 'failed' && "bg-[hsl(var(--danger))]/10 text-[hsl(var(--danger))]",
                          (!doc.extraction_status || doc.extraction_status === 'pending') && "bg-muted text-muted-foreground"
                        )}>
                          {doc.extraction_status === 'completed' && <CheckCircle className="h-3 w-3" />}
                          {doc.extraction_status === 'processing' && <Loader2 className="h-3 w-3 animate-spin" />}
                          {doc.extraction_status === 'failed' && <AlertCircle className="h-3 w-3" />}
                          <span className="capitalize">{doc.extraction_status || 'pending'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Technical Details (Collapsible) */}
                  {doc.file_sha256 && (
                    <Collapsible open={showTechnicalDetails} onOpenChange={setShowTechnicalDetails}>
                      <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mt-3 transition-colors">
                        {showTechnicalDetails ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        Technical details
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-2">
                        <div className="bg-muted/50 rounded p-2 text-xs font-mono text-muted-foreground">
                          <span className="text-muted-foreground/70">SHA-256: </span>
                          <span className="break-all">{doc.file_sha256}</span>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                </div>
                
                {/* Warning Banner for 0 Sections */}
                {quality === 'warning' && (
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-[hsl(var(--warning))]/10 border border-[hsl(var(--warning))]/30">
                    <AlertTriangle className="h-5 w-5 text-[hsl(var(--warning))] flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-[hsl(var(--warning))]">
                        No sections detected
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        This document has no detectable section headings. Analysis results may be limited. 
                        For best results, use documents with clear numbered sections.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Requirements Info */}
      <div className="bg-[var(--bg-2)] rounded-lg p-4">
        <p className="text-sm font-medium mb-2">Document requirements</p>
        <ul className="text-xs text-muted-foreground space-y-1">
          <li>• Must contain clear functional requirements</li>
          <li>• Arabic or English language supported</li>
          <li>• Recommended: Include section headings</li>
          <li>• Documents are verified for integrity</li>
        </ul>
      </div>
    </div>
  );
}
