/**
 * AssigneeCell — Atlaskit Avatar (24px "small") + truncated name + assign popover.
 *
 * Atlaskit Avatar gives us the correct Jira ring colour + initials fallback
 * out of the box, respecting current theme tokens. We keep the surrounding
 * AssigneePopover so click-to-reassign still works.
 */
import React from 'react';
import Avatar from '@atlaskit/avatar';
import { UserPlus } from 'lucide-react';
import { AssigneePopover } from '../popovers/AssigneePopover';

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
  const truncated = displayName
    ? displayName.length > 12 ? displayName.slice(0, 11) + '…' : displayName
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
      {displayName ? (
        <Avatar
          size="small"
          name={displayName}
          src={avatarUrl ?? undefined}
          borderColor="transparent"
        />
      ) : (
        <span className="sp-avatar-fallback" style={{ background: 'var(--ds-border, var(--ds-border, #DFE1E6))', color: 'var(--ds-text-subtlest, var(--ds-text-subtlest, #6B778C))' }}>
          <UserPlus size={12} />
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
