import { useRef } from 'react';
import { Paperclip, Upload, Download, Trash2, FileText, Image, File } from 'lucide-react';
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
    return <FileText className="w-5 h-5 text-gray-500" />;
  }
  return <File className="w-5 h-5 text-[#8C8C8C]" />;
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
    <div className="bg-white border border-[#E8E8E8] rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-[#E8E8E8] flex items-center gap-2">
        <Paperclip className="w-4 h-4 text-[#8C8C8C]" />
        <h3 className="text-[11px] font-semibold uppercase text-[#8C8C8C] tracking-wide">
          Attachments
        </h3>
        <span className="text-xs text-[#8C8C8C]">({attachments.length})</span>
      </div>

      <div className="p-4">
        {/* Attachment List */}
        {attachments.length > 0 && (
          <div className="space-y-2 mb-4">
            {attachments.map(attachment => (
              <div 
                key={attachment.id}
                className="flex items-center justify-between p-3 bg-[#FAFBFC] rounded-lg border border-[#E8E8E8] group hover:border-[#C69C6D]"
              >
                <div className="flex items-center gap-3">
                  {getFileIcon(attachment.name)}
                  <div>
                    <p className="text-sm font-medium text-[#172B4D]">{attachment.name}</p>
                    <p className="text-xs text-[#8C8C8C]">
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
                    <Download className="w-4 h-4 text-[#8C8C8C]" />
                  </Button>
                  {isEditMode && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0 hover:text-red-500"
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
          className="border-2 border-dashed border-[#DFE1E6] rounded-lg p-6 text-center cursor-pointer hover:border-[#C69C6D] hover:bg-[#C69C6D]/5 transition-colors"
        >
          <Upload className="w-8 h-8 text-[#8C8C8C] mx-auto mb-2" />
          <p className="text-sm text-[#5C5C5C]">
            Drop files here or <span className="text-[#C69C6D] font-medium">click to upload</span>
          </p>
          <p className="text-xs text-[#8C8C8C] mt-1">Max 10MB per file</p>
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
