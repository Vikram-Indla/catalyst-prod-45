import React from 'react';

interface StatusLozengeProps {
  name: string;
  category: string;
  size?: 'sm' | 'md';
}

/**
 * V12 StatusLozenge — IMMUTABLE 3-COLOR GUARDRAIL
 * Grey:  bg:#DFE1E6  text:#253858  → Backlog, To Do, On Hold, New, Waiting, Blocked
 * Blue:  bg:#DEEBFF  text:#0747A6  → In Progress, In Dev, In Review, In QA, Active, In Beta
 * Green: bg:#E3FCEF  text:#006644  → Done, Completed, Production, Prod Ready, Approved, Resolved
 */
function getStatusStyle(category: string): { bg: string; color: string } {
  switch (category) {
    case 'in_progress': return { bg: '#0C66E4', color: '#FFFFFF' };
    case 'done': return { bg: '#1B7F37', color: '#FFFFFF' };
    // terminal, todo, backlog, blocked, on_hold — ALL grey
    default: return { bg: '#DFE1E6', color: '#42526E' };
  }
}

export function StatusLozenge({ name, category, size = 'sm' }: StatusLozengeProps) {
  const s = getStatusStyle(category);
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '0 6px',
        height: 20,
        borderRadius: 3,
        fontSize: size === 'sm' ? 11 : 11,
        fontWeight: 700,
        textTransform: 'uppercase' as const,
        letterSpacing: '0.03em',
        whiteSpace: 'nowrap' as const,
        background: s.bg,
        color: s.color,
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {name}
    </span>
  );
}
