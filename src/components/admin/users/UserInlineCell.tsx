/**
 * UserInlineCell - Inline editing cells for the Users table
 * Supports: text, select, date inputs with auto-save on blur/selection
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { Pencil, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';

export type CellType = 'text' | 'select' | 'date';

interface SelectOption {
  value: string;
  label: string;
}

interface UserInlineCellProps {
  type: CellType;
  value: string | null;
  displayValue?: React.ReactNode;
  options?: SelectOption[];
  onSave: (value: string | null, displayValue?: string) => Promise<void>;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  showBadge?: boolean;
  formatDate?: boolean;
}

export function UserInlineCell({
  type,
  value,
  displayValue,
  options = [],
  onSave,
  disabled = false,
  className,
  placeholder = '-',
  showBadge = false,
  formatDate = false,
}: UserInlineCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync edit value when prop value changes (realtime updates)
  useEffect(() => {
    if (!isEditing) {
      setEditValue(value ?? '');
    }
  }, [value, isEditing]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = useCallback(async (newValue: string | null, newDisplayValue?: string) => {
    // Don't save if value hasn't changed
    if (newValue === value) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      await onSave(newValue, newDisplayValue);
    } finally {
      setIsSaving(false);
      setIsEditing(false);
    }
  }, [value, onSave]);

  const handleTextBlur = useCallback(() => {
    const trimmed = editValue.trim();
    handleSave(trimmed || null);
  }, [editValue, handleSave]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const trimmed = editValue.trim();
      handleSave(trimmed || null);
    } else if (e.key === 'Escape') {
      setEditValue(value ?? '');
      setIsEditing(false);
    }
  }, [editValue, value, handleSave]);

  const handleSelectChange = useCallback((newValue: string) => {
    const selectedOption = options.find(opt => opt.value === newValue);
    const displayVal = selectedOption?.label;
    // Handle "none" selection as null
    const actualValue = newValue === '__none__' ? null : newValue;
    handleSave(actualValue, displayVal);
  }, [options, handleSave]);

  const handleDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value || null;
    handleSave(newValue);
  }, [handleSave]);

  // Format display value for dates
  const getDisplayContent = () => {
    if (displayValue !== undefined) {
      return displayValue;
    }

    if (!value) {
      return <span className="text-muted-foreground">{placeholder}</span>;
    }

    if (formatDate && value) {
      try {
        return format(parseISO(value), 'dd MMM yyyy');
      } catch {
        return value;
      }
    }

    if (showBadge) {
      return <Badge variant="outline" className="text-xs">{value}</Badge>;
    }

    return value;
  };

  if (disabled) {
    return (
      <div className={cn("text-sm", className)}>
        {getDisplayContent()}
      </div>
    );
  }

  // Text input editing
  if (type === 'text' && isEditing) {
    return (
      <div className={cn("relative", className)} ref={containerRef}>
        <Input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleTextBlur}
          onKeyDown={handleKeyDown}
          className="h-7 text-sm py-1 px-2"
          disabled={isSaving}
        />
        {isSaving && (
          <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 animate-spin text-muted-foreground" />
        )}
      </div>
    );
  }

  // Date input editing
  if (type === 'date' && isEditing) {
    return (
      <div className={cn("relative", className)} ref={containerRef}>
        <Input
          ref={inputRef}
          type="date"
          value={editValue}
          onChange={handleDateChange}
          onBlur={() => setIsEditing(false)}
          onKeyDown={(e) => e.key === 'Escape' && setIsEditing(false)}
          className="h-7 text-sm py-1 px-2"
          disabled={isSaving}
        />
        {isSaving && (
          <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 animate-spin text-muted-foreground" />
        )}
      </div>
    );
  }

  // Select dropdown - always use Select component but show trigger on click
  if (type === 'select') {
    return (
      <div className={cn("relative group", className)}>
        <Select
          value={value || '__none__'}
          onValueChange={handleSelectChange}
          disabled={isSaving}
        >
          <SelectTrigger 
            className={cn(
              "h-auto min-h-[28px] border-transparent bg-transparent hover:bg-muted/50 hover:border-input transition-colors text-sm py-1 px-2",
              isSaving && "opacity-50"
            )}
          >
            <SelectValue>
              {isSaving ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                getDisplayContent()
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">
              <span className="text-muted-foreground">None</span>
            </SelectItem>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  // Default display mode - click to edit
  return (
    <div
      className={cn(
        "group relative cursor-pointer hover:bg-muted/50 rounded px-2 py-1 -mx-2 transition-colors min-h-[28px] flex items-center",
        className
      )}
      onClick={() => setIsEditing(true)}
    >
      <span className="text-sm flex-1">{getDisplayContent()}</span>
      <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity ml-1 flex-shrink-0" />
      {isSaving && (
        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground ml-1" />
      )}
    </div>
  );
}
