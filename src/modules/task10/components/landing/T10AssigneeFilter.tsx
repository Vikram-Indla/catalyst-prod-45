// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT: T10AssigneeFilter
// Purpose: Multi-select filter for assignees (from profiles table)
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useMemo, useEffect } from 'react';
import { User, Search, Check } from 'lucide-react';
import { T10FilterDropdown } from './T10FilterDropdown';
import { useT10Users } from '../../hooks';
import { getT10Initials } from '../../utils';

interface T10AssigneeFilterProps {
  selectedAssignees: string[];
  onApply: (userIds: string[]) => void;
}

export function T10AssigneeFilter({ selectedAssignees, onApply }: T10AssigneeFilterProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [localSelected, setLocalSelected] = useState<string[]>(selectedAssignees);

  const { data: users, isLoading } = useT10Users();

  // Filter users by search query
  const filteredUsers = useMemo(() => {
    if (!users) return [];
    if (!searchQuery) return users;
    return users.filter(user =>
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
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
            placeholder="Search people..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Options */}
      <div className="t10-dropdown-options">
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
            return (
              <button
                key={user.id}
                type="button"
                className={`t10-dropdown-option ${isSelected ? 't10-selected' : ''}`}
                onClick={() => handleToggle(user.id)}
                role="option"
                aria-selected={isSelected}
              >
                <div className="t10-dropdown-option-checkbox">
                  <Check size={12} />
                </div>
                <div className="t10-dropdown-avatar">
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt={user.full_name || ''} />
                  ) : (
                    initials
                  )}
                </div>
                <span className="t10-dropdown-option-label">
                  {user.full_name || 'Unknown User'}
                </span>
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
