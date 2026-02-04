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
      {/* Logo - "Task" text + blue circular badge with "10" */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ 
          fontSize: '18px', 
          fontWeight: 600, 
          color: '#2563eb',
          letterSpacing: '-0.01em'
        }}>
          Task
        </span>
        <div style={{
          width: '28px',
          height: '28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#2563eb',
          borderRadius: '50%',
          color: '#ffffff',
          fontSize: '12px',
          fontWeight: 700,
        }}>
          10
        </div>
      </div>

      {/* Spacer */}
      <div className="t10-detail-header-spacer" />

      {/* New List Button */}
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
