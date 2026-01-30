// ============================================================================
// ORGANISM: ModalFooter — Timestamps footer with save indicator
// ============================================================================

import React from 'react';
import { Check, Loader2 } from 'lucide-react';
import { COLORS } from '../colors';
import { Task } from '../types';
import { formatDate } from '../utils/formatDate';

interface ModalFooterProps {
  task: Task;
  isSaving?: boolean;
  lastSaved?: Date | null;
}

export const ModalFooter: React.FC<ModalFooterProps> = ({ 
  task, 
  isSaving = false,
  lastSaved 
}) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 28px',
        backgroundColor: COLORS.surfacePage,
        borderTop: `1px solid ${COLORS.borderLight}`
      }}
    >
      {/* TIMESTAMPS */}
      <span style={{ fontSize: '13px', color: COLORS.textMuted }}>
        Created{' '}
        <strong style={{ fontWeight: 600, color: COLORS.textSecondary }}>
          {formatDate(task.createdAt)}
        </strong>
        {' · '}
        Updated{' '}
        <strong style={{ fontWeight: 600, color: COLORS.textSecondary }}>
          {formatDate(task.updatedAt)}
        </strong>
      </span>

      {/* SAVE INDICATOR */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {isSaving ? (
          <>
            <Loader2 
              size={14} 
              style={{ 
                color: COLORS.accent,
                animation: 'spin 1s linear infinite'
              }} 
            />
            <span style={{ fontSize: '12px', color: COLORS.textMuted }}>
              Saving...
            </span>
          </>
        ) : lastSaved ? (
          <>
            <Check size={14} style={{ color: '#16a34a' }} />
            <span style={{ fontSize: '12px', color: COLORS.textMuted }}>
              Saved
            </span>
          </>
        ) : null}
      </div>
    </div>
  );
};

export default ModalFooter;
