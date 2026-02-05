// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT: T10Header
// Purpose: Landing page header with logo, title, new list button, and user avatar
// ═══════════════════════════════════════════════════════════════════════════════

import React from 'react';
import { Plus } from 'lucide-react';
import { getT10Initials } from '../../utils';

interface T10HeaderProps {
  onCreateList: () => void;
  userInitials?: string;
  userName?: string;
  userAvatar?: string;
}

export function T10Header({ 
  onCreateList, 
  userInitials = 'U',
  userName,
  userAvatar,
}: T10HeaderProps) {
  const displayInitials = userInitials || getT10Initials(userName || 'User');

  return (
    <header className="t10-header">
      {/* Left: Logo + Title */}
      <div className="t10-header-logo">
        <div className="t10-logo-text">
          <span className="t10-logo-name">Priorities</span>
          <span className="t10-logo-tagline">Priority Management</span>
        </div>
      </div>

      {/* Right: New List Button */}
      <div className="t10-header-actions">
        <button 
          type="button"
          className="t10-btn t10-btn-primary" 
          onClick={onCreateList}
        >
          <Plus size={18} />
          New List
        </button>
      </div>
    </header>
  );
}

export default T10Header;
