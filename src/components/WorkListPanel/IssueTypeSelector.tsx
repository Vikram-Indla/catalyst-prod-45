/**
 * IssueTypeSelector — Type picker for create modal (F1.8)
 *
 * Dropdown menu for selecting which issue type to create.
 * Shows all creatable types with icons.
 */
import React, { memo, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';

export const CREATABLE_TYPES = [
  'Story',
  'Task',
  'Feature',
  'Defect',
  'Production Incident',
  'Change Request',
  'Business Gap',
  'Backend Task',
  'API Request',
];

export interface IssuTypeSelectorProps {
  value: string | null;
  onChange: (type: string) => void;
}

export const IssueTypeSelector = memo(function IssueTypeSelector({
  value,
  onChange,
}: IssuTypeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Element;
      if (
        !triggerRef.current?.contains(target) &&
        !dropdownRef.current?.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleSelect = (type: string) => {
    onChange(type);
    setIsOpen(false);
  };

  const triggerRect = triggerRef.current?.getBoundingClientRect();

  return (
    <>
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: '8px 12px',
          backgroundColor: '#FFFFFF',
          border: '1px solid #DFE1E6',
          borderRadius: '3px',
          fontSize: '14px',
          fontWeight: 500,
          cursor: 'pointer',
          textAlign: 'left',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          minWidth: '200px',
          transition: 'border-color 150ms',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = '#B6C2CF';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = '#DFE1E6';
        }}
      >
        {value ? (
          <>
            <JiraIssueTypeIcon type={value} size={14} />
            {value}
          </>
        ) : (
          'Select type'
        )}
      </button>

      {isOpen &&
        triggerRect &&
        createPortal(
          <div
            ref={dropdownRef}
            data-testid="issue-type-dropdown"
            style={{
              position: 'fixed',
              top: triggerRect.bottom + 4,
              left: triggerRect.left,
              width: triggerRect.width,
              backgroundColor: '#FFFFFF',
              border: '1px solid #DFE1E6',
              borderRadius: '3px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              zIndex: 10000,
              maxHeight: '300px',
              overflow: 'auto',
            }}
          >
            {CREATABLE_TYPES.map((type) => (
              <button
                key={type}
                onClick={() => handleSelect(type)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: 'none',
                  background: 'transparent',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '14px',
                  color: '#172B4D',
                  transition: 'background-color 150ms',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#F1F2F4';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <JiraIssueTypeIcon type={type} size={14} />
                {type}
              </button>
            ))}
          </div>,
          document.body
        )}
    </>
  );
});
