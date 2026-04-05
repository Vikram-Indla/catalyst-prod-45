interface PriorityChipProps {
  level: 'high' | 'medium' | 'low';
}

const DOT_COLORS: Record<string, string> = {
  high: '#DC2626',
  medium: '#D97706',
  low: '#16A34A',
};

const LABELS: Record<string, string> = {
  high: 'HIGH',
  medium: 'MED',
  low: 'LOW',
};

export default function PriorityChip({ level }: PriorityChipProps) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      fontFamily: 'Inter, sans-serif',
      fontSize: 11,
      fontWeight: 500,
      color: '#475569',
    }}>
      <span style={{
        width: 6,
        height: 6,
        borderRadius: '50%',
        background: DOT_COLORS[level] || DOT_COLORS.low,
        flexShrink: 0,
      }} />
      {LABELS[level] || level.toUpperCase()}
    </span>
  );
}
