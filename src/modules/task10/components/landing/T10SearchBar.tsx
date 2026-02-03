// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT: T10SearchBar
// Purpose: Real-time search with 300ms debounce
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, X } from 'lucide-react';

interface T10SearchBarProps {
  onSearch: (value: string) => void;
  placeholder?: string;
  isLoading?: boolean;
  debounceMs?: number;
}

export function T10SearchBar({
  onSearch,
  placeholder = 'Search lists and items by label, assignee, or keyword...',
  isLoading = false,
  debounceMs = 300,
}: T10SearchBarProps) {
  const [localValue, setLocalValue] = useState('');
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced onChange handler
  const debouncedOnSearch = useCallback(
    (newValue: string) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        onSearch(newValue);
        console.log('[T10] Search debounced:', newValue || '(empty)');
      }, debounceMs);
    },
    [onSearch, debounceMs]
  );

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    debouncedOnSearch(newValue);
  };

  // Handle clear
  const handleClear = () => {
    setLocalValue('');
    onSearch('');
    inputRef.current?.focus();
    console.log('[T10] Search cleared');
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && localValue) {
      e.preventDefault();
      handleClear();
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const showClear = localValue.length > 0;

  return (
    <div className="t10-search-section">
      <div className="t10-search-bar">
        <Search className="t10-search-icon" size={20} />
        <input
          ref={inputRef}
          type="text"
          className="t10-search-input"
          value={localValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label="Search lists"
        />

        {/* Loading indicator */}
        {isLoading && <div className="t10-search-loading" />}

        {/* Clear button */}
        <button
          type="button"
          className={`t10-search-clear ${showClear ? 't10-visible' : ''}`}
          onClick={handleClear}
          aria-label="Clear search"
          tabIndex={showClear ? 0 : -1}
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

export default T10SearchBar;
