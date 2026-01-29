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
      {/* V2 Checklist Header with Progress */}
      <div className="task-modal__checklist-header">
        <span className="task-modal__checklist-title">Checklist</span>
        <span className="task-modal__checklist-progress">
          {completed} of {total} complete ({progress}%)
          <span className="task-modal__checklist-bar">
            <span className="task-modal__checklist-fill" style={{ width: `${progress}%` }} />
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
          className="task-modal__add-checklist"
        >
          <Plus className="w-4 h-4" />
          Add checklist item
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
