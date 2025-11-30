import { useState } from 'react';
import { BacklogItem, BacklogMeta } from '../types';
import { Button } from '@/components/ui/button';
import { X, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useBacklogActions } from '../hooks/useBacklogActions';
import { useBacklogState } from '../hooks/useBacklogState';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface UnassignedBacklogPanelProps {
  items: BacklogItem[];
  meta?: BacklogMeta;
  onClose: () => void;
  onItemClick: (itemId: string) => void;
}

export function UnassignedBacklogPanel({
  items,
  onClose,
  onItemClick,
}: UnassignedBacklogPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const { type } = useBacklogState();
  const actions = useBacklogActions(type);

  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.displayId?.toString().toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-[400px] border-l bg-card flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <h3 className="font-semibold text-sm">Unassigned Backlog</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {items.length} unassigned item{items.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Search */}
      <div className="p-4 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search unassigned items..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Items List */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {filteredItems.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              {searchQuery ? 'No matching items' : 'No unassigned items'}
            </div>
          ) : (
            filteredItems.map((item) => (
              <div
                key={item.id}
                className="group relative p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div
                  className="cursor-pointer"
                  onClick={() => onItemClick(item.id)}
                >
                  <div className="flex items-start gap-2">
                    {item.health && (
                      <div
                        className={cn(
                          'mt-1 h-2 w-2 rounded-full flex-shrink-0',
                          {
                            green: 'bg-success',
                            yellow: 'bg-warning',
                            red: 'bg-destructive',
                            gray: 'bg-muted-foreground',
                          }[item.health]
                        )}
                      />
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-xs text-muted-foreground mb-1">
                        {item.displayId || item.id.slice(0, 8)}
                      </div>
                      <div className="text-sm font-medium mb-1 line-clamp-2">
                        {item.name}
                      </div>
                      
                      <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                        {item.state && (
                          <span className="px-2 py-0.5 bg-muted rounded">
                            {item.state}
                          </span>
                        )}
                        {item.points !== undefined && (
                          <span>{item.points} pts</span>
                        )}
                        {item.mvp && (
                          <span className="px-2 py-0.5 bg-primary/10 text-primary rounded">
                            MVP
                          </span>
                        )}
                        {item.blocked && (
                          <span className="px-2 py-0.5 bg-destructive/10 text-destructive rounded">
                            Blocked
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="sr-only">Actions</span>
                        <span className="text-xs">⋮</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {actions.availablePIs.map((pi) => (
                        <DropdownMenuItem
                          key={pi.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            actions.moveToPI(item.id, pi.id);
                          }}
                        >
                          Assign to {pi.name}
                        </DropdownMenuItem>
                      ))}
                      {actions.availablePIs.length === 0 && (
                        <DropdownMenuItem disabled>
                          No PIs available
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Footer Actions */}
      {filteredItems.length > 0 && (
        <div className="border-t p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Showing {filteredItems.length} of {items.length}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearchQuery('')}
              disabled={!searchQuery}
            >
              Clear search
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
