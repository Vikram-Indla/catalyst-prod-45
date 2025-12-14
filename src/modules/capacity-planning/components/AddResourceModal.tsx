import { useState } from 'react';
import { Search, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { ResourceInventoryItem } from '@/hooks/useResourceInventory';

interface AddResourceModalProps {
  open: boolean;
  onClose: () => void;
  allResources: ResourceInventoryItem[];
  currentResourceIds: string[];
  onAddResources: (resourceIds: string[]) => void;
}

export function AddResourceModal({
  open,
  onClose,
  allResources,
  currentResourceIds,
  onAddResources,
}: AddResourceModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filteredResources = allResources.filter(r => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return r.name.toLowerCase().includes(query) || r.role_code?.toLowerCase().includes(query);
  });

  const toggleResource = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleAdd = () => {
    onAddResources(Array.from(selectedIds));
    setSelectedIds(new Set());
    setSearchQuery('');
    onClose();
  };

  const handleClose = () => {
    setSelectedIds(new Set());
    setSearchQuery('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Resources to View</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search resources..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Resource List */}
          <div className="max-h-[300px] overflow-y-auto space-y-1 border rounded-md p-2" style={{ borderColor: 'hsl(var(--border))' }}>
            {filteredResources.length > 0 ? (
              filteredResources.map(resource => {
                const isInView = currentResourceIds.includes(resource.id);
                const isSelected = selectedIds.has(resource.id);

                return (
                  <button
                    key={resource.id}
                    className={cn(
                      'w-full flex items-center justify-between p-2 rounded-md transition-colors text-left',
                      isInView && 'opacity-50 cursor-not-allowed',
                      !isInView && isSelected && 'bg-brand-gold/10',
                      !isInView && !isSelected && 'hover:bg-muted/50'
                    )}
                    onClick={() => !isInView && toggleResource(resource.id)}
                    disabled={isInView}
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-semibold text-white"
                        style={{ 
                          background: resource.role_code === 'PO' 
                            ? 'hsl(var(--secondary-green))' 
                            : resource.role_code === 'BA' 
                              ? 'hsl(var(--brand-gold))' 
                              : 'hsl(var(--secondary-bronze))'
                        }}
                      >
                        {resource.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <div className="text-sm font-medium">{resource.name}</div>
                        <div className="text-xs text-muted-foreground">{resource.role_code || 'No role'}</div>
                      </div>
                    </div>
                    {isInView && (
                      <span className="text-xs text-muted-foreground">Already in view</span>
                    )}
                    {!isInView && isSelected && (
                      <Check className="h-4 w-4 text-brand-gold" />
                    )}
                  </button>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                {searchQuery ? 'No resources match your search' : 'No resources available'}
              </p>
            )}
          </div>

          {selectedIds.size > 0 && (
            <p className="text-sm text-muted-foreground">
              {selectedIds.size} resource{selectedIds.size > 1 ? 's' : ''} selected
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleAdd}
            disabled={selectedIds.size === 0}
            className="bg-brand-gold hover:bg-brand-gold-hover text-white"
          >
            Add to View
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
