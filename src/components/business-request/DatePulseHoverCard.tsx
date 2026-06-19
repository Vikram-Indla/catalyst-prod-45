import React from 'react';
import type { DatePulseViolation } from '@/types/date-pulse';

interface DatePulseHoverCardProps {
  violations: DatePulseViolation[];
}

const SEVERITY_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  critical: { bg: 'var(--ds-background-danger, #FFECEB)', text: 'var(--ds-text-danger, #AE2A19)', label: 'Critical' },
  warning:  { bg: 'var(--ds-background-warning, #FFF7D6)', text: 'var(--ds-text-warning, #7F5F01)', label: 'Warning' },
  advisory: { bg: 'var(--ds-background-neutral, #F1F2F4)', text: 'var(--ds-text-subtle, #42526E)', label: 'Advisory' },
};

export function DatePulseHoverCard({ violations }: DatePulseHoverCardProps) {
  if (!violations || violations.length === 0) {
    return (
      <div style={{ fontSize: '12px', color: 'var(--ds-text-subtle, #42526E)', padding: '4px 0' }}>
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
      <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--ds-text-subtle, #42526E)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
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
                fontSize: '10px',
                fontWeight: 600,
                background: style.bg,
                color: style.text,
                whiteSpace: 'nowrap',
                flexShrink: 0,
                marginTop: 1,
              }}>
                {style.label}
              </span>
              <span style={{ fontSize: '12px', color: 'var(--ds-text, #172B4D)', lineHeight: '16px' }}>
                {v.title}
              </span>
            </div>
          );
        })}
        {remaining > 0 && (
          <div style={{ fontSize: '11px', color: 'var(--ds-text-subtlest, #6B778C)', marginTop: 2 }}>
            +{remaining} more violation{remaining !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    </div>
  );
}
