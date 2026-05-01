/**
 * AvatarChip — User avatar with photo or face icon fallback
 * GUARDRAIL: Always renders CircleUser face icon when no photo (never bare initials).
 */
import { CircleUser } from 'lucide-react';

interface AvatarChipProps {
  name: string;
  color?: string;
  size?: number;
  avatarUrl?: string;
}

export function AvatarChip({ name, color = 'var(--cp-blue)', size = 28, avatarUrl }: AvatarChipProps) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: '50%',
          objectFit: 'cover',
          flexShrink: 0,
        }}
        onError={(e) => {
          const el = e.currentTarget;
          el.style.display = 'none';
          const fallback = el.nextElementSibling as HTMLElement;
          if (fallback) fallback.style.display = 'inline-flex';
        }}
      />
    );
  }

  return (
    <div
      className="inline-flex items-center justify-center font-semibold rounded-full"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        backgroundColor: color,
        flexShrink: 0,
      }}
    >
      <CircleUser size={size * 0.7} color="var(--ds-text-inverse, #FFFFFF)" strokeWidth={1.5} />
    </div>
  );
}
