import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface InlineTitleEditorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function InlineTitleEditor({ value, onChange, className }: InlineTitleEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleStartEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  const handleSave = () => {
    if (localValue.trim() && localValue !== value) {
      onChange(localValue.trim());
    } else {
      setLocalValue(value);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setLocalValue(value);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "w-full px-2 py-1 -mx-2 -my-1 text-sm font-medium rounded border border-primary bg-background focus:outline-none focus:ring-2 focus:ring-primary/20",
          className
        )}
      />
    );
  }

  return (
    <span
      onClick={handleStartEdit}
      className={cn(
        "font-medium text-foreground truncate max-w-[300px] cursor-text hover:bg-accent/50 rounded px-2 py-1 -mx-2 -my-1 transition-colors",
        className
      )}
      title={value}
    >
      {value}
    </span>
  );
}
