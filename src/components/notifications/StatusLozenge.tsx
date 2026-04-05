import type { StatusType } from "@/types/notifications";

const LOZENGE_STYLES: Record<StatusType, { bg: string; text: string }> = {
  gray:  { bg: '#DFE1E6', text: '#253858' },
  blue:  { bg: '#DEEBFF', text: '#0747A6' },
  green: { bg: '#E3FCEF', text: '#006644' },
};

interface StatusLozengeProps {
  label: string;
  type: StatusType;
}

export default function StatusLozenge({ label, type }: StatusLozengeProps) {
  const s = LOZENGE_STYLES[type] || LOZENGE_STYLES.gray;
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      height: 20,
      padding: '0 6px',
      borderRadius: 3,
      background: s.bg,
      color: s.text,
      fontSize: 11,
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.03em',
      lineHeight: '20px',
      whiteSpace: 'nowrap',
      fontFamily: 'Inter, sans-serif',
    }}>
      {label}
    </span>
  );
}
