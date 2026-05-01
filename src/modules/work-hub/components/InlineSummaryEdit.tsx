import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface InlineSummaryEditProps {
  value: string;
  onChange: (value: string) => void;
  isSelected?: boolean;
}

export function InlineSummaryEdit({ value, onChange, isSelected }: InlineSummaryEditProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (editValue !== value) {
      onChange(editValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur();
    } else if (e.key === 'Escape') {
      setEditValue(value);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <Input
        ref={inputRef}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onClick={(e) => e.stopPropagation()}
        className="h-7 text-sm text-foreground border-[var(--ds-text-brand,var(--ds-text-brand, #2563eb))] rounded-md bg-background px-1.5 focus:ring-0 focus:ring-offset-0"
      />
    );
  }

  return (
    <span 
      className={cn(
        "text-sm text-foreground truncate block cursor-text px-1.5 py-1 -mx-1.5 rounded-md hover:bg-muted",
        isSelected && "bg-[var(--ds-text-brand,var(--ds-text-brand, #2563eb))]/10"
      )}
      onDoubleClick={handleDoubleClick}
      title="Double-click to edit"
    >
      {value}
    </span>
  );
}
