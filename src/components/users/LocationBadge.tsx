import { getLocationBadgeClass } from '@/constants/users';

interface LocationBadgeProps {
  location: string | null;
}

export const LocationBadge: React.FC<LocationBadgeProps> = ({ location }) => {
  if (!location) return <span>—</span>;
  
  const locClass = getLocationBadgeClass(location);
  
  return (
    <span className={`ct-badge ${locClass}`}>
      {location}
    </span>
  );
};
