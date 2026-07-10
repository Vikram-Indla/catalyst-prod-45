/**
 * SeverityChip — Token-based severity badges
 * SEV-1: danger | SEV-2: warning | SEV-3: primary | SEV-4: neutral
 * DARK MODE dark mode: washed-out backgrounds with readable text
 */

import { useTheme } from '@/hooks/useTheme';

const SEV_STYLES: Record<string, { bg: string; text: string; border: string; darkBg: string; darkText: string; darkBorder: string }> = {
  SEV1: { bg: 'var(--ds-background-danger)', text: 'var(--ds-text-danger)', border: 'var(--ds-background-danger)', darkBg: 'rgba(248,113,113,0.12)', darkText: 'var(--ds-border-danger)', darkBorder: 'rgba(248,113,113,0.25)' },
  SEV2: { bg: 'var(--ds-background-warning)', text: 'var(--ds-text-warning)', border: 'var(--ds-background-warning)', darkBg: 'var(--ds-background-warning-bold)', darkText: 'var(--ds-background-warning, var(--ds-background-warning))', darkBorder: 'var(--ds-background-warning-bold)' },
  SEV3: { bg: 'var(--ds-background-information)', text: 'var(--ds-link-pressed)', border: 'var(--ds-background-information)', darkBg: 'var(--ds-background-information-bold)', darkText: 'var(--ds-background-information-bold, var(--ds-link))', darkBorder: 'var(--ds-background-information-bold)' },
  SEV4: { bg: 'var(--ds-surface-sunken, var(--cp-bg-sunken, var(--cp-bg-sunken)))', text: 'var(--ds-text-subtle)', border: 'var(--ds-border, var(--cp-border, var(--cp-bg-sunken)))', darkBg: 'var(--ds-border, var(--cp-ink-1))', darkText: 'var(--ds-text-subtlest)', darkBorder: 'var(--ds-border, var(--cp-ink-1))' },
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
        fontSize: 'var(--ds-font-size-100)',
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
