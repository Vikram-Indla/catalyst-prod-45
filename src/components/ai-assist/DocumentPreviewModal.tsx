import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Search, Copy, Check, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { catalystToast } from '@/lib/catalystToast';

interface DocumentPreviewModalProps {
  open: boolean;
  onClose: () => void;
  extractedText: string | null;
  documentName: string;
  pageCount?: number;
  isFullScreen?: boolean;
  onToggleFullScreen?: () => void;
  onFirstView?: () => void;
}

export function DocumentPreviewModal({
  open,
  onClose,
  extractedText,
  documentName,
  pageCount = 0,
  isFullScreen = false,
  onToggleFullScreen,
  onFirstView,
}: DocumentPreviewModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [hasBeenViewed, setHasBeenViewed] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Focus trap and ESC handler
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  // Fire onFirstView callback once
  useEffect(() => {
    if (open && !hasBeenViewed && onFirstView) {
      console.info('[AI Assist] Preview Text opened');
      setHasBeenViewed(true);
      onFirstView();
    }
  }, [open, hasBeenViewed, onFirstView]);

  useEffect(() => {
    if (open && isFullScreen) {
      console.info('[AI Assist] Full Screen Preview opened');
    }
  }, [open, isFullScreen]);

  // Format extracted text with page separators
  const formatTextWithPages = useCallback((text: string | null): string => {
    if (!text) return 'No extracted text available.';
    
    // Split by double newlines as rough page approximation
    // In real implementation, this would use page_hashes for exact boundaries
    const paragraphs = text.split('\n\n').filter(Boolean);
    const estimatedPagesCount = pageCount || Math.ceil(paragraphs.length / 10);
    const paragraphsPerPage = Math.ceil(paragraphs.length / Math.max(estimatedPagesCount, 1));
    
    let result = '';
    paragraphs.forEach((para, idx) => {
      const pageNum = Math.floor(idx / paragraphsPerPage) + 1;
      if (idx % paragraphsPerPage === 0 && idx > 0) {
        result += `\n\n— Page P${String(pageNum).padStart(2, '0')} —\n\n`;
      } else if (idx === 0) {
        result += `— Page P01 —\n\n`;
      }
      result += para + '\n\n';
    });
    
    return result.trim();
  }, [pageCount]);

  const formattedText = formatTextWithPages(extractedText);

  // Highlight search matches
  const highlightMatches = (text: string, query: string): React.ReactNode => {
    if (!query.trim()) return text;
    
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === query.toLowerCase() 
        ? <mark key={i} className="bg-[hsl(var(--warning))]/30 text-foreground px-0.5 rounded">{part}</mark>
        : part
    );
  };

  const handleCopy = async () => {
    if (!extractedText) return;
    try {
      await navigator.clipboard.writeText(extractedText);
      setCopied(true);
      catalystToast.success('Copied', 'Text copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      catalystToast.error('Copy failed', 'Unable to copy text');
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const matchCount = searchQuery 
    ? (formattedText.match(new RegExp(searchQuery, 'gi')) || []).length 
    : 0;

  if (!open) return null;

  return (
    <div 
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm",
        "transition-opacity duration-200"
      )}
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        className={cn(
          "bg-card border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden",
          "transition-all duration-200",
          isFullScreen 
            ? "w-full h-full m-0 rounded-none" 
            : "w-full max-w-4xl h-[80vh] mx-4"
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="preview-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-3">
            <h2 id="preview-title" className="text-lg font-semibold">
              Preview Extracted Text
            </h2>
            <Badge variant="secondary" className="text-xs">
              {documentName}
            </Badge>
            {pageCount > 0 && (
              <Badge variant="outline" className="text-xs">
                {pageCount} pages
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {onToggleFullScreen && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onToggleFullScreen}
                className="h-8 w-8"
              >
                {isFullScreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onClose}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Search bar */}
        <div className="px-5 py-3 border-b border-border flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search in document..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-9"
            />
          </div>
          {searchQuery && (
            <Badge variant="secondary" className="text-xs shrink-0">
              {matchCount} {matchCount === 1 ? 'match' : 'matches'}
            </Badge>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleCopy}
            className="gap-2 shrink-0"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied' : 'Copy All'}
          </Button>
        </div>

        {/* Content */}
        <div 
          ref={contentRef}
          className="flex-1 overflow-y-auto p-5"
        >
          <pre className="font-mono text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
            {searchQuery 
              ? highlightMatches(formattedText, searchQuery) 
              : formattedText
            }
          </pre>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border bg-muted/30 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Press <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border text-xs">ESC</kbd> to close
          </p>
          <Button variant="default" size="sm" onClick={onClose}>
            Done Reviewing
          </Button>
        </div>
      </div>
    </div>
  );
}
