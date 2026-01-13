// ============================================================
// SEARCHABLE SELECT COMPONENT
// Enterprise-grade dropdown with search, grouping, and custom rendering
// ============================================================

import { useState, useRef, useEffect, ReactNode } from 'react';
import { ChevronDown, Search, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SelectOption {
  id: string;
  label: string;
  color?: string;
  initials?: string;
  meta?: string;
  groupId?: string;
  [key: string]: unknown;
}

interface SearchableSelectProps<T extends SelectOption> {
  label?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  options: T[];
  value: string | null;
  onChange: (value: string | null) => void;
  showSearch?: boolean;
  showClear?: boolean;
  groupBy?: (option: T) => string;
  renderTrigger?: (selected: T | null) => ReactNode;
  renderOption?: (option: T) => ReactNode;
  disabled?: boolean;
  className?: string;
}

export function SearchableSelect<T extends SelectOption>({
  label,
  placeholder = 'Select...',
  searchPlaceholder = 'Search...',
  options,
  value,
  onChange,
  showSearch = true,
  showClear = true,
  groupBy,
  renderTrigger,
  renderOption,
  disabled = false,
  className,
}: SearchableSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selected = options.find(o => o.id === value) || null;

  // Filter options by search
  const filteredOptions = options.filter(o =>
    o.label.toLowerCase().includes(search.toLowerCase())
  );

  // Group options if groupBy provided
  const groupedOptions = groupBy
    ? filteredOptions.reduce((acc, option) => {
        const group = groupBy(option);
        if (!acc[group]) acc[group] = [];
        acc[group].push(option);
        return acc;
      }, {} as Record<string, T[]>)
    : { '': filteredOptions };

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search on open
  useEffect(() => {
    if (isOpen && showSearch) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [isOpen, showSearch]);

  const handleSelect = (option: T) => {
    onChange(option.id);
    setIsOpen(false);
    setSearch('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {label && (
        <label className="block text-sm font-semibold text-foreground mb-2">
          {label}
        </label>
      )}
      
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          "w-full px-4 py-3 bg-muted/50 border rounded-xl text-sm text-left",
          "flex items-center justify-between gap-2 transition-all",
          isOpen 
            ? "bg-background border-primary ring-2 ring-primary/10" 
            : "border-border hover:border-border-strong",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <div className="flex-1 min-w-0 truncate">
          {renderTrigger ? (
            renderTrigger(selected)
          ) : selected ? (
            <div className="flex items-center gap-2">
              {selected.color && (
                <span 
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ background: selected.color }}
                />
              )}
              <span className="text-foreground truncate">{selected.label}</span>
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {showClear && selected && (
            <button
              type="button"
              onClick={handleClear}
              className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown 
            className={cn(
              "w-4 h-4 text-muted-foreground transition-transform",
              isOpen && "rotate-180"
            )}
          />
        </div>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div 
          className="absolute top-full left-0 right-0 mt-2 bg-popover border border-border rounded-xl shadow-lg z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
          style={{ maxHeight: showSearch ? '340px' : '280px' }}
        >
          {/* Search Input */}
          {showSearch && (
            <div className="p-3 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full pl-9 pr-3 py-2.5 bg-muted/50 border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:bg-background focus:border-primary focus:outline-none transition-colors"
                />
              </div>
            </div>
          )}

          {/* Options List */}
          <div className="max-h-[280px] overflow-y-auto p-2">
            {Object.entries(groupedOptions).map(([group, groupOptions]) => (
              <div key={group || 'default'}>
                {group && (
                  <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {group}
                  </div>
                )}
                {groupOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => handleSelect(option)}
                    className={cn(
                      "w-full px-3 py-2.5 rounded-lg flex items-center justify-between gap-3",
                      "transition-colors text-left",
                      option.id === value 
                        ? "bg-primary/10" 
                        : "hover:bg-muted/50"
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      {renderOption ? renderOption(option) : (
                        <div className="flex items-center gap-3">
                          {option.color && (
                            <span 
                              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                              style={{ background: option.color }}
                            />
                          )}
                          <span className="text-sm text-foreground truncate">{option.label}</span>
                        </div>
                      )}
                    </div>
                    {option.id === value && (
                      <Check className="w-4 h-4 text-primary flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            ))}
            
            {filteredOptions.length === 0 && (
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                No results found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
