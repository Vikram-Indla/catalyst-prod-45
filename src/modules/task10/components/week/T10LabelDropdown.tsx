// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT: T10LabelDropdown
// Purpose: Inline label management for priority items - create, add, remove labels
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useRef, useEffect } from 'react';
import { Plus, X, Check, Tag } from 'lucide-react';
import { useT10Labels, useT10CreateLabel } from '../../hooks/useT10Labels';
import { useT10UpdateItemLabels } from '../../hooks/useT10Items';
import type { T10Label } from '../../types';
import { T10_LABEL_COLORS } from '../../types';

interface T10LabelDropdownProps {
  itemId: string;
  currentLabels: T10Label[];
  onLabelsChange?: () => void;
}

export function T10LabelDropdown({ itemId, currentLabels, onLabelsChange }: T10LabelDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [selectedColor, setSelectedColor] = useState<string>(T10_LABEL_COLORS[9].value); // Blue default
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: allLabels = [] } = useT10Labels();
  const createLabel = useT10CreateLabel();
  const updateItemLabels = useT10UpdateItemLabels();

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setIsCreating(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus input when opening
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const currentLabelIds = currentLabels.map(l => l.id);
  
  const filteredLabels = allLabels.filter(label =>
    label.name.toLowerCase().includes(search.toLowerCase())
  );

  const exactMatch = allLabels.find(
    label => label.name.toLowerCase() === search.toLowerCase()
  );

  const handleToggleLabel = async (label: T10Label) => {
    const isSelected = currentLabelIds.includes(label.id);
    const newLabelIds = isSelected
      ? currentLabelIds.filter(id => id !== label.id)
      : [...currentLabelIds, label.id];

    try {
      await updateItemLabels.mutateAsync({
        item_id: itemId,
        label_ids: newLabelIds,
      });
      onLabelsChange?.();
    } catch (error) {
      console.error('[T10] Error toggling label:', error);
    }
  };

  const handleCreateAndAdd = async () => {
    if (!search.trim()) return;

    try {
      const newLabel = await createLabel.mutateAsync({
        name: search.trim(),
        color: selectedColor,
      });

      // Add the new label to the item
      await updateItemLabels.mutateAsync({
        item_id: itemId,
        label_ids: [...currentLabelIds, newLabel.id],
      });

      setSearch('');
      setIsCreating(false);
      onLabelsChange?.();
    } catch (error) {
      console.error('[T10] Error creating label:', error);
    }
  };

  const handleRemoveLabel = async (labelId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newLabelIds = currentLabelIds.filter(id => id !== labelId);
    
    try {
      await updateItemLabels.mutateAsync({
        item_id: itemId,
        label_ids: newLabelIds,
      });
      onLabelsChange?.();
    } catch (error) {
      console.error('[T10] Error removing label:', error);
    }
  };

  return (
    <div className="t10-label-dropdown" ref={dropdownRef}>
      {/* Current Labels */}
      <div className="t10-label-dropdown-current">
        {currentLabels.map(label => (
          <span
            key={label.id}
            className="t10-label-chip"
            style={{ 
              backgroundColor: `${label.color}20`,
              borderColor: label.color,
              color: label.color 
            }}
          >
            {label.name}
            <button
              type="button"
              className="t10-label-chip-remove"
              onClick={(e) => handleRemoveLabel(label.id, e)}
            >
              <X size={10} />
            </button>
          </span>
        ))}
        
        {/* Add Label Button */}
        <button
          type="button"
          className="t10-label-add-btn"
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(!isOpen);
          }}
        >
          <Plus size={12} />
          {currentLabels.length === 0 && 'Add label'}
        </button>
      </div>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="t10-label-dropdown-panel">
          {/* Search Input */}
          <div className="t10-label-dropdown-search">
            <input
              ref={inputRef}
              type="text"
              placeholder="Search or create label..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && search.trim() && !exactMatch) {
                  handleCreateAndAdd();
                }
              }}
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Label List */}
          <div className="t10-label-dropdown-list">
            {filteredLabels.map(label => {
              const isSelected = currentLabelIds.includes(label.id);
              return (
                <button
                  key={label.id}
                  type="button"
                  className={`t10-label-dropdown-item ${isSelected ? 'selected' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleLabel(label);
                  }}
                >
                  <span
                    className="t10-label-dropdown-dot"
                    style={{ backgroundColor: label.color }}
                  />
                  <span className="t10-label-dropdown-name">{label.name}</span>
                  {isSelected && (
                    <Check size={14} className="t10-label-dropdown-check" />
                  )}
                </button>
              );
            })}

            {/* Create New Option */}
            {search.trim() && !exactMatch && (
              <div className="t10-label-dropdown-create">
                {!isCreating ? (
                  <button
                    type="button"
                    className="t10-label-dropdown-create-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsCreating(true);
                    }}
                  >
                    <Plus size={14} />
                    Create "{search.trim()}"
                  </button>
                ) : (
                  <div className="t10-label-dropdown-color-picker">
                    <span className="t10-label-dropdown-color-label">Pick a color:</span>
                    <div className="t10-label-dropdown-colors">
                      {T10_LABEL_COLORS.map(color => (
                        <button
                          key={color.value}
                          type="button"
                          className={`t10-label-color-swatch ${selectedColor === color.value ? 'selected' : ''}`}
                          style={{ backgroundColor: color.value }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedColor(color.value);
                          }}
                          title={color.name}
                        />
                      ))}
                    </div>
                    <button
                      type="button"
                      className="t10-label-dropdown-create-confirm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCreateAndAdd();
                      }}
                      disabled={createLabel.isPending}
                    >
                      {createLabel.isPending ? 'Creating...' : `Create "${search.trim()}"`}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Empty State */}
            {filteredLabels.length === 0 && !search.trim() && (
              <div className="t10-label-dropdown-empty">
                <Tag size={16} />
                <span>No labels yet. Type to create one.</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
