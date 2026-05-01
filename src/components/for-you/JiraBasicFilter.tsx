/**
 * JiraBasicFilter — Two-pane filter popover
 * Left: scrollable category list, Right: searchable checkbox options
 * Pixel-perfect Jira replica from live DOM scrape.
 */
import React, { useState, useMemo, useRef, useEffect } from 'react';
import './JiraBasicFilter.css';

/* ── Types ─────────────────────────────────────────── */

export interface FilterOption {
  id: string;
  label: string;
  labelExtra?: string;
  hideLabel?: boolean;
  avatarUrl?: string;
  avatarInitials?: string;
  avatarColor?: string;
  avatarType?: 'photo' | 'initials' | 'icon' | 'person-icon';
  iconNode?: React.ReactNode;
}

export interface FilterCategory {
  id: string;
  label: string;
  hasInfoIcon?: boolean;
  options: FilterOption[];
  searchPlaceholder?: string;
}

export interface JiraBasicFilterProps {
  categories: FilterCategory[];
  selected: Record<string, string[]>;
  onSelectionChange: (categoryId: string, optionIds: string[]) => void;
  onClearAll: () => void;
  onClose: () => void;
}

/* ── Trigger Button ──────────────────────────────────── */

export function FilterTriggerButton({ count = 0, onClick, isOpen }: {
  count?: number;
  onClick: () => void;
  isOpen?: boolean;
}) {
  return (
    <button
      className={`jf-trigger-btn ${count > 0 ? 'jf-trigger-btn--active' : ''}`}
      onClick={onClick}
      aria-expanded={isOpen}
      aria-haspopup="dialog"
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="jf-trigger-icon">
        <path fill="currentColor" fillRule="evenodd"
          d="M15 3.5H1V2h14zm-2 5.25H3v-1.5h10zM11 14H5v-1.5h6z"
          clipRule="evenodd"
        />
      </svg>
      <span className="jf-trigger-text">
        Filter
        {count > 0 && <span className="jf-trigger-badge">{count}</span>}
      </span>
    </button>
  );
}

/* ── Main Panel ──────────────────────────────────────── */

export function JiraBasicFilter({
  categories, selected, onSelectionChange, onClearAll, onClose,
}: JiraBasicFilterProps) {
  const [activeCategoryId, setActiveCategoryId] = useState(categories[0]?.id ?? '');
  const [searchQuery, setSearchQuery] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);

  const activeCategory = categories.find(c => c.id === activeCategoryId);
  const activeSelected = selected[activeCategoryId] ?? [];

  const handleCategoryChange = (id: string) => {
    setActiveCategoryId(id);
    setSearchQuery('');
  };

  const filteredOptions = useMemo(() => {
    if (!activeCategory) return [];
    if (!searchQuery.trim()) return activeCategory.options;
    const q = searchQuery.toLowerCase();
    return activeCategory.options.filter(
      o => o.label.toLowerCase().includes(q) || o.labelExtra?.toLowerCase().includes(q)
    );
  }, [activeCategory, searchQuery]);

  const handleCheckbox = (optionId: string) => {
    const current = selected[activeCategoryId] ?? [];
    const next = current.includes(optionId)
      ? current.filter(id => id !== optionId)
      : [...current, optionId];
    onSelectionChange(activeCategoryId, next);
  };

  const totalSelected = Object.values(selected).flat().length;

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  // Shift+F to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.shiftKey && e.key === 'F') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="jf-panel" ref={panelRef} role="dialog" aria-modal="false" aria-label="Filter issues">
      <div className="jf-panel-inner">
        <div className="jf-content">
          {/* Tab label — Basic only */}
          <div className="jf-tabs-wrapper">
            <div className="jf-tabs-container" role="tablist">
              <div role="presentation">
                <button role="tab" aria-selected={true} className="jf-tab jf-tab--active">Basic</button>
              </div>
            </div>
          </div>

          {/* Split layout */}
          <div className="jf-split-wrapper">
            <div className="jf-split-inner">
              {/* LEFT PANE */}
              <div className="jf-left-pane">
                <div className="jf-left-scroll">
                  <div className="jf-category-list" role="tablist">
                    {categories.map(cat => {
                      const catCount = (selected[cat.id] ?? []).length;
                      const isActive = cat.id === activeCategoryId;
                      return (
                        <button
                          key={cat.id}
                          role="tab"
                          aria-selected={isActive}
                          className={`jf-category-item ${isActive ? 'jf-category-item--active' : ''}`}
                          onClick={() => handleCategoryChange(cat.id)}
                        >
                          <span className="jf-category-label">
                            <div className="jf-category-text">{cat.label}</div>
                          </span>
                          {catCount > 0 && <span className="jf-category-badge">{catCount}</span>}
                          {cat.hasInfoIcon && catCount === 0 && (
                            <span className="jf-info-icon" title="More information"><InfoIcon /></span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <div className="jf-clear-wrapper">
                    <button className="jf-clear-btn" onClick={onClearAll} disabled={totalSelected === 0}>
                      Clear all
                    </button>
                  </div>
                </div>
              </div>

              {/* RIGHT PANE */}
              <div className="jf-right-pane">
                <div className="jf-right-scroll">
                  <div className="jf-right-content">
                    {/* Search */}
                    <div className="jf-search-box">
                      <span className="jf-search-icon-wrap"><SearchIcon /></span>
                      <div className="jf-search-input-area">
                        {!searchQuery && (
                          <div className="jf-search-placeholder">
                            {activeCategory?.searchPlaceholder ?? `Search ${activeCategory?.label?.toLowerCase() ?? ''}`}
                          </div>
                        )}
                        <div className="jf-search-input-grid">
                          <input
                            type="text"
                            className="jf-search-input"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            aria-label={`Search ${activeCategory?.label ?? ''}`}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Options */}
                    <div className="jf-options-list" role="listbox" aria-multiselectable="true">
                      {filteredOptions.map(option => {
                        const isChecked = activeSelected.includes(option.id);
                        return (
                          <div
                            key={option.id}
                            className={`jf-option-item ${isChecked ? 'jf-option-item--checked' : ''}`}
                            role="option"
                            aria-selected={isChecked}
                            onClick={() => handleCheckbox(option.id)}
                          >
                            <div className="jf-option-inner">
                              <div className="jf-option-content">
                                <div className="jf-option-row">
                                  {option.iconNode ? (
                                    <OptionAvatar option={option} />
                                  ) : (option.avatarUrl || option.avatarInitials || option.avatarType) && (
                                    <div className="jf-avatar-wrap"><OptionAvatar option={option} /></div>
                                  )}
                                  {!option.hideLabel && (
                                    <span className="jf-option-label">
                                      {option.label}
                                      {option.labelExtra && (
                                        <span className="jf-option-label-extra"> {option.labelExtra}</span>
                                      )}
                                    </span>
                                  )}
                                  {isChecked && (
                                    <span className="jf-check-icon">
                                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                        <path d="M3 8.5L6.5 12L13 4" stroke="var(--ds-text-selected, #1868DB)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                      </svg>
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {filteredOptions.length === 0 && (
                        <div className="jf-empty-options">No matches</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="jf-footer">
          <div className="jf-shortcut">
            Press <kbd className="jf-kbd">Shift</kbd> + <kbd className="jf-kbd">F</kbd> to open and close
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Avatar ──────────────────────────────────────────── */

function OptionAvatar({ option }: { option: FilterOption }) {
  if (option.iconNode) {
    return <span style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>{option.iconNode}</span>;
  }
  if (option.avatarType === 'person-icon') {
    return (
      <span className="jf-avatar jf-avatar--circle" style={{ backgroundColor: 'rgb(24, 104, 219)' }}>
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
          <path fill="var(--ds-surface, #fff)" fillRule="evenodd" d="M8 1.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5M4 4a4 4 0 1 1 8 0 4 4 0 0 1-8 0m-2 9a3.75 3.75 0 0 1 3.75-3.75h4.5A3.75 3.75 0 0 1 14 13v2h-1.5v-2a2.25 2.25 0 0 0-2.25-2.25h-4.5A2.25 2.25 0 0 0 3.5 13v2H2z" clipRule="evenodd" />
        </svg>
      </span>
    );
  }
  if (option.avatarType === 'icon') {
    return (
      <span className="jf-avatar jf-avatar--circle" style={{ backgroundColor: 'rgb(221, 222, 225)' }}>
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
          <path fill="rgb(80,82,88)" fillRule="evenodd" d="M8 1.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5M4 4a4 4 0 1 1 8 0 4 4 0 0 1-8 0m-2 9a3.75 3.75 0 0 1 3.75-3.75h4.5A3.75 3.75 0 0 1 14 13v2h-1.5v-2a2.25 2.25 0 0 0-2.25-2.25h-4.5A2.25 2.25 0 0 0 3.5 13v2H2z" clipRule="evenodd" />
        </svg>
      </span>
    );
  }
  if (option.avatarUrl) {
    return (
      <span className="jf-avatar jf-avatar--circle" style={{ backgroundColor: 'var(--ds-surface, #fff)' }}>
        <img src={option.avatarUrl} alt={option.label} className="jf-avatar-img" />
      </span>
    );
  }
  if (option.avatarInitials) {
    return (
      <span className="jf-avatar jf-avatar--initials" style={{ backgroundColor: option.avatarColor ?? '#DDE1E6' }}>
        <span className="jf-avatar-initials-text">{option.avatarInitials}</span>
      </span>
    );
  }
  return null;
}

/* ── Checkbox SVG ────────────────────────────────────── */

function CheckboxSVG({ checked }: { checked: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="jf-checkbox-svg"
      style={{ color: checked ? 'rgb(24, 104, 219)' : 'rgba(9, 30, 66, 0.14)' }}
    >
      <g fillRule="evenodd">
        <rect x="5.5" y="5.5" width="13" height="13" rx="1.5" fill="currentColor" />
        {checked && (
          <path fillRule="evenodd" clipRule="evenodd"
            d="M16.3262 9.48011L15.1738 8.51984L10.75 13.8284L8.82616 11.5198L7.67383 12.4801L10.1738 15.4801C10.3163 15.6511 10.5274 15.75 10.75 15.75C10.9726 15.75 11.1837 15.6511 11.3262 15.4801L16.3262 9.48011Z"
            fill="white"
          />
        )}
      </g>
    </svg>
  );
}

/* ── SVG Icons ───────────────────────────────────────── */

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path fill="rgb(41,42,46)" d="M7 2.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9M1 7a6 6 0 1 1 10.74 3.68l3.29 3.29-1.06 1.06-3.29-3.29A6 6 0 0 1 1 7" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg width="16" height="16" viewBox="-8 -8 32 32" fill="none">
      <path fill="rgb(24,104,219)" fillRule="evenodd" d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0M6.5 6.75v1.5h.75v4.25h1.5v-5A.75.75 0 0 0 8 6.75zM8 3.5a1 1 0 1 0 0 2 1 1 0 0 0 0-2" clipRule="evenodd" />
    </svg>
  );
}

function MegaphoneIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path fill="currentColor" d="M13.5 3.096a.5.5 0 0 0-.685-.465L7.5 4.756v4.736l5.315 2.126a.5.5 0 0 0 .685-.465zM5 13a.5.5 0 0 0 .5.5H6v-2.75H5zM2.5 8.75a.5.5 0 0 0 .5.5h3V5H3a.5.5 0 0 0-.5.5z" />
    </svg>
  );
}
