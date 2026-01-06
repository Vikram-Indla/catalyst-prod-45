import { Link2, Plus, ExternalLink, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { LinkedItem } from '@/types/release';

interface LinkedItemsPanelProps {
  linkedItems: LinkedItem[];
  isEditMode: boolean;
  onRemoveItem?: (id: string) => void;
  onAddItem?: () => void;
}

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'story': return '📖';
    case 'defect': return '🐛';
    case 'task': return '✓';
    case 'epic': return '⚡';
    default: return '📌';
  }
};

const getTypeColor = (type: string) => {
  switch (type) {
    case 'story': return 'bg-workitem-story/20 text-workitem-story';
    case 'defect': return 'bg-destructive/20 text-destructive';
    case 'task': return 'bg-[var(--sem-info-bg)] text-[var(--sem-info)]';
    case 'epic': return 'bg-workitem-epic/20 text-workitem-epic';
    default: return 'bg-muted text-muted-foreground';
  }
};

export function LinkedItemsPanel({
  linkedItems,
  isEditMode,
  onRemoveItem,
  onAddItem,
}: LinkedItemsPanelProps) {
  return (
    <div className="bg-white dark:bg-card border border-[#E8E8E8] dark:border-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Link2 className="w-4 h-4 text-[#8C8C8C] dark:text-muted-foreground" />
          <h4 className="text-sm font-semibold text-foreground">Linked Items</h4>
        </div>
        <span className="text-xs text-muted-foreground">{linkedItems.length}</span>
      </div>

      <div className="space-y-2">
        {linkedItems.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-2">No linked items</p>
        ) : (
          linkedItems.map(item => (
            <div 
              key={item.id} 
              className="flex items-center justify-between p-2 rounded-md hover:bg-muted group"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span>{getTypeIcon(item.type)}</span>
                <Badge variant="secondary" className={getTypeColor(item.type) + " text-[10px] uppercase"}>
                  {item.type}
                </Badge>
                <span className="text-xs font-medium text-[#2563eb] dark:text-[#60a5fa]">{item.id}</span>
                <span className="text-xs text-muted-foreground truncate">{item.summary}</span>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                </Button>
                {isEditMode && onRemoveItem && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 w-6 p-0 hover:text-red-500"
                    onClick={() => onRemoveItem(item.id)}
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <Button 
        variant="ghost" 
        size="sm" 
        className="w-full mt-2 h-8 text-[#2563eb] dark:text-[#60a5fa] hover:text-[#1d4ed8] dark:hover:text-[#93c5fd] hover:bg-[#2563eb]/10 dark:hover:bg-[#3b82f6]/10"
        onClick={onAddItem}
      >
        <Plus className="w-3.5 h-3.5 mr-1" />
        Link work item
      </Button>
    </div>
  );
}
