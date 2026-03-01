/**
 * TypeCell — V12 Type badge
 * 20x20px, 4px radius, inline-flex centered
 */

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
            {/* V12 — 20x20, 4px radius */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 20, /* V12 */
                height: 20, /* V12 */
                borderRadius: 4, /* V12 */
                background: 'rgba(37, 99, 235, 0.12)', /* V12 */
              }}
            >
              <Box style={{ width: 12, height: 12, color: '#2563EB' }} /* V12 */ />
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