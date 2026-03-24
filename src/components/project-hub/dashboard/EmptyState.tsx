/**
 * EmptyState — Consistent empty state messages for dashboard widgets
 */
import { CheckCircle, AlertCircle, Info } from 'lucide-react';
import { useTheme } from 'next-themes';

interface Props {
  message: string;
  icon?: 'check' | 'info' | 'alert';
}

export default function EmptyState({ message, icon = 'info' }: Props) {
  const { theme } = useTheme();
  const dark = theme === 'dark';

  const ICONS = {
    check: <CheckCircle size={16} color={dark ? '#86EFAC' : '#16A34A'} />,
    info: <Info size={16} color={dark ? 'rgba(248,244,240,0.40)' : '#94A3B8'} />,
    alert: <AlertCircle size={16} color={dark ? '#FBBF24' : '#D97706'} />,
  };

  return (
    <div style={{
      padding: '12px 12px',
      textAlign: 'center',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 4,
      minHeight: 60,
      justifyContent: 'center',
    }}>
      {ICONS[icon]}
      <span style={{ fontSize: 12, color: dark ? 'rgba(248,244,240,0.50)' : '#94A3B8', fontFamily: "'Inter', sans-serif" }}>
        {message}
      </span>
    </div>
  );
}
