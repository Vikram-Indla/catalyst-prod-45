/**
 * FILES TAB
 * Upload zone + existing files list
 */

import React, { useRef } from 'react';
import { Upload, FileText, Download, Trash2 } from 'lucide-react';
import {
  useTaskAttachments,
  useUploadAttachment,
  useDeleteAttachment,
} from '../../../hooks/useTaskDetails';
import { formatDistanceToNow } from 'date-fns';

interface FilesTabProps {
  taskId: string;
}

export const FilesTab: React.FC<FilesTabProps> = ({ taskId }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: files = [], isLoading } = useTaskAttachments(taskId);
  const uploadMutation = useUploadAttachment();
  const deleteMutation = useDeleteAttachment();

  const formatFileSize = (bytes: number | null): string => {
    if (!bytes) return 'Unknown';
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileType = (filename: string): 'pdf' | 'doc' | 'img' | 'other' => {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return 'pdf';
    if (['doc', 'docx'].includes(ext || '')) return 'doc';
    if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext || '')) return 'img';
    return 'other';
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = e.target.files;
    if (!uploadedFiles) return;

    Array.from(uploadedFiles).forEach((file) => {
      uploadMutation.mutate({ taskId, file });
    });

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDownload = (url: string, filename: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.target = '_blank';
    a.click();
  };

  return (
    <div className="files-tab">
      {/* UPLOAD ZONE */}
      <div className="upload-zone" onClick={() => fileInputRef.current?.click()}>
        <Upload size={48} />
        <h3>Drop files here to upload</h3>
        <p>
          or <span className="browse-link">browse</span> to choose files
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          style={{ display: 'none' }}
          onChange={handleFileUpload}
        />
      </div>

      {/* FILES LIST */}
      {isLoading ? (
        <p>Loading files...</p>
      ) : (
        <div className="files-list">
          {files.map((file) => {
            const fileType = getFileType(file.file_name);
            return (
              <div key={file.id} className="file-item">
                <div className={`file-icon ${fileType}`}>
                  <FileText size={22} />
                </div>
                <div className="file-info">
                  <div className="file-name">{file.file_name}</div>
                  <div className="file-meta">
                    {formatFileSize(file.file_size)} ·{' '}
                    {formatDistanceToNow(new Date(file.uploaded_at), { addSuffix: true })}
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
                    onClick={() => deleteMutation.mutate(file.id)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
