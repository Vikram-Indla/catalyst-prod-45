// ═══════════════════════════════════════════════════════════════════════════
// THUMBNAIL CARD COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { Play, FileText, Loader2, Pencil, AlertTriangle, Eye, Download, Trash2 } from 'lucide-react';
import { Attachment } from '../types';
import { cn } from '@/lib/utils';

interface ThumbnailCardProps {
  attachment: Attachment;
  imageUrl?: string;
  onClick: () => void;
  onDelete: () => void;
  onAnnotate: () => void;
  onDownload: () => void;
}

export const ThumbnailCard: React.FC<ThumbnailCardProps> = ({ 
  attachment, 
  imageUrl, 
  onClick, 
  onDelete, 
  onAnnotate,
  onDownload
}) => {
  const [showActions, setShowActions] = useState(false);
  
  const isImage = attachment.mimeType.startsWith('image/');
  const isVideo = attachment.mimeType.startsWith('video/');
  const isPdf = attachment.mimeType === 'application/pdf';
  
  return (
    <div
      className={cn(
        "relative group rounded-lg overflow-hidden bg-muted",
        "aspect-[4/3] cursor-pointer border border-border",
        "hover:border-primary hover:shadow-md transition-all"
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      onClick={onClick}
    >
      {/* Thumbnail Image */}
      {isImage && imageUrl && (
        <img
          src={imageUrl}
          alt={attachment.fileName}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      )}
      
      {/* Video Thumbnail */}
      {isVideo && (
        <div className="w-full h-full flex items-center justify-center bg-foreground/90">
          <Play className="w-10 h-10 text-background/80" />
        </div>
      )}
      
      {/* PDF Icon */}
      {isPdf && (
        <div className="w-full h-full flex items-center justify-center bg-destructive/10">
          <FileText className="w-10 h-10 text-destructive" />
        </div>
      )}
      
      {/* Loading State */}
      {isImage && !imageUrl && (
        <div className="w-full h-full flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
        </div>
      )}
      
      {/* Badges */}
      <div className="absolute top-2 left-2 flex items-center gap-1">
        {/* Annotation Badge */}
        {attachment.annotations && attachment.annotations.length > 0 && (
          <div className="bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded flex items-center gap-1">
            <Pencil className="w-3 h-3" />
            {attachment.annotations.length}
          </div>
        )}
        
        {/* AI Issues Badge */}
        {attachment.aiHasIssues && (
          <div className="bg-destructive text-destructive-foreground text-xs px-1.5 py-0.5 rounded flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            AI
          </div>
        )}
      </div>
      
      {/* Hover Actions */}
      {showActions && (
        <div className="absolute inset-0 bg-foreground/50 flex items-center justify-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            className="p-2 bg-background rounded-full hover:bg-muted"
            title="View"
          >
            <Eye className="w-4 h-4 text-foreground" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onAnnotate(); }}
            className="p-2 bg-background rounded-full hover:bg-muted"
            title="Annotate"
          >
            <Pencil className="w-4 h-4 text-foreground" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDownload(); }}
            className="p-2 bg-background rounded-full hover:bg-muted"
            title="Download"
          >
            <Download className="w-4 h-4 text-foreground" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-2 bg-background rounded-full hover:bg-destructive/10"
            title="Delete"
          >
            <Trash2 className="w-4 h-4 text-destructive" />
          </button>
        </div>
      )}
      
      {/* File Name Tooltip */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-foreground/60 to-transparent p-2">
        <p className="text-xs text-background truncate">
          {attachment.fileName}
        </p>
      </div>
    </div>
  );
};
