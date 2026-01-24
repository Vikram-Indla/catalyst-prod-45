interface StatCardProps {
  label: string;
  value: number;
  type: 'all' | 'variable' | 'permanent' | 'fixed' | 'freelance';
  isActive: boolean;
  onClick: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  type,
  isActive,
  onClick
}) => {
  return (
    <div 
      className={`ct-stat-card ${isActive ? 'active' : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
    >
      <div className="ct-stat-header">
        <div className={`ct-stat-dot ${type}`} />
        <span className="ct-stat-label">{label}</span>
      </div>
      <div className="ct-stat-value">{value}</div>
    </div>
  );
};
