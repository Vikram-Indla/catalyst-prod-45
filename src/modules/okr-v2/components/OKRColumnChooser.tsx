import { useState } from 'react';
import { Settings2, GripVertical, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export interface OKRColumn {
  key: string;
  label: string;
  visible: boolean;
  locked?: boolean; // Cannot be hidden
}

interface OKRColumnChooserProps {
  columns: OKRColumn[];
  onColumnsChange: (columns: OKRColumn[]) => void;
}

export const DEFAULT_OKR_COLUMNS: OKRColumn[] = [
  { key: 'objective', label: 'Objective', visible: true, locked: true },
  { key: 'theme', label: 'Theme', visible: true },
  { key: 'owner', label: 'Owner', visible: false },
  { key: 'status', label: 'Status', visible: true },
  { key: 'progress', label: 'Progress vs Plan', visible: true },
  { key: 'startDate', label: 'Start Date', visible: false },
  { key: 'dueDate', label: 'Due Date', visible: false },
  { key: 'risks', label: 'Risks', visible: true },
  { key: 'krs', label: 'KRs', visible: true },
];

export function OKRColumnChooser({ columns, onColumnsChange }: OKRColumnChooserProps) {
  const [open, setOpen] = useState(false);

  const toggleColumn = (key: string) => {
    const updated = columns.map(col =>
      col.key === key && !col.locked
        ? { ...col, visible: !col.visible }
        : col
    );
    onColumnsChange(updated);
  };

  const visibleCount = columns.filter(c => c.visible).length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs"
        >
          <Settings2 className="h-3.5 w-3.5" />
          Columns
          {visibleCount < columns.length && (
            <span className="ml-1 text-muted-foreground">({visibleCount})</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-2 z-[300]">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground px-2 py-1">
            Toggle columns
          </p>
          {columns.map((col) => (
            <button
              key={col.key}
              type="button"
              onClick={() => toggleColumn(col.key)}
              disabled={col.locked}
              className={cn(
                'flex items-center gap-2 w-full px-2 py-1.5 rounded-sm text-sm transition-colors',
                col.locked
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:bg-muted cursor-pointer'
              )}
            >
              <div
                className={cn(
                  'h-4 w-4 rounded border flex items-center justify-center flex-shrink-0',
                  col.visible
                    ? 'bg-brand-gold border-brand-gold'
                    : 'border-border'
                )}
              >
                {col.visible && <Check className="h-3 w-3 text-white" />}
              </div>
              <span className="truncate">{col.label}</span>
              {col.locked && (
                <span className="text-xs text-muted-foreground ml-auto">Required</span>
              )}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}