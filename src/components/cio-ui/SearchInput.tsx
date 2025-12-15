import React from 'react';
import { cn } from '@/lib/utils';
import { Search, X } from 'lucide-react';

interface SearchInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value?: string;
  onChange?: (value: string) => void;
  onClear?: () => void;
  className?: string;
}

export function SearchInput({ value, onChange, onClear, className, placeholder = 'Search...', ...props }: SearchInputProps) {
  const handleClear = () => {
    onChange?.('');
    onClear?.();
  };

  return (
    <div className={cn('relative', className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--icon-muted)]" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        className={cn(
          'w-full h-9 pl-9 pr-8',
          'bg-[var(--input-bg)] border border-[var(--input-border)] rounded-md',
          'text-sm text-[var(--input-text)]',
          'placeholder:text-[var(--input-placeholder)]',
          'transition-all duration-150',
          'focus:outline-none focus:border-[var(--accent-color)] focus:ring-2 focus:ring-[var(--focus-ring-color)]'
        )}
        {...props}
      />
      {value && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-[var(--surface-hover)] text-[var(--icon-muted)] hover:text-[var(--icon-default)]"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
