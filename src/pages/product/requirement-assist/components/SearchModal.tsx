import React, { useState, useEffect } from 'react';
import { Search, FileText, Layers, Bookmark, Clock } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface SearchModalProps {
  open: boolean;
  onClose: () => void;
}

const recentItems = [
  { icon: FileText, label: 'Document Management PRD', type: 'PRD' },
  { icon: Layers, label: 'EPIC-049: Document Upload', type: 'Epic' },
  { icon: Bookmark, label: 'US-512: User Authentication', type: 'Story' },
];

export function SearchModal({ open, onClose }: SearchModalProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  const handleItemClick = (label: string) => {
    toast.success(`Opening ${label}...`);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-lg p-0">
        <div className="flex items-center gap-3 px-4 py-3 border-b">
          <Search className="w-5 h-5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Catalyst..."
            className="flex-1 border-0 focus-visible:ring-0 text-base px-0"
            autoFocus
          />
          <kbd className="px-2 py-1 text-xs bg-muted border rounded">ESC</kbd>
        </div>
        
        <div className="p-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2 px-1">
            <Clock className="w-3 h-3" />
            Recent
          </div>
          
          <div className="space-y-1">
            {recentItems.map((item, i) => (
              <button
                key={i}
                onClick={() => handleItemClick(item.label)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-muted transition-colors text-left"
              >
                <item.icon className="w-4 h-4 text-muted-foreground" />
                <span className="flex-1 text-sm">{item.label}</span>
                <span className="text-xs text-muted-foreground">{item.type}</span>
              </button>
            ))}
          </div>
          
          {searchQuery && (
            <div className="mt-3 pt-3 border-t">
              <p className="text-sm text-muted-foreground text-center py-4">
                Press Enter to search for "{searchQuery}"
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
