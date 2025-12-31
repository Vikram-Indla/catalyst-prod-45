/**
 * TypeCell — Displays the work item type with icon
 * Shows Business Request icon (blue cube)
 */

import { cn } from '@/lib/utils';
import { Box } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface TypeCellProps {
  type?: string;
}

export function TypeCell({ type = 'Business Request' }: TypeCellProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center justify-center">
            <div className={cn(
              "flex items-center justify-center w-7 h-7 rounded-md",
              "bg-blue-500/15 dark:bg-blue-500/20"
            )}>
              <Box className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p className="font-medium">{type}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
