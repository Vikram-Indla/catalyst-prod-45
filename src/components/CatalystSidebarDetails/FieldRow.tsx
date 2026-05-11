/**
 * FieldRow — Label + value layout (F3.2)
 */
import React, { memo, ReactNode } from 'react';

export const FieldRow = memo(function FieldRow({
  label,
  value,
  children,
  editable = false,
}: {
  label: string;
  value?: string;
  children?: ReactNode;
  editable?: boolean;
}) {
  return (
    <div
      data-testid="field-row"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
      }}
    >
      <label data-testid="field-label" style={{ fontSize: '11px', fontWeight: '600' }}>
        {label}
      </label>
      {children || <div>{value}</div>}
      {editable && <div data-testid="field-edit-control">Edit</div>}
    </div>
  );
});
