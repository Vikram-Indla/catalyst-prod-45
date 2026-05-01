import { CircleUser } from 'lucide-react';
import { getAvatarColor } from '@/types/request';
import { formatShortName } from '@/lib/format-name';
import { Tooltip } from '@/components/ads';

interface UserAvatarProps {
  name: string | null;
  size?: 16 | 20 | 24 | 28 | 32 | 36;
  showName?: boolean;
  showTooltip?: boolean;
}

/**
 * GUARDRAIL: Renders CircleUser face icon (never bare initials).
 */
export function UserAvatar({ name, size = 24, showName = false, showTooltip = true }: UserAvatarProps) {
  const px = `${size}px`;

  if (!name) {
    const unassigned = (
      <div className="flex items-center gap-2">
        <div
          className="rounded-full flex-shrink-0 flex items-center justify-center"
          style={{ width: px, height: px, border: '2px dashed #d4d4d8', background: 'transparent' }}
        >
          <CircleUser size={size * 0.7} color="#d4d4d8" strokeWidth={1.5} />
        </div>
        {showName && <span className="text-[13px] text-zinc-400 italic truncate">Unassigned</span>}
      </div>
    );
    return unassigned;
  }

  const shortName = formatShortName(name);

  const avatar = (
    <div
      className="rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0"
      style={{ width: px, height: px, backgroundColor: getAvatarColor(name) }}
    >
      <CircleUser size={size * 0.7} color="var(--ds-surface, #FFFFFF)" strokeWidth={1.5} />
    </div>
  );

  const content = showName ? (
    <div className="flex items-center gap-2 min-w-0">
      {avatar}
      <span className="text-[13px] text-zinc-900 truncate">{shortName}</span>
    </div>
  ) : avatar;

  if (!showTooltip) return content;

  return (
    <Tooltip content={name} delay={500}>
      <div className="inline-flex">{content}</div>
    </Tooltip>
  );
}
