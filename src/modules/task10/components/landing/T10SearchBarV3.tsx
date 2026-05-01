// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT: T10SearchBarV3
// Purpose: Full-width search bar with placeholder text
// Matches reference screenshot
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useRef, useEffect } from 'react';
import { Search } from 'lucide-react';

interface T10SearchBarV3Props {
  value: string;
  onChange: (value: string) => void;
}

export function T10SearchBarV3({ value, onChange }: T10SearchBarV3Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  // "/" keyboard shortcut to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === '/' && 
        !e.metaKey && 
        !e.ctrlKey &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div 
      style={{
        position: 'relative',
        marginBottom: '16px',
      }}
    >
      <Search 
        size={18}
        style={{
          position: 'absolute',
          left: '16px',
          top: '50%',
          transform: 'translateY(-50%)',
          color: 'var(--ds-text-subtlest, #94a3b8)',
          pointerEvents: 'none',
        }}
      />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search lists, task number, or keyword..."
        style={{
          width: '100%',
          height: '48px',
          padding: '0 16px 0 48px',
          fontSize: '14px',
          color: 'var(--ds-text, #0f172a)',
          backgroundColor: 'var(--ds-surface, #ffffff)',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          outline: 'none',
          transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
        }}
        onFocus={(e) => {
          e.target.style.borderColor = 'var(--ds-text-brand, #3b82f6)';
          e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
        }}
        onBlur={(e) => {
          e.target.style.borderColor = 'var(--ds-border, #e2e8f0)';
          e.target.style.boxShadow = 'none';
        }}
      />
    </div>
  );
}

export default T10SearchBarV3;
