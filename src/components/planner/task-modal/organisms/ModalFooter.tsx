// ============================================================================
// ORGANISM: ModalFooter — Timestamps footer
// ============================================================================

import React from 'react';
import { COLORS } from '../colors';
import { Task } from '../types';

interface ModalFooterProps {
  task: Task;
}

export const ModalFooter: React.FC<ModalFooterProps> = ({ task }) => {
  return (
    <div
      style={{
        padding: '16px 28px',
        backgroundColor: COLORS.surfacePage,
        borderTop: `1px solid ${COLORS.borderLight}`
      }}
    >
      <span style={{ fontSize: '13px', color: COLORS.textMuted }}>
        Created{' '}
        <strong style={{ fontWeight: 600, color: COLORS.textSecondary }}>
          {task.createdAt || 'Unknown'}
        </strong>
        {' · '}
        Updated{' '}
        <strong style={{ fontWeight: 600, color: COLORS.textSecondary }}>
          {task.updatedAt || 'Just now'}
        </strong>
      </span>
    </div>
  );
};

export default ModalFooter;
