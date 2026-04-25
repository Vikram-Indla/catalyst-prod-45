/**
 * DepartmentBadge — Pill badge for department
 * Phase 6: Resource 360
 */

const DEPARTMENT_CONFIG: Record<string, { bg: string; text: string }> = {
  Engineering: { bg: '#dbeafe', text: '#1d4ed8' },
  Design:      { bg: '#fce7f3', text: '#9d174d' },
  QA:          { bg: '#d1fae5', text: '#065f46' },
  Platform:    { bg: '#e0e7ff', text: '#3730a3' },
  Data:        { bg: '#ccfbf1', text: '#134e4a' },
  Security:    { bg: '#fee2e2', text: '#991b1b' },
  Product:     { bg: '#fef3c7', text: '#92400e' },
  DevOps:      { bg: '#f1f5f9', text: '#475569' },
  Management:  { bg: '#f5f3ff', text: '#5b21b6' },
};

export { DEPARTMENT_CONFIG };

interface DepartmentBadgeProps {
  department: string;
}

export function DepartmentBadge({ department }: DepartmentBadgeProps) {
  const config = DEPARTMENT_CONFIG[department] || { bg: '#f1f5f9', text: '#475569' };

  return (
    <span
      style={{
        display: 'inline-block',
        backgroundColor: config.bg,
        color: config.text,
        borderRadius: 9999,
        padding: '2px 10px',
        fontSize: 11,
        fontWeight: 500,
        textTransform: 'uppercase',
        fontFamily: 'var(--ds-font-family-body)',
        letterSpacing: '0.02em',
        lineHeight: '18px',
      }}
    >
      {department}
    </span>
  );
}
