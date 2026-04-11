/**
 * SidebarField — Label + children wrapper for sidebar detail fields
 */
import React from 'react';
import { V } from './tokens';

export function SidebarField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span style={{ fontSize: 11, fontWeight: 600, color: V.textMuted, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
      {children}
    </div>
  );
}
