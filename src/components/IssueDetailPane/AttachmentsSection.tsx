/**
 * AttachmentsSection — Attachments list (F2.9)
 */
import React, { memo } from 'react';

export const AttachmentsSection = memo(function AttachmentsSection({ issueKey, attachments = [], onUpload }: any) {
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' kB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div>
      <h2>Attachments</h2>
      {!attachments.length && <div>No attachments</div>}
      {attachments.map((a: any) => (
        <div key={a.id}>
          <a href={a.url}>{a.filename}</a> ({formatSize(a.size)})
        </div>
      ))}
      <input type="file" onChange={(e) => onUpload(e.target.files?.[0])} />
      <button>Upload</button>
    </div>
  );
});
