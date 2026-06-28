import React from 'react';
import { SearchIcon } from '../shared/Icon';

interface SidebarSearchProps {
  /** When provided, clicking the field opens a global chat search modal
   *  (the role the deleted purple WorkspaceSearchBar used to play). */
  onOpenSearchModal?: () => void;
  /** Local typeahead value — used when the field acts as a local filter
   *  rather than a modal trigger. */
  value?: string;
  onChange?: (v: string) => void;
  placeholder?: string;
}

export function SidebarSearch({ onOpenSearchModal, value, onChange, placeholder = 'Search conversations…' }: SidebarSearchProps) {
  // Mode A: modal trigger — render a button styled like the input.
  if (onOpenSearchModal) {
    return (
      <div style={{ padding: '0 12px 8px' }}>
        <button
          type="button"
          onClick={onOpenSearchModal}
          aria-label={placeholder}
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            width: '100%',
            height: 32,
            padding: '0 10px 0 30px',
            background: 'var(--cv2-bg-row-hover)',
            color: 'var(--cv2-text-muted)',
            border: '1px solid var(--cv2-border)',
            borderRadius: 'var(--cv2-radius-md)',
            fontFamily: 'var(--cv2-font)',
            fontSize: 'var(--cv2-fs-search)',
            cursor: 'pointer',
            textAlign: 'left',
            outline: 'none',
            transition: 'border-color var(--cv2-transition-fast), background var(--cv2-transition-fast)',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.borderColor = 'var(--cv2-border-strong)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.borderColor = 'var(--cv2-border)';
          }}
        >
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: 8,
              color: 'var(--cv2-text-muted)',
              pointerEvents: 'none',
              display: 'inline-flex',
            }}
          >
            <SearchIcon size={14} />
          </span>
          <span>{placeholder}</span>
        </button>
      </div>
    );
  }

  // Mode B: local typeahead input (preserved for legacy callsites — DM tab
  // still wants to filter the list in-place rather than open a modal).
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
            left: 8,
            color: 'var(--cv2-text-muted)',
            pointerEvents: 'none',
            display: 'inline-flex',
          }}
        >
          <SearchIcon size={14} />
        </span>
        <input
          type="search"
          value={value ?? ''}
          onChange={e => onChange?.(e.target.value)}
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
