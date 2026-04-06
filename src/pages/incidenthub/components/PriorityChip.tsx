/**
 * PriorityChip — Same token palette as SeverityChip
 * P1: danger | P2: warning | P3: primary | P4: neutral
 */

const PRI_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  P1: { bg: 'rgba(248,113,113,0.10)', text: '#F87171', border: '#FECACA' },
  P2: { bg: 'rgba(251,191,36,0.10)', text: '#FBBF24', border: '#FDE68A' },
  P3: { bg: '#DBEAFE', text: '#7DB8FC', border: '#BFDBFE' },
  P4: { bg: '#1A1A1A', text: '#475569', border: 'var(--bd-default, rgba(255,255,255,0.10))' },
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
