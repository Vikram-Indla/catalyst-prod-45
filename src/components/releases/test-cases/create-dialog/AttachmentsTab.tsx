/**
 * Attachments Tab Component
 * Tab 4: File attachments for test case
 */

import { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Trash2, FileImage, File, FileText, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { TestCaseFormData, TestCaseAttachment } from './types';
import { formatDistanceToNow } from 'date-fns';

interface AttachmentsTabProps {
  data: TestCaseFormData;
  onChange: (updates: Partial<TestCaseFormData>) => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(type: string) {
  if (type.startsWith('image/')) return FileImage;
  if (type.includes('pdf')) return FileText;
  return File;
}

export function AttachmentsTab({ data, onChange }: AttachmentsTabProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleFilesSelected = useCallback((files: FileList) => {
    const newAttachments: TestCaseAttachment[] = [];
    
    for (const file of Array.from(files)) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} exceeds 10MB limit`);
        continue;
      }
      
      newAttachments.push({
        id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: file.name,
        url: URL.createObjectURL(file),
        size: file.size,
        type: file.type,
        uploadedAt: new Date(),
      });
    }
    
    if (newAttachments.length > 0) {
      onChange({ attachments: [...data.attachments, ...newAttachments] });
      toast.success(`${newAttachments.length} file(s) uploaded`);
    }
  }, [data.attachments, onChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      handleFilesSelected(e.dataTransfer.files);
    }
  }, [handleFilesSelected]);

  const handleDelete = useCallback((id: string) => {
    onChange({ attachments: data.attachments.filter((a) => a.id !== id) });
    toast.success('Attachment removed');
  }, [data.attachments, onChange]);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFilesSelected(e.target.files);
      e.target.value = ''; // Reset for same file selection
    }
  };

  return (
    <div className="space-y-6 py-4">
      {/* Upload Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer",
          isDragging
            ? "border-teal-500 bg-teal-50 dark:bg-teal-900/20"
            : "border-slate-300 hover:border-primary hover:bg-primary/5"
        )}
        onClick={() => document.getElementById('file-upload')?.click()}
      >
        <input
          id="file-upload"
          type="file"
          multiple
          className="hidden"
          onChange={handleFileInputChange}
          accept=".png,.jpg,.jpeg,.pdf,.doc,.docx,.xls,.xlsx"
        />
        <Upload className={cn(
          "w-12 h-12 mx-auto mb-3 transition-colors",
          isDragging ? "text-teal-600" : "text-muted-foreground"
        )} />
        <h3 className="font-medium mb-1">
          {isDragging ? 'Drop files here' : 'Drop files here or click to upload'}
        </h3>
        <p className="text-sm text-muted-foreground">
          Supports PNG, JPG, PDF, DOC up to 10MB
        </p>
      </div>

      {/* File List */}
      <AnimatePresence>
        {data.attachments.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-2"
          >
            {data.attachments.map((attachment, index) => {
              const Icon = getFileIcon(attachment.type);
              
              return (
                <motion.div
                  key={attachment.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center gap-3 p-3 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 group"
                >
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center",
                    attachment.type.startsWith('image/')
                      ? "bg-blue-100 text-blue-600"
                      : "bg-slate-100 text-slate-600"
                  )}>
                    <Icon className="w-5 h-5" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{attachment.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(attachment.size)} • Uploaded {formatDistanceToNow(attachment.uploadedAt, { addSuffix: true })}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => window.open(attachment.url, '_blank')}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(attachment.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {data.attachments.length === 0 && (
        <div className="text-center py-4 text-muted-foreground text-sm">
          No attachments yet
        </div>
      )}
    </div>
  );
}
