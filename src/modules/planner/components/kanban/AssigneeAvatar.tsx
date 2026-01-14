// ============================================================
// ASSIGNEE AVATAR COMPONENT
// Displays user avatar with initials fallback
// ============================================================

import type { KanbanProfile, KanbanWorkstream } from '../../types/kanban';
import { cn } from '@/lib/utils';
import { getWorkstreamColor } from '@/lib/workstream-colors';

interface AssigneeAvatarProps {
  profile: KanbanProfile | null | undefined;
  size?: 'sm' | 'md';
  showName?: boolean;
  className?: string;
  workstream?: KanbanWorkstream | null;
}

export function AssigneeAvatar({ profile, size = 'md', showName = true, className, workstream }: AssigneeAvatarProps) {
  if (!profile) return null;
  
  const name = profile.full_name || profile.email || 'Unknown';
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  
  const sizeClasses = size === 'sm' 
    ? 'w-5 h-5 text-[8px]' 
    : 'w-[26px] h-[26px] text-[10px]';
  
  // Get workstream color for avatar background
  const colors = getWorkstreamColor(workstream?.name);
  
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {profile.avatar_url ? (
        <img
          src={profile.avatar_url}
          alt={name}
          className={cn('rounded-full object-cover', sizeClasses)}
        />
      ) : (
        <div
          className={cn(
            'rounded-full flex items-center justify-center text-white font-semibold',
            sizeClasses
          )}
          style={{ backgroundColor: colors.hex }}
        >
          {initials}
        </div>
      )}
      {showName && (
        <span
          className={cn(
            'font-medium text-foreground truncate max-w-[120px]',
            size === 'sm' ? 'text-[11px]' : 'text-xs'
          )}
        >
          {name}
        </span>
      )}
    </div>
  );
}
