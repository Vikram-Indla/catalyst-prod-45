import React from 'react';
import { Sparkles } from 'lucide-react';

interface Props {
  label?: string;
  className?: string;
}

/** AI chip — uses BLUE only (purple is banned) */
export function CatalystAIChip({ label = 'Recommend escalation', className = '' }: Props) {
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold rounded px-1.5 py-0.5 whitespace-nowrap ${className}`}
      style={{ background: 'var(--cp-blue-wash)', color: 'var(--cp-blue)', border: '1px solid #DBEAFE' }}>
      <Sparkles size={10} /> {label}
    </span>
  );
}
