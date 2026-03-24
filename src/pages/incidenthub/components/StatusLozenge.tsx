/**
 * StatusLozenge — 3-color Dual-Intensity guardrail
 * Grey (#DFE1E6/#42526E): open, triage, on_hold, closed, converted
 * Blue (#0C66E4/#FFFFFF): in_progress, in_review, to_committee
 * Green (#1B7F37/#FFFFFF): resolved
 */

import { cn } from '@/lib/utils';

const LOZENGE_MAP: Record<string, { bg: string; text: string }> = {
  open:         { bg: '#DFE1E6', text: '#42526E' },
  triage:       { bg: '#DFE1E6', text: '#42526E' },
  on_hold:      { bg: '#DFE1E6', text: '#42526E' },
  closed:       { bg: '#DFE1E6', text: '#42526E' },
  converted:    { bg: '#DFE1E6', text: '#42526E' },
  in_progress:  { bg: '#0C66E4', text: '#FFFFFF' },
  in_review:    { bg: '#0C66E4', text: '#FFFFFF' },
  to_committee: { bg: '#0C66E4', text: '#FFFFFF' },
  resolved:     { bg: '#1B7F37', text: '#FFFFFF' },
};

const LABELS: Record<string, string> = {
  open: 'OPEN',
  triage: 'TRIAGE',
  on_hold: 'ON HOLD',
  closed: 'CLOSED',
  converted: 'CONVERTED',
  in_progress: 'IN PROGRESS',
  in_review: 'IN REVIEW',
  to_committee: 'COMMITTEE',
  resolved: 'RESOLVED',
};

interface StatusLozengeProps {
  status: string;
  onClick?: () => void;
  className?: string;
}

export function StatusLozenge({ status, onClick, className }: StatusLozengeProps) {
  const key = status?.toLowerCase().replace(/\s+/g, '_') || 'open';
  const colors = LOZENGE_MAP[key] || LOZENGE_MAP.open;
  const label = LABELS[key] || status?.toUpperCase() || 'UNKNOWN';

  return (
    <span
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter') onClick(); } : undefined}
      className={cn(
        'inline-flex items-center justify-center px-2 select-none whitespace-nowrap',
        onClick && 'cursor-pointer',
        className,
      )}
      style={{
        height: 20,
        fontSize: 11,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.03em',
        borderRadius: 3,
        backgroundColor: colors.bg,
        color: colors.text,
        lineHeight: '20px',
      }}
    >
      {label}
    </span>
  );
}
