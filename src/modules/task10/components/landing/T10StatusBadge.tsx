// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT: T10StatusBadge
// Purpose: ACTIVE/INACTIVE status pill
// ═══════════════════════════════════════════════════════════════════════════════

import React from 'react';
import type { T10ListStatus } from '../../types';

interface T10StatusBadgeProps {
  status: T10ListStatus;
}

export function T10StatusBadge({ status }: T10StatusBadgeProps) {
  const isActive = status === 'active';
  
  return (
    <span className={`t10-status-badge ${isActive ? 't10-status-badge-active' : 't10-status-badge-inactive'}`}>
      {isActive && <span className="t10-status-badge-dot" />}
      {status.toUpperCase()}
    </span>
  );
}

export default T10StatusBadge;
