// ============================================================================
// MOLECULE: FieldDropdown — Field dropdown in Description tab (Priority, etc.)
// ============================================================================

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { COLORS } from '../colors';
import { ColorDot, Label } from '../atoms';

interface FieldDropdownOption {
  value: string;
  color: string;
}

interface FieldDropdownProps {
  label: string;
  value: string;
  options: FieldDropdownOption[];
  onChange: (value: string) => void;
  colorMap: Record<string, string>;
}

export const FieldDropdown: React.FC<FieldDropdownProps> = ({
  label,
  value,
  options,
  onChange,
  colorMap
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentColor = colorMap[value] || '#94a3b8';

  return (
    <div 
      ref={dropdownRef}
      style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '8px', 
        position: 'relative' 
      }}
    >
      {/* LABEL — 12px for field dropdowns */}
      <Label size="md">{label}</Label>

      {/* TRIGGER — Slightly larger padding than meta dropdown */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '12px 14px',  // 12px vertical for field dropdowns
          backgroundColor: COLORS.surfaceCard,
          border: `1px solid ${isOpen ? COLORS.borderFocus : (isHovered ? COLORS.borderFocus : COLORS.borderDefault)}`,
          borderRadius: '12px',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          boxShadow: isOpen ? '0 0 0 3px rgba(59, 130, 246, 0.15)' : 'none'
        }}
      >
        <ColorDot color={currentColor} size={10} />
        <span style={{ flex: 1, fontSize: '14px', color: COLORS.textPrimary }}>
          {value}
        </span>
        <ChevronDown 
          size={16} 
          style={{ 
            color: COLORS.textLight,
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease'
          }} 
        />
      </div>

      {/* DROPDOWN MENU */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            backgroundColor: COLORS.surfaceCard,
            border: `1px solid ${COLORS.borderDefault}`,
            borderRadius: '12px',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
            zIndex: 1000,
            padding: '6px'
          }}
        >
          {options.map((option) => {
            const isSelected = value === option.value;
            return (
              <div
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  backgroundColor: isSelected ? COLORS.accentLight : 'transparent'
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) e.currentTarget.style.backgroundColor = COLORS.surfaceHover;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = isSelected ? COLORS.accentLight : 'transparent';
                }}
              >
                <ColorDot color={option.color} size={10} />
                <span style={{ fontSize: '14px', color: COLORS.textPrimary }}>{option.value}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default FieldDropdown;
