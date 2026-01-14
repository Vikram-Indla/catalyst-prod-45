// ============================================================
// CHECKLIST SECTION COMPONENT
// Progress ring + toggleable checklist items
// ============================================================

import { useState } from 'react';
import { CheckSquare, Plus, X, Check, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CATALYST_COLORS } from '../../types/kanban';
import type { ChecklistItem } from '../../hooks/useTaskDetails';
import { 
  useToggleChecklistItem, 
  useAddChecklistItem, 
  useDeleteChecklistItem 
} from '../../hooks/useTaskDetails';
import { ProgressRing } from './ProgressRing';

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

  const completedCount = items?.filter(i => i.is_completed).length || 0;
  const totalCount = items?.length || 0;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const handleAddItem = () => {
    if (!newItemText.trim()) return;
    addItem.mutate({ taskId, text: newItemText.trim() });
    setNewItemText('');
  };

  return (
    <div className="space-y-3">
      {/* Header with progress */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ProgressRing progress={progress} size={40} strokeWidth={4} />
          <div>
            <div className="flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-semibold text-foreground">Checklist</span>
            </div>
            <span className="text-xs text-muted-foreground">
              {completedCount} of {totalCount} completed
            </span>
          </div>
        </div>
        
        <Button variant="ghost" size="sm" className="h-7 text-xs">
          <Sparkles className="w-3.5 h-3.5 mr-1" />
          AI Generate
        </Button>
      </div>
      
      {/* Checklist items */}
      <div className="space-y-1">
        {items?.map(item => (
          <ChecklistItemRow
            key={item.id}
            item={item}
            onToggle={() => toggleItem.mutate({ id: item.id, is_completed: !item.is_completed })}
            onDelete={() => deleteItem.mutate(item.id)}
          />
        ))}
        
        {/* Add item input */}
        {isAdding ? (
          <div className="flex items-center gap-2 pl-7">
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
              <Check className="w-3.5 h-3.5" />
            </Button>
          </div>
        ) : (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors py-2 pl-7"
          >
            <Plus className="w-3.5 h-3.5" />
            Add item
          </button>
        )}
      </div>
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
      className="group flex items-center gap-2 py-1.5 px-2 -mx-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
      onClick={onToggle}
    >
      <div 
        className={cn(
          "w-5 h-5 rounded border-2 flex items-center justify-center transition-all",
          item.is_completed 
            ? "bg-primary border-primary" 
            : "border-muted-foreground/30 hover:border-primary/50"
        )}
      >
        {item.is_completed && <Check className="w-3 h-3 text-primary-foreground" />}
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
        className="w-6 h-6 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
