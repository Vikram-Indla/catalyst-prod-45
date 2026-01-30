// ============================================================================
// MOLECULE: MetaDropdown — Status/Priority/Workstream dropdown in metadata bar
// ============================================================================

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { COLORS } from '../colors';
import { ColorDot, Label } from '../atoms';

interface MetaDropdownOption {
  value: string;
  color: string;
}

interface MetaDropdownProps {
  label: string;
  value: string;
  options: MetaDropdownOption[];
  onChange: (value: string) => void;
  colorMap: Record<string, string>;
}

export const MetaDropdown: React.FC<MetaDropdownProps> = ({
  label,
  value,
  options,
  onChange,
  colorMap
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
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
        gap: '6px', 
        position: 'relative' 
      }}
    >
      {/* LABEL */}
      <Label size="sm">{label}</Label>

      {/* TRIGGER */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '10px 14px',
          backgroundColor: COLORS.surfaceCard,
          border: `1px solid ${isOpen ? COLORS.borderFocus : (isHovered ? COLORS.borderDefault : COLORS.borderLight)}`,
          borderRadius: '10px',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          boxShadow: isOpen ? '0 0 0 3px rgba(59, 130, 246, 0.15)' : 'none'
        }}
      >
        {/* DOT — 10px */}
        <ColorDot color={currentColor} size={10} />
        
        {/* TEXT */}
        <span style={{ 
          flex: 1, 
          fontSize: '14px', 
          fontWeight: 500, 
          color: COLORS.textPrimary 
        }}>
          {value}
        </span>
        
        {/* CHEVRON */}
        <ChevronDown 
          size={16} 
          style={{ 
            color: COLORS.textLight,
            transition: 'transform 0.2s ease',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)'
          }} 
        />
      </div>

      {/* DROPDOWN MENU - FIX 1: z-index 99999 */}
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
            zIndex: 99999,
            padding: '6px',
            maxHeight: '280px',
            overflowY: 'auto'
          }}
        >
          {options.map((option) => (
            <DropdownItem
              key={option.value}
              value={option.value}
              color={option.color}
              isSelected={value === option.value}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Sub-component: DropdownItem
const DropdownItem: React.FC<{
  value: string;
  color: string;
  isSelected: boolean;
  onClick: () => void;
}> = ({ value, color, isSelected, onClick }) => {
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
      <ColorDot color={color} size={10} />
      <span style={{ fontSize: '14px', color: COLORS.textPrimary }}>{value}</span>
    </div>
  );
};

export default MetaDropdown;
