/**
 * Module 3C-4: Delete Type Selector
 */

import { cn } from '@/lib/utils';
import { Trash2, AlertTriangle } from 'lucide-react';
import { DELETE_TYPE_OPTIONS, type DeleteType } from '../../types/batch-delete';

interface DeleteTypeSelectorProps {
  selected: DeleteType;
  onSelect: (type: DeleteType) => void;
}

export function DeleteTypeSelector({ selected, onSelect }: DeleteTypeSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {DELETE_TYPE_OPTIONS.map((option) => (
        <button
          key={option.type}
          type="button"
          onClick={() => onSelect(option.type)}
          className={cn(
            'flex flex-col items-start gap-3 rounded-lg border-2 p-4 text-left transition-all hover:border-destructive/50',
            selected === option.type
              ? 'border-destructive bg-destructive/5'
              : 'border-border'
          )}
        >
          <div className="flex items-center gap-2">
            {option.type === 'soft' ? (
              <Trash2 className="h-5 w-5 text-amber-600" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-destructive" />
            )}
            <span className="font-semibold">{option.label}</span>
          </div>
          <p className="text-sm text-muted-foreground">{option.description}</p>
          <div
            className={cn(
              'mt-2 rounded-md px-3 py-2 text-xs',
              option.type === 'soft'
                ? 'bg-amber-50 text-amber-700'
                : 'bg-destructive/10 text-destructive'
            )}
          >
            {option.warning}
          </div>
        </button>
      ))}
    </div>
  );
}
