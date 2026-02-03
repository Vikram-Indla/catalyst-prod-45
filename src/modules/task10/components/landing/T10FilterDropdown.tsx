// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT: T10FilterDropdown
// Purpose: Base dropdown component for filters
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useRef, useEffect, ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

interface T10FilterDropdownProps {
  icon: ReactNode;
  label: string;
  selectedCount?: number;
  isActive?: boolean;
  children: ReactNode;
  onClose?: () => void;
}

export function T10FilterDropdown({
  icon,
  label,
  selectedCount = 0,
  isActive = false,
  children,
  onClose,
}: T10FilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        onClose?.();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Close on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        onClose?.();
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleToggle = () => {
    setIsOpen(!isOpen);
    if (isOpen) {
      onClose?.();
    }
  };

  return (
    <div className="t10-filter-dropdown" ref={dropdownRef}>
      <button
        ref={triggerRef}
        type="button"
        className={`t10-filter-trigger ${isActive ? 't10-active' : ''} ${isOpen ? 't10-open' : ''}`}
        onClick={handleToggle}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className="t10-filter-trigger-icon">{icon}</span>
        <span>{label}</span>
        {selectedCount > 0 && (
          <span className="t10-filter-badge">{selectedCount}</span>
        )}
        <ChevronDown className="t10-filter-trigger-chevron" />
      </button>

      {isOpen && (
        <div className="t10-dropdown-panel" role="listbox">
          {children}
        </div>
      )}
    </div>
  );
}

export default T10FilterDropdown;
