import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { CalendarIcon, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PROCESS_STEPS, DELIVERY_PLATFORM_OPTIONS } from '@/types/business-request';

interface InlineEditableCellProps {
  value: string | null | undefined;
  field: string;
  requestId: string;
  onSave: (requestId: string, field: string, value: any) => void;
  type?: 'text' | 'select' | 'date' | 'user';
  options?: { value: string; label: string }[];
  displayValue?: React.ReactNode;
  className?: string;
}

const USER_OPTIONS = [
  { value: 'Ibrahim Q', label: 'Ibrahim Q' },
  { value: 'Alaa Ali', label: 'Alaa Ali' },
  { value: 'Mohammed A', label: 'Mohammed A' },
  { value: 'Sarah J', label: 'Sarah J' },
  { value: 'Omar K', label: 'Omar K' },
  { value: 'Fatima K', label: 'Fatima K' },
  { value: 'Yusuf H', label: 'Yusuf H' },
  { value: 'Rania B', label: 'Rania B' },
];

// DEPARTMENT_OPTIONS imported from business-request.ts (single source of truth)

const QUARTER_OPTIONS = [
  { value: 'Q1 2024', label: 'Q1 2024' },
  { value: 'Q2 2024', label: 'Q2 2024' },
  { value: 'Q3 2024', label: 'Q3 2024' },
  { value: 'Q4 2024', label: 'Q4 2024' },
  { value: 'Q1 2025', label: 'Q1 2025' },
  { value: 'Q2 2025', label: 'Q2 2025' },
  { value: 'Q3 2025', label: 'Q3 2025' },
  { value: 'Q4 2025', label: 'Q4 2025' },
];

export function InlineEditableCell({
  value,
  field,
  requestId,
  onSave,
  type = 'text',
  options,
  displayValue,
  className,
}: InlineEditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value || '');
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    setEditValue(value || '');
  }, [value]);

  const handleSave = () => {
    if (editValue !== value) {
      onSave(requestId, field, editValue || null);
    }
    setIsEditing(false);
    setIsOpen(false);
  };

  const handleCancel = () => {
    setEditValue(value || '');
    setIsEditing(false);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const getOptions = () => {
    if (options) return options;
    switch (field) {
      case 'process_step':
        return PROCESS_STEPS.map(s => ({ value: s.value, label: s.label }));
      case 'delivery_platform':
        return DELIVERY_PLATFORM_OPTIONS.map(p => ({ value: p.value, label: p.label.en }));
      case 'department':
        // Department options must be passed via props from parent (ZERO-SEED policy)
        return options || [];
      case 'requestor':
      case 'business_owner':
      case 'created_by':
        return USER_OPTIONS;
      case 'planned_quarter':
        return QUARTER_OPTIONS;
      default:
        return [];
    }
  };

  // Determine type based on field if not specified
  const effectiveType = type || (() => {
    if (['process_step', 'delivery_platform', 'department', 'planned_quarter'].includes(field)) {
      return 'select';
    }
    if (['requestor', 'business_owner', 'created_by'].includes(field)) {
      return 'user';
    }
    if (field === 'end_date') {
      return 'date';
    }
    return 'text';
  })();

  const renderDisplay = () => (
    <div
      className={cn(
        "w-full h-full px-1 py-0.5 cursor-pointer hover:bg-[#EBECF0] rounded transition-colors min-h-[24px] flex items-center",
        className
      )}
      onClick={(e) => {
        e.stopPropagation();
        setIsEditing(true);
        if (effectiveType === 'select' || effectiveType === 'user' || effectiveType === 'date') {
          setIsOpen(true);
        }
      }}
    >
      {displayValue || <span className="text-[14px] text-[#172B4D] truncate">{value || '-'}</span>}
    </div>
  );

  if (effectiveType === 'select' || effectiveType === 'user') {
    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          {renderDisplay()}
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0 bg-white shadow-lg border z-[9999]" align="start" onClick={(e) => e.stopPropagation()}>
          <div className="max-h-[300px] overflow-y-auto">
            {getOptions().map((opt) => (
              <div
                key={opt.value}
                className={cn(
                  "px-3 py-2 cursor-pointer hover:bg-[#F4F5F7] flex items-center gap-2 text-[14px]",
                  editValue === opt.value && "bg-[#E9F2FF]"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  onSave(requestId, field, opt.value);
                  setIsOpen(false);
                }}
              >
                {effectiveType === 'user' && (
                  <div className="w-6 h-6 rounded-full bg-brand-gold text-white flex items-center justify-center text-[10px] font-medium">
                    {opt.label.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                )}
                <span className="flex-1">{opt.label}</span>
                {editValue === opt.value && <Check className="h-4 w-4 text-brand-gold" />}
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  if (effectiveType === 'date') {
    const dateValue = value ? new Date(value) : undefined;
    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          {renderDisplay()}
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 bg-white shadow-lg border z-[9999]" align="start" onClick={(e) => e.stopPropagation()}>
          <Calendar
            mode="single"
            selected={dateValue}
            onSelect={(date) => {
              if (date) {
                onSave(requestId, field, format(date, 'yyyy-MM-dd'));
              }
              setIsOpen(false);
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    );
  }

  // Text input
  if (isEditing) {
    return (
      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
        <Input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          className="h-7 text-[14px] px-2 py-1"
        />
      </div>
    );
  }

  return renderDisplay();
}
