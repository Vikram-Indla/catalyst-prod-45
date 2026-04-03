/**
 * WorkHubDatePicker — Date picker using shadcn Calendar in Popover
 */
import { useState } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';

interface WorkHubDatePickerProps {
  value: string | null;
  onChange: (date: string | null) => void;
  placeholder?: string;
  compact?: boolean;
}

export default function WorkHubDatePicker({ value, onChange, placeholder = '— Set date', compact = false }: WorkHubDatePickerProps) {
  const [open, setOpen] = useState(false);
  const date = value ? new Date(value) : undefined;

  const handleSelect = (d: Date | undefined) => {
    onChange(d ? d.toISOString().split('T')[0] : null);
    setOpen(false);
  };

  const displayText = date ? (compact ? format(date, 'dd MMM yy') : format(date, 'MMM d, yyyy')) : placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          fontSize: 13, color: date ? 'var(--fg-1)' : 'var(--fg-4)',
          fontFamily: date && compact ? "'JetBrains Mono', monospace" : 'Inter, sans-serif',
          cursor: 'pointer', background: 'transparent', border: 'none', padding: 0,
        }}>
          {!compact && <CalendarIcon size={14} style={{ color: 'var(--fg-4)' }} />}
          {displayText}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start" style={{ zIndex: 9999 }}>
        <Calendar mode="single" selected={date} onSelect={handleSelect} initialFocus className={cn('p-3 pointer-events-auto')} />
        {date && (
          <div style={{ padding: '0 12px 8px', display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={() => { onChange(null); setOpen(false); }} style={{ fontSize: 12, color: 'var(--sem-danger)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
              <X size={12} /> Clear
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
