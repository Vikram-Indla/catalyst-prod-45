/**
 * AssigneeCell — Avatar photo (24px circle) + truncated name + assign popover.
 */
import React, { useState } from 'react';
import { AssigneePopover } from '../popovers/AssigneePopover';
import { getInitials, getAvatarColor } from '../../dialogs/story-detail-modules/helpers';
import { UserPlus } from 'lucide-react';

interface AssigneeCellProps {
  displayName: string | null;
  accountId: string | null;
  avatarUrl?: string | null;
  onChange?: (assignee: { accountId: string | null; displayName: string | null }) => void;
  readOnly?: boolean;
}

export const AssigneeCell = React.memo(function AssigneeCell({
  displayName, accountId, avatarUrl, onChange, readOnly,
}: AssigneeCellProps) {
  const [imgError, setImgError] = useState(false);

  const truncated = displayName
    ? displayName.length > 6 ? displayName.slice(0, 5) + '…' : displayName
    : null;

  const trigger = (
    <button
      type="button"
      className="sp-inline-trigger sp-assignee-cell"
      onClick={(e) => e.stopPropagation()}
      title={displayName ?? 'Unassigned'}
      aria-label={displayName ? `Assigned to ${displayName} — change` : 'Assign user'}
      disabled={readOnly}
    >
      {!displayName ? (
        <span className="sp-avatar-fallback" style={{ background: '#DFE1E6', color: '#6B778C' }}>
          <UserPlus size={12} />
        </span>
      ) : avatarUrl && !imgError ? (
        <img
          className="sp-avatar"
          src={avatarUrl}
          alt={displayName}
          onError={() => setImgError(true)}
        />
      ) : (
        <span className="sp-avatar-fallback" style={{ background: getAvatarColor(displayName) }}>
          {getInitials(displayName)}
        </span>
      )}
      {truncated && <span className="sp-assignee-name">{truncated}</span>}
    </button>
  );

  if (readOnly || !onChange) return trigger;

  return (
    <AssigneePopover currentAccountId={accountId} onChange={onChange}>
      {trigger}
    </AssigneePopover>
  );
});
