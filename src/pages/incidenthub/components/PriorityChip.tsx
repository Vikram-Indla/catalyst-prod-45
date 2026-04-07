/**
 * PriorityChip — Same token palette as SeverityChip
 * P1: danger | P2: warning | P3: primary | P4: neutral
 * NOCTURNE dark mode support via useTheme()
 */

import { useTheme } from '@/hooks/useTheme';

const PRI_STYLES: Record<string, { bg: string; text: string; border: string; darkBg: string; darkText: string; darkBorder: string }> = {
  P1: { bg: '#FEE2E2', text: '#991B1B', border: '#FECACA', darkBg: 'rgba(239,68,68,0.12)', darkText: '#FCA5A5', darkBorder: 'rgba(239,68,68,0.2)' },
  P2: { bg: '#FEF3C7', text: '#92400E', border: '#FDE68A', darkBg: 'rgba(251,191,36,0.12)', darkText: '#FDE68A', darkBorder: 'rgba(251,191,36,0.2)' },
  P3: { bg: '#DBEAFE', text: '#1E40AF', border: '#BFDBFE', darkBg: 'rgba(59,130,246,0.12)', darkText: '#93C5FD', darkBorder: 'rgba(59,130,246,0.2)' },
  P4: { bg: '#F1F5F9', text: '#475569', border: '#E2E8F0', darkBg: '#2E2E2E', darkText: '#A1A1A1', darkBorder: '#454545' },
};

interface PriorityChipProps {
  priority: string;
}

export function PriorityChip({ priority }: PriorityChipProps) {
  const { isDark } = useTheme();
  const key = priority?.toUpperCase() || 'P4';
  const s = PRI_STYLES[key] || PRI_STYLES.P4;

  return (
    <span
      style={{
        height: 18,
        fontSize: 11,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.02em',
        borderRadius: 4,
        backgroundColor: isDark ? s.darkBg : s.bg,
        color: isDark ? s.darkText : s.text,
        border: `1px solid ${isDark ? s.darkBorder : s.border}`,
        padding: '0 6px',
        display: 'inline-flex',
        alignItems: 'center',
        lineHeight: '18px',
      }}
    >
      {key}
    </span>
  );
}
