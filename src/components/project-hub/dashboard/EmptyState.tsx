/**
 * EmptyState — Consistent empty state messages for dashboard widgets
 */
import { CheckCircle, AlertCircle, Info } from 'lucide-react';

interface Props {
  message: string;
  icon?: 'check' | 'info' | 'alert';
}

const ICONS = {
  check: <CheckCircle size={16} color="#16A34A" />,
  info: <Info size={16} color="#94A3B8" />,
  alert: <AlertCircle size={16} color="#D97706" />,
};

export default function EmptyState({ message, icon = 'info' }: Props) {
  return (
    <div style={{
      padding: '28px 20px',
      textAlign: 'center',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 6,
    }}>
      {ICONS[icon]}
      <span style={{ fontSize: 12, color: '#94A3B8', fontFamily: "'Inter', sans-serif" }}>
        {message}
      </span>
    </div>
  );
}
