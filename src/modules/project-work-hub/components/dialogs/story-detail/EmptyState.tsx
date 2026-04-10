/**
 * EmptyState — Empty state placeholder with icon, message, and optional action
 */
import React from 'react';
import { V } from './tokens';

export function EmptyState({ icon, message, action }: { icon: React.ReactNode; message: string; action?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '20px 16px' }}>
      <div style={{ color: V.textDisabled }}>{icon}</div>
      <span style={{ fontSize: 13, color: V.textMuted, textAlign: 'center' }}>{message}</span>
      {action}
    </div>
  );
}
