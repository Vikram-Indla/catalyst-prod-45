/**
 * ForYouLightBulkBar — Light-mode bulk action bar for the For You page
 * White bg, blue count badge, floating shadow — matches Catalyst light palette
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
    cursor: 'pointer', fontSize: 13, fontWeight: 500, color: '#3F3F46',
    transition: 'background 0.1s', fontFamily: "'Inter', system-ui",
  };

  return (
    <div style={{
      position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
      display: 'flex', alignItems: 'center', gap: 2,
      height: 48, padding: '0 8px',
      backgroundColor: '#FFFFFF', border: '1px solid #E4E4E7',
      borderRadius: 12,
      boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.04)',
      zIndex: 90, animation: 'fy-dropIn 0.2s ease',
    }}>
      {/* Count badge */}
      <span style={{
        display: 'flex', alignItems: 'center', height: 32,
        padding: '0 14px', backgroundColor: '#EFF6FF', color: '#2563EB',
        borderRadius: 8, fontSize: 13, fontWeight: 600, marginRight: 8,
      }}>
        {selectedCount} selected
      </span>

      <div style={{ width: 1, height: 24, backgroundColor: '#E4E4E7' }} />

      {onAssignOwner && (
        <button
          style={actionBtn}
          onClick={onAssignOwner}
          onMouseEnter={e => { e.currentTarget.style.background = '#F4F4F5'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
        >
          <UserPlus size={14} /> Assign Owner
        </button>
      )}

      {onApprove && (
        <button
          style={actionBtn}
          onClick={onApprove}
          onMouseEnter={e => { e.currentTarget.style.background = '#F4F4F5'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
        >
          <Check size={14} /> Approve
        </button>
      )}

      {onDelete && (
        <button
          style={{ ...actionBtn, color: '#D92525' }}
          onClick={onDelete}
          onMouseEnter={e => { e.currentTarget.style.background = '#FEF2F2'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
        >
          <Trash2 size={14} /> Delete
        </button>
      )}

      <div style={{ width: 1, height: 24, backgroundColor: '#E4E4E7' }} />

      <button
        onClick={onClear}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 32, height: 32, backgroundColor: 'transparent',
          border: 'none', borderRadius: 8, cursor: 'pointer', color: '#71717A',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = '#F4F4F5'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
      >
        <X size={16} />
      </button>
    </div>
  );
}
