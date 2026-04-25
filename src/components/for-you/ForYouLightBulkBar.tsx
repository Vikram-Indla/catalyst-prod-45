/**
 * ForYouLightBulkBar — Theme-aware bulk action bar
 */

import React from 'react';
import { UserPlus, Check, Trash2, X } from 'lucide-react';

interface ForYouLightBulkBarProps {
  selectedCount: number;
  onClear: () => void;
  onAssignOwner?: () => void;
  onApprove?: () => void;
  onDelete?: () => void;
}

export function ForYouLightBulkBar({
  selectedCount, onClear, onAssignOwner, onApprove, onDelete,
}: ForYouLightBulkBarProps) {
  if (selectedCount === 0) return null;

  const actionBtn: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 6,
    height: 32, padding: '0 14px',
    backgroundColor: 'transparent', border: 'none', borderRadius: 8,
    cursor: 'pointer', fontSize: 13, fontWeight: 500, color: 'var(--cp-t2)',
    transition: 'background 0.1s', fontFamily: 'var(--cp-font-body)',
  };

  return (
    <div style={{
      position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
      display: 'flex', alignItems: 'center', gap: 2,
      height: 48, padding: '0 8px',
      backgroundColor: 'var(--cp-float)', border: '1px solid var(--cp-bd)',
      borderRadius: 12,
      boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.04)',
      zIndex: 90, animation: 'fy-dropIn 0.2s ease',
    }}>
      <span style={{
        display: 'flex', alignItems: 'center', height: 32,
        padding: '0 14px', backgroundColor: 'var(--cp-blue-wash)', color: 'var(--cp-blue-text)',
        borderRadius: 8, fontSize: 13, fontWeight: 600, marginRight: 8,
      }}>
        {selectedCount} selected
      </span>

      <div style={{ width: 1, height: 24, backgroundColor: 'var(--cp-bd)' }} />

      {onAssignOwner && (
        <button
          style={actionBtn}
          onClick={onAssignOwner}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--cp-hover)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
        >
          <UserPlus size={14} /> Assign Owner
        </button>
      )}

      {onApprove && (
        <button
          style={actionBtn}
          onClick={onApprove}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--cp-hover)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
        >
          <Check size={14} /> Approve
        </button>
      )}

      {onDelete && (
        <button
          style={{ ...actionBtn, color: 'var(--cp-err-text)' }}
          onClick={onDelete}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--cp-err-bg)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
        >
          <Trash2 size={14} /> Delete
        </button>
      )}

      <div style={{ width: 1, height: 24, backgroundColor: 'var(--cp-bd)' }} />

      <button
        onClick={onClear}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 32, height: 32, backgroundColor: 'transparent',
          border: 'none', borderRadius: 8, cursor: 'pointer', color: 'var(--cp-t3)',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--cp-hover)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
      >
        <X size={16} />
      </button>
    </div>
  );
}
