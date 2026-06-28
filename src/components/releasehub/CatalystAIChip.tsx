import React from 'react';
import { Sparkles } from '@/lib/atlaskit-icons';

interface Props {
  label?: string;
  className?: string;
}

/** AI chip — uses BLUE only (purple is banned) */
export function CatalystAIChip({ label = 'Recommend escalation', className = '' }: Props) {
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold rounded px-1.5 py-0.5 whitespace-nowrap ${className}`}
      style={{ background: 'var(--cp-blue-wash)', color: 'var(--cp-blue)', border: '1px solid var(--ds-background-information)' }}>
      <Sparkles size={10} /> {label}
    </span>
  );
}
