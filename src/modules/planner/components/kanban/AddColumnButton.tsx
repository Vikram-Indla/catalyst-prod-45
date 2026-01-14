// ============================================================
// ADD COLUMN BUTTON COMPONENT
// Button to add new Kanban columns at the end of the board
// ============================================================

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useCreateKanbanStatus } from '../../hooks/useKanbanStatuses';
import { CATALYST_COLORS } from '../../types/kanban';

type ColumnColor = typeof COLUMN_COLORS[number]['value'];

interface AddColumnButtonProps {
  className?: string;
}

const COLUMN_COLORS = [
  { value: CATALYST_COLORS.gray400, label: 'Gray' },
  { value: CATALYST_COLORS.primary, label: 'Blue' },
  { value: CATALYST_COLORS.warning, label: 'Orange' },
  { value: CATALYST_COLORS.purple, label: 'Purple' },
  { value: CATALYST_COLORS.success, label: 'Green' },
  { value: CATALYST_COLORS.teal, label: 'Teal' },
];

export function AddColumnButton({ className }: AddColumnButtonProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [selectedColor, setSelectedColor] = useState<string>(CATALYST_COLORS.primary);
  
  const createStatus = useCreateKanbanStatus();

  const handleAddColumn = async () => {
    if (!newColumnName.trim()) return;
    
    await createStatus.mutateAsync({
      name: newColumnName.trim(),
      color: selectedColor,
    });
    
    setNewColumnName('');
    setSelectedColor(CATALYST_COLORS.primary);
    setIsAdding(false);
  };

  const handleCancel = () => {
    setNewColumnName('');
    setSelectedColor(CATALYST_COLORS.primary);
    setIsAdding(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAddColumn();
    if (e.key === 'Escape') handleCancel();
  };

  if (!isAdding) {
    return (
      <div className={`flex flex-col w-[300px] min-w-[300px] ${className}`}>
        <button
          onClick={() => setIsAdding(true)}
          className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-border rounded-xl text-muted-foreground font-medium text-sm hover:border-primary hover:text-primary hover:bg-primary/5 transition-all"
        >
          <Plus className="w-4 h-4" />
          Add Column
        </button>
      </div>
    );
  }

  return (
    <div className={`flex flex-col w-[300px] min-w-[300px] bg-card border border-border rounded-xl p-4 ${className}`}>
      <Input
        value={newColumnName}
        onChange={(e) => setNewColumnName(e.target.value)}
        placeholder="Column name..."
        autoFocus
        className="mb-3"
        onKeyDown={handleKeyDown}
      />
      
      {/* Color Picker */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs text-muted-foreground">Color:</span>
        <div className="flex gap-1.5">
          {COLUMN_COLORS.map((color) => (
            <button
              key={color.value}
              onClick={() => setSelectedColor(color.value)}
              className={`w-6 h-6 rounded-full transition-all ${
                selectedColor === color.value 
                  ? 'ring-2 ring-offset-2 ring-primary' 
                  : 'hover:scale-110'
              }`}
              style={{ backgroundColor: color.value }}
              title={color.label}
            />
          ))}
        </div>
      </div>
      
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleCancel}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={handleAddColumn}
          disabled={!newColumnName.trim() || createStatus.isPending}
          className="flex-1"
        >
          {createStatus.isPending ? 'Adding...' : 'Add'}
        </Button>
      </div>
    </div>
  );
}
