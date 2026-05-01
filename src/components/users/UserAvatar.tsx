import { useState } from 'react';
import { CircleUser } from 'lucide-react';
import { getAvatarColor, getCountryFlag } from '@/constants/users';
import { resolveAvatarUrl } from '@/lib/avatars';

interface UserAvatarProps {
  name: string | null;
  country: string | null;
  onClick?: () => void;
}

/**
 * GUARDRAIL: Renders CircleUser face icon (never bare initials) when no photo is resolved.
 * Photo source: local asset via resolveAvatarUrl(name). External URLs banned per CLAUDE.md §19.
 */
export const UserAvatar: React.FC<UserAvatarProps> = ({ name, country, onClick }) => {
  const [imgError, setImgError] = useState(false);
  const photoUrl = resolveAvatarUrl(name);
  const showPhoto = photoUrl && !imgError;

  return (
    <div className="ct-avatar-wrapper" onClick={onClick}>
      <div
        className="ct-avatar flex items-center justify-center overflow-hidden"
        style={{ backgroundColor: showPhoto ? 'transparent' : getAvatarColor(name) }}
      >
        {showPhoto ? (
          <img
            src={photoUrl}
            alt={name ?? 'User'}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <CircleUser className="w-[70%] h-[70%]" color="var(--ds-surface, var(--ds-surface, #FFFFFF))" strokeWidth={1.5} />
        )}
      </div>
      <div className="ct-avatar-flag">
        {getCountryFlag(country)}
      </div>
    </div>
  );
};
