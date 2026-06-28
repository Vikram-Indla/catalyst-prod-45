import React from 'react';
import type { DatePulseViolation } from '@/types/date-pulse';

interface DatePulseHoverCardProps {
  violations: DatePulseViolation[];
}

const SEVERITY_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  critical: { bg: 'var(--ds-background-danger)', text: 'var(--ds-text-danger)', label: 'Critical' },
  warning:  { bg: 'var(--ds-background-warning)', text: 'var(--ds-text-warning)', label: 'Warning' },
  advisory: { bg: 'var(--ds-background-neutral)', text: 'var(--ds-text-subtle)', label: 'Advisory' },
};

export function DatePulseHoverCard({ violations }: DatePulseHoverCardProps) {
  if (!violations || violations.length === 0) {
    return (
      <div style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtle)', padding: '4px 0' }}>
        No violations detected
      </div>
    );
  }

  // Sort: critical → warning → advisory
  const sorted = [...violations].sort((a, b) => {
    const order = { critical: 0, warning: 1, advisory: 2 };
    return (order[a.severity] ?? 2) - (order[b.severity] ?? 2);
  });

  const visible = sorted.slice(0, 3);
  const remaining = sorted.length - 3;

  return (
    <div>
      <div style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: 'var(--ds-text-subtle)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        Violations
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {visible.map((v) => {
          const style = SEVERITY_COLORS[v.severity] ?? SEVERITY_COLORS.advisory;
          return (
            <div key={v.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <span style={{
                display: 'inline-block',
                padding: '1px 6px',
                borderRadius: 3,
                fontSize: 'var(--ds-font-size-50)',
                fontWeight: 600,
                background: style.bg,
                color: style.text,
                whiteSpace: 'nowrap',
                flexShrink: 0,
                marginTop: 1,
              }}>
                {style.label}
              </span>
              <span style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text)', lineHeight: '16px' }}>
                {v.title}
              </span>
            </div>
          );
        })}
        {remaining > 0 && (
          <div style={{ fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-subtlest)', marginTop: 2 }}>
            +{remaining} more violation{remaining !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    </div>
  );
}
