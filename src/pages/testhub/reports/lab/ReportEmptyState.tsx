import React from 'react';

interface Props {
  message?: string;
  hint?: string;
}

export default function ReportEmptyState({
  message = 'No data for this report',
  hint = 'Adjust filters or run test cycles to generate data.',
}: Props) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 32px',
        gap: 8,
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: 'var(--ds-background-neutral)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 'var(--ds-font-size-700)',
          marginBottom: 4,
        }}
      >
        📊
      </div>
      <p style={{ margin: 0, fontSize: 'var(--ds-font-size-400)', fontWeight: 600, color: 'var(--ds-text)' }}>{message}</p>
      <p style={{ margin: 0, fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text-subtle)', maxWidth: 320, lineHeight: 1.5 }}>{hint}</p>
    </div>
  );
}
