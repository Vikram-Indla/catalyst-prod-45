import { useTheme } from "@/hooks/useTheme";

interface SectionHeaderProps {
  label: string;
}

/* P-03: Section labels — Today / Yesterday / Older */
export default function SectionHeader({ label }: SectionHeaderProps) {
  const { isDark } = useTheme();
  return (
    <div style={{
      position: 'sticky',
      top: 0,
      zIndex: 10,
      background: isDark ? 'var(--cp-bg-page, #1F1F21)' : '#FFFFFF',
      padding: '12px 16px 4px',
      fontFamily: 'var(--cp-font-body)',
      fontSize: 11,
      fontWeight: 500,
      color: isDark ? '#878787' : '#94A3B8',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
    }}>
      {label}
    </div>
  );
}
