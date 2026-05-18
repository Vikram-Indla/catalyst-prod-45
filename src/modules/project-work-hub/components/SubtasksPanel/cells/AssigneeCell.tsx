/**
 * AssigneeCell — Atlaskit Avatar (24px "small") + truncated name + assign popover.
 *
 * Atlaskit Avatar gives us the correct Jira ring colour + initials fallback
 * out of the box, respecting current theme tokens. We keep the surrounding
 * AssigneePopover so click-to-reassign still works.
 */
import React from 'react';
import CatalystAvatar from '@/components/shared/CatalystAvatar';
import { resolveAvatarUrl } from '@/lib/avatars';
import { AssigneePopover } from '../popovers/AssigneePopover';

interface AssigneeCellProps {
  displayName: string | null;
  accountId: string | null;
  avatarUrl?: string | null;
  onChange?: (assignee: { accountId: string | null; displayName: string | null }) => void;
  readOnly?: boolean;
  /** When true, suppresses the name text — shows avatar only (Jira subtasks 40px icon column). */
  iconOnly?: boolean;
}

// Inline SVG user-plus — replaces lucide-react UserPlus.
const UserPlusIcon = () => (
  <svg width={12} height={12} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M15 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-8.5 8c0-3.31 3.13-6 7-6 .34 0 .67.02 1 .05A6.5 6.5 0 0 1 14 18.5c0 .56.08 1.1.22 1.62C13.5 20.37 12.3 20.5 11 20.5c-2.21 0-4.2-.5-5.5-1.3V20z"/>
    <path d="M20 14v2h2v2h-2v2h-2v-2h-2v-2h2v-2h2z"/>
  </svg>
);

export const AssigneeCell = React.memo(function AssigneeCell({
  displayName, accountId, avatarUrl, onChange, readOnly, iconOnly,
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
        <CatalystAvatar
          size="small"
          name={displayName}
          src={resolveAvatarUrl(displayName) ?? avatarUrl}
          borderColor="transparent"
        />
      ) : (
        <span className="sp-avatar-fallback" style={{ background: 'var(--ds-border, var(--cp-lozenge-grey-bg, var(--cp-border-neutral, #DFE1E6)))', color: 'var(--ds-text-subtlest, #6B778C)' }}>
          <UserPlusIcon />
        </span>
      )}
      {!iconOnly && truncated && <span className="sp-assignee-name">{truncated}</span>}
    </button>
  );

  if (readOnly || !onChange) return trigger;

  return (
    <AssigneePopover currentAccountId={accountId} onChange={onChange}>
      {trigger}
    </AssigneePopover>
  );
});
