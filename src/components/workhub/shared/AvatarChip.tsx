/**
 * AvatarChip — User avatar with initials
 */

interface AvatarChipProps {
  name: string;
  color?: string;
  size?: number;
}

export function AvatarChip({ name, color = 'var(--wh-primary)', size = 28 }: AvatarChipProps) {
  // Extract initials: first letter of first + last name
  const parts = name.trim().split(/\s+/);
  const initials = parts.length >= 2 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : parts[0]?.[0] || '?';

  return (
    <div
      className="inline-flex items-center justify-center font-semibold rounded-full text-white"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        backgroundColor: color,
        fontSize: `${size * 0.4}px`,
      }}
    >
      {initials.toUpperCase()}
    </div>
  );
}
