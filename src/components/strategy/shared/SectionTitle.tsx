/**
 * SectionTitle — Uppercase section header for drawers/panels
 */

interface SectionTitleProps {
  title: string;
  action?: React.ReactNode;
  className?: string;
}

export function SectionTitle({ title, action, className = '' }: SectionTitleProps) {
  return (
    <div className={`flex items-center justify-between ${className}`} style={{ marginBottom: 8 }}>
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--catalyst-text-tertiary, #94A3B8)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        {title}
      </span>
      {action}
    </div>
  );
}
