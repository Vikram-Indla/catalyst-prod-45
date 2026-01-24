interface IdBadgeProps {
  value: string | null;
}

export const IdBadge: React.FC<IdBadgeProps> = ({ value }) => {
  if (!value) return <span>—</span>;
  return <span className="ct-id-badge">{value}</span>;
};
