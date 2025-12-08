import { useState } from 'react';
import { Star, Trash2, MoreHorizontal, Filter, Plus, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useSavedFilters, SavedFilter } from '@/hooks/useSavedFilters';
import { cn } from '@/lib/utils';

interface SavedFiltersDropdownProps {
  entityType: string;
  currentFilters: object;
  onApplyFilter: (filters: object) => void;
  hasActiveFilters?: boolean;
}

export function SavedFiltersDropdown({
  entityType,
  currentFilters,
  onApplyFilter,
  hasActiveFilters = false,
}: SavedFiltersDropdownProps) {
  const { filters, saveFilter, updateFilter, deleteFilter, parseFilterQuery, isSaving } = useSavedFilters(entityType);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [newFilterName, setNewFilterName] = useState('');
  const [setAsDefault, setSetAsDefault] = useState(false);

  const handleSaveFilter = () => {
    if (!newFilterName.trim()) return;
    saveFilter({ name: newFilterName.trim(), query: currentFilters, isDefault: setAsDefault });
    setSaveDialogOpen(false);
    setNewFilterName('');
    setSetAsDefault(false);
  };

  const handleApplyFilter = (filter: SavedFilter) => {
    const parsed = parseFilterQuery(filter);
    onApplyFilter(parsed);
  };

  const handleToggleStar = (filter: SavedFilter, e: React.MouseEvent) => {
    e.stopPropagation();
    updateFilter({ id: filter.id, updates: { is_starred: !filter.is_starred } });
  };

  const handleSetDefault = (filter: SavedFilter, e: React.MouseEvent) => {
    e.stopPropagation();
    updateFilter({ id: filter.id, updates: { is_default: !filter.is_default } });
  };

  const handleDelete = (filter: SavedFilter, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteFilter(filter.id);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="h-4 w-4" />
            Saved Filters
            {filters.length > 0 && (
              <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-xs">
                {filters.length}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          {filters.length === 0 ? (
            <div className="px-2 py-4 text-center text-sm text-muted-foreground">
              No saved filters
            </div>
          ) : (
            filters.map((filter) => (
              <DropdownMenuItem
                key={filter.id}
                className="flex items-center justify-between gap-2 cursor-pointer"
                onClick={() => handleApplyFilter(filter)}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <button
                    onClick={(e) => handleToggleStar(filter, e)}
                    className="shrink-0"
                  >
                    <Star
                      className={cn(
                        'h-4 w-4',
                        filter.is_starred ? 'fill-brand-gold text-brand-gold' : 'text-muted-foreground'
                      )}
                    />
                  </button>
                  <span className="truncate">{filter.name}</span>
                  {filter.is_default && (
                    <span className="shrink-0 text-xs text-brand-gold">(default)</span>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <button className="shrink-0 p-1 hover:bg-accent rounded">
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem onClick={(e) => handleSetDefault(filter, e)}>
                      <Check className="h-4 w-4 mr-2" />
                      {filter.is_default ? 'Unset default' : 'Set as default'}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={(e) => handleDelete(filter, e)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </DropdownMenuItem>
            ))
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setSaveDialogOpen(true)}
            disabled={!hasActiveFilters}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Save current filter
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save Filter</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="filter-name">Filter name</Label>
              <Input
                id="filter-name"
                value={newFilterName}
                onChange={(e) => setNewFilterName(e.target.value)}
                placeholder="My custom filter"
                autoFocus
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="set-default"
                checked={setAsDefault}
                onCheckedChange={(checked) => setSetAsDefault(checked === true)}
              />
              <Label htmlFor="set-default" className="text-sm font-normal">
                Set as default filter
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveFilter} disabled={!newFilterName.trim() || isSaving}>
              Save Filter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
