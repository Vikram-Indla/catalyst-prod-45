import React from 'react';
import { X, Download } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface EvidenceViewerProps {
  evidence: {
    id: string;
    file_name: string;
    file_type: string;
    file_size: number;
    signedUrl?: string;
    mime_type: string;
    created_at: string;
  };
  isOpen: boolean;
  onClose: () => void;
}

export const EvidenceViewer: React.FC<EvidenceViewerProps> = ({
  evidence,
  isOpen,
  onClose,
}) => {
  const handleDownload = () => {
    if (evidence.signedUrl) {
      const link = document.createElement('a');
      link.href = evidence.signedUrl;
      link.download = evidence.file_name;
      link.click();
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const renderContent = () => {
    if (!evidence.signedUrl) {
      return (
        <div className="flex items-center justify-center h-96 text-muted-foreground">
          <p>Failed to load file</p>
        </div>
      );
    }

    if (evidence.file_type === 'image') {
      return (
        <div className="flex items-center justify-center bg-black/5 rounded-lg p-4">
          <img
            src={evidence.signedUrl}
            alt={evidence.file_name}
            className="max-w-full max-h-[70vh] object-contain"
          />
        </div>
      );
    }

    if (evidence.file_type === 'video') {
      return (
        <video
          src={evidence.signedUrl}
          controls
          className="w-full max-h-[70vh] rounded-lg bg-black"
        >
          Your browser does not support the video tag.
        </video>
      );
    }

    if (evidence.file_type === 'log' && evidence.mime_type.includes('text')) {
      return (
        <div className="bg-muted/50 rounded-lg p-4 max-h-[70vh] overflow-auto">
          <iframe
            src={evidence.signedUrl}
            className="w-full h-96 border-0"
            title={evidence.file_name}
          />
        </div>
      );
    }

    // Default: Show download option
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <p className="text-muted-foreground">Preview not available for this file type</p>
        <Button
          onClick={handleDownload}
          className="bg-brand-gold text-white hover:bg-brand-gold-hover"
        >
          <Download className="h-4 w-4 mr-2" />
          Download File
        </Button>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>{evidence.file_name}</DialogTitle>
              <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                <span>{formatFileSize(evidence.file_size)}</span>
                <span>•</span>
                <span>{new Date(evidence.created_at).toLocaleString()}</span>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="border-brand-gold text-brand-gold hover:bg-brand-gold/10"
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
        </DialogHeader>

        <div className="py-4">
          {renderContent()}
        </div>
      </DialogContent>
    </Dialog>
  );
};
