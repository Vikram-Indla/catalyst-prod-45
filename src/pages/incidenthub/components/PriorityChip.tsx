/**
 * PriorityChip — Same token palette as SeverityChip
 * P1: danger | P2: warning | P3: primary | P4: neutral
 */

const PRI_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  P1: { bg: '#FEE2E2', text: '#991B1B', border: '#FECACA' },
  P2: { bg: '#FEF3C7', text: '#92400E', border: '#FDE68A' },
  P3: { bg: '#DBEAFE', text: '#1E40AF', border: '#BFDBFE' },
  P4: { bg: '#F1F5F9', text: '#475569', border: 'var(--bd-default, #E2E8F0)' },
};

interface PriorityChipProps {
  priority: string;
}

export function PriorityChip({ priority }: PriorityChipProps) {
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
        backgroundColor: s.bg,
        color: s.text,
        border: `1px solid ${s.border}`,
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
