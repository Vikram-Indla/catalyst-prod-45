// ============================================================
// FILES TAB
// Upload zone + files list
// ============================================================

import React, { useRef } from 'react';
import { Upload, FileText, Download, Trash2 } from 'lucide-react';
import type { TaskFile } from '../types';

interface FilesTabProps {
  files: TaskFile[];
  onUploadFile: (file: File) => void;
  onDeleteFile: (fileId: string) => void;
}

export const FilesTab: React.FC<FilesTabProps> = ({
  files,
  onUploadFile,
  onDeleteFile,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = e.target.files;
    if (!uploadedFiles) return;

    Array.from(uploadedFiles).forEach((file) => {
      onUploadFile(file);
    });

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getFileIconClass = (type: string) => {
    switch (type) {
      case 'pdf':
        return 'file-icon pdf';
      case 'doc':
        return 'file-icon doc';
      case 'img':
        return 'file-icon img';
      default:
        return 'file-icon other';
    }
  };

  return (
    <div className="files-tab">
      {/* UPLOAD ZONE */}
      <div
        className="upload-zone"
        onClick={() => fileInputRef.current?.click()}
      >
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
          onChange={handleFileChange}
        />
      </div>

      {/* FILES LIST */}
      {files.length === 0 ? (
        <div className="empty-state">
          <FileText size={52} />
          <h3>No files yet</h3>
          <p>Upload files related to this task</p>
        </div>
      ) : (
        <div className="files-list">
          {files.map((file) => (
            <div key={file.id} className="file-item">
              <div className={getFileIconClass(file.type)}>
                <FileText size={22} />
              </div>
              <div className="file-info">
                <div className="file-name">{file.name}</div>
                <div className="file-meta">
                  {file.size} · {file.uploaded_at}
                </div>
              </div>
              <div className="file-actions">
                <button className="item-action-btn">
                  <Download size={16} />
                </button>
                <button
                  className="item-action-btn"
                  onClick={() => onDeleteFile(file.id)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
