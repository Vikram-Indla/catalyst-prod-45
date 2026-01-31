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

  // Calculate progress
  const completed = items?.filter(i => i.is_completed).length || 0;
  const total = items?.length || 0;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div>
      {/* Progress indicator only (no duplicate header) */}
      <div className="task-modal__checklist-header mb-3">
        <span className="task-modal__checklist-progress text-xs text-muted-foreground">
          {completed} of {total} complete ({progress}%)
          <span className="task-modal__checklist-bar ml-2 inline-block w-24 h-1.5 bg-muted rounded-full overflow-hidden align-middle">
            <span className="task-modal__checklist-fill block h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
          </span>
        </span>
      </div>

      {/* Items */}
      <div className="task-modal__checklist-items">
        {items?.map(item => (
          <ChecklistItemRow
            key={item.id}
            item={item}
            onToggle={() => toggleItem.mutate({ id: item.id, is_completed: !item.is_completed })}
            onDelete={() => deleteItem.mutate(item.id)}
          />
        ))}
      </div>
      
      {/* Add Item */}
      {/* Add Item - Always visible input */}
      <div className="flex items-center gap-3 mt-3 py-2.5 px-3 bg-muted/20 rounded-lg hover:bg-muted/30 transition-colors">
        <Plus className="w-4 h-4 text-primary flex-shrink-0" />
        <input
          value={newItemText}
          onChange={(e) => setNewItemText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && newItemText.trim()) handleAddItem();
          }}
          onFocus={() => setIsAdding(true)}
          placeholder="Add checklist item..."
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60 min-w-0"
        />
        {newItemText.trim() && (
          <Button 
            size="sm" 
            variant="ghost" 
            className="h-7 w-7 p-0 hover:bg-primary/10"
            onClick={handleAddItem}
          >
            <Check className="w-4 h-4 text-primary" />
          </Button>
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
      className="task-modal__checklist-item group"
      onClick={onToggle}
    >
      <div 
        className={cn(
          "task-modal__checkbox",
          item.is_completed && "task-modal__checkbox--checked"
        )}
      >
        {item.is_completed && '✓'}
      </div>
      
      <span 
        className={cn(
          "task-modal__checklist-text",
          item.is_completed && "task-modal__checklist-text--completed"
        )}
      >
        {item.text}
      </span>
      
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="task-modal__checklist-delete"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}
