// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT: T10DateRangeFilter
// Purpose: Date range filter with presets and custom range
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';
import { T10FilterDropdown } from './T10FilterDropdown';
import { getDateRangeFromPreset } from '../../hooks';
import type { T10DateRangePreset } from '../../types';

interface T10DateRangeFilterProps {
  selectedPreset: T10DateRangePreset | null;
  customStart: string | null;
  customEnd: string | null;
  onApply: (preset: T10DateRangePreset | null, start?: string, end?: string) => void;
}

const DATE_PRESETS: { value: T10DateRangePreset; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'tomorrow', label: 'Tomorrow' },
  { value: 'this_week', label: 'This week' },
  { value: 'next_week', label: 'Next week' },
  { value: 'this_month', label: 'This month' },
  { value: 'overdue', label: 'Overdue' },
];

export function T10DateRangeFilter({
  selectedPreset,
  customStart,
  customEnd,
  onApply,
}: T10DateRangeFilterProps) {
  const [localPreset, setLocalPreset] = useState<T10DateRangePreset | null>(selectedPreset);
  const [localCustomStart, setLocalCustomStart] = useState(customStart || '');
  const [localCustomEnd, setLocalCustomEnd] = useState(customEnd || '');
  const [showCustom, setShowCustom] = useState(selectedPreset === 'custom');

  // Sync local state when props change
  useEffect(() => {
    setLocalPreset(selectedPreset);
    setLocalCustomStart(customStart || '');
    setLocalCustomEnd(customEnd || '');
    setShowCustom(selectedPreset === 'custom');
  }, [selectedPreset, customStart, customEnd]);

  const handlePresetSelect = (preset: T10DateRangePreset) => {
    if (preset === 'custom') {
      setShowCustom(true);
      setLocalPreset('custom');
    } else {
      setShowCustom(false);
      setLocalPreset(preset);
    }
  };

  const handleApply = () => {
    if (localPreset === 'custom') {
      onApply('custom', localCustomStart, localCustomEnd);
      console.log('[T10] Date filter applied: custom', localCustomStart, '-', localCustomEnd);
    } else if (localPreset) {
      const range = getDateRangeFromPreset(localPreset);
      onApply(localPreset, range.start, range.end);
      console.log('[T10] Date filter applied:', localPreset);
    } else {
      onApply(null);
      console.log('[T10] Date filter cleared');
    }
  };

  const handleClear = () => {
    setLocalPreset(null);
    setLocalCustomStart('');
    setLocalCustomEnd('');
    setShowCustom(false);
  };

  const handleClose = () => {
    setLocalPreset(selectedPreset);
    setLocalCustomStart(customStart || '');
    setLocalCustomEnd(customEnd || '');
    setShowCustom(selectedPreset === 'custom');
  };

  return (
    <T10FilterDropdown
      icon={<Calendar size={16} />}
      label="Date Range"
      selectedCount={selectedPreset ? 1 : 0}
      isActive={!!selectedPreset}
      onClose={handleClose}
    >
      {/* Preset Options */}
      <div className="t10-dropdown-options">
        {DATE_PRESETS.map(preset => {
          const isSelected = localPreset === preset.value && !showCustom;
          return (
            <button
              key={preset.value}
              type="button"
              className={`t10-dropdown-option ${isSelected ? 't10-selected' : ''}`}
              onClick={() => handlePresetSelect(preset.value)}
              role="option"
              aria-selected={isSelected}
            >
              <div className="t10-dropdown-option-radio">
                <div className="t10-dropdown-option-radio-inner" />
              </div>
              <span className="t10-dropdown-option-label">
                {preset.label}
              </span>
            </button>
          );
        })}

        {/* Custom Range Option */}
        <button
          type="button"
          className={`t10-dropdown-option ${showCustom ? 't10-selected' : ''}`}
          onClick={() => handlePresetSelect('custom')}
          role="option"
          aria-selected={showCustom}
        >
          <div className="t10-dropdown-option-radio">
            <div className="t10-dropdown-option-radio-inner" />
          </div>
          <span className="t10-dropdown-option-label">
            Custom range...
          </span>
        </button>
      </div>

      {/* Custom Date Inputs */}
      {showCustom && (
        <div className="t10-date-range-custom">
          <div className="t10-date-range-inputs">
            <input
              type="date"
              className="t10-date-input"
              value={localCustomStart}
              onChange={(e) => setLocalCustomStart(e.target.value)}
              placeholder="Start date"
            />
            <span className="t10-date-range-separator">—</span>
            <input
              type="date"
              className="t10-date-input"
              value={localCustomEnd}
              onChange={(e) => setLocalCustomEnd(e.target.value)}
              placeholder="End date"
            />
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="t10-dropdown-footer">
        <button
          type="button"
          className="t10-dropdown-footer-btn t10-dropdown-footer-btn-clear"
          onClick={handleClear}
          disabled={!localPreset}
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

export default T10DateRangeFilter;
