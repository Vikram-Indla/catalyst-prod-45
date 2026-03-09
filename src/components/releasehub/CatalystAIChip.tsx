import React from 'react';

interface Props {
  label?: string;
  className?: string;
}

export function CatalystAIChip({ label = 'Recommend escalation', className = '' }: Props) {
  return (
    <span className={`inline-flex items-center gap-1 bg-[#7C3AED] text-white text-[10px] font-extrabold rounded px-1.5 py-0.5 whitespace-nowrap ${className}`}>
      ◆ Catalyst AI: {label}
    </span>
  );
}
