/**
 * AvatarCircle — Colored initials avatar
 */
import React from 'react';
import { getInitials } from './helpers';

export function AvatarCircle({ name, size = 24 }: { name?: string | null; size?: number }) {
  let hash = 0;
  const n = name || '';
  for (let i = 0; i < n.length; i++) hash = n.charCodeAt(i) + ((hash << 5) - hash);
  const colors = ['#2563EB', '#0D9488', '#7C3AED', '#D97706', '#DC2626', '#16A34A'];
  const bg = colors[Math.abs(hash) % colors.length];
  return (
    <div title={name || undefined} style={{
      width: size, height: size, borderRadius: '50%', background: bg,
      color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.42, fontWeight: 600, flexShrink: 0,
    }}>
      {getInitials(name)}
    </div>
  );
}
