import { useTheme } from "@/hooks/useTheme";

interface SectionHeaderProps {
  label: string; // "Today", "Yesterday", "Older" — sentence case, NOT uppercase
}

export default function SectionHeader({ label }: SectionHeaderProps) {
  const { isDark } = useTheme();
  return (
    <div style={{
      position: 'sticky',
      top: 0,
      zIndex: 10,
      background: isDark ? '#0A0A0A' : '#FFFFFF',
      padding: '10px 20px 4px',
      fontFamily: 'Inter, sans-serif',
      fontSize: 11,
      fontWeight: 600,
      color: isDark ? '#A1A1A1' : '#64748B',
    }}>
      {label}
    </div>
  );
}
