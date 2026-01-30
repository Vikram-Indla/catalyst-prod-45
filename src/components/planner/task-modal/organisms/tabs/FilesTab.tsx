// ============================================================================
// ORGANISM: FilesTab — Files tab content
// ============================================================================

import React from 'react';
import { UploadZone, FileItem } from '../../molecules';
import { TaskFile } from '../../types';

interface FilesTabProps {
  files: TaskFile[];
  onUpload: (files: FileList) => void;
  onDelete: (id: string) => void;
  onDownload?: (id: string) => void;
}

export const FilesTab: React.FC<FilesTabProps> = ({
  files,
  onUpload,
  onDelete,
  onDownload
}) => {
  return (
    <div>
      {/* UPLOAD ZONE — Icon must be CENTERED */}
      <UploadZone onUpload={onUpload} />

      {/* FILES LIST */}
      {files.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {files.map((file) => (
            <FileItem
              key={file.id}
              id={file.id}
              name={file.name}
              size={file.size}
              type={file.type}
              uploadedAt={file.uploadedAt}
              onDelete={onDelete}
              onDownload={onDownload}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default FilesTab;
