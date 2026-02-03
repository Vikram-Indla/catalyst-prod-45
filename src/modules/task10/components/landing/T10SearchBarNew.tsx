// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT: T10SearchBarNew
// Purpose: Ghost-style search with "/" keyboard shortcut hint
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Search } from 'lucide-react';
import { debounce } from '../../utils';

interface T10SearchBarNewProps {
  onSearch: (query: string) => void;
}

export function T10SearchBarNew({ onSearch }: T10SearchBarNewProps) {
  const [value, setValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced search
  const debouncedSearch = useCallback(
    debounce((query: string) => {
      onSearch(query);
      console.log('[T10] Search:', query || '(cleared)');
    }, 300),
    [onSearch]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setValue(query);
    debouncedSearch(query);
  };

  // Global "/" shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="t10-search-ghost">
      <Search className="t10-search-ghost-icon" size={16} />
      <input
        ref={inputRef}
        type="text"
        className="t10-search-ghost-input"
        placeholder="Search lists..."
        value={value}
        onChange={handleChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      />
      {!isFocused && !value && (
        <kbd className="t10-search-ghost-kbd">/</kbd>
      )}
    </div>
  );
}

export default T10SearchBarNew;
