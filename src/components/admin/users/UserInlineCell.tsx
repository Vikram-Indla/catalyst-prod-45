/**
 * UserInlineCell - Inline editing cells for the Users table
 * Supports: text, select, date inputs with auto-save on blur/selection
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import Textfield from '@atlaskit/textfield';
import AdsSelect from '@atlaskit/select';
import Spinner from '@atlaskit/spinner';
import EditIcon from '@atlaskit/icon/core/edit';
import { Lozenge } from '@/components/ads';
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
  const inputRef = useRef<HTMLInputElement | null>(null);
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

  const handleSelectChange = useCallback((newValue: string | null) => {
    const selectedOption = options.find(opt => opt.value === newValue);
    const displayVal = selectedOption?.label;
    handleSave(newValue, displayVal);
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
      return <Lozenge appearance="default">{value}</Lozenge>;
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
        <Textfield
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue((e.target as HTMLInputElement).value)}
          onBlur={handleTextBlur}
          onKeyDown={handleKeyDown}
          isDisabled={isSaving}
        />
        {isSaving && (
          <Spinner size="small" />
        )}
      </div>
    );
  }

  // Date input editing
  if (type === 'date' && isEditing) {
    return (
      <div className={cn("relative", className)} ref={containerRef}>
        <Textfield
          ref={inputRef}
          type="date"
          value={editValue}
          onChange={handleDateChange as any}
          onBlur={() => setIsEditing(false)}
          onKeyDown={(e: React.KeyboardEvent) => e.key === 'Escape' && setIsEditing(false)}
          isDisabled={isSaving}
        />
        {isSaving && (
          <Spinner size="small" />
        )}
      </div>
    );
  }

  // Select dropdown
  if (type === 'select') {
    const selectOptions = [
      { value: null as unknown as string, label: 'None' },
      ...options,
    ];
    const currentOption = value ? options.find(o => o.value === value) ?? null : null;
    return (
      <div className={cn("relative group", className)} style={{ opacity: isSaving ? 0.5 : 1 }}>
        <AdsSelect
          value={currentOption}
          options={selectOptions}
          onChange={(opt) => handleSelectChange(opt?.value ?? null)}
          isDisabled={isSaving}
          placeholder="None"
          formatOptionLabel={(opt: SelectOption & { value: string | null }) =>
            opt.value === null
              ? <span style={{ color: 'var(--ds-text-subtle, var(--cp-text-secondary, var(--cp-text-secondary, #44546F)))' }}>None</span>
              : showBadge
                ? <Lozenge appearance="default">{opt.label}</Lozenge>
                : opt.label
          }
          styles={{
            control: (base: object, state: { isFocused: boolean }) => ({
              ...base,
              borderColor: state.isFocused ? 'var(--ds-border-selected, #0C66E4)' : 'transparent',
              backgroundColor: 'transparent',
              boxShadow: 'none',
              minHeight: '28px',
              '&:hover': { borderColor: 'var(--ds-border, #DCDFE4)' },
            }),
          }}
        />
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
      <EditIcon label="" size="small" />
      {isSaving && (
        <Spinner size="small" />
      )}
    </div>
  );
}
