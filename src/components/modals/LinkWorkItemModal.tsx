// =====================================================
// LINK WORK ITEM MODAL
// Main modal component for linking work items
// =====================================================

import React, { useState, useMemo } from 'react';
import { X, Search, Link2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LinkTypeSelector } from './LinkWorkItemModal/LinkTypeSelector';
import { 
  useSearchWorkItems, 
  useLinksForItem, 
  useCreateLinks,
  useDeleteLink 
} from '@/hooks/useWorkItemLinks';
import { 
  WorkItemType, 
  LinkType, 
  LINK_TYPE_CONFIG, 
  WORK_ITEM_CONFIG,
  STATUS_CONFIG,
  WorkflowStatus 
} from '@/types/views';
import { cn } from '@/lib/utils';

interface LinkWorkItemModalProps {
  open: boolean;
  onClose: () => void;
  sourceType: WorkItemType;
  sourceId: string;
  sourceIdentifier: string;
  sourceTitle: string;
  projectId: string;
}

export function LinkWorkItemModal({
  open,
  onClose,
  sourceType,
  sourceId,
  sourceIdentifier,
  sourceTitle,
  projectId
}: LinkWorkItemModalProps) {
  const [activeTab, setActiveTab] = useState('search');
  const [selectedLinkType, setSelectedLinkType] = useState<LinkType>('relates_to');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<WorkItemType | 'all'>('all');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  // Queries
  const { data: searchResults = [], isLoading: searching } = useSearchWorkItems(
    searchQuery,
    projectId,
    typeFilter
  );
  const { data: existingLinks = [] } = useLinksForItem(sourceType, sourceId);

  // Mutations
  const createLinksMutation = useCreateLinks();
  const deleteLinkMutation = useDeleteLink();

  // Filter out already linked items and self
  const filteredResults = useMemo(() => {
    const linkedIds = new Set(existingLinks.map(l => l.to_work_item_id));
    return searchResults.filter(
      item => item.id !== sourceId && !linkedIds.has(item.id)
    );
  }, [searchResults, existingLinks, sourceId]);

  // Toggle item selection
  const toggleSelect = (itemId: string) => {
    setSelectedItems(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  // Create links
  const handleCreateLinks = () => {
    const inputs = selectedItems.map(itemId => {
      const item = filteredResults.find(r => r.id === itemId);
      return {
        source_type: sourceType,
        source_id: sourceId,
        target_type: item?.type || 'feature' as WorkItemType,
        target_id: itemId,
        link_type: selectedLinkType
      };
    });

    createLinksMutation.mutate(inputs, {
      onSuccess: () => {
        setSelectedItems([]);
        setSearchQuery('');
        onClose();
      }
    });
  };

  // Delete link state
  const [linkToDelete, setLinkToDelete] = useState<string | null>(null);
  
  const handleConfirmDelete = () => {
    if (linkToDelete) {
      deleteLinkMutation.mutate(linkToDelete);
      setLinkToDelete(null);
    }
  };

  const getStatusConfig = (status: string | undefined) => {
    if (!status) return { bgColor: 'hsl(var(--muted))', textColor: 'hsl(var(--muted-foreground))', label: 'Unknown' };
    const config = STATUS_CONFIG[status as WorkflowStatus];
    return config || { bgColor: 'hsl(var(--muted))', textColor: 'hsl(var(--muted-foreground))', label: status };
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Link Work Item</DialogTitle>
          <p className="text-sm text-muted-foreground">
            <span className="font-mono text-primary">{sourceIdentifier}</span>
            {' '}{sourceTitle}
          </p>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="search">Search & Link</TabsTrigger>
            <TabsTrigger value="existing">
              Existing Links ({existingLinks.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="flex-1 overflow-auto mt-4 space-y-4">
            {/* Link Type Selection */}
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground mb-3">
                LINK TYPE
              </p>
              <LinkTypeSelector
                selectedType={selectedLinkType}
                onSelect={setSelectedLinkType}
              />
            </div>

            {/* Search Input */}
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                SEARCH WORK ITEMS
              </p>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by ID or title..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Type Filters */}
            <div className="flex gap-2">
              {(['all', 'epic', 'feature', 'story'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setTypeFilter(type)}
                  className={cn(
                    'px-3 py-1.5 text-xs font-medium rounded-full transition-colors',
                    typeFilter === type
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  )}
                >
                  {type === 'all' ? 'All' : WORK_ITEM_CONFIG[type].label + 's'}
                </button>
              ))}
            </div>

            {/* Search Results */}
            <div className="border rounded-lg overflow-hidden">
              <div className="max-h-64 overflow-y-auto">
                {searchQuery.length < 2 && (
                  <p className="p-4 text-center text-muted-foreground text-sm">
                    Type at least 2 characters to search
                  </p>
                )}
                {searchQuery.length >= 2 && filteredResults.length === 0 && !searching && (
                  <p className="p-4 text-center text-muted-foreground text-sm">
                    No items found
                  </p>
                )}
                {filteredResults.map((item) => {
                  const isSelected = selectedItems.includes(item.id);
                  const typeConfig = WORK_ITEM_CONFIG[item.type];
                  const statusConfig = getStatusConfig(item.status);

                  return (
                    <div
                      key={item.id}
                      onClick={() => toggleSelect(item.id)}
                      className={cn(
                        'flex items-center justify-between p-3 border-b cursor-pointer transition-colors',
                        isSelected
                          ? 'bg-primary/10'
                          : 'hover:bg-primary/5'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded flex items-center justify-center"
                          style={{ background: typeConfig.bgColor }}
                        >
                          <Link2 className="w-4 h-4" style={{ color: typeConfig.color }} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-primary">
                              {item.identifier}
                            </span>
                            <span
                              className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                              style={{ 
                                background: typeConfig.bgColor, 
                                color: typeConfig.color 
                              }}
                            >
                              {typeConfig.label}
                            </span>
                          </div>
                          <p className="text-sm">{item.title}</p>
                        </div>
                      </div>
                      <span
                        className="px-2 py-0.5 rounded text-xs"
                        style={{ 
                          background: statusConfig.bgColor,
                          color: statusConfig.textColor
                        }}
                      >
                        {statusConfig.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Selected Items */}
            {selectedItems.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                  SELECTED TO LINK ({selectedItems.length})
                </p>
                <div className="space-y-2">
                  {selectedItems.map((itemId) => {
                    const item = filteredResults.find(r => r.id === itemId);
                    return (
                      <div
                        key={itemId}
                        className="flex items-center justify-between p-2 rounded-lg bg-primary/10"
                      >
                        <span className="text-sm font-mono text-primary">
                          {item?.identifier}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSelect(itemId);
                          }}
                          className="p-1 hover:bg-background rounded"
                        >
                          <X className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="existing" className="flex-1 overflow-auto mt-4">
            <p className="text-xs font-semibold uppercase text-muted-foreground mb-3">
              CURRENT LINKS
            </p>
            <div className="space-y-3">
              {existingLinks.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm py-8">
                  No links yet
                </p>
              ) : (
                existingLinks.map((link) => {
                  const linkConfig = LINK_TYPE_CONFIG[link.link_type as LinkType];
                  const statusConfig = getStatusConfig(link.target_item?.status);

                  return (
                    <div key={link.id} className="p-4 rounded-lg border">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span
                            className="px-2 py-0.5 rounded text-xs font-medium"
                            style={{ 
                              background: linkConfig?.bgColor,
                              color: linkConfig?.color
                            }}
                          >
                            {linkConfig?.label}
                          </span>
                          <span className="text-xs font-mono text-primary">
                            {link.target_item?.identifier}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setLinkToDelete(link.id)}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                      <p className="text-sm">{link.target_item?.title}</p>
                      <div className="mt-2">
                        <span
                          className="px-2 py-0.5 rounded text-xs"
                          style={{ 
                            background: statusConfig.bgColor,
                            color: statusConfig.textColor
                          }}
                        >
                          {statusConfig.label}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="flex justify-between items-center pt-4 border-t mt-4">
          <span className="text-sm text-muted-foreground">
            {selectedItems.length > 0
              ? `${selectedItems.length} item(s) selected`
              : 'Select items to link'}
          </span>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateLinks}
              disabled={selectedItems.length === 0 || createLinksMutation.isPending}
            >
              {createLinksMutation.isPending ? 'Linking...' : 'Link Selected'}
            </Button>
          </div>
        </div>
      </DialogContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!linkToDelete} onOpenChange={(open) => !open && setLinkToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Link</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this link? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
