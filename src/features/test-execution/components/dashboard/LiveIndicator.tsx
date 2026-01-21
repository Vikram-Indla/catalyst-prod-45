/**
 * Module 3B-3: Pulsing LIVE badge
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Radio, Pause } from 'lucide-react';

interface LiveIndicatorProps {
  isLive: boolean;
  onToggle: () => void;
  className?: string;
}

export function LiveIndicator({ isLive, onToggle, className }: LiveIndicatorProps) {
  return (
    <Button
      variant={isLive ? 'default' : 'outline'}
      size="sm"
      onClick={onToggle}
      className={cn('gap-2', className)}
    >
      {isLive ? (
        <>
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-destructive" />
          </span>
          <span className="text-xs font-semibold">LIVE</span>
        </>
      ) : (
        <>
          <Pause className="h-3 w-3" />
          <span className="text-xs font-medium">Paused</span>
        </>
      )}
    </Button>
  );
}
