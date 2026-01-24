/**
 * UsersTypeBadge — Resource type badge with colored dot
 * Per LOVABLE-USERS-MODULE-REDESIGN.md spec
 */

import { cn } from '@/lib/utils';

interface UsersTypeBadgeProps {
  type: string | null | undefined;
}

const TYPE_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  Variable: { 
    bg: 'bg-blue-50', 
    text: 'text-blue-700', 
    dot: 'bg-blue-600' 
  },
  Permanent: { 
    bg: 'bg-teal-50', 
    text: 'text-teal-700', 
    dot: 'bg-teal-600' 
  },
  Fixed: { 
    bg: 'bg-amber-50', 
    text: 'text-amber-700', 
    dot: 'bg-amber-600' 
  },
  Freelance: { 
    bg: 'bg-purple-50', 
    text: 'text-purple-700', 
    dot: 'bg-purple-600' 
  },
};

export function UsersTypeBadge({ type }: UsersTypeBadgeProps) {
  if (!type) {
    return <span className="text-[hsl(var(--users-text-muted))]">—</span>;
  }
  
  const style = TYPE_STYLES[type] || TYPE_STYLES.Variable;
  
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold",
      style.bg,
      style.text
    )}>
      <span className={cn("w-1.5 h-1.5 rounded-full", style.dot)} />
      {type}
    </span>
  );
}
