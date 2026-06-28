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
        padding: '64px 32px',
        gap: 10,
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
          fontSize: 22,
          marginBottom: 4,
        }}
      >
        📊
      </div>
      <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--ds-text)' }}>{message}</p>
      <p style={{ margin: 0, fontSize: 13, color: 'var(--ds-text-subtle)', maxWidth: 320, lineHeight: 1.5 }}>{hint}</p>
    </div>
  );
}
