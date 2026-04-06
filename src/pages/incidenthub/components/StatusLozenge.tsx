/**
 * StatusLozenge — 3-color Dual-Intensity guardrail
 * Grey (#DFE1E6/#42526E): open, triage, on_hold, closed, converted
 * Blue (#0C66E4/#FFFFFF): in_progress, in_review, to_committee
 * Green (#1B7F37/#FFFFFF): resolved
 *
 * NOCTURNE dark mode: slightly adjusted opacity for grey lozenges
 */

import { cn } from '@/lib/utils';
import { useTheme } from '@/hooks/useTheme';

const LOZENGE_MAP: Record<string, { bg: string; text: string; darkBg: string; darkText: string }> = {
  open:         { bg: '#DFE1E6', text: '#42526E', darkBg: 'rgba(223,225,230,0.16)', darkText: '#A1A1A1' },
  triage:       { bg: '#DFE1E6', text: '#42526E', darkBg: 'rgba(223,225,230,0.16)', darkText: '#A1A1A1' },
  on_hold:      { bg: '#DFE1E6', text: '#42526E', darkBg: 'rgba(223,225,230,0.16)', darkText: '#A1A1A1' },
  closed:       { bg: '#DFE1E6', text: '#42526E', darkBg: 'rgba(223,225,230,0.16)', darkText: '#A1A1A1' },
  converted:    { bg: '#DFE1E6', text: '#42526E', darkBg: 'rgba(223,225,230,0.16)', darkText: '#A1A1A1' },
  in_progress:  { bg: '#0C66E4', text: '#FFFFFF', darkBg: 'rgba(12,102,228,0.24)', darkText: '#93C5FD' },
  in_review:    { bg: '#0C66E4', text: '#FFFFFF', darkBg: 'rgba(12,102,228,0.24)', darkText: '#93C5FD' },
  to_committee: { bg: '#0C66E4', text: '#FFFFFF', darkBg: 'rgba(12,102,228,0.24)', darkText: '#93C5FD' },
  resolved:     { bg: '#1B7F37', text: '#FFFFFF', darkBg: 'rgba(27,127,55,0.24)', darkText: '#86EFAC' },
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
  const { isDark } = useTheme();
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
        borderRadius: 4,
        backgroundColor: isDark ? colors.darkBg : colors.bg,
        color: isDark ? colors.darkText : colors.text,
        lineHeight: '20px',
      }}
    >
      {label}
    </span>
  );
}
