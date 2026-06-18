import React from 'react';
import { SearchIcon } from '../shared/Icon';

interface SidebarSearchProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

export function SidebarSearch({ value, onChange, placeholder = 'Find a DM' }: SidebarSearchProps) {
  return (
    <div style={{ padding: '0 12px 8px' }}>
      <label
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: 10,
            color: 'var(--cv2-text-muted)',
            pointerEvents: 'none',
            display: 'inline-flex',
          }}
        >
          <SearchIcon size={14} />
        </span>
        <input
          type="search"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          style={{
            width: '100%',
            height: 32,
            padding: '0 10px 0 30px',
            background: 'var(--cv2-bg-row-hover)',
            color: 'var(--cv2-text-strong)',
            border: '1px solid var(--cv2-border)',
            borderRadius: 'var(--cv2-radius-md)',
            fontFamily: 'var(--cv2-font)',
            fontSize: 'var(--cv2-fs-search)',
            outline: 'none',
            transition: 'border-color var(--cv2-transition-fast), background var(--cv2-transition-fast)',
          }}
          onFocus={e => {
            e.currentTarget.style.borderColor = 'var(--cv2-accent)';
          }}
          onBlur={e => {
            e.currentTarget.style.borderColor = 'var(--cv2-border)';
          }}
        />
      </label>
    </div>
  );
}
