import { CircleUser } from 'lucide-react';
import { getAvatarColor, getCountryFlag } from '@/constants/users';

interface UserAvatarProps {
  name: string | null;
  country: string | null;
  onClick?: () => void;
}

/**
 * GUARDRAIL: Renders CircleUser face icon (never bare initials).
 */
export const UserAvatar: React.FC<UserAvatarProps> = ({ name, country, onClick }) => {
  return (
    <div className="ct-avatar-wrapper" onClick={onClick}>
      <div
        className="ct-avatar flex items-center justify-center"
        style={{ backgroundColor: getAvatarColor(name) }}
      >
        <CircleUser className="w-[70%] h-[70%]" color="#FFFFFF" strokeWidth={1.5} />
      </div>
      <div className="ct-avatar-flag">
        {getCountryFlag(country)}
      </div>
    </div>
  );
};
