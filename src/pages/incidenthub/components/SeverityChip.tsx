/**
 * SeverityChip — Token-based severity badges
 * SEV-1: danger | SEV-2: warning | SEV-3: primary | SEV-4: neutral
 * NOCTURNE dark mode: washed-out backgrounds with readable text
 */

import { useTheme } from '@/hooks/useTheme';

const SEV_STYLES: Record<string, { bg: string; text: string; border: string; darkBg: string; darkText: string; darkBorder: string }> = {
  SEV1: { bg: 'rgba(248,113,113,0.10)', text: '#F87171', border: '#FECACA', darkBg: 'rgba(248,113,113,0.12)', darkText: '#FCA5A5', darkBorder: 'rgba(248,113,113,0.25)' },
  SEV2: { bg: 'rgba(251,191,36,0.10)', text: '#FBBF24', border: '#FDE68A', darkBg: 'rgba(251,191,36,0.12)', darkText: '#FCD34D', darkBorder: 'rgba(251,191,36,0.25)' },
  SEV3: { bg: '#DBEAFE', text: '#7DB8FC', border: '#BFDBFE', darkBg: 'rgba(59,130,246,0.12)', darkText: '#93C5FD', darkBorder: 'rgba(59,130,246,0.25)' },
  SEV4: { bg: '#1A1A1A', text: '#475569', border: 'rgba(255,255,255,0.10)', darkBg: 'rgba(255,255,255,0.06)', darkText: '#A1A1A1', darkBorder: 'rgba(255,255,255,0.08)' },
};

interface SeverityChipProps {
  severity: string;
}

export function SeverityChip({ severity }: SeverityChipProps) {
  const { isDark } = useTheme();
  const key = severity?.toUpperCase().replace('-', '') || 'SEV4';
  const s = SEV_STYLES[key] || SEV_STYLES.SEV4;
  const label = severity?.replace(/(\d)/, '-$1') || severity;

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
      {label}
    </span>
  );
}
