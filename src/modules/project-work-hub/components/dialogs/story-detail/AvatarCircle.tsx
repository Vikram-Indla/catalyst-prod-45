/**
 * AvatarCircle — Colored face icon avatar
 * GUARDRAIL: Always renders CircleUser face icon (never bare initials).
 */
import React from 'react';
import { CircleUser } from 'lucide-react';

export function AvatarCircle({ name, size = 24 }: { name?: string | null; size?: number }) {
  let hash = 0;
  const n = name || '';
  for (let i = 0; i < n.length; i++) hash = n.charCodeAt(i) + ((hash << 5) - hash);
  const colors = ['#2563EB', '#0D9488', '#7C3AED', '#D97706', '#DC2626', '#16A34A'];
  const bg = colors[Math.abs(hash) % colors.length];
  return (
    <div title={name || undefined} style={{
      width: size, height: size, borderRadius: '50%', background: bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      <CircleUser size={size * 0.7} color="#FFFFFF" strokeWidth={1.5} />
    </div>
  );
}
