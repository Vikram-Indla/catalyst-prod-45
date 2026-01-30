// ============================================================================
// MOLECULE: HistoryItem — History event in activity feed
// ============================================================================

import React from 'react';
import { Clock } from 'lucide-react';
import { COLORS } from '../colors';

interface HistoryItemProps {
  action: string;
  author: string;
  timestamp: string;
  isLast?: boolean;
}

export const HistoryItem: React.FC<HistoryItemProps> = ({
  action,
  author,
  timestamp,
  isLast = false
}) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '14px',
        padding: '16px 0',
        borderBottom: isLast ? 'none' : `1px solid ${COLORS.borderLight}`
      }}
    >
      {/* ICON — 36px circle */}
      <div
        style={{
          width: '36px',
          height: '36px',
          backgroundColor: COLORS.surfacePage,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}
      >
        <Clock size={16} style={{ color: COLORS.textMuted }} />
      </div>

      {/* CONTENT */}
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontSize: '14px',
            color: COLORS.textSecondary,
            lineHeight: 1.5
          }}
        >
          <strong style={{ color: COLORS.textPrimary, fontWeight: 600 }}>
            {action}
          </strong>
          {' by '}
          <strong style={{ color: COLORS.textPrimary, fontWeight: 600 }}>
            {author}
          </strong>
        </div>
        <div
          style={{
            fontSize: '13px',
            color: COLORS.textLight,
            marginTop: '4px'
          }}
        >
          {timestamp}
        </div>
      </div>
    </div>
  );
};

export default HistoryItem;
