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
    check: <CheckCircle size={16} color={dark ? 'var(--sem-success-accent)' : 'var(--sem-success)'} />,
    info: <Info size={16} color={dark ? 'rgba(248,244,240,0.40)' : 'var(--fg-4)'} />,
    alert: <AlertCircle size={16} color={dark ? 'var(--sem-warning)' : 'var(--sem-warning)'} />,
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
      <span style={{ fontSize: 12, color: dark ? 'rgba(248,244,240,0.50)' : 'var(--fg-4)', fontFamily: "'Inter', sans-serif" }}>
        {message}
      </span>
    </div>
  );
}
