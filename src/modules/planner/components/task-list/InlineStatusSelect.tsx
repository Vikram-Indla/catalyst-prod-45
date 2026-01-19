import { useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useKanbanStatuses } from '../../hooks/useKanbanStatuses';

interface InlineStatusSelectProps {
  value: string | null;
  status?: { id: string; name: string; color?: string } | null;
  onChange: (statusId: string) => void;
}

export function InlineStatusSelect({ value, status, onChange }: InlineStatusSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { data: statuses = [] } = useKanbanStatuses();

  const currentStatus = status || statuses.find(s => s.id === value);

  const handleSelect = (statusId: string) => {
    onChange(statusId);
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold hover:bg-accent transition-colors"
          style={{
            backgroundColor: currentStatus?.color ? `${currentStatus.color}15` : undefined,
            color: currentStatus?.color,
            border: currentStatus?.color ? `1px solid ${currentStatus.color}30` : undefined,
          }}
        >
          <span 
            className="w-2 h-2 rounded-full" 
            style={{ backgroundColor: currentStatus?.color || 'currentColor' }}
          />
          {currentStatus?.name || 'No Status'}
          <ChevronDown className="w-3 h-3 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-48 p-1 bg-popover" 
        align="start"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-0.5">
          {statuses.map((s) => (
            <button
              key={s.id}
              onClick={() => handleSelect(s.id)}
              className={cn(
                "w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm text-left transition-colors",
                s.id === value 
                  ? "bg-accent" 
                  : "hover:bg-accent"
              )}
            >
              <span 
                className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
                style={{ backgroundColor: s.color }}
              />
              <span className="flex-1 truncate">{s.name}</span>
              {s.id === value && (
                <Check className="w-4 h-4 text-primary" />
              )}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
