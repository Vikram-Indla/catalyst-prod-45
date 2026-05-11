/**
 * CatalystSeverityField — Severity field (F3.5)
 */
import React, { memo, useState } from 'react';

export const CatalystSeverityField = memo(function CatalystSeverityField({
  severity,
  onSeverityChange,
}: {
  severity: string;
  onSeverityChange: (severity: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const severities = ['Critical', 'High', 'Medium', 'Low'];

  return (
    <div>
      <label>Severity</label>
      <button data-testid="severity-button" onClick={() => setOpen(!open)}>
        {severity}
      </button>
      {open && (
        <select
          role="listbox"
          onChange={(e) => {
            onSeverityChange(e.target.value);
            setOpen(false);
          }}
        >
          {severities.map((s) => (
            <option key={s} role="option">{s}</option>
          ))}
        </select>
      )}
    </div>
  );
});
