import React from 'react';
import { useMyScheduledMessages, type ScheduledMessage } from '../../hooks/useMyScheduledMessages';
import { ScheduledRow } from './ScheduledRow';

interface ScheduledTabProps {
  onSelectScheduled: (msg: ScheduledMessage) => void;
}

export function ScheduledTab({ onSelectScheduled }: ScheduledTabProps) {
  const { data: scheduled = [], isLoading } = useMyScheduledMessages();

  if (isLoading) return null;

  if (scheduled.length === 0) {
    return (
      <div
        style={{
          padding: '40px 24px',
          textAlign: 'center',
          color: 'var(--cv2-text-muted)',
          fontFamily: 'var(--cv2-font)',
          fontSize: 14,
        }}
      >
        No messages scheduled.
      </div>
    );
  }

  return (
    <ul
      style={{
        listStyle: 'none',
        margin: 0,
        padding: '0 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        overflowY: 'auto',
      }}
    >
      {scheduled.map(s => (
        <li key={s.id}>
          <ScheduledRow scheduled={s} onClick={() => onSelectScheduled(s)} />
        </li>
      ))}
    </ul>
  );
}
