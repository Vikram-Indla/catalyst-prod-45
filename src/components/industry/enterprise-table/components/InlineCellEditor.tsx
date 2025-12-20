import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface EditOption {
  value: string | number | boolean;
  label: string;
  color?: string;
  disabled?: boolean;
}

interface InlineCellEditorProps {
  value: any;
  type: 'text' | 'number' | 'select' | 'multi-select' | 'date' | 'datetime' | 'textarea' | 'checkbox';
  options?: EditOption[];
  onSave: (value: any) => void;
  onCancel: () => void;
  validation?: (value: any) => string | null;
  placeholder?: string;
  className?: string;
}

export function InlineCellEditor({
  value,
  type,
  options,
  onSave,
  onCancel,
  validation,
  placeholder,
  className,
}: InlineCellEditorProps) {
  const [localValue, setLocalValue] = useState(value ?? '');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      if (inputRef.current instanceof HTMLInputElement || inputRef.current instanceof HTMLTextAreaElement) {
        inputRef.current.select();
      }
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation();
    
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    } else if (e.key === 'Tab') {
      handleSave();
    }
  };

  const handleSave = () => {
    let finalValue = localValue;
    
    if (type === 'number') {
      finalValue = localValue === '' ? null : Number(localValue);
    }
    
    if (validation) {
      const validationError = validation(finalValue);
      if (validationError) {
        setError(validationError);
        return;
      }
    }
    
    onSave(finalValue);
  };

  const handleBlur = () => {
    // Small delay to allow click events on options to fire first
    setTimeout(() => {
      handleSave();
    }, 100);
  };

  // Select type
  if (type === 'select' && options) {
    return (
      <Select
        value={String(localValue)}
        onValueChange={(newValue) => {
          setLocalValue(newValue);
          onSave(newValue);
        }}
      >
        <SelectTrigger 
          className={cn(
            "h-8 w-full focus:ring-2 focus:ring-primary",
            error && "border-destructive",
            className
          )}
          autoFocus
        >
          <SelectValue placeholder={placeholder || "Select..."} />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem 
              key={String(opt.value)} 
              value={String(opt.value)}
              disabled={opt.disabled}
            >
              <span className="flex items-center gap-2">
                {opt.color && (
                  <span 
                    className="w-2 h-2 rounded-full" 
                    style={{ backgroundColor: opt.color }}
                  />
                )}
                {opt.label}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  // Textarea type
  if (type === 'textarea') {
    return (
      <div className="relative">
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={localValue}
          onChange={(e) => {
            setLocalValue(e.target.value);
            setError(null);
          }}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={3}
          className={cn(
            "w-full px-3 py-2 text-sm rounded-md border bg-background",
            "focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent",
            error && "border-destructive",
            className
          )}
        />
        {error && (
          <span className="absolute -bottom-5 left-0 text-xs text-destructive">
            {error}
          </span>
        )}
      </div>
    );
  }

  // Checkbox type
  if (type === 'checkbox') {
    return (
      <input
        type="checkbox"
        checked={Boolean(localValue)}
        onChange={(e) => {
          onSave(e.target.checked);
        }}
        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
      />
    );
  }

  // Date type
  if (type === 'date' || type === 'datetime') {
    return (
      <Input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type={type === 'datetime' ? 'datetime-local' : 'date'}
        value={localValue}
        onChange={(e) => {
          setLocalValue(e.target.value);
          setError(null);
        }}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={cn(
          "h-8 w-full focus:ring-2 focus:ring-primary",
          error && "border-destructive",
          className
        )}
      />
    );
  }

  // Default: text/number input
  return (
    <div className="relative">
      <Input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type={type === 'number' ? 'number' : 'text'}
        value={localValue}
        onChange={(e) => {
          setLocalValue(e.target.value);
          setError(null);
        }}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={cn(
          "h-8 w-full focus:ring-2 focus:ring-primary",
          error && "border-destructive",
          className
        )}
      />
      {error && (
        <span className="absolute -bottom-5 left-0 text-xs text-destructive">
          {error}
        </span>
      )}
    </div>
  );
}
