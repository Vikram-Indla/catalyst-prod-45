// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT: T10HeaderV3
// Purpose: Landing page header matching week view detail page style
// ═══════════════════════════════════════════════════════════════════════════════

import React from 'react';
import { Plus } from 'lucide-react';
import '../../styles/task10-detail.css';

interface T10HeaderV3Props {
  onNewList: () => void;
}

export function T10HeaderV3({ onNewList }: T10HeaderV3Props) {
  return (
    <header className="t10-detail-header" style={{ marginBottom: '24px' }}>
      {/* Logo - same as week view */}
      <div className="t10-detail-logo-link" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}>
        <div className="t10-detail-logo-badge">10</div>
        <div className="t10-detail-logo-text">
          <span className="t10-detail-logo-title">Task¹⁰</span>
          <span className="t10-detail-logo-subtitle">Priority Management</span>
        </div>
      </div>

      {/* Spacer */}
      <div className="t10-detail-header-spacer" />

      {/* New List Button - matches week view checkout button style */}
      <button
        type="button"
        onClick={onNewList}
        className="t10-detail-btn-checkout"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        <Plus size={16} strokeWidth={2.5} />
        New List
      </button>
    </header>
  );
}

export default T10HeaderV3;
