/**
 * IssueTypeSelector — Type picker for create modal (F1.8)
 *
 * Dropdown menu for selecting which issue type to create.
 * Shows all creatable types with icons.
 */
import React, { memo, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
// CRE chokepoint (Grids A + D): this create-modal picker serves a TEAM
// surface, so the catalogue must pass the Catalyst Rules Engine filter
// before render. See RULE_TABLE.md.
import { filterCreatableTypes } from '@/lib/catalyst-rules';

export const CREATABLE_TYPES = filterCreatableTypes(
  [
    'Story',
    'Task',
    'Feature',
    'Defect',
    'Production Incident',
    'Change Request',
    'Business Gap',
    'Backend Task',
    'API Request',
  ],
  'TEAM',
);

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
          backgroundColor: 'var(--ds-surface)',
          border: '1px solid var(--cp-lozenge-grey-bg, var(--cp-border-neutral))',
          borderRadius: '3px',
          fontSize: 'var(--ds-font-size-400)',
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
          e.currentTarget.style.borderColor = 'var(--ds-border)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'var(--cp-lozenge-grey-bg, var(--cp-border-neutral))';
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
              backgroundColor: 'var(--ds-surface)',
              border: '1px solid var(--cp-lozenge-grey-bg, var(--cp-border-neutral))',
              borderRadius: '3px',
              boxShadow: '0 4px 12px var(--ds-shadow-raised, rgba(0,0,0,0.15))',
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
                  fontSize: 'var(--ds-font-size-400)',
                  color: 'var(--cp-text-primary, var(--cp-text-inverse))',
                  transition: 'background-color 150ms',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--ds-background-neutral)';
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
