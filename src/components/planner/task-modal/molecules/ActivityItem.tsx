// ============================================================================
// MOLECULE: ActivityItem — Comment in activity feed
// ============================================================================

import React from 'react';
import { COLORS } from '../colors';
import { Avatar } from '../atoms';

interface ActivityItemProps {
  author: string;
  authorInitials: string;
  authorColor: string;
  content: string;
  createdAt: string;
}

export const ActivityItem: React.FC<ActivityItemProps> = ({
  author,
  authorInitials,
  authorColor,
  content,
  createdAt
}) => {
  return (
    <div style={{ display: 'flex', gap: '14px' }}>
      {/* AVATAR — 40px */}
      <Avatar initials={authorInitials} color={authorColor} size="lg" />

      {/* CONTENT */}
      <div style={{ flex: 1 }}>
        {/* HEADER */}
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: '10px',
            marginBottom: '8px'
          }}
        >
          <span
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: COLORS.textPrimary
            }}
          >
            {author}
          </span>
          <span style={{ fontSize: '13px', color: COLORS.textLight }}>
            {createdAt}
          </span>
        </div>

        {/* COMMENT BUBBLE */}
        <div
          style={{
            padding: '14px 18px',
            backgroundColor: COLORS.surfacePage,
            borderRadius: '12px',
            fontSize: '14px',
            lineHeight: 1.5,
            color: COLORS.textSecondary
          }}
        >
          {content}
        </div>
      </div>
    </div>
  );
};

export default ActivityItem;
