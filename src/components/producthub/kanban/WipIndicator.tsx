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

  const overLimit = count >= limit;
  const approaching = !overLimit && count >= limit - 1;

  return (
    <span
      className={cn(
        'text-xs font-semibold tabular-nums rounded-full px-2 py-0.5',
        overLimit
          ? 'text-red-700 bg-red-50 font-bold'
          : approaching
            ? 'text-amber-700 bg-amber-50 font-semibold'
            : 'text-zinc-500 bg-zinc-100'
      )}
    >
      {count}
      <span className={cn(
        'ml-0.5',
        overLimit ? 'text-red-500' : approaching ? 'text-amber-500' : 'text-zinc-400'
      )}>
        /{limit}
      </span>
    </span>
  );
};
