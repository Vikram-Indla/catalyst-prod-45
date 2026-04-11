/**
 * AssigneeCell — Avatar photo (24px circle) + truncated name
 * Jira parity: real avatar with initials fallback, name truncated
 */
import React, { useState } from 'react';

function getInitials(name: string | null | undefined): string {
  if (!name?.trim()) return '?';
  const parts = name.trim().split(/\s+/);
  return parts.length === 1
    ? parts[0].slice(0, 2).toUpperCase()
    : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getAvatarColor(id: string): string {
  const colors = ['#0052CC', '#6554C0', '#36B37E', '#FF5630', '#FF991F', '#00B8D9', '#166534', '#9E4C00'];
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash) + id.charCodeAt(i);
    hash = hash & hash;
  }
  return colors[Math.abs(hash) % colors.length];
}

interface AssigneeCellProps {
  displayName: string | null;
  avatarUrl?: string | null;
}

export const AssigneeCell = React.memo(function AssigneeCell({ displayName, avatarUrl }: AssigneeCellProps) {
  const [imgError, setImgError] = useState(false);

  if (!displayName) {
    return (
      <div className="sp-assignee-cell">
        <div className="sp-avatar-fallback" style={{ background: '#8993A4' }}>?</div>
      </div>
    );
  }

  const truncated = displayName.length > 6 ? displayName.slice(0, 5) + '...' : displayName;

  return (
    <div className="sp-assignee-cell" title={displayName}>
      {avatarUrl && !imgError ? (
        <img
          className="sp-avatar"
          src={avatarUrl}
          alt={displayName}
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="sp-avatar-fallback" style={{ background: getAvatarColor(displayName) }}>
          {getInitials(displayName)}
        </div>
      )}
      <span className="sp-assignee-name">{truncated}</span>
    </div>
  );
});
