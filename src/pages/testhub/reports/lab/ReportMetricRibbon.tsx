import React from 'react';

interface Metric {
  label: string;
  value: string | number;
  sub?: string;
  highlight?: 'success' | 'danger' | 'warning' | 'neutral';
}

interface Props {
  metrics: Metric[];
}

const HIGHLIGHT_COLOR: Record<string, string> = {
  success: 'var(--ds-text-success)',
  danger: 'var(--ds-text-danger)',
  warning: 'var(--ds-text-warning)',
  neutral: 'var(--ds-text)',
};

function MetricCard({ label, value, sub, highlight = 'neutral' }: Metric) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 100,
        background: 'var(--ds-surface)',
        border: '1px solid var(--ds-border)',
        borderRadius: 6,
        padding: '12px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      <span
        style={{
          fontSize: 'var(--ds-font-size-100)',
          fontWeight: 600,
          color: 'var(--ds-text-subtlest)',
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 'var(--ds-font-size-700)',
          fontWeight: 700,
          color: HIGHLIGHT_COLOR[highlight],
          lineHeight: 1.1,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </span>
      {sub && (
        <span style={{ fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-subtlest)', lineHeight: 1.2 }}>
          {sub}
        </span>
      )}
    </div>
  );
}

export default function ReportMetricRibbon({ metrics }: Props) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 8,
        flexWrap: 'nowrap',
        overflowX: 'auto',
        padding: '16px 20px',
        borderBottom: '1px solid var(--ds-border)',
        background: 'var(--ds-surface-sunken)',
      }}
    >
      {metrics.map(m => (
        <MetricCard key={m.label} {...m} />
      ))}
    </div>
  );
}
