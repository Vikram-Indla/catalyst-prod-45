// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT: T10AssigneeDropdown
// Purpose: Inline assignee picker for priority items - same style as label dropdown
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useRef, useEffect } from 'react';
import { Plus, X, Check, User } from 'lucide-react';
import { useT10Users } from '../../hooks/useT10Users';
import { useT10UpdateItem } from '../../hooks/useT10Items';

interface T10AssigneeDropdownProps {
  itemId: string;
  currentAssigneeId: string | null;
  currentAssigneeName: string | null;
  onAssigneeChange?: () => void;
}

// Generate consistent color from name
function getAvatarColor(name: string | null): string {
  if (!name) return '#94a3b8';
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 65%, 50%)`;
}

function getInitials(name: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function T10AssigneeDropdown({ 
  itemId, 
  currentAssigneeId, 
  currentAssigneeName,
  onAssigneeChange 
}: T10AssigneeDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: users = [] } = useT10Users(search);
  const updateItem = useT10UpdateItem();

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus input when opening
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelectUser = async (userId: string | null) => {
    try {
      await updateItem.mutateAsync({
        id: itemId,
        assignee_id: userId,
      });
      onAssigneeChange?.();
      setIsOpen(false);
      setSearch('');
    } catch (error) {
      console.error('[T10] Error updating assignee:', error);
    }
  };

  const handleRemoveAssignee = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await handleSelectUser(null);
  };

  return (
    <div className="t10-assignee-dropdown" ref={dropdownRef}>
      {/* Current Assignee / Add button */}
      <div className="t10-assignee-dropdown-current">
        {currentAssigneeId && currentAssigneeName ? (
          <span
            className="t10-assignee-chip"
            style={{ 
              backgroundColor: `${getAvatarColor(currentAssigneeName)}15`,
              borderColor: getAvatarColor(currentAssigneeName),
              color: getAvatarColor(currentAssigneeName)
            }}
          >
            <span 
              className="t10-assignee-chip-avatar"
              style={{ backgroundColor: getAvatarColor(currentAssigneeName) }}
            >
              {getInitials(currentAssigneeName)}
            </span>
            {currentAssigneeName.split(' ')[0]}
            <button
              type="button"
              className="t10-assignee-chip-remove"
              onClick={handleRemoveAssignee}
            >
              <X size={10} />
            </button>
          </span>
        ) : (
          <button
            type="button"
            className="t10-assignee-add-btn"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(!isOpen);
            }}
          >
            <User size={12} />
            Assignee
          </button>
        )}
        
        {/* Edit button when assigned */}
        {currentAssigneeId && (
          <button
            type="button"
            className="t10-assignee-edit-btn"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(!isOpen);
            }}
          >
            <Plus size={12} style={{ transform: 'rotate(45deg)' }} />
          </button>
        )}
      </div>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="t10-assignee-dropdown-panel">
          {/* Search Input */}
          <div className="t10-assignee-dropdown-search">
            <input
              ref={inputRef}
              type="text"
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* User List */}
          <div className="t10-assignee-dropdown-list">
            {users.map(user => {
              const isSelected = user.id === currentAssigneeId;
              return (
                <button
                  key={user.id}
                  type="button"
                  className={`t10-assignee-dropdown-item ${isSelected ? 'selected' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectUser(user.id);
                  }}
                >
                  <span
                    className="t10-assignee-dropdown-avatar"
                    style={{ backgroundColor: getAvatarColor(user.full_name) }}
                  >
                    {user.initials}
                  </span>
                  <div className="t10-assignee-dropdown-info">
                    <span className="t10-assignee-dropdown-name">{user.full_name}</span>
                    <span className="t10-assignee-dropdown-email">{user.email}</span>
                  </div>
                  {isSelected && (
                    <Check size={14} className="t10-assignee-dropdown-check" />
                  )}
                </button>
              );
            })}

            {/* Empty State */}
            {users.length === 0 && (
              <div className="t10-assignee-dropdown-empty">
                <User size={16} />
                <span>{search ? 'No users found' : 'No users available'}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
