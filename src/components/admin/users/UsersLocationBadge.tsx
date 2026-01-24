/**
 * UsersLocationBadge — Location badge (Onsite = green, Off-Shore = gray)
 * Per LOVABLE-USERS-MODULE-REDESIGN.md spec
 */

import { cn } from '@/lib/utils';

interface UsersLocationBadgeProps {
  location: string | null | undefined;
}

export function UsersLocationBadge({ location }: UsersLocationBadgeProps) {
  if (!location) {
    return <span className="text-[hsl(var(--users-text-muted))]">—</span>;
  }
  
  const isOnsite = location.toLowerCase() === 'onsite';
  
  return (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
      isOnsite 
        ? "bg-green-50 text-green-700" 
        : "bg-slate-100 text-slate-600"
    )}>
      {isOnsite ? 'Onsite' : 'Off-Shore'}
    </span>
  );
}
