import { Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function AdhocCycleIndicator() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Info className="h-4 w-4 text-muted-foreground cursor-help" />
        </TooltipTrigger>
        <TooltipContent className="max-w-sm">
          <p className="text-sm">
            By default, an Adhoc cycle is created. The Adhoc cycle is created to get you 
            quickly started on execution or if there is a need to do unplanned testing.
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
