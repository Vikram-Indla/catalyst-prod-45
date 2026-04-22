// ─────────────────────────────────────────────────────────────────────────────
// NotificationGroup — renders a date section with UPPERCASE label + rows
// ─────────────────────────────────────────────────────────────────────────────

import type { DateGroup, NotificationItem } from '../types';
import { NotificationRow } from './NotificationRow';

interface Props {
  group: DateGroup;
  onMarkRead: (id: string) => void;
  onItemClick: (item: NotificationItem) => void;
}

export function NotificationGroup({ group, onMarkRead, onItemClick }: Props) {
  return (
    <div>
      {/* Section header — sticky, uppercase */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          padding: '10px 16px 4px',
          background: '#FFFFFF',
          fontFamily: 'Inter, sans-serif',
          fontSize: 11,
          fontWeight: 600,
          color: '#94A3B8',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          borderBottom: '0.5px solid rgba(15,23,42,0.06)',
        }}
      >
        {group.label}
      </div>

      {/* Notification rows */}
      {group.items.map(item => (
        <NotificationRow
          key={item.id}
          item={item}
          onMarkRead={onMarkRead}
          onClick={onItemClick}
        />
      ))}
    </div>
  );
}
