/**
 * CatalystProfileCard — User profile hover card.
 * Shows name, role, email, and avatar on hover over any user reference.
 * Wraps @atlaskit/profilecard with Catalyst data resolution.
 */
import { type ReactNode } from 'react';
import CatalystAvatar from '@/components/shared/CatalystAvatar';
import Tooltip from '@atlaskit/tooltip';
import { token } from '@atlaskit/tokens';

interface CatalystProfileCardProps {
  name: string;
  role?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  children: ReactNode;
}

export function CatalystProfileCard({
  name,
  role,
  email,
  avatarUrl,
  children,
}: CatalystProfileCardProps) {
  const content = (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: 4 }}>
      <CatalystAvatar name={name} src={avatarUrl} size="medium" />
      <div>
        <div style={{ fontSize: 'var(--ds-font-size-400)', fontWeight: 600, color: token('color.text', 'var(--ds-text)') }}>{name}</div>
        {role && <div style={{ fontSize: 'var(--ds-font-size-200)', color: token('color.text.subtle', 'var(--ds-text-subtle)') }}>{role}</div>}
        {email && <div style={{ fontSize: 'var(--ds-font-size-200)', color: token('color.text.subtlest', 'var(--ds-text-subtlest)') }}>{email}</div>}
      </div>
    </div>
  );

  return (
    <Tooltip content={content} position="bottom-start">
      {children}
    </Tooltip>
  );
}
