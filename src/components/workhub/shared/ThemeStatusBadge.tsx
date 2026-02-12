/**
 * ThemeStatusBadge — Pill badge for theme status
 */
import type { ThemeStatus } from '@/types/workhub.types';

const THEME_STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string }> = {
  Active:    { bg: '#dbeafe', text: '#1d4ed8', dot: '#2563eb' },
  Completed: { bg: '#d1fae5', text: '#047857', dot: '#16a34a' },
  'On Hold': { bg: '#fffbeb', text: '#92400e', dot: '#d97706' },
};

export { THEME_STATUS_CONFIG };

interface ThemeStatusBadgeProps {
  status: ThemeStatus;
}

export function ThemeStatusBadge({ status }: ThemeStatusBadgeProps) {
  const config = THEME_STATUS_CONFIG[status] || THEME_STATUS_CONFIG.Active;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 12px',
        borderRadius: 9999,
        fontSize: 12,
        fontWeight: 600,
        background: config.bg,
        color: config.text,
      }}
    >
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: config.dot }} />
      {status}
    </span>
  );
}
