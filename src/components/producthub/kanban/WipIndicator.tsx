import React from 'react';

interface WipIndicatorProps {
  count: number;
  limit: number | null;
}

export const WipIndicator: React.FC<WipIndicatorProps> = ({ count, limit }) => {
  if (limit === null) {
    return (
      <span className="pk-wip pk-wip--normal">
        <span className="pk-wip-count">{count}</span>
      </span>
    );
  }

  const overLimit = count >= limit;
  const approaching = !overLimit && count >= limit - 1;
  const cls = overLimit ? 'pk-wip--over' : approaching ? 'pk-wip--approaching' : 'pk-wip--normal';

  return (
    <span className={`pk-wip ${cls}`}>
      <span className="pk-wip-count">{count}</span>
      <span className="pk-wip-limit"> /{limit}</span>
    </span>
  );
};
