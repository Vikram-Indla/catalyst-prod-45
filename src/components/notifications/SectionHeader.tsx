interface SectionHeaderProps {
  label: string; // "Today", "Yesterday", "Older" — sentence case, NOT uppercase
}

export default function SectionHeader({ label }: SectionHeaderProps) {
  return (
    <div style={{
      position: 'sticky',
      top: 0,
      zIndex: 10,
      background: '#FFFFFF',
      padding: '10px 20px 4px',
      fontFamily: 'Inter, sans-serif',
      fontSize: 11,
      fontWeight: 600,
      color: '#64748B',
    }}>
      {label}
    </div>
  );
}
