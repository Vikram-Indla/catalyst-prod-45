import { getTypeBadgeClass } from '@/constants/users';

interface TypeBadgeProps {
  type: string | null;
}

export const TypeBadge: React.FC<TypeBadgeProps> = ({ type }) => {
  if (!type) return <span>—</span>;
  
  const typeClass = getTypeBadgeClass(type);
  
  return (
    <span className={`ct-badge ${typeClass}`}>
      <span className="ct-badge-dot" />
      {type}
    </span>
  );
};
