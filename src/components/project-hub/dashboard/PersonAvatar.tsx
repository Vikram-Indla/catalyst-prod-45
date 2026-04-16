/**
 * PersonAvatar — Deterministic gradient circle with face icon
 * GUARDRAIL: Always renders CircleUser face icon (never bare initials).
 */
import { CircleUser } from 'lucide-react';

const GRADIENTS = [
  ['#2563EB', '#1D4ED8'],
  ['#0D9488', '#0F766E'],
  ['#D97706', '#B45309'],
  ['#7C3AED', '#6D28D9'],
  ['#EF4444', '#DC2626'],
  ['#16A34A', '#15803D'],
  ['#0891B2', '#0E7490'],
  ['#BE185D', '#9D174D'],
];

function hashName(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return Math.abs(h);
}

export default function PersonAvatar({ name, size = 18 }: { name: string; size?: number }) {
  const [c1, c2] = GRADIENTS[hashName(name) % GRADIENTS.length];

  return (
    <div
      title={name}
      style={{
        width: size,
        height: size,
        minWidth: size,
        borderRadius: '50%',
        background: `linear-gradient(135deg, ${c1}, ${c2})`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <CircleUser size={size * 0.7} color="#FFFFFF" strokeWidth={1.5} />
    </div>
  );
}
