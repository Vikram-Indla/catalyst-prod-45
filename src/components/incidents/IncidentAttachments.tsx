import { useRef } from 'react';
import { Paperclip, Upload, Download, Trash2, FileText, Image, File } from '@/lib/atlaskit-icons';
import { Button } from '@/components/ui/button';
import type { Attachment } from '@/types/release';

interface IncidentAttachmentsProps {
  attachments: Attachment[];
  isEditMode: boolean;
  onUpload?: (files: FileList) => void;
  onDelete?: (id: string) => void;
  onDownload?: (attachment: Attachment) => void;
}

const getFileIcon = (name: string) => {
  const ext = name.split('.').pop()?.toLowerCase();
  if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext || '')) {
    return <Image className="w-5 h-5 text-blue-500" />;
  }
  if (['txt', 'log', 'md', 'json'].includes(ext || '')) {
    return <FileText className="w-5 h-5 text-[var(--ds-icon-subtle)]" />;
  }
  return <File className="w-5 h-5 text-[var(--ds-text-subtlest)]" />;
};

export function IncidentAttachments({
  attachments,
  isEditMode,
  onUpload,
  onDelete,
  onDownload,
}: IncidentAttachmentsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files.length > 0 && onUpload) {
      onUpload(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0 && onUpload) {
      onUpload(e.target.files);
    }
  };

  return (
    <div className="bg-white border border-[var(--ds-border)] rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--ds-border)] flex items-center gap-2">
        <Paperclip className="w-4 h-4 text-[var(--ds-text-subtlest)]" />
        <h3 className="text-[11px] font-semibold uppercase text-[var(--ds-text-subtlest)] tracking-wide">
          Attachments
        </h3>
        <span className="text-xs text-[var(--ds-text-subtlest)]">({attachments.length})</span>
      </div>

      <div className="p-4">
        {/* Attachment List */}
        {attachments.length > 0 && (
          <div className="space-y-2 mb-4">
            {attachments.map(attachment => (
              <div 
                key={attachment.id}
                className="flex items-center justify-between p-3 bg-[var(--ds-surface-sunken)] rounded-lg border border-[var(--ds-border)] group hover:border-[var(--ds-text-brand,var(--cp-workstream-catalyst-primary))]"
              >
                <div className="flex items-center gap-3">
                  {getFileIcon(attachment.name)}
                  <div>
                    <p className="text-sm font-medium text-[var(--ds-text,var(--cp-text-primary, var(--cp-text-inverse)))]">{attachment.name}</p>
                    <p className="text-xs text-[var(--ds-text-subtlest)]">
                      {attachment.size} • Uploaded by {attachment.uploadedBy} at {attachment.uploadedAt}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 w-8 p-0"
                    onClick={() => onDownload?.(attachment)}
                  >
                    <Download className="w-4 h-4 text-[var(--ds-text-subtlest)]" />
                  </Button>
                  {isEditMode && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0 hover:text-[var(--ds-text-danger)]"
                      onClick={() => onDelete?.(attachment.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Upload Zone */}
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-[var(--ds-border,var(--cp-lozenge-grey-bg, var(--cp-border-neutral)))] rounded-lg p-6 text-center cursor-pointer hover:border-[var(--ds-text-brand,var(--cp-workstream-catalyst-primary))] hover:bg-[var(--ds-text-brand,var(--cp-workstream-catalyst-primary))]/5 transition-colors"
        >
          <Upload className="w-8 h-8 text-[var(--ds-text-subtlest)] mx-auto mb-2" />
          <p className="text-sm text-[var(--ds-text-subtlest)]">
            Drop files here or <span className="text-[var(--ds-text-brand,var(--cp-workstream-catalyst-primary))] font-medium">click to upload</span>
          </p>
          <p className="text-xs text-[var(--ds-text-subtlest)] mt-1">Max 10MB per file</p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>
    </div>
  );
}
