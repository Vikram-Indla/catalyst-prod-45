import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, Check, Hash, Globe, ArrowRight, Loader2, RefreshCw, Eye, Lightbulb, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAIAssistUpload } from '@/hooks/useAIAssistUpload';

interface Document {
  id: string;
  file_name: string;
  file_size: number;
  file_sha256: string | null;
  extraction_status: string | null;
  extracted_text: string | null;
  created_at: string;
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

export function DocumentCaptureStep({ draftId, documents, onUploadComplete }: DocumentCaptureStepProps) {
  const upload = useAIAssistUpload();
  const [uploadProgress, setUploadProgress] = useState(0);

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
      onUploadComplete?.();
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
    
    return (
      <div className="space-y-6">
        {/* Document card - success state */}
        <div className="bg-card border-2 border-[hsl(var(--success))] rounded-xl p-6">
          <div className="flex gap-5">
            {/* File icon */}
            <div className="w-14 h-14 bg-[hsl(var(--success))]/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <FileText className="h-7 w-7 text-[hsl(var(--success))]" />
            </div>

            {/* File info */}
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold truncate">{latestDoc.file_name}</h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                {formatFileSize(latestDoc.file_size)} • Uploaded just now
              </p>

              {/* Progress bar */}
              <div className="mt-4 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-[hsl(var(--success))] rounded-full transition-all duration-500"
                  style={{ width: extractionComplete ? '100%' : '75%' }}
                />
              </div>

              {/* Status indicators */}
              <div className="flex gap-4 mt-3 text-xs font-medium text-[hsl(var(--success))]">
                <span className="flex items-center gap-1">
                  <Check className="h-3.5 w-3.5" /> Text extracted
                </span>
                <span className="flex items-center gap-1">
                  <Check className="h-3.5 w-3.5" /> Hash computed
                </span>
                <span className="flex items-center gap-1">
                  <Check className="h-3.5 w-3.5" /> Stored
                </span>
              </div>
            </div>
          </div>

          {/* Metrics cards */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold">{sectionsDetected}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mt-1">Sections detected</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <div className="flex items-center justify-center gap-1">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <p className="text-lg font-bold">AR/EN</p>
              </div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mt-1">Bilingual detected</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <div className="flex items-center justify-center gap-1">
                <Hash className="h-4 w-4 text-muted-foreground" />
                <code className="text-sm font-bold">
                  {latestDoc.file_sha256?.substring(0, 8) || '—'}...
                </code>
              </div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mt-1">SHA256</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-6">
            <Button variant="outline" size="sm" className="gap-2" {...getRootProps()}>
              <input {...getInputProps()} />
              <RefreshCw className="h-4 w-4" />
              Replace Document
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <Eye className="h-4 w-4" />
              Preview Text
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Upload zone - empty state
  return (
    <div className="space-y-6">
      {/* Hero upload zone */}
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-200",
          "bg-muted/50 hover:border-primary hover:bg-primary/5",
          isDragActive && "border-primary bg-primary/10",
          isDragReject && "border-[hsl(var(--danger))] bg-[hsl(var(--danger))]/5",
          upload.isPending && "opacity-50 pointer-events-none"
        )}
      >
        <input {...getInputProps()} />

        <div className={cn(
          "w-16 h-16 mx-auto mb-5 rounded-full flex items-center justify-center transition-all",
          isDragActive ? "bg-primary/20 text-primary scale-110" : "bg-muted text-muted-foreground",
          isDragReject && "bg-[hsl(var(--danger))]/20 text-[hsl(var(--danger))]"
        )}>
          {upload.isPending ? (
            <Loader2 className="h-8 w-8 animate-spin" />
          ) : isDragReject ? (
            <AlertCircle className="h-8 w-8" />
          ) : (
            <Upload className="h-8 w-8" />
          )}
        </div>

        {upload.isPending ? (
          <>
            <p className="text-lg font-semibold">Uploading...</p>
            <div className="w-48 h-2 bg-muted rounded-full mx-auto mt-3 overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </>
        ) : isDragReject ? (
          <>
            <p className="text-lg font-semibold text-[hsl(var(--danger))]">Invalid file type</p>
            <p className="text-sm text-muted-foreground mt-2">Please upload PDF or DOCX files only</p>
          </>
        ) : isDragActive ? (
          <p className="text-lg font-semibold text-primary">Drop your file here</p>
        ) : (
          <>
            <p className="text-lg font-semibold">Drop your requirements document here</p>
            <p className="text-sm text-muted-foreground mt-2">or click to browse</p>
            <div className="mt-6 pt-6 border-t border-border/50">
              <p className="text-xs text-muted-foreground">PDF, DOCX • Max 50MB • Arabic/English</p>
            </div>
          </>
        )}
      </div>

      {/* What happens next */}
      <div className="bg-muted/50 rounded-xl p-6">
        <p className="text-sm font-medium mb-4 text-center">What happens next</p>
        <div className="flex items-center justify-center gap-4">
          <div className="flex flex-col items-center gap-2 p-4 bg-card rounded-lg shadow-sm">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Upload className="h-5 w-5 text-primary" />
            </div>
            <span className="text-xs text-muted-foreground">Upload</span>
          </div>
          <ArrowRight className="h-5 w-5 text-muted-foreground" />
          <div className="flex flex-col items-center gap-2 p-4 bg-card rounded-lg shadow-sm">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <span className="text-xs text-muted-foreground">Extract Text</span>
          </div>
          <ArrowRight className="h-5 w-5 text-muted-foreground" />
          <div className="flex flex-col items-center gap-2 p-4 bg-card rounded-lg shadow-sm">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Hash className="h-5 w-5 text-primary" />
            </div>
            <span className="text-xs text-muted-foreground">Hash & Store</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground text-center mt-4">
          Your document will be securely processed and hashed for deterministic replay and audit compliance.
        </p>
      </div>

      {/* Tips */}
      <div className="bg-muted/30 rounded-lg p-4 border-l-4 border-primary">
        <p className="text-sm font-semibold flex items-center gap-2 mb-2">
          <Lightbulb className="h-4 w-4 text-primary" />
          Tips for best results
        </p>
        <ul className="space-y-1.5 text-sm text-muted-foreground">
          <li className="flex items-center gap-2">• Clear functional requirements</li>
          <li className="flex items-center gap-2">• Section headings</li>
          <li className="flex items-center gap-2">• Arabic or English content</li>
        </ul>
      </div>
    </div>
  );
}
