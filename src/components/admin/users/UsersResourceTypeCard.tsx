/**
 * UsersResourceTypeCard — Stat card for resource type filtering
 * Per LOVABLE-USERS-MODULE-REDESIGN.md spec
 */

import { cn } from '@/lib/utils';

interface UsersResourceTypeCardProps {
  label: string;
  count: number;
  isActive: boolean;
  onClick: () => void;
  dotColor: string;
  variant?: 'total' | 'variable' | 'permanent' | 'fixed' | 'freelance';
}

export function UsersResourceTypeCard({
  label,
  count,
  isActive,
  onClick,
  dotColor,
  variant = 'total',
}: UsersResourceTypeCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex flex-col gap-1 p-4 rounded-xl border bg-white transition-all duration-200 text-left",
        "hover:shadow-md hover:-translate-y-0.5",
        isActive && [
          "border-[hsl(var(--users-primary))]",
          "bg-gradient-to-br from-[hsl(var(--users-primary)/0.03)] to-[hsl(var(--users-primary)/0.06)]",
        ],
        !isActive && "border-[hsl(var(--users-border))]"
      )}
    >
      {/* Active accent bar */}
      {isActive && (
        <div className="absolute left-0 top-3 bottom-3 w-1 rounded-r-full bg-[hsl(var(--users-primary))]" />
      )}
      
      {/* Label with dot */}
      <div className="flex items-center gap-2">
        <span 
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: dotColor }}
        />
        <span className="text-xs font-medium text-[hsl(var(--users-text-secondary))]">
          {label}
        </span>
      </div>
      
      {/* Count */}
      <div className="text-2xl font-bold text-[hsl(var(--users-text))] pl-4">
        {count}
      </div>
    </button>
  );
}

// Dot colors per spec
export const RESOURCE_DOT_COLORS = {
  total: '#475569',      // slate
  variable: '#2563eb',   // blue
  permanent: '#0d9488',  // teal
  fixed: '#d97706',      // amber
  freelance: '#8b5cf6',  // purple
} as const;
