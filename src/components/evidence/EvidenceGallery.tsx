// ═══════════════════════════════════════════════════════════════════════════
// EVIDENCE GALLERY COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { EvidenceGalleryProps, Attachment } from './types';
import { ThumbnailCard } from './gallery/ThumbnailCard';
import { EmptyState } from './gallery/EmptyState';
import { ImageViewerModal } from './gallery/ImageViewerModal';
import { DeleteConfirmDialog } from './gallery/DeleteConfirmDialog';
import { useSignedUrls, downloadFile } from './gallery/useSignedUrls';

export const EvidenceGallery: React.FC<EvidenceGalleryProps> = ({
  stepResultId,
  attachments,
  onDelete,
  onAnnotate,
  onRefresh
}) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Attachment | null>(null);
  
  const { signedUrls, loading, refreshUrls } = useSignedUrls(attachments);

  const handleRefresh = () => {
    refreshUrls();
    onRefresh();
  };

  const handleDeleteConfirm = () => {
    if (deleteTarget) {
      onDelete(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  const handleDownload = (attachment: Attachment) => {
    downloadFile(attachment);
  };
  
  if (attachments.length === 0) {
    return <EmptyState />;
  }
  
  return (
    <div className="space-y-4">
      {/* Gallery Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-foreground">
          Evidence ({attachments.length})
        </h4>
        <button
          onClick={handleRefresh}
          className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>
      
      {/* Thumbnail Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {attachments.map((attachment, index) => (
          <ThumbnailCard
            key={attachment.id}
            attachment={attachment}
            imageUrl={signedUrls[attachment.id]}
            onClick={() => setSelectedIndex(index)}
            onDelete={() => setDeleteTarget(attachment)}
            onAnnotate={() => onAnnotate(attachment.id)}
            onDownload={() => handleDownload(attachment)}
          />
        ))}
      </div>
      
      {/* Image Viewer Modal */}
      {selectedIndex !== null && (
        <ImageViewerModal
          attachments={attachments}
          currentIndex={selectedIndex}
          signedUrls={signedUrls}
          onClose={() => setSelectedIndex(null)}
          onNavigate={setSelectedIndex}
          onAnnotate={onAnnotate}
          onDelete={(id) => {
            const attachment = attachments.find(a => a.id === id);
            if (attachment) setDeleteTarget(attachment);
          }}
          onDownload={handleDownload}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        isOpen={deleteTarget !== null}
        fileName={deleteTarget?.fileName || ''}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
