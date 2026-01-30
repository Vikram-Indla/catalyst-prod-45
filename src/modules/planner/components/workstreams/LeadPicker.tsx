// ============================================================================
// LEAD PICKER — Enterprise Grade Implementation
// Searchable dropdown for assigning workstream lead
// ============================================================================

import React, { useState, useRef, useEffect } from 'react';
import { Search, User, X, Check, ChevronDown } from 'lucide-react';
import { useResourceInventory, Resource } from '../../hooks/useResourceInventory';

// ============================================================================
// TYPES
// ============================================================================

interface TeamMember {
  id: string;
  profileId: string | null;
  name: string;
  initials: string;
  role: string;
  department?: string;
  avatarColor: string;
  email?: string;
}

interface LeadPickerProps {
  value: string | null;  // Current lead ID (profile_id)
  currentLeadInfo?: { id: string; name: string; initials: string } | null;
  onChange: (leadId: string | null, leadData?: TeamMember) => void;
  workstreamColor?: string;
  placeholder?: string;
  disabled?: boolean;
  size?: 'sm' | 'md';  // sm for grid cards, md for list rows
  showRole?: boolean;
  className?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const COLORS = {
  textPrimary: '#0f172a',
  textSecondary: '#334155',
  textMuted: '#64748b',
  textLight: '#94a3b8',
  textPlaceholder: '#9ca3af',
  
  surfaceCard: '#ffffff',
  surfacePage: '#f8fafc',
  surfaceHover: '#f1f5f9',
  surfaceSelected: '#dbeafe',
  
  borderLight: '#e2e8f0',
  borderDefault: '#cbd5e1',
  borderFocus: '#3b82f6',
  
  accent: '#2563eb',
  accentHover: '#1d4ed8',
  
  danger: '#dc2626'
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const getInitials = (name: string): string => {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

const getColorFromName = (name: string): string => {
  const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b', '#6366f1', '#2563eb'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const LeadPicker: React.FC<LeadPickerProps> = ({
  value,
  currentLeadInfo,
  onChange,
  workstreamColor,
  placeholder = 'Assign lead...',
  disabled = false,
  size = 'md',
  showRole = true,
  className
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isHovered, setIsHovered] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { data: resources = [], isLoading } = useResourceInventory();

  // Convert resources to team members
  const teamMembers: TeamMember[] = resources.map(r => ({
    id: r.id,
    profileId: r.profile_id,
    name: r.name,
    initials: r.initials || getInitials(r.name),
    role: r.role || 'Team Member',
    department: r.department,
    avatarColor: getColorFromName(r.name),
    email: r.email
  }));

  // Find selected member
  const selectedMember = currentLeadInfo 
    ? { ...currentLeadInfo, avatarColor: workstreamColor || getColorFromName(currentLeadInfo.name) }
    : teamMembers.find(m => m.profileId === value);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search when opened
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleSelect = (member: TeamMember | null) => {
    if (member && !member.profileId) return; // Can't select members without profile_id
    onChange(member?.profileId || null, member || undefined);
    setIsOpen(false);
    setSearchQuery('');
  };

  // Filter by search query
  const filteredMembers = teamMembers.filter(member => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      member.name.toLowerCase().includes(query) ||
      member.role.toLowerCase().includes(query) ||
      (member.email && member.email.toLowerCase().includes(query))
    );
  });

  // Size variants
  const sizeConfig = {
    sm: {
      triggerPadding: '8px 10px',
      avatarSize: 24,
      fontSize: '13px',
      avatarFontSize: '10px'
    },
    md: {
      triggerPadding: '10px 14px',
      avatarSize: 28,
      fontSize: '14px',
      avatarFontSize: '11px'
    }
  };

  const config = sizeConfig[size];
  const displayColor = workstreamColor || (selectedMember ? getColorFromName(selectedMember.name) : COLORS.accent);

  return (
    <div 
      ref={dropdownRef} 
      style={{ position: 'relative', display: 'inline-block', width: '100%' }}
      className={className}
      onClick={(e) => e.stopPropagation()}
    >
      {/* ================================================================ */}
      {/* TRIGGER BUTTON */}
      {/* ================================================================ */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        disabled={disabled}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          width: '100%',
          padding: config.triggerPadding,
          backgroundColor: disabled ? COLORS.surfacePage : COLORS.surfaceCard,
          border: `1px solid ${isOpen ? COLORS.borderFocus : (isHovered && !disabled ? COLORS.borderFocus : COLORS.borderDefault)}`,
          borderRadius: '8px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'all 0.15s ease',
          outline: 'none',
          fontFamily: 'inherit',
          textAlign: 'left',
          opacity: disabled ? 0.6 : 1
        }}
      >
        {selectedMember ? (
          <>
            {/* AVATAR */}
            <div
              style={{
                width: `${config.avatarSize}px`,
                height: `${config.avatarSize}px`,
                borderRadius: '50%',
                backgroundColor: displayColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: config.avatarFontSize,
                fontWeight: 600,
                color: '#ffffff',
                flexShrink: 0
              }}
            >
              {selectedMember.initials}
            </div>
            
            {/* NAME */}
            <span 
              style={{ 
                flex: 1, 
                fontSize: config.fontSize, 
                color: COLORS.textPrimary,
                fontWeight: 500,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {selectedMember.name}
            </span>
          </>
        ) : (
          <>
            {/* EMPTY STATE */}
            <User size={size === 'sm' ? 16 : 18} style={{ color: COLORS.textLight }} />
            <span 
              style={{ 
                flex: 1, 
                fontSize: config.fontSize, 
                color: COLORS.textPlaceholder 
              }}
            >
              {placeholder}
            </span>
          </>
        )}

        {/* CHEVRON */}
        <ChevronDown
          size={16}
          style={{
            color: COLORS.textLight,
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
            flexShrink: 0
          }}
        />
      </button>

      {/* ================================================================ */}
      {/* DROPDOWN MENU */}
      {/* ================================================================ */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            width: '320px',
            maxWidth: '90vw',
            backgroundColor: COLORS.surfaceCard,
            border: `1px solid ${COLORS.borderDefault}`,
            borderRadius: '12px',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
            zIndex: 99999,
            overflow: 'hidden'
          }}
        >
          {/* SEARCH BAR */}
          <div 
            style={{ 
              padding: '12px',
              borderBottom: `1px solid ${COLORS.borderLight}`
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 12px',
                backgroundColor: COLORS.surfacePage,
                borderRadius: '8px',
                border: `1px solid ${COLORS.borderLight}`
              }}
            >
              <Search size={16} style={{ color: COLORS.textLight, flexShrink: 0 }} />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search team members..."
                style={{
                  flex: 1,
                  border: 'none',
                  backgroundColor: 'transparent',
                  fontSize: '14px',
                  color: COLORS.textPrimary,
                  outline: 'none',
                  fontFamily: 'inherit'
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '20px',
                    height: '20px',
                    backgroundColor: COLORS.surfaceHover,
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    color: COLORS.textMuted
                  }}
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* MEMBER LIST */}
          <div 
            style={{ 
              maxHeight: '300px', 
              overflowY: 'auto',
              padding: '8px'
            }}
          >
            {isLoading ? (
              <div style={{ 
                padding: '24px', 
                textAlign: 'center', 
                color: COLORS.textMuted,
                fontSize: '14px'
              }}>
                Loading team members...
              </div>
            ) : filteredMembers.length === 0 ? (
              <div style={{ 
                padding: '24px', 
                textAlign: 'center', 
                color: COLORS.textMuted,
                fontSize: '14px'
              }}>
                {searchQuery ? 'No members found' : 'No team members available'}
              </div>
            ) : (
              filteredMembers.map(member => (
                <MemberOption
                  key={member.id}
                  member={member}
                  isSelected={value === member.profileId}
                  showRole={showRole}
                  onClick={() => handleSelect(member)}
                />
              ))
            )}
          </div>

          {/* REMOVE ASSIGNMENT */}
          {value && (
            <div 
              style={{ 
                padding: '8px 12px',
                borderTop: `1px solid ${COLORS.borderLight}`
              }}
            >
              <button
                onClick={() => handleSelect(null)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '10px 12px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  color: COLORS.danger,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'background-color 0.1s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fef2f2'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <X size={16} />
                Remove assignment
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// SUB-COMPONENT: MemberOption
// ============================================================================

const MemberOption: React.FC<{
  member: TeamMember;
  isSelected: boolean;
  showRole: boolean;
  onClick: () => void;
}> = ({ member, isSelected, showRole, onClick }) => {
  const [isHovered, setIsHovered] = useState(false);
  const isDisabled = !member.profileId;

  return (
    <div
      onClick={() => !isDisabled && onClick()}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '10px 12px',
        borderRadius: '8px',
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        opacity: isDisabled ? 0.5 : 1,
        backgroundColor: isSelected 
          ? COLORS.surfaceSelected 
          : (isHovered && !isDisabled ? COLORS.surfaceHover : 'transparent'),
        transition: 'background-color 0.1s ease',
        marginBottom: '2px'
      }}
    >
      {/* AVATAR */}
      <div
        style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          backgroundColor: member.avatarColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '13px',
          fontWeight: 600,
          color: '#ffffff',
          flexShrink: 0
        }}
      >
        {member.initials}
      </div>

      {/* INFO */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: '14px',
            fontWeight: 500,
            color: COLORS.textPrimary,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          {member.name}
        </div>
        {showRole && (
          <div
            style={{
              fontSize: '12px',
              color: COLORS.textMuted,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              marginTop: '2px'
            }}
          >
            {member.role}
            {member.department && (
              <span style={{ color: COLORS.textLight }}> · {member.department}</span>
            )}
          </div>
        )}
      </div>

      {/* CHECK MARK */}
      {isSelected && (
        <Check size={18} style={{ color: COLORS.accent, flexShrink: 0 }} />
      )}
    </div>
  );
};

export default LeadPicker;
