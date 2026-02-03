// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT: T10LabelFilter
// Purpose: Multi-select filter for labels
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useMemo, useEffect } from 'react';
import { Tag, Search, Check } from 'lucide-react';
import { T10FilterDropdown } from './T10FilterDropdown';
import { useT10Labels } from '../../hooks';

interface T10LabelFilterProps {
  selectedLabels: string[];
  onApply: (labelIds: string[]) => void;
}

export function T10LabelFilter({ selectedLabels, onApply }: T10LabelFilterProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [localSelected, setLocalSelected] = useState<string[]>(selectedLabels);

  const { data: labels, isLoading } = useT10Labels();

  // Filter labels by search query
  const filteredLabels = useMemo(() => {
    if (!labels) return [];
    if (!searchQuery) return labels;
    return labels.filter(label =>
      label.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [labels, searchQuery]);

  // Sync local state when prop changes
  useEffect(() => {
    setLocalSelected(selectedLabels);
  }, [selectedLabels]);

  const handleToggle = (labelId: string) => {
    setLocalSelected(prev =>
      prev.includes(labelId)
        ? prev.filter(id => id !== labelId)
        : [...prev, labelId]
    );
  };

  const handleApply = () => {
    onApply(localSelected);
    console.log('[T10] Label filter applied:', localSelected.length, 'labels');
  };

  const handleClear = () => {
    setLocalSelected([]);
  };

  const handleClose = () => {
    // Reset to applied state on close without apply
    setLocalSelected(selectedLabels);
    setSearchQuery('');
  };

  return (
    <T10FilterDropdown
      icon={<Tag size={16} />}
      label="Label"
      selectedCount={selectedLabels.length}
      isActive={selectedLabels.length > 0}
      onClose={handleClose}
    >
      {/* Search */}
      <div className="t10-dropdown-search">
        <div className="t10-dropdown-search-wrapper">
          <Search className="t10-dropdown-search-icon" />
          <input
            type="text"
            className="t10-dropdown-search-input"
            placeholder="Search labels..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Options */}
      <div className="t10-dropdown-options">
        {isLoading ? (
          <div className="t10-dropdown-empty">Loading labels...</div>
        ) : filteredLabels.length === 0 ? (
          <div className="t10-dropdown-empty">
            {searchQuery ? 'No labels found' : 'No labels available'}
          </div>
        ) : (
          filteredLabels.map(label => {
            const isSelected = localSelected.includes(label.id);
            return (
              <button
                key={label.id}
                type="button"
                className={`t10-dropdown-option ${isSelected ? 't10-selected' : ''}`}
                onClick={() => handleToggle(label.id)}
                role="option"
                aria-selected={isSelected}
              >
                <div className="t10-dropdown-option-checkbox">
                  <Check size={12} />
                </div>
                <span
                  className="t10-dropdown-option-color"
                  style={{ backgroundColor: label.color }}
                />
                <span className="t10-dropdown-option-label">
                  {label.name}
                </span>
              </button>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="t10-dropdown-footer">
        <button
          type="button"
          className="t10-dropdown-footer-btn t10-dropdown-footer-btn-clear"
          onClick={handleClear}
          disabled={localSelected.length === 0}
        >
          Clear
        </button>
        <button
          type="button"
          className="t10-dropdown-footer-btn t10-dropdown-footer-btn-apply"
          onClick={handleApply}
        >
          Apply
        </button>
      </div>
    </T10FilterDropdown>
  );
}

export default T10LabelFilter;
