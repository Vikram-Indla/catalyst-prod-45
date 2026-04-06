// ============================================================================
// MOLECULE: PermissionBanner — Yellow warning banner
// ============================================================================

import React from 'react';
import { Lock } from 'lucide-react';
import { COLORS } from '../colors';

interface PermissionBannerProps {
  message?: string;
}

export const PermissionBanner: React.FC<PermissionBannerProps> = ({
  message = 'Visible to all · Editable by leads and management'
}) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '14px 18px',
        backgroundColor: COLORS.warningBg,
        border: `1px solid ${COLORS.warningBorder}`,
        borderRadius: '12px',
        marginBottom: '24px'
      }}
    >
      <Lock size={20} style={{ color: COLORS.warningIcon, flexShrink: 0 }} />
      <span style={{ fontSize: '13px', color: COLORS.warningText }}>
        {message}
      </span>
    </div>
  );
};

export default PermissionBanner;
