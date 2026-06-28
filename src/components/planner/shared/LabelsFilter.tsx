// ============================================================================
// SHARED: LabelsFilter — Filter dropdown for labels with task counts
// ============================================================================

import React, { useState, useRef, useEffect } from 'react';
import { Tag, ChevronDown, Check } from '@/lib/atlaskit-icons';
import { useLabels } from '../task-modal/hooks/useLabels';
import { useLabelTaskCounts } from '@/modules/tasks/hooks/useLabelTaskCounts';

interface LabelsFilterProps {
  selectedLabels: string[];
  onChange: (labelIds: string[]) => void;
}

const COLORS = {
  textPrimary: 'var(--ds-text)',
  textMuted: 'var(--ds-text-subtlest)',
  surfaceCard: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))',
  surfaceHover: 'var(--ds-surface-sunken)',
  borderLight: 'var(--ds-border, var(--cp-bg-sunken))',
  borderDefault: 'var(--ds-text-disabled)',
  accent: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))',
  accentLight: 'var(--ds-background-information)'
};

export const LabelsFilter: React.FC<LabelsFilterProps> = ({
  selectedLabels,
  onChange
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { labels } = useLabels();
  const { data: labelCounts = {} } = useLabelTaskCounts();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleLabel = (labelId: string) => {
    if (selectedLabels.includes(labelId)) {
      onChange(selectedLabels.filter(id => id !== labelId));
    } else {
      onChange([...selectedLabels, labelId]);
    }
  };

  const clearAll = () => {
    onChange([]);
    setIsOpen(false);
  };

  const selectedCount = selectedLabels.length;

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      {/* TRIGGER BUTTON */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 14px',
          backgroundColor: selectedCount > 0 ? COLORS.accentLight : COLORS.surfaceCard,
          border: `1px solid ${selectedCount > 0 ? COLORS.accent : COLORS.borderDefault}`,
          borderRadius: '8px',
          fontSize: 'var(--ds-font-size-300)',
          fontWeight: 500,
          color: selectedCount > 0 ? COLORS.accent : COLORS.textMuted,
          cursor: 'pointer',
          fontFamily: 'inherit',
          transition: 'all 0.15s ease'
        }}
      >
        <Tag size={14} />
        Labels
        {selectedCount > 0 && (
          <span
            style={{
              minWidth: '18px',
              height: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: COLORS.accent,
              color: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))',
              borderRadius: '9px',
              fontSize: 'var(--ds-font-size-100)',
              fontWeight: 600
            }}
          >
            {selectedCount}
          </span>
        )}
        <ChevronDown 
          size={14} 
          style={{ 
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease'
          }} 
        />
      </button>

      {/* DROPDOWN */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            width: '260px',
            backgroundColor: COLORS.surfaceCard,
            border: `1px solid ${COLORS.borderDefault}`,
            borderRadius: '12px',
            boxShadow: '0 10px 40px var(--ds-shadow-raised, rgba(0, 0, 0, 0.15))',
            zIndex: 99999,
            overflow: 'hidden'
          }}
        >
          {/* HEADER */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 14px',
              borderBottom: `1px solid ${COLORS.borderLight}`
            }}
          >
            <span style={{ fontSize: 'var(--ds-font-size-300)', fontWeight: 600, color: COLORS.textPrimary }}>
              Filter by Labels
            </span>
            {selectedCount > 0 && (
              <button
                onClick={clearAll}
                style={{
                  fontSize: 'var(--ds-font-size-200)',
                  color: COLORS.accent,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'inherit'
                }}
              >
                Clear all
              </button>
            )}
          </div>

          {/* LABELS LIST */}
          <div style={{ maxHeight: '280px', overflowY: 'auto', padding: '8px' }}>
            {labels.map(label => {
              const isSelected = selectedLabels.includes(label.id);
              const taskCount = labelCounts[label.id] || 0;
              return (
                <div
                  key={label.id}
                  onClick={() => toggleLabel(label.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    backgroundColor: isSelected ? COLORS.accentLight : 'transparent',
                    transition: 'background-color 0.1s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = COLORS.surfaceHover;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = isSelected ? COLORS.accentLight : 'transparent';
                  }}
                >
                  <span
                    style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '4px',
                      backgroundColor: label.color,
                      flexShrink: 0
                    }}
                  />
                  <span style={{ flex: 1, fontSize: 'var(--ds-font-size-400)', color: COLORS.textPrimary }}>
                    {label.name}
                  </span>
                  <span
                    style={{
                      fontSize: 'var(--ds-font-size-200)',
                      fontWeight: 500,
                      color: COLORS.textMuted,
                      backgroundColor: COLORS.surfaceHover,
                      padding: '0px 8px',
                      borderRadius: '12px',
                      minWidth: '24px',
                      textAlign: 'center'
                    }}
                  >
                    {taskCount}
                  </span>
                  {isSelected && <Check size={16} style={{ color: COLORS.accent }} />}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default LabelsFilter;
