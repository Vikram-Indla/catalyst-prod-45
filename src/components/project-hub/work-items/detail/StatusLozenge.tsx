import React from 'react';

interface StatusLozengeProps {
  name: string;
  category: string;
  size?: 'sm' | 'md';
}

function getStatusStyle(category: string): { bg: string; color: string } {
  switch (category) {
    case 'in_progress': return { bg: '#DBEAFE', color: '#2563EB' };
    case 'done': return { bg: '#F0FDF4', color: '#16A34A' };
    case 'terminal': return { bg: '#FEF2F2', color: '#DC2626' };
    default: return { bg: '#F1F5F9', color: '#64748B' };
  }
}

export function StatusLozenge({ name, category, size = 'sm' }: StatusLozengeProps) {
  const s = getStatusStyle(category);
  const fontSize = size === 'sm' ? 10 : 11;
  return (
    <span
      className="inline-block px-1.5 py-0.5 rounded font-bold uppercase whitespace-nowrap"
      style={{ background: s.bg, color: s.color, fontSize, letterSpacing: '0.02em' }}
    >
      {name}
    </span>
  );
}
