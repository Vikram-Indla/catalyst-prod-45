// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT: T10AssigneeFieldNew
// Purpose: Database-wired user dropdown for assignee selection
// Prompt 8 of 9 Complete Rebuild
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, X, Search, Check } from 'lucide-react';
import { useT10Users } from '../../hooks';
import { getT10Initials } from '../../utils';

// Generate consistent vibrant avatar color from name.
// CLAUDE.md §L38 — hex literals only (no HSL).
// Fixed 10-colour Catalyst avatar palette (shared with MentionTextarea / SidebarFields).
const AVATAR_PALETTE = [
  '#2A6DF4', '#7C3BED', '#25A777', '#E92063', '#F97015',
  '#21C45D', '#0DA2E7', '#FAC814', '#BB36D3', '#1DAFA1',
];
function getAvatarColor(name: string | null): string {
  if (!name) return AVATAR_PALETTE[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

interface T10AssigneeFieldNewProps {
  value: string | null;
  assigneeName: string | null;
  assigneeAvatar: string | null;
  onChange: (userId: string | null) => void;
}

export function T10AssigneeFieldNew({
  value,
  assigneeName,
  assigneeAvatar,
  onChange,
}: T10AssigneeFieldNewProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { data: users, isLoading } = useT10Users(searchQuery);

  // Calculate position when opening
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
      console.log('[T10] Assignee dropdown opened');

      // Focus search input
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Log when users are fetched
  useEffect(() => {
    if (users && users.length > 0) {
      console.log('[T10] Users fetched:', users.length);
    }
  }, [users]);

  const handleSelect = (userId: string) => {
    onChange(userId);
    setIsOpen(false);
    setSearchQuery('');
    console.log('[T10] Assignee selected:', userId);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    console.log('[T10] Assignee cleared');
  };

  const dropdown = isOpen && (
    <div
      ref={dropdownRef}
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        width: Math.max(position.width, 320),
        backgroundColor: 'var(--ds-surface, var(--ds-surface, #ffffff))',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15), 0 4px 6px -2px rgba(0,0,0,0.08)',
        // Must be above the side panel overlay (z=100000) and panel (z=100001)
        zIndex: 100002,
        pointerEvents: 'auto',
        overflow: 'hidden',
      }}
    >
      {/* Search */}
      <div style={{ padding: '8px', borderBottom: '1px solid #f3f4f6' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            backgroundColor: '#f9fafb',
            borderRadius: '6px',
            border: '1px solid #e5e7eb',
          }}
        >
          <Search size={14} style={{ color: '#9ca3af', flexShrink: 0 }} />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search people..."
            className="flex-1 min-w-0 text-sm text-gray-700 placeholder:text-gray-400 !bg-transparent !border-0 !p-0 !outline-none !shadow-none !ring-0 focus:!outline-none focus:!shadow-none focus:!ring-0"
            style={{
              WebkitAppearance: 'none',
              MozAppearance: 'none',
              appearance: 'none',
              backgroundColor: 'transparent',
              WebkitBoxShadow: '0 0 0 1000px transparent inset',
            }}
          />
        </div>
      </div>

      {/* Options */}
      <div style={{ maxHeight: '280px', overflowY: 'auto', padding: '4px 8px 8px' }}>
        {/* Unassign option */}
        {value && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange(null);
              setIsOpen(false);
              console.log('[T10] Assignee cleared');
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              width: '100%',
              padding: '10px 12px',
              marginTop: '4px',
              backgroundColor: 'var(--ds-background-danger, var(--ds-background-danger, #fef2f2))',
              border: '1px solid #fecaca',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              color: 'var(--ds-text-danger, var(--ds-text-danger, #dc2626))',
            }}
          >
            <X size={14} />
            Remove assignee
          </button>
        )}

        {isLoading && (
          <div
            style={{
              padding: '20px',
              textAlign: 'center',
              color: '#9ca3af',
              fontSize: '14px',
            }}
          >
            Loading...
          </div>
        )}

        {!isLoading && users && users.length === 0 && (
          <div
            style={{
              padding: '20px',
              textAlign: 'center',
              color: '#9ca3af',
              fontSize: '14px',
            }}
          >
            No users found
          </div>
        )}

        {!isLoading &&
          users?.map((user) => {
            const isSelected = value === user.id;
            const initials = getT10Initials(user.full_name);
            return (
              <button
                key={user.id}
                type="button"
                onClick={() => handleSelect(user.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  width: '100%',
                  padding: '10px 12px',
                  marginTop: '4px',
                  backgroundColor: isSelected ? 'var(--ds-background-selected, var(--ds-background-selected, #eff6ff))' : 'transparent',
                  border: isSelected ? '1px solid #bfdbfe' : '1px solid transparent',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: '#111827',
                }}
              >
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: user.avatar_url ? 'var(--ds-border, var(--ds-border, #e5e7eb))' : getAvatarColor(user.full_name),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--ds-surface, var(--ds-surface, #ffffff))',
                    flexShrink: 0,
                    overflow: 'hidden',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                  }}
                >
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.full_name || ''}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                  ) : (
                    initials
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                  <div style={{ fontWeight: 500, color: '#111827' }}>
                    {user.full_name || 'Unknown User'}
                  </div>
                  {user.email && (
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>
                      {user.email}
                    </div>
                  )}
                </div>
                {isSelected && (
                  <Check size={14} style={{ color: 'var(--ds-text-brand, var(--ds-text-brand, #2563eb))', flexShrink: 0 }} />
                )}
              </button>
            );
          })}
      </div>
    </div>
  );

  return (
    <>
      <div
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          padding: '10px 14px',
          backgroundColor: 'var(--ds-surface, var(--ds-surface, #ffffff))',
          border: isOpen ? '1px solid #2563eb' : '1px solid #d1d5db',
          borderRadius: '8px',
          cursor: 'pointer',
          boxShadow: isOpen ? '0 0 0 3px #eff6ff' : 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
          {value && assigneeName ? (
            <>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: assigneeAvatar ? 'var(--ds-border, var(--ds-border, #e5e7eb))' : getAvatarColor(assigneeName),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--ds-surface, var(--ds-surface, #ffffff))',
                  overflow: 'hidden',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                }}
              >
                {assigneeAvatar ? (
                  <img
                    src={assigneeAvatar}
                    alt={assigneeName}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                ) : (
                  getT10Initials(assigneeName)
                )}
              </div>
              <span style={{ fontSize: '14px', color: '#111827', fontWeight: 500 }}>{assigneeName}</span>
            </>
          ) : (
            <span style={{ color: '#9ca3af', fontSize: '14px' }}>Select assignee</span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {value && (
            <button
              type="button"
              onClick={handleClear}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '20px',
                height: '20px',
                backgroundColor: '#f3f4f6',
                border: 'none',
                borderRadius: '50%',
                color: '#6b7280',
                cursor: 'pointer',
              }}
            >
              <X size={12} />
            </button>
          )}
          <ChevronDown
            size={16}
            style={{
              color: '#9ca3af',
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.15s ease',
            }}
          />
        </div>
      </div>
      {createPortal(dropdown, document.body)}
    </>
  );
}

export default T10AssigneeFieldNew;
