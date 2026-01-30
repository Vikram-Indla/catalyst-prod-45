// ============================================================================
// ORGANISM: ModalFooter — Timestamps footer (FIX 2: Date formatting)
// ============================================================================

import React from 'react';
import { COLORS } from '../colors';
import { Task } from '../types';
import { formatDate } from '../utils/formatDate';

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
          {formatDate(task.createdAt)}
        </strong>
        {' · '}
        Updated{' '}
        <strong style={{ fontWeight: 600, color: COLORS.textSecondary }}>
          {formatDate(task.updatedAt)}
        </strong>
      </span>
    </div>
  );
};

export default ModalFooter;
