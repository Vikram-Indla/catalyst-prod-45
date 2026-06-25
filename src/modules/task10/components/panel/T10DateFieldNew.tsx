// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT: T10DateFieldNew
// Purpose: Date picker with presets (Today, Tomorrow, Next Week, etc.)
// Prompt 8 of 9 Complete Rebuild
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, X, Calendar } from '@/lib/atlaskit-icons';
import { formatT10Date } from '../../utils';

// Date presets
const DATE_PRESETS = [
  {
    label: 'Today',
    getValue: () => {
      const d = new Date();
      return d.toISOString().split('T')[0];
    },
  },
  {
    label: 'Tomorrow',
    getValue: () => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      return d.toISOString().split('T')[0];
    },
  },
  {
    label: 'In 3 Days',
    getValue: () => {
      const d = new Date();
      d.setDate(d.getDate() + 3);
      return d.toISOString().split('T')[0];
    },
  },
  {
    label: 'Next Week',
    getValue: () => {
      const d = new Date();
      d.setDate(d.getDate() + 7);
      return d.toISOString().split('T')[0];
    },
  },
  {
    label: 'In 2 Weeks',
    getValue: () => {
      const d = new Date();
      d.setDate(d.getDate() + 14);
      return d.toISOString().split('T')[0];
    },
  },
  {
    label: 'Next Month',
    getValue: () => {
      const d = new Date();
      d.setMonth(d.getMonth() + 1);
      return d.toISOString().split('T')[0];
    },
  },
];

interface T10DateFieldNewProps {
  value: string | null;
  onChange: (date: string | null) => void;
}

export function T10DateFieldNew({ value, onChange }: T10DateFieldNewProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customDate, setCustomDate] = useState(value || '');
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync custom date with value
  useEffect(() => {
    setCustomDate(value || '');
  }, [value]);

  // Calculate position when opening
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    }
  }, [isOpen]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handlePresetSelect = (getValue: () => string) => {
    const date = getValue();
    onChange(date);
    setCustomDate(date);
    setIsOpen(false);
    console.log('[T10] Date preset selected:', date);
  };

  const handleCustomDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = e.target.value;
    setCustomDate(date);
    if (date) {
      onChange(date);
      console.log('[T10] Custom date selected:', date);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    setCustomDate('');
    console.log('[T10] Date cleared');
  };

  const dropdown = isOpen && (
    <div
      ref={dropdownRef}
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        width: Math.max(position.width, 240),
        backgroundColor: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, #ffffff)))',
        border: '1px solid var(--ds-border, #DFE1E6)',
        borderRadius: '8px',
        boxShadow: '0 10px 25px -5px var(--ds-shadow-raised, rgba(0,0,0,0.15)), 0 4px 6px -2px var(--ds-shadow-raised, rgba(0,0,0,0.08))',
        // Must be above the side panel overlay (z=100000) and panel (z=100001)
        zIndex: 100002,
        pointerEvents: 'auto',
        overflow: 'hidden',
      }}
    >
      {/* Presets */}
      <div style={{ padding: '8px' }}>
        {DATE_PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => handlePresetSelect(preset.getValue)}
            style={{
              display: 'block',
              width: '100%',
              padding: '10px 12px',
              textAlign: 'left',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              color: 'var(--ds-text-subtle, #44546F)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--ds-surface-sunken, #F7F8F9)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Custom date input */}
      <div
        style={{
          padding: '12px',
          borderTop: '1px solid var(--ds-background-neutral-subtle, #F7F8F9)',
        }}
      >
        <input
          type="date"
          value={customDate}
          onChange={handleCustomDateChange}
          style={{
            width: '100%',
            padding: '10px 12px',
            border: '1px solid var(--ds-border, #DFE1E6)',
            borderRadius: '6px',
            fontSize: '14px',
            color: 'var(--ds-text-subtle, #44546F)',
            outline: 'none',
          }}
        />
      </div>
    </div>
  );

  return (
    <>
      <div
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          padding: '10px 14px',
          backgroundColor: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, #ffffff)))',
          border: isOpen ? '1px solid var(--ds-link, #2563eb)' : '1px solid var(--ds-border, #DFE1E6)',
          borderRadius: '8px',
          cursor: 'pointer',
          boxShadow: isOpen ? '0 0 0 3px var(--ds-background-information, #E9F2FF)' : 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
          {value ? (
            <>
              <Calendar size={16} style={{ color: 'var(--ds-text-subtlest, #64748b)' }} />
              <span style={{ fontSize: '14px', color: 'var(--ds-text, #172B4D)' }}>
                {formatT10Date(value)}
              </span>
            </>
          ) : (
            <span style={{ color: 'var(--ds-text-disabled, #8590A2)', fontSize: '14px' }}>Set due date</span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {value && (
            <button
              type="button"
              onClick={handleClear}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '20px',
                height: '20px',
                backgroundColor: 'var(--ds-background-neutral-subtle, #F7F8F9)',
                border: 'none',
                borderRadius: '50%',
                color: 'var(--ds-text-subtlest, #626F86)',
                cursor: 'pointer',
              }}
            >
              <X size={12} />
            </button>
          )}
          <ChevronDown
            size={16}
            style={{
              color: 'var(--ds-text-disabled, #8590A2)',
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.15s ease',
            }}
          />
        </div>
      </div>
      {createPortal(dropdown, document.body)}
    </>
  );
}

export default T10DateFieldNew;
