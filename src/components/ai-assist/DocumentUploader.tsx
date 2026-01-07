import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, X, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAIAssistUpload } from '@/hooks/useAIAssistUpload';
import type { AIAssistDocument } from '@/hooks/useAIAssistDocuments';

interface DocumentUploaderProps {
  draftId: string;
  documents: AIAssistDocument[];
  onUploadComplete?: (document: AIAssistDocument) => void;
}

export function DocumentUploader({ draftId, documents, onUploadComplete }: DocumentUploaderProps) {
  const upload = useAIAssistUpload();
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

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
            <p className="text-xs text-muted-foreground">Computing SHA-256 hash...</p>
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
        <div className="border border-[var(--border-subtle)] rounded-lg divide-y divide-[var(--border-subtle)]">
          <div className="px-4 py-2 bg-[var(--bg-2)]">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Uploaded Documents ({documents.length})
            </p>
          </div>
          {documents.map((doc) => (
            <div key={doc.id} className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{doc.file_name}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatFileSize(doc.file_size)}</span>
                    <span>•</span>
                    <span className="font-mono truncate max-w-[120px]" title={doc.file_sha256 || undefined}>
                      SHA: {doc.file_sha256?.slice(0, 8) || '—'}...
                    </span>
                  </div>
                </div>
              </div>
              <span className={cn(
                "text-xs px-2 py-1 rounded flex-shrink-0",
                doc.extraction_status === 'completed' && "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]",
                doc.extraction_status === 'processing' && "bg-[hsl(var(--info))]/10 text-[hsl(var(--info))]",
                doc.extraction_status === 'failed' && "bg-[hsl(var(--danger))]/10 text-[hsl(var(--danger))]",
                (!doc.extraction_status || doc.extraction_status === 'pending') && "bg-muted text-muted-foreground"
              )}>
                {doc.extraction_status === 'completed' && <CheckCircle className="h-3 w-3 mr-1 inline" />}
                {doc.extraction_status || 'pending'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Requirements Info */}
      <div className="bg-[var(--bg-2)] rounded-lg p-4">
        <p className="text-sm font-medium mb-2">Document Requirements</p>
        <ul className="text-xs text-muted-foreground space-y-1">
          <li>• Must contain clear functional requirements</li>
          <li>• Arabic or English language supported</li>
          <li>• Recommended: Include section headings</li>
          <li>• File hash computed for deterministic replay</li>
        </ul>
      </div>
    </div>
  );
}
