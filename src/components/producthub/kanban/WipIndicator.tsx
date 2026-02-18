import React from 'react';
import { cn } from '@/lib/utils';

interface WipIndicatorProps {
  count: number;
  limit: number | null;
}

export const WipIndicator: React.FC<WipIndicatorProps> = ({ count, limit }) => {
  if (limit === null) {
    return (
      <span className="text-xs font-semibold text-zinc-500 tabular-nums bg-zinc-100 rounded-full px-2 py-0.5">
        {count}
      </span>
    );
  }

  const atLimit = count === limit;
  const overLimit = count > limit;

  return (
    <span
      className={cn(
        'text-xs font-semibold tabular-nums rounded-full px-2 py-0.5',
        overLimit
          ? 'text-red-700 bg-red-50 font-bold animate-pulse'
          : atLimit
            ? 'text-amber-700 bg-amber-50 font-bold'
            : 'text-zinc-500 bg-zinc-100'
      )}
    >
      {count}
      <span className={cn(
        'ml-0.5',
        overLimit ? 'text-red-500' : atLimit ? 'text-amber-500' : 'text-zinc-400'
      )}>
        /{limit}
      </span>
    </span>
  );
};
