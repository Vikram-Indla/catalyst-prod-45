// ============================================================================
// MOLECULE: LabelsManager — Full labels management panel
// ============================================================================

import React, { useState, useRef, useEffect } from 'react';
import { Tag, Plus, Search, Check, Loader2 } from '@/lib/atlaskit-icons';
import { useLabels } from '../hooks/useLabels';
import { useTaskLabels } from '../hooks/useTaskLabels';
import { Label, LABEL_COLORS } from '../types/labels';
import { LabelBadge } from './LabelBadge';

interface LabelsManagerProps {
  taskId: string;
  onLabelsChange?: (labels: Label[]) => void;
}

const COLORS = {
  textPrimary: 'var(--ds-text)',
  textSecondary: 'var(--cp-ink-2, var(--cp-ink-2, var(--cp-ink-2)))',
  textMuted: 'var(--ds-text-subtlest)',
  textLight: 'var(--ds-text-subtlest)',
  surfaceCard: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))',
  surfacePage: 'var(--ds-surface-sunken)',
  surfaceHover: 'var(--ds-surface-sunken)',
  borderLight: 'var(--ds-border, var(--cp-bg-sunken))',
  borderDefault: 'var(--ds-text-disabled)',
  accent: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))',
  accentLight: 'var(--ds-background-information)'
};

export const LabelsManager: React.FC<LabelsManagerProps> = ({
  taskId,
  onLabelsChange
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState(LABEL_COLORS[6].value); // Default blue
  const [isHovered, setIsHovered] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { labels: allLabels, isLoading: labelsLoading, createLabel } = useLabels();
  const { taskLabels, toggleLabel, removeLabel, isLoading: taskLabelsLoading } = useTaskLabels(taskId);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setIsCreating(false);
        setSearchQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search when opened
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Notify parent of changes
  useEffect(() => {
    if (onLabelsChange) {
      onLabelsChange(taskLabels);
    }
  }, [taskLabels, onLabelsChange]);

  // Filter labels by search
  const filteredLabels = allLabels.filter(label =>
    label.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle create new label
  const handleCreateLabel = async () => {
    if (!newLabelName.trim()) return;

    const newLabel = await createLabel(newLabelName.trim(), newLabelColor);
    if (newLabel) {
      await toggleLabel(newLabel);
      setNewLabelName('');
      setIsCreating(false);
    }
  };

  // Check if label is assigned
  const isLabelAssigned = (labelId: string): boolean => {
    return taskLabels.some(l => l.id === labelId);
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      {/* CURRENT LABELS + ADD BUTTON */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
        {/* ASSIGNED LABELS */}
        {taskLabels.map(label => (
          <LabelBadge
            key={label.id}
            label={label}
            showRemove
            onRemove={() => removeLabel(label.id)}
          />
        ))}

        {/* ADD LABELS BUTTON */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 14px',
            backgroundColor: isHovered ? COLORS.accentLight : COLORS.surfaceHover,
            border: `1.5px ${isHovered ? 'solid' : 'dashed'} ${isHovered ? COLORS.accent : COLORS.borderDefault}`,
            borderRadius: '8px',
            fontSize: 'var(--ds-font-size-300)',
            fontWeight: 500,
            color: isHovered ? COLORS.accent : COLORS.textMuted,
            cursor: 'pointer',
            fontFamily: 'inherit',
            transition: 'all 0.15s ease'
          }}
        >
          <Tag size={14} />
          {taskLabels.length === 0 ? 'Add labels' : 'Add'}
        </button>
      </div>

      {/* DROPDOWN PANEL */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: 0,
            width: '320px',
            backgroundColor: COLORS.surfaceCard,
            border: `1px solid ${COLORS.borderDefault}`,
            borderRadius: '12px',
            boxShadow: '0 10px 40px var(--ds-shadow-raised, rgba(0, 0, 0, 0.15))',
            zIndex: 99999,
            overflow: 'hidden'
          }}
        >
          {/* SEARCH BAR */}
          <div style={{ padding: '12px', borderBottom: `1px solid ${COLORS.borderLight}` }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                backgroundColor: COLORS.surfacePage,
                borderRadius: '8px'
              }}
            >
              <Search size={16} style={{ color: COLORS.textLight }} />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search labels..."
                style={{
                  flex: 1,
                  border: 'none',
                  backgroundColor: 'transparent',
                  fontSize: 'var(--ds-font-size-400)',
                  color: COLORS.textPrimary,
                  outline: 'none',
                  fontFamily: 'inherit'
                }}
              />
            </div>
          </div>

          {/* LABELS LIST */}
          <div style={{ maxHeight: '240px', overflowY: 'auto', padding: '8px' }}>
            {labelsLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
                <Loader2 size={20} style={{ color: COLORS.textMuted, animation: 'spin 1s linear infinite' }} />
              </div>
            ) : filteredLabels.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', color: COLORS.textMuted, fontSize: 'var(--ds-font-size-400)' }}>
                {searchQuery ? 'No labels found' : 'No labels available'}
              </div>
            ) : (
              filteredLabels.map(label => {
                const isAssigned = isLabelAssigned(label.id);
                return (
                  <LabelOption
                    key={label.id}
                    label={label}
                    isSelected={isAssigned}
                    onClick={() => toggleLabel(label)}
                  />
                );
              })
            )}
          </div>

          {/* CREATE NEW LABEL */}
          <div style={{ borderTop: `1px solid ${COLORS.borderLight}`, padding: '12px' }}>
            {isCreating ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* NAME INPUT */}
                <input
                  type="text"
                  value={newLabelName}
                  onChange={(e) => setNewLabelName(e.target.value)}
                  placeholder="Label name"
                  autoFocus
                  style={{
                    padding: '10px 12px',
                    border: `1px solid ${COLORS.borderDefault}`,
                    borderRadius: '8px',
                    fontSize: 'var(--ds-font-size-400)',
                    color: COLORS.textPrimary,
                    outline: 'none',
                    fontFamily: 'inherit'
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateLabel();
                    if (e.key === 'Escape') setIsCreating(false);
                  }}
                />

                {/* COLOR PICKER */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {LABEL_COLORS.map(color => (
                    <button
                      key={color.value}
                      onClick={() => setNewLabelColor(color.value)}
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '6px',
                        backgroundColor: color.value,
                        border: newLabelColor === color.value 
                          ? '2px solid var(--ds-text)' 
                          : '2px solid transparent',
                        cursor: 'pointer',
                        padding: 0
                      }}
                      title={color.name}
                    />
                  ))}
                </div>

                {/* ACTIONS */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => setIsCreating(false)}
                    style={{
                      flex: 1,
                      padding: '8px',
                      backgroundColor: COLORS.surfaceHover,
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: 'var(--ds-font-size-300)',
                      fontWeight: 500,
                      color: COLORS.textSecondary,
                      cursor: 'pointer',
                      fontFamily: 'inherit'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateLabel}
                    disabled={!newLabelName.trim()}
                    style={{
                      flex: 1,
                      padding: '8px',
                      backgroundColor: newLabelName.trim() ? COLORS.accent : COLORS.surfaceHover,
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: 'var(--ds-font-size-300)',
                      fontWeight: 500,
                      color: newLabelName.trim() ? 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))' : COLORS.textMuted,
                      cursor: newLabelName.trim() ? 'pointer' : 'not-allowed',
                      fontFamily: 'inherit'
                    }}
                  >
                    Create
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setIsCreating(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '10px 12px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: 'var(--ds-font-size-400)',
                  fontWeight: 500,
                  color: COLORS.accent,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  textAlign: 'left'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = COLORS.surfaceHover}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <Plus size={16} />
                Create new label
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Sub-component: Label Option in dropdown
const LabelOption: React.FC<{
  label: Label;
  isSelected: boolean;
  onClick: () => void;
}> = ({ label, isSelected, onClick }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '10px 12px',
        borderRadius: '8px',
        cursor: 'pointer',
        backgroundColor: isSelected 
          ? COLORS.accentLight 
          : (isHovered ? COLORS.surfaceHover : 'transparent'),
        transition: 'background-color 0.1s ease'
      }}
    >
      {/* COLOR DOT */}
      <span
        style={{
          width: '12px',
          height: '12px',
          borderRadius: '4px',
          backgroundColor: label.color,
          flexShrink: 0
        }}
      />

      {/* LABEL NAME */}
      <span style={{ flex: 1, fontSize: 'var(--ds-font-size-400)', color: COLORS.textPrimary }}>
        {label.name}
      </span>

      {/* CHECK MARK */}
      {isSelected && (
        <Check size={16} style={{ color: COLORS.accent }} />
      )}
    </div>
  );
};

export default LabelsManager;
