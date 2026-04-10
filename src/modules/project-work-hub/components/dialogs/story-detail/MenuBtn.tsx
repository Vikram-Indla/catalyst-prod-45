/**
 * MenuBtn — Menu button row used in dropdown menus
 */
import React from 'react';
import { V } from './tokens';

export function MenuBtn({ icon, label, shortcut, onClick, danger = false }: {
  icon: React.ReactNode; label: string; shortcut?: string; onClick: () => void; danger?: boolean;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px',
        fontSize: 13, cursor: 'pointer', color: danger ? V.dangerRed : V.textPrimary,
        height: 36, transition: 'background 120ms',
      }}
      onMouseEnter={e => e.currentTarget.style.background = V.hoverRow}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      {icon}
      <span style={{ flex: 1 }}>{label}</span>
      {shortcut && <span style={{ fontSize: 11, color: V.textMuted }}>{shortcut}</span>}
    </div>
  );
}
