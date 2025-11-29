import { BacklogItem, BacklogMeta } from '../types';
import { Button } from '@/components/ui/button';
import { X, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

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
  return (
    <div className="w-[400px] border-l bg-card flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h3 className="font-semibold text-sm">Unassigned Backlog</h3>
        <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Search */}
      <div className="p-4 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search unassigned items..." className="pl-9" />
        </div>
      </div>

      {/* Items List */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {items.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No unassigned items
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => onItemClick(item.id)}
              >
                <div className="flex items-start gap-2">
                  {item.health && (
                    <div
                      className={cn(
                        'mt-1 h-2 w-2 rounded-full flex-shrink-0',
                        {
                          green: 'bg-green-500',
                          yellow: 'bg-yellow-500',
                          red: 'bg-red-500',
                          gray: 'bg-gray-400',
                        }[item.health]
                      )}
                    />
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-xs text-muted-foreground mb-1">
                      {item.displayId}
                    </div>
                    <div className="text-sm font-medium mb-1">{item.name}</div>
                    
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {item.state && <span>{item.state}</span>}
                      {item.points !== undefined && <span>• {item.points} pts</span>}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
