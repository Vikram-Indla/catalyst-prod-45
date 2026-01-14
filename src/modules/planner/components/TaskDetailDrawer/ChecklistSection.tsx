// ============================================================
// CHECKLIST SECTION - POLISHED
// Larger progress ring, styled AI button, better add item
// ============================================================

import { useState } from 'react';
import { CheckSquare, Plus, X, Check, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
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
    <div className="space-y-4">
      {/* Header with Progress Ring */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* LARGER Progress Ring - 48px */}
          <ProgressRing progress={progress} size={48} strokeWidth={4} />
          <div>
            <div className="flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-semibold text-gray-700">Checklist</span>
            </div>
            <span className="text-xs text-gray-400">
              {totalCount > 0 ? `${completedCount} of ${totalCount} completed` : 'No items yet'}
            </span>
          </div>
        </div>
        
        {/* Styled AI Generate Button */}
        <Button 
          variant="outline" 
          size="sm" 
          className="h-7 text-xs font-medium border-primary text-primary hover:bg-primary hover:text-white transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5 mr-1.5" />
          AI Generate
        </Button>
      </div>
      
      {/* Checklist items */}
      <div className="space-y-1.5">
        {items?.map(item => (
          <ChecklistItemRow
            key={item.id}
            item={item}
            onToggle={() => toggleItem.mutate({ id: item.id, is_completed: !item.is_completed })}
            onDelete={() => deleteItem.mutate(item.id)}
          />
        ))}
        
        {/* Styled Add Item */}
        {isAdding ? (
          <div className="flex items-center gap-2.5 p-2.5 border border-primary bg-blue-50/50 rounded-lg">
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
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
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
            className="w-full flex items-center gap-2.5 p-2.5 border border-dashed border-gray-300 rounded-lg text-xs text-gray-400 hover:border-primary hover:text-primary hover:bg-blue-50/50 transition-all"
          >
            <Plus className="w-4 h-4" />
            Add checklist item...
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
      className="group flex items-center gap-2.5 py-2 px-2.5 -mx-0.5 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
      onClick={onToggle}
    >
      <div 
        className={cn(
          "w-5 h-5 rounded border-2 flex items-center justify-center transition-all",
          item.is_completed 
            ? "bg-primary border-primary" 
            : "border-gray-300 hover:border-primary/50"
        )}
      >
        {item.is_completed && <Check className="w-3 h-3 text-primary-foreground" />}
      </div>
      
      <span 
        className={cn(
          "flex-1 text-sm transition-colors",
          item.is_completed && "line-through text-gray-400"
        )}
      >
        {item.text}
      </span>
      
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="w-6 h-6 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 transition-all"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
