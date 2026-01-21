// ════════════════════════════════════════════════════════════════════════════
// MEMBER ROLE BADGE COMPONENT
// ════════════════════════════════════════════════════════════════════════════

import { cn } from '@/lib/utils';
import { MEMBER_ROLE_CONFIG } from '@/lib/space-constants';
import type { MemberRole } from '@/types/spaces';

interface MemberRoleBadgeProps {
  role: MemberRole;
  className?: string;
}

export function MemberRoleBadge({ role, className }: MemberRoleBadgeProps) {
  const config = MEMBER_ROLE_CONFIG[role];

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
        config.color,
        className
      )}
    >
      {config.label}
    </span>
  );
}
