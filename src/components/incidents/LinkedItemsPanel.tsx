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
    case 'story': return 'bg-green-100 text-green-700';
    case 'defect': return 'bg-red-100 text-red-700';
    case 'task': return 'bg-blue-100 text-blue-700';
    case 'epic': return 'bg-purple-100 text-purple-700';
    default: return 'bg-gray-100 text-gray-700';
  }
};

export function LinkedItemsPanel({
  linkedItems,
  isEditMode,
  onRemoveItem,
  onAddItem,
}: LinkedItemsPanelProps) {
  return (
    <div className="bg-white border border-[#E8E8E8] rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Link2 className="w-4 h-4 text-[#8C8C8C]" />
          <h4 className="text-sm font-semibold text-[#172B4D]">Linked Items</h4>
        </div>
        <span className="text-xs text-[#8C8C8C]">{linkedItems.length}</span>
      </div>

      <div className="space-y-2">
        {linkedItems.length === 0 ? (
          <p className="text-xs text-[#8C8C8C] text-center py-2">No linked items</p>
        ) : (
          linkedItems.map(item => (
            <div 
              key={item.id} 
              className="flex items-center justify-between p-2 rounded-md hover:bg-[#F5F5F5] group"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span>{getTypeIcon(item.type)}</span>
                <Badge variant="secondary" className={getTypeColor(item.type) + " text-[10px] uppercase"}>
                  {item.type}
                </Badge>
                <span className="text-xs font-medium text-[#C69C6D]">{item.id}</span>
                <span className="text-xs text-[#5C5C5C] truncate">{item.summary}</span>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <ExternalLink className="w-3.5 h-3.5 text-[#8C8C8C]" />
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
        className="w-full mt-2 h-8 text-[#C69C6D] hover:text-[#B8894D] hover:bg-[#C69C6D]/10"
        onClick={onAddItem}
      >
        <Plus className="w-3.5 h-3.5 mr-1" />
        Link work item
      </Button>
    </div>
  );
}
