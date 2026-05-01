import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip } from '@/components/ads';

interface OwnerCellProps {
  name: string | null;
}

/**
 * Owner/User Cell with dark mode support
 * Avatar uses blue tint for brand consistency
 * Includes tooltip for truncated names
 */
export function OwnerCell({ name }: OwnerCellProps) {
  if (!name) {
    return (
      <div className="flex items-center gap-2">
        <div className={cn(
          "w-7 h-7 rounded-full border-2 border-dashed flex items-center justify-center",
          "border-border/50 dark:border-border/30"
        )}>
          <Plus className="h-3 w-3 text-muted-foreground" />
        </div>
        <span className="text-sm text-muted-foreground italic">
          Unassigned
        </span>
      </div>
    );
  }

  const displayInitials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
      <Tooltip content={<p className="font-medium">{name}</p>}>
        <div className="flex items-center gap-2 min-w-0">
          <div className={cn(
            "flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center",
            "bg-[rgba(37,99,235,0.1)] text-[var(--ds-text-brand, #2563eb)]",
            "dark:bg-[rgba(37,99,235,0.15)] dark:text-[var(--ds-text-brand, #60a5fa)]"
          )}>
            <span className="text-[10px] font-semibold">
              {displayInitials}
            </span>
          </div>
          <span className={cn(
            "text-sm truncate max-w-[100px]",
            "text-foreground"
          )}>
            {name}
          </span>
        </div>
      </Tooltip>
  );
}
