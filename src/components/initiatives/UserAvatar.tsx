import { getAvatarColor, getInitials } from '@/types/initiative';
import { formatShortName } from '@/lib/format-name';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';

interface UserAvatarProps {
  name: string | null;
  size?: 16 | 20 | 24 | 28 | 32 | 36;
  showName?: boolean;
  showTooltip?: boolean;
}

const FONT_SIZE: Record<number, string> = {
  16: 'text-[8px]',
  20: 'text-[9px]',
  24: 'text-[10px]',
  28: 'text-[11px]',
  32: 'text-[12px]',
  36: 'text-[13px]',
};

export function UserAvatar({ name, size = 24, showName = false, showTooltip = true }: UserAvatarProps) {
  const px = `${size}px`;

  if (!name) {
    const unassigned = (
      <div className="flex items-center gap-2">
        <div
          className="rounded-full flex-shrink-0"
          style={{ width: px, height: px, border: '2px dashed #d4d4d8', background: 'transparent' }}
        />
        {showName && <span className="text-[13px] text-zinc-400 italic truncate">Unassigned</span>}
      </div>
    );
    return unassigned;
  }

  const shortName = formatShortName(name);

  const avatar = (
    <div
      className={`rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0 ${FONT_SIZE[size] || 'text-[10px]'}`}
      style={{ width: px, height: px, backgroundColor: getAvatarColor(name) }}
    >
      {getInitials(name)}
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
    <TooltipProvider delayDuration={500}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="inline-flex">{content}</div>
        </TooltipTrigger>
        <TooltipContent>{name}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
