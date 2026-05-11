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
        <ul role="listbox" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {severities.map((s) => (
            <li
              key={s}
              role="option"
              onClick={() => {
                onSeverityChange(s);
                setOpen(false);
              }}
            >
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});
