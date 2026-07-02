import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Check, Plus, X, Search } from '@/lib/atlaskit-icons';
import { labelAccentTokens } from '@/lib/labelPalette';

// No default labels - user creates their own
const DEFAULT_LABELS: string[] = [];

/**
 * Get the color triple for a label. Delegates to the canonical
 * `labelAccentTokens` helper so the same label text renders with the same
 * ADS-accent hue everywhere in Catalyst (right-rail chip, dropdown, kanban
 * card, hover card, task10 side panel).
 *
 * Returns `{ bg, color, border }` for back-compat with existing call sites
 * that read those keys.
 */
export function getLabelColor(label: string): { bg: string; color: string; border: string } {
  const t = labelAccentTokens(label);
  return { bg: t.background, color: t.text, border: t.border };
}

interface T10LabelPickerProps {
  currentLabel: string | undefined;
  onSelect: (label: string | undefined) => void;
  isReadOnly?: boolean;
}

export function T10LabelPicker({ currentLabel, onSelect, isReadOnly = false }: T10LabelPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [customLabels, setCustomLabels] = useState<string[]>(() => {
    // Load custom labels from localStorage
    try {
      const stored = localStorage.getItem('t10-custom-labels');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  
  const triggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });

  // All available labels (defaults + custom)
  const allLabels = [...new Set([...DEFAULT_LABELS, ...customLabels])];
  
  // Filter labels by search
  const filteredLabels = search.trim()
    ? allLabels.filter(label => 
        label.toLowerCase().includes(search.toLowerCase())
      )
    : allLabels;

  // Check if search term is a new label
  const isNewLabel = search.trim() && 
    !allLabels.some(label => label.toLowerCase() === search.toLowerCase().trim());

  // Update position when opening
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: Math.max(rect.width, 280),
      });
      
      // Focus search input
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setSearch('');
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Handle label selection
  const handleSelect = (label: string) => {
    if (currentLabel === label) {
      onSelect(undefined); // Toggle off
    } else {
      onSelect(label);
    }
    setIsOpen(false);
    setSearch('');
  };

  // Handle creating new label
  const handleCreateLabel = () => {
    const newLabel = search.trim();
    if (!newLabel) return;
    
    // Add to custom labels
    const updated = [...customLabels, newLabel];
    setCustomLabels(updated);
    localStorage.setItem('t10-custom-labels', JSON.stringify(updated));
    
    // Select the new label
    onSelect(newLabel);
    setIsOpen(false);
    setSearch('');
  };

  // Handle key press
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && isNewLabel) {
      e.preventDefault();
      handleCreateLabel();
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setSearch('');
    }
  };

  // Clear label
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(undefined);
  };

  const colors = currentLabel ? getLabelColor(currentLabel) : null;

  const dropdownContent = isOpen && (
    <div
      ref={dropdownRef}
      className="t10-label-dropdown"
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        width: position.width,
        zIndex: 100001,
        background: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))',
        borderRadius: '8px',
        boxShadow: '0 10px 25px -5px var(--ds-shadow-raised, rgba(0,0,0,0.15)), 0 4px 6px -2px var(--ds-shadow-raised, rgba(0,0,0,0.08))',
        border: '1px solid var(--ds-border)',
        overflow: 'hidden',
      }}
    >
      {/* Search Input */}
      <div style={{ padding: '8px', borderBottom: '1px solid var(--ds-border)' }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px',
          padding: '8px 12px',
          background: 'var(--ds-surface-sunken)',
          borderRadius: '6px',
          border: '1px solid var(--ds-border)',
        }}>
          <Search size={14} style={{ color: 'var(--ds-text-subtlest)', flexShrink: 0 }} />
          <input
            ref={searchInputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search or create label..."
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontSize: 'var(--ds-font-size-400)',
              color: 'var(--ds-text)',
            }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--ds-text-subtlest)',
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Create New Label Option */}
      {isNewLabel && (
        <div style={{ padding: '4px 8px', borderBottom: '1px solid var(--ds-border)' }}>
          <button
            onClick={handleCreateLabel}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              width: '100%',
              padding: '8px 12px',
              background: 'var(--ds-background-success)',
              border: '1px solid var(--ds-border)',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: 'var(--ds-font-size-400)',
              color: 'var(--ds-text-success)',
              fontWeight: 500,
            }}
          >
            <Plus size={14} />
            Create "{search.trim()}"
          </button>
        </div>
      )}

      {/* Label Options */}
      <div style={{ maxHeight: '240px', overflowY: 'auto', padding: '4px 8px 8px' }}>
        {filteredLabels.length > 0 ? (
          filteredLabels.map((label) => {
            const labelColors = getLabelColor(label);
            const isSelected = currentLabel === label;
            return (
              <button
                key={label}
                onClick={() => handleSelect(label)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: '8px 12px',
                  marginTop: '4px',
                  background: isSelected ? labelColors.bg : 'transparent',
                  border: `1px solid ${isSelected ? labelColors.border : 'transparent'}`,
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: 'var(--ds-font-size-300)',
                  color: labelColors.color,
                  fontWeight: isSelected ? 600 : 500,
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = 'var(--ds-surface-sunken)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                }}>
                  <span style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '4px',
                    background: labelColors.color,
                  }} />
                  {label}
                </span>
                {isSelected && <Check size={14} />}
              </button>
            );
          })
        ) : (
          <div style={{ 
            padding: '16px', 
            textAlign: 'center', 
            color: 'var(--ds-text-subtlest)',
            fontSize: 'var(--ds-font-size-300)',
          }}>
            No labels found
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      <div 
        ref={triggerRef}
        className="t10-label-trigger"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flexWrap: 'wrap',
        }}
      >
        {currentLabel ? (
          <>
            <span 
              className="t10-label-chip"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 10px',
                background: colors?.bg,
                color: colors?.color,
                border: `1px solid ${colors?.border}`,
                borderRadius: '4px',
                fontSize: 'var(--ds-font-size-300)',
                fontWeight: 500,
              }}
            >
              {currentLabel}
              {!isReadOnly && (
                <button
                  onClick={handleClear}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0px',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'inherit',
                    opacity: 0.6,
                  }}
                >
                  <X size={12} />
                </button>
              )}
            </span>
            {!isReadOnly && (
              <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 8px',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 'var(--ds-font-size-300)',
                  color: 'var(--ds-text-subtle)',
                  fontWeight: 500,
                }}
              >
                <Plus size={14} />
                Add
              </button>
            )}
          </>
        ) : (
          <button
            onClick={() => !isReadOnly && setIsOpen(!isOpen)}
            disabled={isReadOnly}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '8px 12px',
              background: 'transparent',
              border: '1px dashed var(--ds-border)',
              borderRadius: '6px',
              cursor: isReadOnly ? 'default' : 'pointer',
              fontSize: 'var(--ds-font-size-400)',
              color: 'var(--ds-text-subtlest)',
              width: '100%',
            }}
          >
            <Plus size={16} />
            Add label
          </button>
        )}
      </div>

      {createPortal(dropdownContent, document.body)}
    </>
  );
}
