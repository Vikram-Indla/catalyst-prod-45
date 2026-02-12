/**
 * AvatarChip — User avatar with photo or initials fallback
 */

interface AvatarChipProps {
  name: string;
  color?: string;
  size?: number;
  avatarUrl?: string;
}

export function AvatarChip({ name, color = 'var(--wh-primary)', size = 28, avatarUrl }: AvatarChipProps) {
  const parts = name.trim().split(/\s+/);
  const initials = parts.length >= 2 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : parts[0]?.[0] || '?';

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
          // Fallback to initials on error
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
      className="inline-flex items-center justify-center font-semibold rounded-full text-white"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        backgroundColor: color,
        fontSize: `${size * 0.4}px`,
        flexShrink: 0,
      }}
    >
      {initials.toUpperCase()}
    </div>
  );
}
