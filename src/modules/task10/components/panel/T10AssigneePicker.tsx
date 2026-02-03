import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, User, Check, Loader2 } from 'lucide-react';
import { useProfiles, T10Profile } from '../../hooks/useProfiles';

interface T10AssigneePickerProps {
  currentAssigneeId?: string;
  currentAssigneeName?: string;
  currentAssigneeInitials?: string;
  onSelect: (profile: T10Profile | null) => void;
  anchorRef: React.RefObject<HTMLDivElement>;
  isOpen: boolean;
  onClose: () => void;
}

export function T10AssigneePicker({
  currentAssigneeId,
  currentAssigneeName,
  currentAssigneeInitials,
  onSelect,
  anchorRef,
  isOpen,
  onClose,
}: T10AssigneePickerProps) {
  const [search, setSearch] = useState('');
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: profiles = [], isLoading } = useProfiles(search);

  // Calculate position based on anchor
  useEffect(() => {
    if (isOpen && anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 4,
        left: rect.left,
      });
    }
  }, [isOpen, anchorRef]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        anchorRef.current &&
        !anchorRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose, anchorRef]);

  // Close on Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSelect = (profile: T10Profile) => {
    onSelect(profile);
    onClose();
    setSearch('');
  };

  const handleClear = () => {
    onSelect(null);
    onClose();
    setSearch('');
  };

  const dropdown = (
    <div
      ref={dropdownRef}
      className="t10-assignee-dropdown"
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        zIndex: 99999,
      }}
    >
      {/* Search Input */}
      <div className="t10-assignee-search">
        <Search size={16} />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button onClick={() => setSearch('')} className="t10-assignee-search-clear">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Options */}
      <div className="t10-assignee-options">
        {/* Unassign option */}
        {currentAssigneeId && (
          <button className="t10-assignee-option unassign" onClick={handleClear}>
            <div className="t10-assignee-avatar empty">
              <User size={14} />
            </div>
            <div className="t10-assignee-info">
              <span className="t10-assignee-name">Remove assignee</span>
            </div>
            <X size={14} className="t10-assignee-action" />
          </button>
        )}

        {isLoading && (
          <div className="t10-assignee-loading">
            <Loader2 size={18} className="animate-spin" />
            <span>Loading...</span>
          </div>
        )}

        {!isLoading && profiles.length === 0 && search && (
          <div className="t10-assignee-empty">
            No users found matching "{search}"
          </div>
        )}

        {profiles.map((profile) => {
          const isSelected = profile.id === currentAssigneeId;
          return (
            <button
              key={profile.id}
              className={`t10-assignee-option ${isSelected ? 'selected' : ''}`}
              onClick={() => handleSelect(profile)}
            >
              <div className="t10-assignee-avatar">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt={profile.full_name} />
                ) : (
                  profile.initials
                )}
              </div>
              <div className="t10-assignee-info">
                <span className="t10-assignee-name">{profile.full_name}</span>
                <span className="t10-assignee-email">{profile.email}</span>
              </div>
              {isSelected && <Check size={16} className="t10-assignee-check" />}
            </button>
          );
        })}
      </div>
    </div>
  );

  return createPortal(dropdown, document.body);
}
