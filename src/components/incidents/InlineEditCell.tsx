/**
 * InlineEditCell — Inline editing for table cells
 * 
 * Supports: text input, select dropdown, toggle
 * Single click selects, Enter/double-click edits, blur/Enter saves
 */

import { useState, useRef, useEffect } from 'react';
import { Check, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

export type InlineCellType = 'text' | 'select' | 'toggle';

interface SelectOption {
  value: string;
  label: string;
}

interface InlineEditCellProps {
  type: InlineCellType;
  value: string | boolean | null;
  displayValue?: React.ReactNode;
  options?: SelectOption[];
  onSave: (value: string | boolean) => Promise<void>;
  disabled?: boolean;
  className?: string;
  textSize?: string;
}

export function InlineEditCell({
  type,
  value,
  displayValue,
  options = [],
  onSave,
  disabled = false,
  className,
  textSize = 'text-sm',
}: InlineEditCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = async () => {
    if (editValue === value) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      await onSave(editValue as string | boolean);
      setIsEditing(false);
    } catch (error) {
      setEditValue(value); // Rollback on failure
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (disabled) {
    return (
      <div className={cn(textSize, 'text-muted-foreground cursor-not-allowed', className)}>
        {displayValue ?? String(value ?? '—')}
      </div>
    );
  }

  // Toggle type - always shows switch
  if (type === 'toggle') {
    return (
      <Switch
        checked={Boolean(value)}
        onCheckedChange={async (checked) => {
          setIsSaving(true);
          try {
            await onSave(checked);
          } finally {
            setIsSaving(false);
          }
        }}
        disabled={isSaving}
        className="data-[state=checked]:bg-amber-500"
      />
    );
  }

  // Not editing - show display value
  if (!isEditing) {
    return (
      <div
        className={cn(
          textSize,
          'cursor-pointer rounded px-1 -mx-1 py-0.5 hover:bg-muted/80 transition-colors',
          className
        )}
        onClick={(e) => {
          e.stopPropagation();
          setIsEditing(true);
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          setIsEditing(true);
        }}
      >
        {displayValue ?? String(value ?? '—')}
      </div>
    );
  }

  // Editing - Text input
  if (type === 'text') {
    return (
      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
        <Input
          ref={inputRef}
          value={String(editValue ?? '')}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          disabled={isSaving}
          className="h-7 text-sm px-2"
        />
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="p-1 rounded hover:bg-emerald-100 dark:hover:bg-emerald-950/30 transition-colors"
        >
          <Check className="h-3.5 w-3.5 text-emerald-600" />
        </button>
        <button
          onClick={handleCancel}
          disabled={isSaving}
          className="p-1 rounded hover:bg-rose-100 dark:hover:bg-rose-950/30 transition-colors"
        >
          <X className="h-3.5 w-3.5 text-rose-600" />
        </button>
      </div>
    );
  }

  // Editing - Select dropdown
  if (type === 'select') {
    return (
      <div onClick={(e) => e.stopPropagation()}>
        <Select
          value={String(editValue ?? '')}
          onValueChange={async (val) => {
            setEditValue(val);
            setIsSaving(true);
            try {
              await onSave(val);
              setIsEditing(false);
            } catch {
              setEditValue(value);
            } finally {
              setIsSaving(false);
            }
          }}
          disabled={isSaving}
        >
          <SelectTrigger className="h-7 text-sm min-w-[100px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-sm">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  return null;
}
