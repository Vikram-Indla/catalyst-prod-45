/**
 * Files Tab Component
 * Drag and drop upload zone + file list
 */

import React, { useRef } from 'react';
import { Upload, FileText, Download, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { 
  useTaskAttachments, 
  useUploadAttachment, 
  useDeleteAttachment 
} from '../../../hooks/useTaskDetails';

interface FilesTabProps {
  taskId: string;
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return 'Unknown size';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileType(filename: string): 'pdf' | 'doc' | 'img' | 'other' {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return 'pdf';
  if (['doc', 'docx'].includes(ext || '')) return 'doc';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext || '')) return 'img';
  return 'other';
}

export function FilesTab({ taskId }: FilesTabProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: files = [], isLoading } = useTaskAttachments(taskId);
  const uploadFile = useUploadAttachment();
  const deleteFile = useDeleteAttachment();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = e.target.files;
    if (!uploadedFiles) return;

    Array.from(uploadedFiles).forEach(file => {
      uploadFile.mutate({ taskId, file });
    });

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDownload = async (url: string, fileName: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="empty-state">
        <div className="loading-spinner" style={{ width: 32, height: 32 }} />
      </div>
    );
  }

  return (
    <div className="files-tab">
      {/* UPLOAD ZONE */}
      <div
        className="upload-zone"
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload size={48} />
        <h3>Drop files here to upload</h3>
        <p>or <span className="browse-link">browse</span> to choose files</p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          style={{ display: 'none' }}
          onChange={handleFileUpload}
        />
      </div>

      {/* FILES LIST */}
      <div className="files-list">
        {files.map((file) => (
          <div key={file.id} className="file-item">
            <div className={`file-icon ${getFileType(file.file_name)}`}>
              <FileText size={22} />
            </div>
            <div className="file-info">
              <div className="file-name">{file.file_name}</div>
              <div className="file-meta">
                {formatFileSize(file.file_size)} · {format(new Date(file.uploaded_at), 'MMM d, yyyy')}
              </div>
            </div>
            <div className="file-actions">
              <button 
                className="item-action-btn"
                onClick={() => handleDownload(file.file_url, file.file_name)}
              >
                <Download size={16} />
              </button>
              <button
                className="item-action-btn"
                onClick={() => deleteFile.mutate(file.id)}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
