/**
 * DepartmentBadge — Pill badge for department
 * Phase 6: Resource 360
 */

const DEPARTMENT_CONFIG: Record<string, { bg: string; text: string }> = {
  Engineering: { bg: 'var(--ds-background-information, #E9F2FF)', text: 'var(--ds-background-brand-bold-hovered, #1d4ed8)' },
  Design:      { bg: 'var(--ds-background-accent-magenta-subtle, #fce7f3)', text: 'var(--ds-background-accent-magenta-bolder, #9d174d)' },
  QA:          { bg: 'var(--ds-background-success, #DFFCF0)', text: 'var(--ds-text-success, #216E4E)' },
  Platform:    { bg: 'var(--ds-background-discovery, #F3F0FF)', text: 'var(--ds-background-discovery-bold, #3730a3)' },
  Data:        { bg: 'var(--ds-background-success, #DCFFF1)', text: 'var(--ds-text-success, #216E4E)' },
  Security:    { bg: 'var(--ds-background-danger, #FFECEB)', text: 'var(--ds-text-danger, #991b1b)' },
  Product:     { bg: 'var(--ds-background-warning, #FFF7D6)', text: 'var(--ds-text-warning, #974F0C)' },
  DevOps:      { bg: 'var(--ds-surface-sunken, #f1f5f9)', text: 'var(--ds-text-subtle, #475569)' },
  Management:  { bg: 'var(--ds-background-discovery, #F3F0FF)', text: 'var(--ds-background-discovery-bold, #5b21b6)' },
};

export { DEPARTMENT_CONFIG };

interface DepartmentBadgeProps {
  department: string;
}

export function DepartmentBadge({ department }: DepartmentBadgeProps) {
  const config = DEPARTMENT_CONFIG[department] || { bg: 'var(--ds-surface-sunken, #f1f5f9)', text: 'var(--ds-text-subtle, #475569)' };

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
        fontFamily: 'var(--cp-font-body)',
        letterSpacing: '0.02em',
        lineHeight: '18px',
      }}
    >
      {department}
    </span>
  );
}
