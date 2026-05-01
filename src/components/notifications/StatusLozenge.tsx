import type { StatusType } from "@/types/notifications";
import { useTheme } from "@/hooks/useTheme";

const LIGHT_STYLES: Record<StatusType, { bg: string; text: string }> = {
  gray:  { bg: 'var(--ds-border, #DFE1E6)', text: 'var(--ds-text, #253858)' },
  blue:  { bg: '#DEEBFF', text: '#0747A6' },
  green: { bg: '#E3FCEF', text: '#006644' },
};

const DARK_STYLES: Record<StatusType, { bg: string; text: string }> = {
  gray:  { bg: 'var(--ds-surface-raised, #1A1A1A)', text: 'var(--ds-text-subtlest, #A1A1A1)' },
  blue:  { bg: '#1A2540', text: '#93C5FD' },
  green: { bg: '#0F2A1A', text: '#86EFAC' },
};

interface StatusLozengeProps {
  label: string;
  type: StatusType;
}

export default function StatusLozenge({ label, type }: StatusLozengeProps) {
  const { isDark } = useTheme();
  const palette = isDark ? DARK_STYLES : LIGHT_STYLES;
  const s = palette[type] || palette.gray;
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      height: 20,
      padding: '0 6px',
      borderRadius: 4,
      background: s.bg,
      color: s.text,
      fontSize: 11,
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.03em',
      lineHeight: '20px',
      whiteSpace: 'nowrap',
      fontFamily: 'var(--cp-font-body)',
    }}>
      {label}
    </span>
  );
}
