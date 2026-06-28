/**
 * Add Column Modal
 * Create new status columns with name and color selection
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Check } from '@/lib/atlaskit-icons';
import { useCreateColumn } from '../../hooks/useColumnManagement';
import { cn } from '@/lib/utils';

interface AddColumnModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// task_statuses.color is varchar(7) — these are persisted DATA values (plain
// hex), not UI style tokens. Existing seed statuses store plain hex (var(--ds-text-disabled, #9ca3af)).
// Do NOT use var(--ds-*) token strings here: they exceed 7 chars and overflow
// the column. The swatch renders identically via backgroundColor.
const STATUS_COLORS = [
  { name: 'Slate', value: 'var(--ds-text-disabled, #8590A2)' },
  { name: 'Blue', value: 'var(--ds-background-information-bold, #3b82f6)' },
  { name: 'Teal', value: 'var(--ds-icon-information, #1D7AFC)' },
  { name: 'Green', value: 'var(--ds-background-success-bold, #1F845A)' },
  { name: 'Yellow', value: 'var(--ds-background-warning-bold, #E2B203)' },
  { name: 'Orange', value: 'var(--ds-background-warning-bold, #E2B203)' },
  { name: 'Red', value: 'var(--ds-background-danger-bold, #ef4444)' },
  { name: 'Purple', value: 'var(--ds-background-discovery-bold, #6E5DC6)' },
  { name: 'Pink', value: 'var(--ds-background-accent-magenta-bolder, #BE185D)' },
  { name: 'Cyan', value: 'var(--ds-icon-information, #1D7AFC)' },
  { name: 'Amber', value: 'var(--ds-background-warning-bold, #f59e0b)' },
  { name: 'Emerald', value: 'var(--ds-background-success-bold, #1F845A)' },
];

export function AddColumnModal({ open, onOpenChange }: AddColumnModalProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('var(--ds-text-disabled, #8590A2)');
  
  const createColumn = useCreateColumn();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) return;

    try {
      await createColumn.mutateAsync({ name: name.trim(), color });
      setName('');
      setColor('var(--ds-text-disabled, #8590A2)');
      onOpenChange(false);
    } catch {
      // Error handled in hook
    }
  };

  const handleClose = () => {
    setName('');
    setColor('var(--ds-text-disabled, #8590A2)');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[400px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Column</DialogTitle>
            <DialogDescription>
              Create a new status column for your board.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Column Name */}
            <div className="grid gap-2">
              <Label htmlFor="column-name">Column Name</Label>
              <Input
                id="column-name"
                placeholder="e.g., QA Testing, Blocked, On Hold"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                maxLength={50}
              />
            </div>

            {/* Color Selection */}
            <div className="grid gap-2">
              <Label>Status Color</Label>
              <div className="grid grid-cols-6 gap-2">
                {STATUS_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setColor(c.value)}
                    className={cn(
                      'w-8 h-8 rounded-full transition-all duration-150 flex items-center justify-center',
                      'hover:scale-110 hover:ring-2 hover:ring-offset-2',
                      color === c.value && 'ring-2 ring-offset-2 ring-slate-400'
                    )}
                    style={{ backgroundColor: c.value }}
                    title={c.name}
                  >
                    {color === c.value && (
                      <Check className="w-4 h-4 text-white drop-shadow-sm" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Preview */}
            <div className="grid gap-2">
              <Label>Preview</Label>
              <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-[var(--ds-surface-raised,var(--cp-ink-1, #1A1A1A))] rounded-lg">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="text-sm font-medium text-slate-700 dark:text-[var(--ds-text,var(--cp-bg-neutral, #EDEDED))]">
                  {name || 'Column Name'}
                </span>
                <span className="text-xs text-slate-500 bg-slate-200 dark:bg-[var(--ds-surface-raised,var(--cp-ink-1, #1A1A1A))] dark:text-[var(--ds-text-subtlest,#A1A1A1)] px-2 py-0.5 rounded-full ml-auto">
                  0
                </span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!name.trim() || createColumn.isPending}
            >
              {createColumn.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Add Column
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
