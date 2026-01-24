/**
 * UsersIdBadge — ID badge for DID, AID, VID
 * Per LOVABLE-USERS-MODULE-REDESIGN.md spec
 */

import { cn } from '@/lib/utils';

interface UsersIdBadgeProps {
  id: string | null | undefined;
  className?: string;
}

export function UsersIdBadge({ id, className }: UsersIdBadgeProps) {
  if (!id) {
    return <span className="text-[hsl(var(--users-text-muted))] font-mono text-xs">—</span>;
  }
  
  return (
    <span className={cn(
      "font-mono text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded",
      className
    )}>
      {id}
    </span>
  );
}
