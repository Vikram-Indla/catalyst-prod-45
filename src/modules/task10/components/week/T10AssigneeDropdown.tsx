// ════════════════════════════════════════════════════════════════════════════════
// COMPONENT: T10AssigneeDropdown
// Purpose: Portal-based assignee picker for priority items - matches side panel UX
// ════════════════════════════════════════════════════════════════════════════════

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, Search, User } from 'lucide-react';
import { useT10Users } from '../../hooks/useT10Users';
import { useT10UpdateItem } from '../../hooks/useT10Items';
import { getT10Initials } from '../../utils';

interface T10AssigneeDropdownProps {
  itemId: string;
  currentAssigneeId: string | null;
  currentAssigneeName: string | null;
  onAssigneeChange?: () => void;
}

// Generate consistent vibrant avatar color from name
function getAvatarColor(name: string | null): string {
  if (!name) return 'hsl(220, 70%, 55%)';
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 65%, 50%)`;
}

export function T10AssigneeDropdown({
  itemId,
  currentAssigneeId,
  currentAssigneeName,
  onAssigneeChange,
}: T10AssigneeDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { data: users = [], isLoading } = useT10Users(searchQuery);
  const updateItem = useT10UpdateItem();

  // Calculate position when opening
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
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

  const handleSelect = async (userId: string) => {
    try {
      await updateItem.mutateAsync({
        id: itemId,
        assignee_id: userId,
      });
      setIsOpen(false);
      setSearchQuery('');
      onAssigneeChange?.();
    } catch (error) {
      console.error('[T10] Error updating assignee:', error);
    }
  };

  const handleClear = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await updateItem.mutateAsync({
        id: itemId,
        assignee_id: null,
      });
      onAssigneeChange?.();
    } catch (error) {
      console.error('[T10] Error clearing assignee:', error);
    }
  };

  const dropdown = isOpen && (
    <div
      ref={dropdownRef}
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        width: Math.max(position.width, 320),
        backgroundColor: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15), 0 4px 6px -2px rgba(0,0,0,0.08)',
        zIndex: 99999,
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
            style={{
              flex: 1,
              minWidth: 0,
              fontSize: '14px',
              color: '#111827',
              backgroundColor: 'transparent',
              border: 'none',
              outline: 'none',
            }}
          />
        </div>
      </div>

      {/* Options */}
      <div style={{ maxHeight: '280px', overflowY: 'auto', padding: '4px 8px 8px' }}>
        {/* Unassign option */}
        {currentAssigneeId && (
          <button
            type="button"
            onClick={handleClear}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              width: '100%',
              padding: '10px 12px',
              marginTop: '4px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              color: '#dc2626',
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

        {!isLoading && users.length === 0 && (
          <div
            style={{
              padding: '20px',
              textAlign: 'center',
              color: '#9ca3af',
              fontSize: '14px',
            }}
          >
            {searchQuery ? 'No users found' : 'No users available'}
          </div>
        )}

        {!isLoading &&
          users.map((user) => {
            const isSelected = currentAssigneeId === user.id;
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
                  backgroundColor: isSelected ? '#eff6ff' : 'transparent',
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
                    backgroundColor: user.avatar_url ? '#e5e7eb' : getAvatarColor(user.full_name),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#ffffff',
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
                  <Check size={14} style={{ color: '#2563eb', flexShrink: 0 }} />
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
          gap: '8px',
          padding: '6px 10px',
          backgroundColor: currentAssigneeId ? '#eff6ff' : '#f9fafb',
          border: isOpen ? '1px solid #2563eb' : '1px solid #e5e7eb',
          borderRadius: '6px',
          cursor: 'pointer',
          minHeight: '32px',
        }}
      >
        {currentAssigneeId && currentAssigneeName ? (
          <>
            <div
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                backgroundColor: getAvatarColor(currentAssigneeName),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px',
                fontWeight: 600,
                color: '#ffffff',
                flexShrink: 0,
                overflow: 'hidden',
                boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
              }}
            >
              {getT10Initials(currentAssigneeName)}
            </div>
            <span style={{ fontSize: '13px', fontWeight: 500, color: '#111827' }}>
              {currentAssigneeName.split(' ')[0]}
            </span>
          </>
        ) : (
          <>
            <User size={14} style={{ color: '#9ca3af' }} />
            <span style={{ fontSize: '13px', color: '#9ca3af' }}>Assign</span>
          </>
        )}
      </div>
      {createPortal(dropdown, document.body)}
    </>
  );
}