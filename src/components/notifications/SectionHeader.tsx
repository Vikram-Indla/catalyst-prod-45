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
      background: isDark ? '#1A1714' : '#FFFFFF',
      padding: '10px 20px 4px',
      fontFamily: 'Geist, -apple-system, sans-serif',
      fontSize: 11,
      fontWeight: 600,
      color: isDark ? '#A09890' : 'rgba(237,237,237,0.40)',
    }}>
      {label}
    </div>
  );
}
