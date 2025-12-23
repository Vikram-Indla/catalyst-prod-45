import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface OwnerCellProps {
  name: string | null;
}

/**
 * Owner/User Cell with dark mode support (9.5 grade compliance)
 * Avatar uses /30 opacity in dark mode for better visibility
 * Includes tooltip for truncated names
 */
export function OwnerCell({ name }: OwnerCellProps) {
  if (!name) {
    return (
      <div className="flex items-center gap-2">
        <div className={cn(
          "w-7 h-7 rounded-full border-2 border-dashed flex items-center justify-center",
          "border-gray-300 dark:border-gray-500"
        )}>
          <Plus className="h-3 w-3 text-gray-400 dark:text-gray-500" />
        </div>
        <span className="text-sm text-gray-400 dark:text-gray-500 italic">
          Unassigned
        </span>
      </div>
    );
  }

  const displayInitials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2 min-w-0">
            <div className={cn(
              "flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center",
              "bg-[#c69c6d]/20 text-[#8b7355]",
              "dark:bg-[#c69c6d]/30 dark:text-[#d4a855]"
            )}>
              <span className="text-[10px] font-semibold">
                {displayInitials}
              </span>
            </div>
            <span className={cn(
              "text-sm truncate max-w-[100px]",
              "text-gray-900 dark:text-gray-100"
            )}>
              {name}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p className="font-medium">{name}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
