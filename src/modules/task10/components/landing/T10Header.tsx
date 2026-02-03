import React from 'react';
import { Plus } from 'lucide-react';

interface T10HeaderProps {
  onCreateList: () => void;
  userInitials: string;
}

export function T10Header({ onCreateList, userInitials }: T10HeaderProps) {
  return (
    <header className="t10-header">
      <div className="t10-header-logo">
        <div className="t10-logo-box">10</div>
        <div className="t10-logo-text">
          <span className="t10-logo-name">Task<sup>10</sup></span>
          <span className="t10-logo-tagline">Priority Management</span>
        </div>
      </div>
      <div className="t10-header-actions">
        <button className="t10-btn t10-btn-primary" onClick={onCreateList}>
          <Plus size={18} />
          New List
        </button>
        <div className="t10-avatar">{userInitials}</div>
      </div>
    </header>
  );
}
