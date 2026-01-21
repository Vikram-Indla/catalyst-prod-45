/**
 * Module 3B-2: Position control buttons
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  ChevronUp, 
  ChevronDown, 
  ChevronsUp, 
  ChevronsDown 
} from 'lucide-react';

interface PositionControlsProps {
  position: number;
  maxPosition: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onMoveToTop: () => void;
  onMoveToBottom: () => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export function PositionControls({
  position,
  maxPosition,
  onMoveUp,
  onMoveDown,
  onMoveToTop,
  onMoveToBottom,
  disabled = false,
  size = 'sm',
  className,
}: PositionControlsProps) {
  const isFirst = position === 1;
  const isLast = position === maxPosition;
  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';
  const buttonSize = size === 'sm' ? 'h-6 w-6' : 'h-7 w-7';

  return (
    <TooltipProvider delayDuration={300}>
      <div className={cn('flex items-center gap-0.5', className)}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={buttonSize}
              onClick={onMoveToTop}
              disabled={disabled || isFirst}
            >
              <ChevronsUp className={iconSize} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">Move to top</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={buttonSize}
              onClick={onMoveUp}
              disabled={disabled || isFirst}
            >
              <ChevronUp className={iconSize} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">Move up</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={buttonSize}
              onClick={onMoveDown}
              disabled={disabled || isLast}
            >
              <ChevronDown className={iconSize} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">Move down</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={buttonSize}
              onClick={onMoveToBottom}
              disabled={disabled || isLast}
            >
              <ChevronsDown className={iconSize} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">Move to bottom</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
