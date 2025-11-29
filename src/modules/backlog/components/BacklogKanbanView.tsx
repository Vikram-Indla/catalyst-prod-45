import { BacklogItem, BacklogMeta } from '../types';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface BacklogKanbanViewProps {
  items: BacklogItem[];
  meta?: BacklogMeta;
  selectedItems: string[];
  onItemClick: (itemId: string) => void;
  onItemSelect: (itemId: string, selected: boolean) => void;
}

export function BacklogKanbanView({
  items,
  meta,
  selectedItems,
  onItemClick,
}: BacklogKanbanViewProps) {
  const states = meta?.states || ['Proposed', 'In Progress', 'Done'];

  const getItemsByState = (state: string) => {
    return items.filter((item) => item.state === state);
  };

  return (
    <div className="flex gap-4 p-4 overflow-x-auto h-full">
      {states.map((state) => {
        const stateItems = getItemsByState(state);
        return (
          <div key={state} className="flex-shrink-0 w-[280px]">
            <div className="sticky top-0 bg-background pb-2">
              <div className="flex items-center justify-between px-3 py-2 bg-muted rounded-lg">
                <span className="font-medium text-sm">{state}</span>
                <span className="text-xs text-muted-foreground">
                  {stateItems.length}
                </span>
              </div>
            </div>

            <div className="space-y-2 mt-2">
              {stateItems.map((item) => (
                <Card
                  key={item.id}
                  className={cn(
                    'p-3 cursor-pointer hover:shadow-md transition-shadow',
                    selectedItems.includes(item.id) && 'ring-2 ring-primary'
                  )}
                  onClick={() => onItemClick(item.id)}
                >
                  <div className="font-mono text-xs text-muted-foreground mb-1">
                    {item.displayId}
                  </div>
                  <div className="text-sm font-medium mb-2">{item.name}</div>
                  
                  <div className="flex items-center gap-2">
                    {item.health && (
                      <div
                        className={cn(
                          'h-2 w-2 rounded-full',
                          {
                            green: 'bg-green-500',
                            yellow: 'bg-yellow-500',
                            red: 'bg-red-500',
                            gray: 'bg-gray-400',
                          }[item.health]
                        )}
                      />
                    )}
                    
                    {item.points !== undefined && (
                      <span className="text-xs text-muted-foreground">
                        {item.points} pts
                      </span>
                    )}

                    {item.mvp && (
                      <span className="ml-auto px-2 py-0.5 text-xs bg-primary text-primary-foreground rounded">
                        MVP
                      </span>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
