// ============================================================
// CHECKLIST SECTION - CONTENT ONLY (no header, wrapped by CollapsibleSection)
// ============================================================

import { useState } from 'react';
import { Plus, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ChecklistItem } from '../../hooks/useTaskDetails';
import { 
  useToggleChecklistItem, 
  useAddChecklistItem, 
  useDeleteChecklistItem 
} from '../../hooks/useTaskDetails';

interface ChecklistSectionProps {
  taskId: string;
  items: ChecklistItem[];
}

export function ChecklistSection({ taskId, items }: ChecklistSectionProps) {
  const toggleItem = useToggleChecklistItem();
  const addItem = useAddChecklistItem();
  const deleteItem = useDeleteChecklistItem();
  const [newItemText, setNewItemText] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleAddItem = () => {
    if (!newItemText.trim()) return;
    addItem.mutate({ taskId, text: newItemText.trim() });
    setNewItemText('');
  };

  // CONTENT ONLY - no header (CollapsibleSection provides the header)
  return (
    <div className="space-y-1.5">
      {items?.length === 0 && !isAdding ? (
        <p className="text-sm text-muted-foreground text-center py-2">
          No items yet
        </p>
      ) : (
        items?.map(item => (
          <ChecklistItemRow
            key={item.id}
            item={item}
            onToggle={() => toggleItem.mutate({ id: item.id, is_completed: !item.is_completed })}
            onDelete={() => deleteItem.mutate(item.id)}
          />
        ))
      )}
      
      {/* Add Item */}
      {isAdding ? (
        <div className="flex items-center gap-2 p-2 border border-primary/50 bg-primary/5 rounded-lg">
          <Plus className="w-4 h-4 text-primary" />
          <input
            autoFocus
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddItem();
              if (e.key === 'Escape') {
                setIsAdding(false);
                setNewItemText('');
              }
            }}
            onBlur={() => {
              if (!newItemText.trim()) setIsAdding(false);
            }}
            placeholder="Add checklist item..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <Button 
            size="sm" 
            variant="ghost" 
            className="h-6 w-6 p-0"
            onClick={handleAddItem}
          >
            <Check className="w-3.5 h-3.5 text-primary" />
          </Button>
        </div>
      ) : (
        <button
          onClick={() => setIsAdding(true)}
          className="w-full flex items-center gap-2 p-2 border border-dashed border-muted-foreground/30 rounded-lg text-xs text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5 transition-all"
        >
          <Plus className="w-4 h-4" />
          Add item...
        </button>
      )}
    </div>
  );
}

function ChecklistItemRow({ 
  item, 
  onToggle, 
  onDelete 
}: { 
  item: ChecklistItem; 
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <div 
      className="group flex items-center gap-2.5 py-1.5 px-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
      onClick={onToggle}
    >
      <div 
        className={cn(
          "w-4 h-4 rounded border-2 flex items-center justify-center transition-all flex-shrink-0",
          item.is_completed 
            ? "bg-primary border-primary" 
            : "border-muted-foreground/40 hover:border-primary/50"
        )}
      >
        {item.is_completed && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
      </div>
      
      <span 
        className={cn(
          "flex-1 text-sm transition-colors",
          item.is_completed && "line-through text-muted-foreground"
        )}
      >
        {item.text}
      </span>
      
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="w-5 h-5 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}
