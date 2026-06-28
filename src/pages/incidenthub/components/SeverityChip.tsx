/**
 * SeverityChip — Token-based severity badges
 * SEV-1: danger | SEV-2: warning | SEV-3: primary | SEV-4: neutral
 * DARK MODE dark mode: washed-out backgrounds with readable text
 */

import { useTheme } from '@/hooks/useTheme';

const SEV_STYLES: Record<string, { bg: string; text: string; border: string; darkBg: string; darkText: string; darkBorder: string }> = {
  SEV1: { bg: 'var(--ds-background-danger, #FFECEB)', text: 'var(--ds-text-danger, #991B1B)', border: 'var(--ds-background-danger, #FFECEB)', darkBg: 'rgba(248,113,113,0.12)', darkText: 'var(--ds-border-danger, #FCA5A5)', darkBorder: 'rgba(248,113,113,0.25)' },
  SEV2: { bg: 'var(--ds-background-warning, #FFF7D6)', text: 'var(--ds-text-warning, #974F0C)', border: 'var(--ds-background-warning, #FFF7D6)', darkBg: 'var(--ds-background-warning-bold, rgba(251,191,36,0.12))', darkText: 'var(--ds-background-warning, var(--ds-background-warning, #FFF7D6))', darkBorder: 'var(--ds-background-warning-bold, rgba(251,191,36,0.25))' },
  SEV3: { bg: 'var(--ds-background-information, #E9F2FF)', text: 'var(--ds-link-pressed, #1e40af)', border: 'var(--ds-background-information, #E9F2FF)', darkBg: 'var(--ds-background-information-bold, rgba(59,130,246,0.12))', darkText: 'var(--ds-background-information-bold, var(--ds-link, #0C66E4))', darkBorder: 'var(--ds-background-information-bold, rgba(59,130,246,0.25))' },
  SEV4: { bg: 'var(--ds-surface-sunken, var(--cp-bg-sunken, var(--cp-bg-sunken, #F1F5F9)))', text: 'var(--ds-text-subtle, #475569)', border: 'var(--ds-border, var(--cp-border, var(--cp-bg-sunken, #E2E8F0)))', darkBg: 'var(--ds-border, var(--cp-ink-1, #292929))', darkText: 'var(--ds-text-subtlest, #A1A1A1)', darkBorder: 'var(--ds-border, var(--cp-ink-1, #2E2E2E))' },
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
