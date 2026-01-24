import { getInitials, getAvatarColor, getCountryFlag } from '@/constants/users';

interface UserAvatarProps {
  name: string | null;
  country: string | null;
  onClick?: () => void;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({ name, country, onClick }) => {
  return (
    <div className="ct-avatar-wrapper" onClick={onClick}>
      <div 
        className="ct-avatar" 
        style={{ backgroundColor: getAvatarColor(name) }}
      >
        {getInitials(name)}
      </div>
      <div className="ct-avatar-flag">
        {getCountryFlag(country)}
      </div>
    </div>
  );
};
