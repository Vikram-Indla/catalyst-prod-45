/**
 * SeverityChip — Token-based severity badges
 * SEV-1: danger | SEV-2: warning | SEV-3: primary | SEV-4: neutral
 */

const SEV_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  SEV1: { bg: '#FEE2E2', text: '#991B1B', border: '#FECACA' },
  SEV2: { bg: '#FEF3C7', text: '#92400E', border: '#FDE68A' },
  SEV3: { bg: '#DBEAFE', text: '#1E40AF', border: '#BFDBFE' },
  SEV4: { bg: '#F1F5F9', text: '#475569', border: '#E2E8F0' },
};

interface SeverityChipProps {
  severity: string;
}

export function SeverityChip({ severity }: SeverityChipProps) {
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
        borderRadius: 3,
        backgroundColor: s.bg,
        color: s.text,
        border: `1px solid ${s.border}`,
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
