import { useState } from 'react';
import { Search, Link as LinkIcon, X, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Lozenge } from '@/components/ads';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useSearchWorkItems, useLinkWorkItem, type WorkItemSearchResult } from '@/hooks/useIncidentWorkItems';
import { toast } from 'sonner';

interface LinkWorkItemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  incidentId: string;
  incidentKey: string;
}

const TYPE_BADGES: Record<string, { label: string; className: string }> = {
  feature: {
    label: 'Feature',
    className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
  },
  story: {
    label: 'Story',
    className: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400'
  },
  task: {
    label: 'Task',
    className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
  },
};

export function LinkWorkItemModal({
  open,
  onOpenChange,
  incidentId,
  incidentKey,
}: LinkWorkItemModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'feature' | 'story' | 'task'>('all');
  const [selectedItem, setSelectedItem] = useState<WorkItemSearchResult | null>(null);
  
  const { data: searchResults = [], isLoading: isSearching } = useSearchWorkItems(
    searchTerm,
    typeFilter === 'all' ? undefined : typeFilter
  );
  const linkWorkItem = useLinkWorkItem();
  
  const handleLink = async () => {
    if (!selectedItem) return;
    
    try {
      await linkWorkItem.mutateAsync({ incidentId, workItem: selectedItem });
      toast.success(`Linked ${selectedItem.key} to ${incidentKey}`);
      onOpenChange(false);
      setSearchTerm('');
      setSelectedItem(null);
    } catch (error: any) {
      if (error.code === '23505') {
        toast.error('This work item is already linked');
      } else {
        toast.error(error.message || 'Failed to link work item');
      }
    }
  };
  
  const handleClose = () => {
    onOpenChange(false);
    setSearchTerm('');
    setSelectedItem(null);
  };
  
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg p-0">
        <DialogHeader className="px-4 pt-4 pb-3 border-b border-border">
          <DialogTitle className="text-sm font-semibold flex items-center gap-2">
            <LinkIcon className="h-4 w-4" />
            Link Work Item to {incidentKey}
          </DialogTitle>
        </DialogHeader>
        
        <div className="p-4 space-y-4">
          {/* Type Filter Tabs */}
          <Tabs value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)}>
            <TabsList className="w-full grid grid-cols-4 h-9">
              <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
              <TabsTrigger value="feature" className="text-xs">Features</TabsTrigger>
              <TabsTrigger value="story" className="text-xs">Stories</TabsTrigger>
              <TabsTrigger value="task" className="text-xs">Tasks</TabsTrigger>
            </TabsList>
          </Tabs>
          
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by key (e.g., FTR-001) or title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-10"
              autoFocus
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
            )}
          </div>
          
          {/* Search Results */}
          <ScrollArea className="h-[280px] border border-border rounded-md">
            {searchTerm.length < 2 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <Search className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">Type at least 2 characters to search</p>
              </div>
            ) : searchResults.length === 0 && !isSearching ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <p className="text-sm">No work items found</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {searchResults.map((item) => {
                  const typeConfig = TYPE_BADGES[item.type];
                  const isSelected = selectedItem?.id === item.id;
                  
                  return (
                    <button
                      key={`${item.type}-${item.id}`}
                      className={cn(
                        'w-full text-left p-3 hover:bg-muted/50 transition-colors',
                        isSelected && 'bg-primary/5 ring-1 ring-primary/20'
                      )}
                      onClick={() => setSelectedItem(item)}
                    >
                      <div className="flex items-start gap-3">
                        <span className="flex-shrink-0 mt-0.5">
                          <Lozenge appearance="default">
                            {typeConfig.label}
                          </Lozenge>
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-primary">{item.key}</span>
                            {item.status && (
                              <Lozenge appearance="default">
                                {item.status}
                              </Lozenge>
                            )}
                          </div>
                          <p className="text-sm font-medium truncate mt-0.5">{item.name}</p>
                          {item.project_name && (
                            <p className="text-xs text-muted-foreground">{item.project_name}</p>
                          )}
                        </div>
                        {isSelected && (
                          <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                            <svg className="h-3 w-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
          
          {/* Selected Item Preview */}
          {selectedItem && (
            <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-md border border-border">
              <Lozenge appearance="default">
                {TYPE_BADGES[selectedItem.type].label}
              </Lozenge>
              <span className="font-mono text-xs text-primary">{selectedItem.key}</span>
              <span className="text-sm truncate flex-1">{selectedItem.name}</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => setSelectedItem(null)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-border bg-muted/30">
          <Button variant="outline" size="sm" className="h-8" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            size="sm" 
            className="h-8" 
            onClick={handleLink}
            disabled={!selectedItem || linkWorkItem.isPending}
          >
            {linkWorkItem.isPending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                Linking...
              </>
            ) : (
              <>
                <LinkIcon className="h-3.5 w-3.5 mr-1.5" />
                Link Work Item
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
