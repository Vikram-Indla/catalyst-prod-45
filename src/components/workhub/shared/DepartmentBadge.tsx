/**
 * DepartmentBadge — Pill badge for department
 * Phase 6: Resource 360
 */

const DEPARTMENT_CONFIG: Record<string, { bg: string; text: string }> = {
  Engineering: { bg: 'var(--ds-background-information)', text: 'var(--ds-background-brand-bold-hovered)' },
  Design:      { bg: 'var(--ds-background-accent-magenta-subtle)', text: 'var(--ds-background-accent-magenta-bolder)' },
  QA:          { bg: 'var(--ds-background-success)', text: 'var(--ds-text-success)' },
  Platform:    { bg: 'var(--ds-background-discovery)', text: 'var(--ds-background-discovery-bold)' },
  Data:        { bg: 'var(--ds-background-success)', text: 'var(--ds-text-success)' },
  Security:    { bg: 'var(--ds-background-danger)', text: 'var(--ds-text-danger)' },
  Product:     { bg: 'var(--ds-background-warning)', text: 'var(--ds-text-warning)' },
  DevOps:      { bg: 'var(--ds-surface-sunken)', text: 'var(--ds-text-subtle)' },
  Management:  { bg: 'var(--ds-background-discovery)', text: 'var(--ds-background-discovery-bold)' },
};

export { DEPARTMENT_CONFIG };

interface DepartmentBadgeProps {
  department: string;
}

export function DepartmentBadge({ department }: DepartmentBadgeProps) {
  const config = DEPARTMENT_CONFIG[department] || { bg: 'var(--ds-surface-sunken)', text: 'var(--ds-text-subtle)' };

  return (
    <span
      style={{
        display: 'inline-block',
        backgroundColor: config.bg,
        color: config.text,
        borderRadius: 9999,
        padding: '2px 10px',
        fontSize: 'var(--ds-font-size-100)',
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
