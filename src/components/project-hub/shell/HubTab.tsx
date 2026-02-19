interface HubTabProps {
  label: string;
  isActive?: boolean;
  onClick?: () => void;
}

export function HubTab({ label, isActive, onClick }: HubTabProps) {
  return (
    <button
      onClick={onClick}
      className="relative flex items-center h-full transition-colors duration-150"
      style={{
        padding: '0 14px',
        fontSize: '13px',
        fontWeight: isActive ? 600 : 500,
        color: isActive ? '#2563EB' : '#334155',
        fontFamily: "'Inter', sans-serif",
        background: 'transparent',
        border: 'none',
        borderBottom: isActive ? '2px solid #2563EB' : '2px solid transparent',
        cursor: 'pointer',
        letterSpacing: '0.005em',
      }}
      onMouseEnter={(e) => {
        if (!isActive) e.currentTarget.style.color = '#2563EB';
      }}
      onMouseLeave={(e) => {
        if (!isActive) e.currentTarget.style.color = '#334155';
      }}
    >
      {label}
    </button>
  );
}
