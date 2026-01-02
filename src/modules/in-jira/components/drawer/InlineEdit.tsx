/**
 * Inline Edit Component
 * Allows inline editing of text fields with click-to-edit behavior
 */

import React, { useState, useRef, useEffect } from 'react';
import { Check, X, Pencil } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface InlineEditProps {
  value: string;
  onSave: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  className?: string;
  displayClassName?: string;
  inputClassName?: string;
  disabled?: boolean;
}

export function InlineEdit({
  value,
  onSave,
  placeholder = 'Click to edit',
  multiline = false,
  className,
  displayClassName,
  inputClassName,
  disabled = false,
}: InlineEditProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  const handleSave = () => {
    if (editValue.trim() !== value) {
      onSave(editValue.trim());
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !multiline) {
      e.preventDefault();
      handleSave();
    }
    if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div className={cn("flex gap-1", className)}>
        {multiline ? (
          <Textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            className={cn("min-h-[80px]", inputClassName)}
            placeholder={placeholder}
          />
        ) : (
          <Input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className={inputClassName}
            placeholder={placeholder}
          />
        )}
        <div className="flex flex-col gap-1">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleSave}>
            <Check className="h-3 w-3 text-green-600" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCancel}>
            <X className="h-3 w-3 text-red-600" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group relative cursor-pointer hover:bg-surface-hover rounded px-1 py-0.5 -mx-1 transition-colors",
        disabled && "cursor-default hover:bg-transparent",
        className
      )}
      onClick={() => !disabled && setIsEditing(true)}
    >
      <span className={cn(
        "block",
        !value && "text-text-tertiary italic",
        displayClassName
      )}>
        {value || placeholder}
      </span>
      {!disabled && (
        <Pencil className="absolute right-1 top-1/2 -translate-y-1/2 h-3 w-3 text-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
    </div>
  );
}

export default InlineEdit;
