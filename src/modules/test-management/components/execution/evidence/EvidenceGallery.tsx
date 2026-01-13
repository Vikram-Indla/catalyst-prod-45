/**
 * Evidence Gallery Component
 * Grid display of evidence with thumbnails, metadata, and actions
 * Implements TC-151 to TC-175
 */

import React, { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Image as ImageIcon,
  FileText,
  Video,
  File,
  MoreVertical,
  Trash2,
  Download,
  Eye,
  Maximize2,
  Clock,
  Camera,
  Clipboard,
  Upload,
  MousePointer,
  Grid3X3,
  List,
  Search,
  Filter,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import type { Evidence, CaptureMethod } from './types';
import { EvidenceLightbox } from './EvidenceLightbox';

interface EvidenceGalleryProps {
  evidence: Evidence[];
  onDelete?: (evidence: Evidence) => void;
  onDownload?: (evidence: Evidence) => void;
  readOnly?: boolean;
  className?: string;
}

// File icon mapping
const getFileIcon = (fileType: Evidence['fileType']) => {
  switch (fileType) {
    case 'image': return ImageIcon;
    case 'video': return Video;
    case 'document': return FileText;
    case 'log': return FileText;
    default: return File;
  }
};

// Capture method icons and labels
const captureMethodConfig: Record<CaptureMethod, { icon: typeof Camera; label: string }> = {
  screen_capture: { icon: Camera, label: 'Screen Capture' },
  clipboard_paste: { icon: Clipboard, label: 'Clipboard Paste' },
  drag_drop: { icon: MousePointer, label: 'Drag & Drop' },
  file_browser: { icon: Upload, label: 'File Upload' },
};

// Format file size
const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

type ViewMode = 'grid' | 'list';
type SortBy = 'date' | 'name' | 'size' | 'type';

export function EvidenceGallery({
  evidence,
  onDelete,
  onDownload,
  readOnly = false,
  className,
}: EvidenceGalleryProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('date');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Filter and sort evidence
  const filteredEvidence = useMemo(() => {
    let filtered = evidence;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(e => 
        e.fileName.toLowerCase().includes(query) ||
        e.fileType.toLowerCase().includes(query) ||
        e.captureMethod.toLowerCase().includes(query)
      );
    }

    // Sort
    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return b.createdAt.getTime() - a.createdAt.getTime();
        case 'name':
          return a.fileName.localeCompare(b.fileName);
        case 'size':
          return b.fileSize - a.fileSize;
        case 'type':
          return a.fileType.localeCompare(b.fileType);
        default:
          return 0;
      }
    });
  }, [evidence, searchQuery, sortBy]);

  // Open lightbox
  const openLightbox = (index: number) => {
    const actualIndex = evidence.findIndex(e => e.id === filteredEvidence[index].id);
    setSelectedIndex(actualIndex);
    setLightboxOpen(true);
  };

  // Handle keyboard navigation in gallery
  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openLightbox(index);
    }
  };

  // Handle download
  const handleDownload = async (item: Evidence) => {
    if (onDownload) {
      onDownload(item);
    } else if (item.url) {
      const link = document.createElement('a');
      link.href = item.url;
      link.download = item.fileName;
      link.click();
    }
  };

  if (evidence.length === 0) {
    return (
      <div className={cn(
        'flex flex-col items-center justify-center py-12 text-center',
        className
      )}>
        <ImageIcon className="h-12 w-12 text-muted-foreground/30 mb-3" />
        <p className="text-sm font-medium text-muted-foreground">No evidence attached</p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          Upload screenshots, images, or documents
        </p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search evidence..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-xs"
            />
          </div>
          <Badge variant="secondary" className="text-xs">
            {filteredEvidence.length} of {evidence.length}
          </Badge>
        </div>

        <div className="flex items-center gap-1">
          {/* Sort */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 px-2 text-xs">
                <Filter className="h-3.5 w-3.5 mr-1" />
                Sort
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setSortBy('date')}>
                <Clock className="h-3.5 w-3.5 mr-2" />
                Date (newest)
                {sortBy === 'date' && <span className="ml-auto">✓</span>}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('name')}>
                Name (A-Z)
                {sortBy === 'name' && <span className="ml-auto">✓</span>}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('size')}>
                Size (largest)
                {sortBy === 'size' && <span className="ml-auto">✓</span>}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('type')}>
                Type
                {sortBy === 'type' && <span className="ml-auto">✓</span>}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* View mode toggle */}
          <div className="flex items-center border rounded-md">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 w-7 p-0 rounded-r-none"
              onClick={() => setViewMode('grid')}
            >
              <Grid3X3 className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 w-7 p-0 rounded-l-none"
              onClick={() => setViewMode('list')}
            >
              <List className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Gallery Grid/List */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {filteredEvidence.map((item, index) => (
            <GalleryGridItem
              key={item.id}
              item={item}
              onClick={() => openLightbox(index)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              onDelete={readOnly ? undefined : () => onDelete?.(item)}
              onDownload={() => handleDownload(item)}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-1.5">
          {filteredEvidence.map((item, index) => (
            <GalleryListItem
              key={item.id}
              item={item}
              onClick={() => openLightbox(index)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              onDelete={readOnly ? undefined : () => onDelete?.(item)}
              onDownload={() => handleDownload(item)}
            />
          ))}
        </div>
      )}

      {/* Lightbox */}
      <EvidenceLightbox
        evidence={evidence}
        initialIndex={selectedIndex ?? 0}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        onDelete={readOnly ? undefined : onDelete}
        onDownload={handleDownload}
      />
    </div>
  );
}

// Grid Item Component
interface GalleryItemProps {
  item: Evidence;
  onClick: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onDelete?: () => void;
  onDownload?: () => void;
}

function GalleryGridItem({ item, onClick, onKeyDown, onDelete, onDownload }: GalleryItemProps) {
  const Icon = getFileIcon(item.fileType);
  const isImage = item.fileType === 'image';
  const MethodIcon = captureMethodConfig[item.captureMethod]?.icon || Upload;

  return (
    <div
      role="button"
      tabIndex={0}
      className={cn(
        'group relative aspect-square rounded-lg border bg-muted/30 overflow-hidden',
        'cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        'hover:border-primary/50 transition-colors'
      )}
      onClick={onClick}
      onKeyDown={onKeyDown}
    >
      {/* Thumbnail */}
      {isImage && item.url ? (
        <img
          src={item.url}
          alt={item.fileName}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-muted">
          <Icon className="h-10 w-10 text-muted-foreground" />
        </div>
      )}

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <Maximize2 className="h-6 w-6 text-white" />
      </div>

      {/* Capture method badge */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="absolute top-1.5 left-1.5 p-1 rounded bg-black/50 text-white">
            <MethodIcon className="h-3 w-3" />
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" className="text-xs">
          {captureMethodConfig[item.captureMethod]?.label || 'Uploaded'}
        </TooltipContent>
      </Tooltip>

      {/* Actions menu */}
      <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="secondary"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onClick(); }}>
              <Eye className="h-3.5 w-3.5 mr-2" />
              View
            </DropdownMenuItem>
            {onDownload && (
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDownload(); }}>
                <Download className="h-3.5 w-3.5 mr-2" />
                Download
              </DropdownMenuItem>
            )}
            {onDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={(e) => { e.stopPropagation(); onDelete(); }}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-2" />
                  Delete
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* File info footer */}
      <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-gradient-to-t from-black/70 to-transparent">
        <p className="text-[10px] text-white truncate font-medium">
          {item.fileName}
        </p>
        <p className="text-[9px] text-white/70">
          {formatFileSize(item.fileSize)}
        </p>
      </div>
    </div>
  );
}

// List Item Component
function GalleryListItem({ item, onClick, onKeyDown, onDelete, onDownload }: GalleryItemProps) {
  const Icon = getFileIcon(item.fileType);
  const isImage = item.fileType === 'image';
  const methodConfig = captureMethodConfig[item.captureMethod];
  const MethodIcon = methodConfig?.icon || Upload;

  return (
    <div
      role="button"
      tabIndex={0}
      className={cn(
        'group flex items-center gap-3 p-2 rounded-lg border bg-muted/30',
        'cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring',
        'hover:border-primary/50 hover:bg-muted/50 transition-colors'
      )}
      onClick={onClick}
      onKeyDown={onKeyDown}
    >
      {/* Thumbnail */}
      {isImage && item.url ? (
        <img
          src={item.url}
          alt={item.fileName}
          className="h-12 w-12 rounded object-cover flex-shrink-0"
          loading="lazy"
        />
      ) : (
        <div className="h-12 w-12 rounded bg-muted flex items-center justify-center flex-shrink-0">
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{item.fileName}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <MethodIcon className="h-3 w-3" />
            {methodConfig?.label || 'Uploaded'}
          </span>
          <span>•</span>
          <span>{formatFileSize(item.fileSize)}</span>
          {item.width && item.height && (
            <>
              <span>•</span>
              <span>{item.width}×{item.height}</span>
            </>
          )}
          <span>•</span>
          <span>{format(item.createdAt, 'MMM d, h:mm a')}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); onClick(); }}>
              <Eye className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>View</TooltipContent>
        </Tooltip>
        {onDownload && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); onDownload(); }}>
                <Download className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Download</TooltipContent>
          </Tooltip>
        )}
        {onDelete && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Delete</TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  );
}
