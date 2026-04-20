// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT: T10AssigneeFilter
// Purpose: Multi-select filter for assignees (from profiles table)
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useMemo, useEffect } from 'react';
import { User, Search, Check } from 'lucide-react';
import { T10FilterDropdown } from './T10FilterDropdown';
import { useT10Users } from '../../hooks';
import { getT10Initials } from '../../utils';

// Generate consistent avatar color from name.
// CLAUDE.md §L38 — hex literals only (no HSL).
// Fixed 10-colour Catalyst avatar palette (shared across T10 / Mention / Sidebar).
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

interface T10AssigneeFilterProps {
  selectedAssignees: string[];
  onApply: (userIds: string[]) => void;
}

export function T10AssigneeFilter({ selectedAssignees, onApply }: T10AssigneeFilterProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [localSelected, setLocalSelected] = useState<string[]>(selectedAssignees);

  const { data: users, isLoading } = useT10Users();

  // Filter users by search query (name or email)
  const filteredUsers = useMemo(() => {
    if (!users) return [];
    if (!searchQuery) return users;
    const q = searchQuery.toLowerCase();
    return users.filter(user =>
      user.full_name?.toLowerCase().includes(q) ||
      user.email?.toLowerCase().includes(q)
    );
  }, [users, searchQuery]);

  // Sync local state when prop changes
  useEffect(() => {
    setLocalSelected(selectedAssignees);
  }, [selectedAssignees]);

  const handleToggle = (userId: string) => {
    setLocalSelected(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleApply = () => {
    onApply(localSelected);
    console.log('[T10] Assignee filter applied:', localSelected.length, 'users');
  };

  const handleClear = () => {
    setLocalSelected([]);
  };

  const handleClose = () => {
    setLocalSelected(selectedAssignees);
    setSearchQuery('');
  };

  return (
    <T10FilterDropdown
      icon={<User size={16} />}
      label="Assigned To"
      selectedCount={selectedAssignees.length}
      isActive={selectedAssignees.length > 0}
      onClose={handleClose}
    >
      {/* Search */}
      <div className="t10-dropdown-search">
        <div className="t10-dropdown-search-wrapper">
          <Search className="t10-dropdown-search-icon" />
          <input
            type="text"
            className="t10-dropdown-search-input"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Options */}
      <div className="t10-dropdown-options t10-assignee-list">
        {isLoading ? (
          <div className="t10-dropdown-empty">Loading users...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="t10-dropdown-empty">
            {searchQuery ? 'No users found' : 'No users available'}
          </div>
        ) : (
          filteredUsers.map(user => {
            const isSelected = localSelected.includes(user.id);
            const initials = getT10Initials(user.full_name);
            const avatarColor = getAvatarColor(user.full_name);
            
            return (
              <button
                key={user.id}
                type="button"
                className={`t10-assignee-option ${isSelected ? 't10-selected' : ''}`}
                onClick={() => handleToggle(user.id)}
                role="option"
                aria-selected={isSelected}
              >
                {/* Avatar */}
                <div 
                  className="t10-assignee-avatar"
                  style={{ backgroundColor: avatarColor }}
                >
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt={user.full_name || ''} />
                  ) : (
                    initials
                  )}
                </div>
                
                {/* Name & Email */}
                <div className="t10-assignee-info">
                  <span className="t10-assignee-name">
                    {user.full_name || 'Unknown User'}
                  </span>
                  {user.email && (
                    <span className="t10-assignee-email">
                      {user.email}
                    </span>
                  )}
                </div>

                {/* Selection indicator */}
                {isSelected && (
                  <div className="t10-assignee-check">
                    <Check size={16} />
                  </div>
                )}
              </button>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="t10-dropdown-footer">
        <button
          type="button"
          className="t10-dropdown-footer-btn t10-dropdown-footer-btn-clear"
          onClick={handleClear}
          disabled={localSelected.length === 0}
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

export default T10AssigneeFilter;
