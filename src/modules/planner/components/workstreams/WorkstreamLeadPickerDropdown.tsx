// ============================================================================
// LeadPickerDropdown + DropdownItem — Lead assignment dropdown (portalled)
// Extracted from WorkstreamsPage.tsx
// ============================================================================

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, Check } from 'lucide-react';
import { COLORS, TeamMember } from './workstreams-constants';

const DropdownItem: React.FC<{
  user: TeamMember;
  isSelected: boolean;
  onClick: () => void;
}> = ({ user, isSelected, onClick }) => {
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
        padding: '8px 10px',
        borderRadius: '8px',
        cursor: 'pointer',
        backgroundColor: isSelected ? COLORS.surfaceSelected : isHovered ? COLORS.surfaceHover : 'transparent',
        marginBottom: '2px',
      }}
    >
      <div
        style={{
          width: '32px',
          height: '32px',
          minWidth: '32px',
          minHeight: '32px',
          borderRadius: '50%',
          backgroundColor: user.avatarColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px',
          fontWeight: 600,
          color: '#ffffff',
          flexShrink: 0,
        }}
      >
        {user.initials}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '13px', fontWeight: 500, color: COLORS.textPrimary }}>{user.name}</div>
        <div style={{ fontSize: '11px', color: COLORS.textMuted }}>{user.role}</div>
      </div>
      {isSelected && <Check size={16} style={{ color: COLORS.accent }} />}
    </div>
  );
};

export const LeadPickerDropdown: React.FC<{
  users: TeamMember[];
  selectedId?: string;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSelect: (user: TeamMember | null) => void;
  showRemove: boolean;
  anchorRect: DOMRect | null;
}> = ({ users, selectedId, searchQuery, onSearchChange, onSelect, showRemove, anchorRect }) => {
  if (!anchorRect) return null;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: anchorRect.bottom + 4,
        left: anchorRect.left,
        width: '280px',
        backgroundColor: COLORS.surfaceWhite,
        border: `1px solid ${COLORS.borderLight}`,
        borderRadius: '12px',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.12)',
        zIndex: 99999,
        overflow: 'hidden',
      }}
      onClick={(e) => e.stopPropagation()}
    >
    {/* Search */}
    <div style={{
      padding: '12px',
      borderBottom: `1px solid ${COLORS.surfaceHover}`,
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    }}>
      <Search size={16} style={{ color: COLORS.textLight, flexShrink: 0 }} />
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search members..."
        autoFocus
        style={{
          flex: 1,
          border: 'none',
          backgroundColor: 'transparent',
          fontSize: '13px',
          color: COLORS.textPrimary,
          outline: 'none',
          fontFamily: 'inherit',
        }}
      />
    </div>

    {/* List */}
    <div style={{ maxHeight: '240px', overflowY: 'auto', padding: '8px' }}>
      {users.length === 0 ? (
        <div style={{ padding: '16px', textAlign: 'center', color: COLORS.textMuted, fontSize: '13px' }}>
          No members found
        </div>
      ) : (
        users.map((user) => (
          <DropdownItem key={user.id} user={user} isSelected={selectedId === user.id} onClick={() => onSelect(user)} />
        ))
      )}
    </div>

    {/* Remove */}
    {showRemove && (
      <div style={{ padding: '8px 12px', borderTop: `1px solid ${COLORS.surfaceHover}` }}>
        <button
          onClick={() => onSelect(null)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            width: '100%',
            padding: '10px 12px',
            backgroundColor: 'transparent',
            border: 'none',
            borderRadius: '8px',
            fontSize: '13px',
            color: COLORS.danger,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          <X size={16} />
          Remove assignment
        </button>
      </div>
    )}
    </div>,
    document.body
  );
};
