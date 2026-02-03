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
    <div style={{ marginBottom: '24px' }}>
      {/* SINGLE CONTAINER - NO NESTED RECTANGLES */}
      <div 
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          height: '48px',
          padding: '0 16px',
          backgroundColor: '#ffffff',
          border: isFocused ? '2px solid #2563eb' : '1px solid #e2e8f0',
          borderRadius: '12px',
          boxShadow: isFocused ? '0 4px 12px rgba(37, 99, 235, 0.1)' : 'none',
          transition: 'all 0.15s ease',
        }}
      >
        <Search 
          size={18} 
          style={{ 
            flexShrink: 0, 
            color: '#94a3b8',
          }} 
        />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search lists..."
          value={value}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          style={{
            flex: 1,
            height: '100%',
            padding: 0,
            margin: 0,
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: '14px',
            color: '#1e293b',
            backgroundColor: 'transparent',
            border: 'none',
            borderRadius: 0,
            outline: 'none',
            boxShadow: 'none',
            WebkitAppearance: 'none',
            appearance: 'none',
          }}
        />
        {!isFocused && !value && (
          <kbd 
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '24px',
              padding: '0 8px',
              fontSize: '12px',
              fontFamily: 'monospace',
              color: '#94a3b8',
              backgroundColor: '#f1f5f9',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
            }}
          >
            /
          </kbd>
        )}
      </div>
    </div>
  );
}

export default T10SearchBarNew;
